import AppKit
import SwiftUI

/// Geometry and export-time constants. **Dynamic colors** come from `FlowDeskAppearanceTokens`
/// (resolved per `ColorScheme` + user style preset) and are injected via `@Environment(\.flowDeskTokens)`.
enum FlowDeskTheme {
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
            .foregroundStyle(.tertiary)
            .padding(.bottom, FlowDeskLayout.inspectorSectionHeaderBottomSpacing)
    }
}
