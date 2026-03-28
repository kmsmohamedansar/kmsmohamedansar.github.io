import AppKit
import SwiftUI

/// Shared visual constants for a calm, native macOS productivity feel.
enum FlowDeskTheme {
    // MARK: - Canvas workspace

    static func canvasWorkspaceBackground(for colorScheme: ColorScheme) -> Color {
        switch colorScheme {
        case .dark:
            Color(nsColor: NSColor(red: 0.12, green: 0.12, blue: 0.13, alpha: 1))
        default:
            // Slightly warm off-white; easier on the eyes than pure window gray.
            Color(nsColor: NSColor(red: 0.965, green: 0.958, blue: 0.948, alpha: 1))
        }
    }

    /// Export and thumbnails: match light workspace for predictable output.
    static var canvasWorkspaceBackgroundExport: Color {
        Color(nsColor: NSColor(red: 0.965, green: 0.958, blue: 0.948, alpha: 1))
    }

    static func gridLineOpacity(for colorScheme: ColorScheme) -> Double {
        colorScheme == .dark ? 0.07 : 0.045
    }

    // MARK: - Framed canvas items

    static let textBlockCornerRadius: CGFloat = 14
    static let textBlockContentPadding = EdgeInsets(top: 11, leading: 14, bottom: 11, trailing: 14)

    static let chartCardCornerRadius: CGFloat = 14
    static let chartCardContentPadding: CGFloat = 16
    static let chartTitleSpacing: CGFloat = 12

    static let shapeSelectionChromeCorner: CGFloat = 12
    static let strokeSelectionChromeCorner: CGFloat = 8

    // MARK: - Selection & handles

    static let selectionStrokeWidth: CGFloat = 1.5
    static let selectionAccentOpacity: Double = 0.88

    static var selectionStrokeColor: Color {
        Color.accentColor.opacity(selectionAccentOpacity)
    }

    // MARK: - Shadows (subtle depth)

    static func cardShadowOpacity(selected: Bool) -> Double {
        selected ? 0.11 : 0.055
    }

    static func cardShadowRadius(selected: Bool) -> CGFloat {
        selected ? 12 : 6
    }

    static func cardShadowY(selected: Bool) -> CGFloat {
        selected ? 4 : 2
    }
}

// MARK: - Inspector

/// Consistent section headers for the inspector form.
struct FlowDeskInspectorSectionHeader: View {
    let title: String

    init(_ title: String) {
        self.title = title
    }

    var body: some View {
        Text(title)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(.secondary)
    }
}
