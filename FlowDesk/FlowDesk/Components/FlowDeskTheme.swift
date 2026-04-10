import AppKit
import SwiftUI

/// Geometry and export-time constants. **Dynamic colors** come from `FlowDeskAppearanceTokens`
/// (resolved per `ColorScheme` + user style preset) and are injected via `@Environment(\.flowDeskTokens)`.
enum FlowDeskTheme {
    // MARK: - Depth (Level 2 floating panels — single shadow system)

    /// Tight, modern lift—subtle elevation without heavy blur.
    static let floatingPanelShadowOpacity: Double = 0.055
    static let floatingPanelShadowRadius: CGFloat = 10
    static let floatingPanelShadowY: CGFloat = 3

    /// Home dashboard: very light top wash only (atmospheric layers reduced elsewhere).
    static func homeAtmosphereWash(colorScheme: ColorScheme) -> LinearGradient {
        LinearGradient(
            colors: colorScheme == .dark
                ? [Color.white.opacity(0.028), Color.clear]
                : [Color(red: 0.995, green: 0.988, blue: 0.978).opacity(0.47), Color.clear],
            startPoint: .top,
            endPoint: UnitPoint(x: 0.5, y: 0.44)
        )
    }

    // MARK: - Canvas readability (dense boards)

    /// Elements outside the selection + one connector hop use this opacity (see `CanvasBoardView`).
    static let canvasBoardReadabilityDeemphasisOpacity: CGFloat = 0.86

    // MARK: - Canvas workspace (export / previews only)

    /// Matches warm-paper light tokens for predictable PNG/PDF output (board mat, not home chrome).
    static func canvasWorkspaceBackground(for colorScheme: ColorScheme) -> Color {
        FlowDeskAppearanceTokens.resolve(colorScheme: colorScheme, preset: .warmPaper).canvasWorkspaceBackground
    }

    static var canvasWorkspaceBackgroundExport: Color {
        FlowDeskAppearanceTokens.resolve(colorScheme: .light, preset: .warmPaper).canvasWorkspaceBackground
    }

    static func gridLineOpacity(for colorScheme: ColorScheme) -> Double {
        FlowDeskAppearanceTokens.resolve(colorScheme: colorScheme, preset: .warmPaper).gridLineOpacity
    }

    // MARK: - Framed canvas items (geometry; aligned with `FlowDeskLayout.cardCornerRadius`)

    static var textBlockCornerRadius: CGFloat { FlowDeskLayout.cardCornerRadius }
    static var textBlockContentPadding: EdgeInsets { FlowDeskLayout.canvasCardContentPadding }

    static var chartCardCornerRadius: CGFloat { FlowDeskLayout.cardCornerRadius }
    static var chartCardContentPadding: CGFloat { FlowDeskLayout.canvasCardContentPadding.leading }
    static var chartTitleSpacing: CGFloat { FlowDeskLayout.chartTitleElementSpacing }

    static var shapeSelectionChromeCorner: CGFloat { FlowDeskLayout.shapeSelectionCornerRadius }
    static var strokeSelectionChromeCorner: CGFloat { FlowDeskLayout.strokeSelectionCornerRadius }

    // MARK: - Selection & handles (geometry; stroke color lives on tokens in canvas views)

    static let selectionStrokeWidth: CGFloat = 1.25
    static let selectionAccentOpacity: Double = 0.92

    /// Single product accent (RGB aligned with `FlowDeskAppearanceTokens` accent bases).
    static let brandAccent = Color(nsColor: NSColor(red: 0.20, green: 0.45, blue: 0.84, alpha: 1))

    static var selectionStrokeColor: Color {
        brandAccent.opacity(selectionAccentOpacity)
    }

    // MARK: - Shadows (export + legacy callers)

    static func cardShadowOpacity(selected: Bool) -> Double {
        let t = FlowDeskAppearanceTokens.resolve(colorScheme: .light, preset: .warmPaper)
        return selected ? t.canvasItemShadowSelected : t.canvasItemShadowNormal
    }

    static func cardShadowRadius(selected: Bool) -> CGFloat {
        let t = FlowDeskAppearanceTokens.resolve(colorScheme: .light, preset: .warmPaper)
        return selected ? t.canvasItemShadowRadiusSelected : t.canvasItemShadowRadiusNormal
    }

    static func cardShadowY(selected: Bool) -> CGFloat {
        let t = FlowDeskAppearanceTokens.resolve(colorScheme: .light, preset: .warmPaper)
        return selected ? t.canvasItemShadowYSelected : t.canvasItemShadowYNormal
    }

    // MARK: - Floating panel chrome (palette, toolbars, HUD)

    /// Hairline rim shared by palette rail, context panels, selection toolbars, zoom HUD, tips.
    static var chromeHairlineBorderGradient: LinearGradient {
        LinearGradient(
            colors: [
                Color.primary.opacity(0.085),
                Color.primary.opacity(0.03)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    @ViewBuilder
    static func floatingPanelStackedFill(
        tokens: FlowDeskAppearanceTokens,
        colorScheme: ColorScheme,
        cornerRadius: CGFloat,
        lightOpacity: Double,
        darkOpacity: Double
    ) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .fill(.ultraThinMaterial)
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .fill(tokens.homeCardFill.opacity(colorScheme == .dark ? darkOpacity : lightOpacity))
        }
    }

    /// Connector labels and similar inline canvas annotations (one shadow language).
    static let canvasAuxiliaryLabelShadowOpacity: Double = 0.12
    static let canvasAuxiliaryLabelShadowOpacityHover: Double = 0.22
    static let canvasAuxiliaryLabelShadowRadius: CGFloat = 2
    static let canvasAuxiliaryLabelShadowRadiusHover: CGFloat = 3
    static let canvasAuxiliaryLabelShadowY: CGFloat = 1

    // MARK: - Canvas mat (infinite board surface)

    /// Neutral 72×72 tile; `overlay` at low opacity reads as paper tooth, not speckle noise.
    private static let canvasMatGrainTileNSImage: NSImage = {
        let w = 72
        let h = 72
        guard let rep = NSBitmapImageRep(
            bitmapDataPlanes: nil,
            pixelsWide: w,
            pixelsHigh: h,
            bitsPerSample: 8,
            samplesPerPixel: 4,
            hasAlpha: false,
            isPlanar: false,
            colorSpaceName: .deviceRGB,
            bytesPerRow: w * 4,
            bitsPerPixel: 32
        ), let data = rep.bitmapData else {
            return NSImage(size: NSSize(width: 16, height: 16))
        }
        for y in 0..<h {
            for x in 0..<w {
                var u = UInt64(x) &* 92_837_111 ^ UInt64(y) &* 689_287_499
                u = u &* 2_246_822_519
                u ^= u >> 13
                u = u &* 3_266_489_917
                let t = Double(u & 0xFFFF) / 65_535.0
                let g = UInt8(min(255, max(0, Int((0.48 + (t - 0.5) * 0.11) * 255.0))))
                let o = y * w * 4 + x * 4
                data[o] = g
                data[o + 1] = g
                data[o + 2] = g
                data[o + 3] = 255
            }
        }
        let img = NSImage(size: NSSize(width: w, height: h))
        img.addRepresentation(rep)
        return img
    }()

    /// Token-driven board mat: base → grid → one vertical depth multiply → light top wash → edge vignette → optional grain (no stacked radial/center/depth overlays).
    @ViewBuilder
    static func canvasWorkspaceMatBackground(
        tokens: FlowDeskAppearanceTokens,
        colorScheme: ColorScheme,
        showGrid: Bool,
        includeFilmGrain: Bool
    ) -> some View {
        let gridOpacity = tokens.gridLineOpacity * tokens.canvasGridEmphasis
        let topWash = (colorScheme == .dark ? tokens.canvasTopWashOpacity * 0.52 : tokens.canvasTopWashOpacity) * 0.5

        ZStack {
            tokens.canvasWorkspaceBackground

            if showGrid {
                CanvasGridOverlay(
                    spacing: 24,
                    lineWidth: FlowDeskLayout.gridLineWidth,
                    lineOpacity: gridOpacity,
                    gridInk: tokens.canvasGridInk
                )
            }

            LinearGradient(
                colors: [
                    Color.black.opacity(0),
                    Color.black.opacity(tokens.canvasBottomDepthOpacity)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .blendMode(.multiply)
            .allowsHitTesting(false)

            LinearGradient(
                colors: [
                    Color.white.opacity(topWash),
                    Color.white.opacity(0)
                ],
                startPoint: .top,
                endPoint: UnitPoint(x: 0.5, y: 0.38)
            )
            .blendMode(.softLight)
            .allowsHitTesting(false)

            RadialGradient(
                colors: [
                    Color.clear,
                    tokens.canvasGridInk.opacity(tokens.canvasVignetteOpacity)
                ],
                center: .center,
                startRadius: 280,
                endRadius: 2_600
            )
            .blendMode(.multiply)
            .allowsHitTesting(false)

            if includeFilmGrain, tokens.canvasGrainOpacity > 0.0001 {
                Image(nsImage: canvasMatGrainTileNSImage)
                    .resizable(resizingMode: .tile)
                    .blendMode(.overlay)
                    .opacity(tokens.canvasGrainOpacity)
                    .allowsHitTesting(false)
            }
        }
    }
}

// MARK: - Inspector

/// Section headers: same density as sidebar section titles for quick scanning.
struct FlowDeskInspectorSectionHeader: View {
    @Environment(\.colorScheme) private var colorScheme

    let title: String

    init(_ title: String) {
        self.title = title
    }

    var body: some View {
        Text(title)
            .font(.system(size: 11, weight: .semibold, design: .default))
            .foregroundStyle(Color.primary.opacity(colorScheme == .dark ? 0.58 : 0.45))
            .textCase(.uppercase)
            .tracking(0.62)
            .padding(.bottom, FlowDeskLayout.inspectorSectionHeaderBottomSpacing)
    }
}

// MARK: - Brand identity

/// Calm wordmark: rounded “Flow” + slightly quieter “Desk” (not system all-caps eyebrow).
struct FlowDeskWordmark: View {
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 2) {
            Text("Cere")
                .font(.system(size: 21, weight: .semibold, design: .rounded))
                .tracking(-0.35)
            Text("bra")
                .font(.system(size: 21, weight: .medium, design: .rounded))
                .tracking(-0.22)
                .foregroundStyle(.secondary)
        }
        .foregroundStyle(.primary)
        .accessibilityLabel("Cerebra")
    }
}

/// Stacked “sheets” mark—product-owned silhouette instead of a lone SF Symbol.
struct FlowDeskSheetsStackMark: View {
    @Environment(\.flowDeskTokens) private var tokens
    @Environment(\.colorScheme) private var colorScheme

    var size: CGFloat = 80

    var body: some View {
        let corner = size * 0.12
        let sheetW = size * 0.56
        let sheetH = size * 0.7
        let isDark = colorScheme == .dark

        ZStack {
            RoundedRectangle(cornerRadius: corner, style: .continuous)
                .fill(tokens.homeCardFill.opacity(isDark ? 0.32 : 0.46))
                .frame(width: sheetW, height: sheetH)
                .overlay {
                    RoundedRectangle(cornerRadius: corner, style: .continuous)
                        .strokeBorder(Color.primary.opacity(isDark ? 0.12 : 0.08), lineWidth: 0.75)
                }
                .rotationEffect(.degrees(-8))
                .offset(x: -size * 0.1, y: size * 0.06)
                .shadow(color: .black.opacity(isDark ? 0.22 : 0.07), radius: size * 0.045, x: 0, y: size * 0.022)

            RoundedRectangle(cornerRadius: corner, style: .continuous)
                .fill(tokens.homeCardFill.opacity(isDark ? 0.42 : 0.58))
                .frame(width: sheetW, height: sheetH)
                .overlay {
                    RoundedRectangle(cornerRadius: corner, style: .continuous)
                        .strokeBorder(Color.primary.opacity(isDark ? 0.14 : 0.1), lineWidth: 0.75)
                }
                .rotationEffect(.degrees(4))
                .offset(x: size * 0.04, y: -size * 0.02)
                .shadow(color: .black.opacity(isDark ? 0.28 : 0.085), radius: size * 0.05, x: 0, y: size * 0.03)

            RoundedRectangle(cornerRadius: corner, style: .continuous)
                .fill(tokens.workspaceBackground)
                .frame(width: sheetW, height: sheetH)
                .overlay {
                    RoundedRectangle(cornerRadius: corner, style: .continuous)
                        .strokeBorder(Color.primary.opacity(isDark ? 0.2 : 0.11), lineWidth: 1)
                }
                .shadow(color: .black.opacity(isDark ? 0.35 : 0.1), radius: size * 0.055, x: 0, y: size * 0.038)
        }
        .frame(width: size * 1.2, height: size * 1.05)
        .accessibilityHidden(true)
    }
}

/// Centered canvas empty state: same sheets language as the sidebar, tuned for the board.
struct FlowDeskCanvasWorkspaceHint: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(spacing: 20) {
            FlowDeskSheetsStackMark(size: 88)
            VStack(spacing: 8) {
                Text("What do you want to explore?")
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(Color.primary.opacity(colorScheme == .dark ? 0.55 : 0.42))
                    .multilineTextAlignment(.center)
                Text("A calm canvas for solo thinking—use the tools on the left to write, sketch, or place shapes.")
                    .font(.system(size: 12.5, weight: .regular, design: .rounded))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Color.primary.opacity(colorScheme == .dark ? 0.38 : 0.32))
                    .frame(maxWidth: 280)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .accessibilityElement(children: .combine)
    }
}
