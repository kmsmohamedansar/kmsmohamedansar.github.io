import AppKit
import SwiftUI

/// Geometry and export-time constants. **Dynamic colors** come from `FlowDeskAppearanceTokens`
/// (resolved per `ColorScheme` + user style preset) and are injected via `@Environment(\.flowDeskTokens)`.
enum FlowDeskTheme {
    // MARK: - Depth (Level 2 floating panels — single shadow system)

    /// Softer lift so floating chrome reads light and precise, not heavy.
    static let floatingPanelShadowOpacity: Double = 0.11
    static let floatingPanelShadowRadius: CGFloat = 22
    static let floatingPanelShadowY: CGFloat = 5

    /// Subtle vertical wash so the canvas (Level 1) reads as a surface, not a flat fill.
    static func canvasBoardDepthGradient(colorScheme: ColorScheme) -> LinearGradient {
        if colorScheme == .dark {
            return LinearGradient(
                colors: [.clear, Color.black.opacity(0.2)],
                startPoint: .top,
                endPoint: .bottom
            )
        }
        return LinearGradient(
            gradient: Gradient(stops: [
                .init(color: .clear, location: 0),
                .init(color: Color.black.opacity(0.03), location: 0.52),
                .init(color: Color(red: 0.44, green: 0.37, blue: 0.31).opacity(0.022), location: 1)
            ]),
            startPoint: .top,
            endPoint: .bottom
        )
    }

    /// Soft light pool from the upper-left—adds spatial richness without clutter.
    static func canvasBoardRadialAtmosphere(colorScheme: ColorScheme) -> RadialGradient {
        RadialGradient(
            colors: colorScheme == .dark
                ? [Color.white.opacity(0.052), Color.clear]
                : [Color(red: 1, green: 0.992, blue: 0.978).opacity(0.34), Color.clear],
            center: UnitPoint(x: 0.12, y: 0.08),
            startRadius: 0,
            endRadius: 780
        )
    }

    /// Gentle brightening at the canvas center so the board reads as a lit “space” (Figma/Miro-like depth).
    static func canvasBoardCenterGlow(colorScheme: ColorScheme) -> RadialGradient {
        RadialGradient(
            colors: colorScheme == .dark
                ? [Color.white.opacity(0.04), Color.clear]
                : [Color.white.opacity(0.22), Color.clear],
            center: .center,
            startRadius: 80,
            endRadius: 1400
        )
    }

    /// Home dashboard: gentle warmth from the top so the first screen feels composed.
    static func homeAtmosphereWash(colorScheme: ColorScheme) -> LinearGradient {
        LinearGradient(
            colors: colorScheme == .dark
                ? [Color.white.opacity(0.042), Color.clear]
                : [Color(red: 0.995, green: 0.988, blue: 0.978).opacity(0.88), Color.clear],
            startPoint: .top,
            endPoint: UnitPoint(x: 0.5, y: 0.44)
        )
    }

    // MARK: - Canvas readability (dense boards)

    /// Elements outside the selection + one connector hop use this opacity (see `CanvasBoardView`).
    static let canvasBoardReadabilityDeemphasisOpacity: CGFloat = 0.86

    // MARK: - Canvas workspace (export / previews only)

    /// Matches warm-paper light tokens for predictable PNG/PDF output.
    static func canvasWorkspaceBackground(for colorScheme: ColorScheme) -> Color {
        FlowDeskAppearanceTokens.resolve(colorScheme: colorScheme, preset: .warmPaper).workspaceBackground
    }

    static var canvasWorkspaceBackgroundExport: Color {
        FlowDeskAppearanceTokens.resolve(colorScheme: .light, preset: .warmPaper).workspaceBackground
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

    static let selectionStrokeWidth: CGFloat = 1.5
    static let selectionAccentOpacity: Double = 0.88

    static var selectionStrokeColor: Color {
        Color.accentColor.opacity(selectionAccentOpacity)
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
}

// MARK: - Inspector

/// Section headers: same density as sidebar section titles for quick scanning.
struct FlowDeskInspectorSectionHeader: View {
    let title: String

    init(_ title: String) {
        self.title = title
    }

    var body: some View {
        Text(title)
            .font(FlowDeskTypography.sidebarSectionHeader)
            .foregroundStyle(.quaternary)
            .textCase(.uppercase)
            .tracking(0.35)
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
