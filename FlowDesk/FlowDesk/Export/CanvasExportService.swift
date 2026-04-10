import AppKit
import PDFKit
import SwiftUI
import UniformTypeIdentifiers

// MARK: - Export appearance (matches live app chrome)

@MainActor
private enum CanvasExportAppearance {
    static func resolvedAppearance() -> (colorScheme: ColorScheme, tokens: FlowDeskAppearanceTokens) {
        let modeRaw = UserDefaults.standard.string(forKey: "FlowDesk.appearance.mode")
            ?? FlowDeskAppearanceMode.system.rawValue
        let mode = FlowDeskAppearanceMode(rawValue: modeRaw) ?? .system
        let colorScheme: ColorScheme
        switch mode {
        case .light:
            colorScheme = .light
        case .dark:
            colorScheme = .dark
        case .system:
            colorScheme = NSApp.effectiveAppearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
                ? .dark
                : .light
        }
        let presetRaw = UserDefaults.standard.string(forKey: "FlowDesk.appearance.stylePreset")
            ?? FlowDeskStylePreset.warmPaper.rawValue
        let preset = FlowDeskStylePreset(rawValue: presetRaw) ?? .warmPaper
        let tokens = FlowDeskAppearanceTokens.resolve(colorScheme: colorScheme, preset: preset)
        return (colorScheme, tokens)
    }
}

/// Renders a snapshot of `CanvasBoardState` off-screen and writes PNG/PDF via the system save panel.
/// Does not mutate documents or live canvas UI state.
@MainActor
enum CanvasExportService {
    /// Raster scale for `ImageRenderer` (logical points → pixels). 2× keeps exports sharp on Retina.
    static let defaultRenderScale: CGFloat = 2

    enum Format {
        case png
        case pdf

        var utType: UTType {
            switch self {
            case .png: return .png
            case .pdf: return .pdf
            }
        }

        var pathExtension: String {
            switch self {
            case .png: return "png"
            case .pdf: return "pdf"
            }
        }
    }

    // MARK: - Public entry (save panel)

    static func presentExportPanel(
        boardState: CanvasBoardState,
        documentTitle: String,
        format: Format
    ) {
        guard let image = renderExportImage(boardState: boardState) else {
            NSSound.beep()
            return
        }

        let baseName = sanitizedFileName(documentTitle)
        let defaultName = "\(baseName).\(format.pathExtension)"

        let panel = NSSavePanel()
        panel.canCreateDirectories = true
        panel.isExtensionHidden = false
        panel.title = format == .png ? "Export as PNG" : "Export as PDF"
        panel.nameFieldStringValue = defaultName
        panel.allowedContentTypes = [format.utType]
        panel.allowsOtherFileTypes = false

        let parentWindow = NSApp.keyWindow ?? NSApp.mainWindow ?? NSApp.windows.first
        let completion: (NSApplication.ModalResponse) -> Void = { response in
            guard response == .OK, let url = panel.url else { return }
            switch format {
            case .png:
                _ = writePNG(image, to: url)
            case .pdf:
                _ = writePDF(from: image, to: url)
            }
        }

        if let window = parentWindow {
            panel.beginSheetModal(for: window, completionHandler: completion)
        } else {
            let response = panel.runModal()
            completion(response)
        }
    }

    // MARK: - Rendering

    /// Renders the content bounds (see `CanvasExportBounds`) at `defaultRenderScale`.
    static func renderExportImage(boardState: CanvasBoardState) -> NSImage? {
        let rect = CanvasExportBounds.exportRect(elements: boardState.elements)
        let appearance = CanvasExportAppearance.resolvedAppearance()
        let content = CanvasBoardExportContentView(
            boardState: boardState,
            exportRect: rect,
            tokens: appearance.tokens,
            colorScheme: appearance.colorScheme
        )
        let renderer = ImageRenderer(content: content)
        renderer.scale = defaultRenderScale
        renderer.proposedSize = ProposedViewSize(
            width: rect.width,
            height: rect.height
        )
        return renderer.nsImage
    }

    // MARK: - Writers

    @discardableResult
    static func writePNG(_ image: NSImage, to url: URL) -> Bool {
        guard let data = pngData(from: image) else { return false }
        do {
            try data.write(to: url, options: .atomic)
            return true
        } catch {
            NSSound.beep()
            return false
        }
    }

    static func pngData(from image: NSImage) -> Data? {
        guard let tiff = image.tiffRepresentation,
              let rep = NSBitmapImageRep(data: tiff)
        else { return nil }
        return rep.representation(using: .png, properties: [.compressionFactor: 1])
    }

    /// Single-page PDF embedding a **raster** of the same bitmap as PNG (Swift Charts / rich text are not vectorized in v1).
    @discardableResult
    static func writePDF(from image: NSImage, to url: URL) -> Bool {
        guard let page = PDFPage(image: image) else { return false }
        let doc = PDFDocument()
        doc.insert(page, at: 0)
        return doc.write(to: url)
    }

    // MARK: - Filename

    private static func sanitizedFileName(_ title: String) -> String {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let base = trimmed.isEmpty ? "Board" : trimmed
        let invalid = CharacterSet(charactersIn: "/:\\?%*|\"<>")
        return base
            .components(separatedBy: invalid)
            .joined(separator: "-")
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
