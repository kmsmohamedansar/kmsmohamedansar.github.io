import AppKit
import SwiftUI

/// Material layer for cards, sidebars, and toolbars when a preset wants depth without a flat color.
enum FlowDeskMaterialLayer: Equatable {
    case none
    case ultraThin
    case thin
    case regular

    var material: Material? {
        switch self {
        case .none: return nil
        case .ultraThin: return .ultraThinMaterial
        case .thin: return .thinMaterial
        case .regular: return .regularMaterial
        }
    }
}

/// Resolved visual tokens for one `(colorScheme × style preset)` pair.
struct FlowDeskAppearanceTokens: Equatable {
    let workspaceBackground: Color
    let gridLineOpacity: Double
    /// Base color for canvas grid lines (scaled by `gridLineOpacity`). Warm presets use ink with a slight paper tone.
    let canvasGridInk: Color

    let homeCardFill: Color
    let homeCardMaterial: FlowDeskMaterialLayer
    let homeCardBorderNormal: Double
    let homeCardBorderHover: Double
    let homeCardShadowOpacityNormal: Double
    let homeCardShadowOpacityHover: Double
    let homeCardShadowRadiusNormal: CGFloat
    let homeCardShadowRadiusHover: CGFloat

    let canvasTextBlockFill: Color
    let canvasTextBlockBorderOpacity: Double
    let canvasItemShadowNormal: Double
    let canvasItemShadowSelected: Double
    let canvasItemShadowRadiusNormal: CGFloat
    let canvasItemShadowRadiusSelected: CGFloat
    let canvasItemShadowYNormal: CGFloat
    let canvasItemShadowYSelected: CGFloat

    let chartCardFill: Color
    let chartCardBorderOpacity: Double

    let selectionStrokeColor: Color
    let selectionStrokeWidth: CGFloat

    let sidebarListTint: Color
    let sidebarFooterUseSystemBar: Bool
    let sidebarFooterMaterial: FlowDeskMaterialLayer

    let toolbarMaterial: FlowDeskMaterialLayer
    let toolbarFlatBackground: Color?

    let inspectorChromeBackground: Color

    static let fallback = resolve(colorScheme: .light, preset: .warmPaper)

    static func resolve(colorScheme: ColorScheme, preset: FlowDeskStylePreset) -> FlowDeskAppearanceTokens {
        switch (preset, colorScheme) {
        case (.warmPaper, .light): return warmPaperLight
        case (.warmPaper, .dark): return warmPaperDark
        case (.graphite, .light): return graphiteLight
        case (.graphite, .dark): return graphiteDark
        case (.glass, .light): return glassLight
        case (.glass, .dark): return glassDark
        case (.solid, .light): return solidLight
        case (.solid, .dark): return solidDark
        @unknown default: return warmPaperLight
        }
    }

    // MARK: - Warm Paper

    private static let warmPaperLight = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.972, green: 0.962, blue: 0.949, alpha: 1)),
        gridLineOpacity: 0.028,
        canvasGridInk: Color(nsColor: NSColor(red: 0.36, green: 0.30, blue: 0.25, alpha: 1)),
        homeCardFill: Color(nsColor: NSColor(red: 0.99, green: 0.985, blue: 0.975, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.08,
        homeCardBorderHover: 0.14,
        homeCardShadowOpacityNormal: 0.055,
        homeCardShadowOpacityHover: 0.1,
        homeCardShadowRadiusNormal: 8,
        homeCardShadowRadiusHover: 14,
        canvasTextBlockFill: Color(nsColor: NSColor(red: 0.995, green: 0.992, blue: 0.985, alpha: 1)),
        canvasTextBlockBorderOpacity: 0.07,
        canvasItemShadowNormal: 0.055,
        canvasItemShadowSelected: 0.11,
        canvasItemShadowRadiusNormal: 6,
        canvasItemShadowRadiusSelected: 12,
        canvasItemShadowYNormal: 2,
        canvasItemShadowYSelected: 4,
        chartCardFill: Color(nsColor: NSColor(red: 0.99, green: 0.987, blue: 0.98, alpha: 1)),
        chartCardBorderOpacity: 0.08,
        selectionStrokeColor: Color.accentColor.opacity(0.88),
        selectionStrokeWidth: 1.5,
        sidebarListTint: Color(nsColor: NSColor(red: 0.98, green: 0.975, blue: 0.965, alpha: 0.2)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .thin,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.97, green: 0.965, blue: 0.955, alpha: 0.38))
    )

    private static let warmPaperDark = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.14, green: 0.12, blue: 0.11, alpha: 1)),
        gridLineOpacity: 0.062,
        canvasGridInk: Color(nsColor: NSColor(red: 0.58, green: 0.53, blue: 0.49, alpha: 1)),
        homeCardFill: Color(nsColor: NSColor(red: 0.2, green: 0.17, blue: 0.16, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.12,
        homeCardBorderHover: 0.2,
        homeCardShadowOpacityNormal: 0.35,
        homeCardShadowOpacityHover: 0.5,
        homeCardShadowRadiusNormal: 10,
        homeCardShadowRadiusHover: 16,
        canvasTextBlockFill: Color(nsColor: NSColor(red: 0.18, green: 0.16, blue: 0.15, alpha: 1)),
        canvasTextBlockBorderOpacity: 0.15,
        canvasItemShadowNormal: 0.4,
        canvasItemShadowSelected: 0.55,
        canvasItemShadowRadiusNormal: 8,
        canvasItemShadowRadiusSelected: 14,
        canvasItemShadowYNormal: 3,
        canvasItemShadowYSelected: 5,
        chartCardFill: Color(nsColor: NSColor(red: 0.19, green: 0.17, blue: 0.16, alpha: 1)),
        chartCardBorderOpacity: 0.18,
        selectionStrokeColor: Color.accentColor.opacity(0.9),
        selectionStrokeWidth: 1.5,
        sidebarListTint: Color(nsColor: NSColor(red: 0.16, green: 0.14, blue: 0.13, alpha: 0.32)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .thin,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.17, green: 0.15, blue: 0.14, alpha: 0.4))
    )

    // MARK: - Graphite

    private static let graphiteLight = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.93, green: 0.94, blue: 0.96, alpha: 1)),
        gridLineOpacity: 0.055,
        canvasGridInk: Color.primary,
        homeCardFill: Color(nsColor: NSColor(red: 0.98, green: 0.98, blue: 0.99, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.1,
        homeCardBorderHover: 0.16,
        homeCardShadowOpacityNormal: 0.06,
        homeCardShadowOpacityHover: 0.11,
        homeCardShadowRadiusNormal: 8,
        homeCardShadowRadiusHover: 14,
        canvasTextBlockFill: Color(nsColor: .textBackgroundColor),
        canvasTextBlockBorderOpacity: 0.09,
        canvasItemShadowNormal: 0.06,
        canvasItemShadowSelected: 0.12,
        canvasItemShadowRadiusNormal: 6,
        canvasItemShadowRadiusSelected: 12,
        canvasItemShadowYNormal: 2,
        canvasItemShadowYSelected: 4,
        chartCardFill: Color(nsColor: NSColor(red: 0.99, green: 0.99, blue: 1, alpha: 1)),
        chartCardBorderOpacity: 0.1,
        selectionStrokeColor: Color(nsColor: NSColor(red: 0.2, green: 0.45, blue: 0.85, alpha: 1)),
        selectionStrokeWidth: 1.5,
        sidebarListTint: Color(nsColor: NSColor(red: 0.94, green: 0.95, blue: 0.97, alpha: 0.3)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .ultraThin,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.95, green: 0.96, blue: 0.98, alpha: 0.42))
    )

    private static let graphiteDark = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.11, green: 0.12, blue: 0.14, alpha: 1)),
        gridLineOpacity: 0.08,
        canvasGridInk: Color.primary,
        homeCardFill: Color(nsColor: NSColor(red: 0.17, green: 0.18, blue: 0.2, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.14,
        homeCardBorderHover: 0.22,
        homeCardShadowOpacityNormal: 0.4,
        homeCardShadowOpacityHover: 0.55,
        homeCardShadowRadiusNormal: 10,
        homeCardShadowRadiusHover: 16,
        canvasTextBlockFill: Color(nsColor: NSColor(red: 0.16, green: 0.17, blue: 0.19, alpha: 1)),
        canvasTextBlockBorderOpacity: 0.2,
        canvasItemShadowNormal: 0.45,
        canvasItemShadowSelected: 0.6,
        canvasItemShadowRadiusNormal: 8,
        canvasItemShadowRadiusSelected: 14,
        canvasItemShadowYNormal: 3,
        canvasItemShadowYSelected: 5,
        chartCardFill: Color(nsColor: NSColor(red: 0.18, green: 0.19, blue: 0.21, alpha: 1)),
        chartCardBorderOpacity: 0.22,
        selectionStrokeColor: Color(nsColor: NSColor(red: 0.45, green: 0.65, blue: 1, alpha: 0.95)),
        selectionStrokeWidth: 1.5,
        sidebarListTint: Color(nsColor: NSColor(red: 0.13, green: 0.14, blue: 0.16, alpha: 0.36)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .ultraThin,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.15, green: 0.16, blue: 0.18, alpha: 0.42))
    )

    // MARK: - Glass

    private static let glassLight = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.94, green: 0.95, blue: 0.98, alpha: 1)),
        gridLineOpacity: 0.04,
        canvasGridInk: Color.primary,
        homeCardFill: Color.white.opacity(0.2),
        homeCardMaterial: .regular,
        homeCardBorderNormal: 0.12,
        homeCardBorderHover: 0.2,
        homeCardShadowOpacityNormal: 0.08,
        homeCardShadowOpacityHover: 0.14,
        homeCardShadowRadiusNormal: 12,
        homeCardShadowRadiusHover: 20,
        canvasTextBlockFill: Color(nsColor: NSColor.white.withAlphaComponent(0.72)),
        canvasTextBlockBorderOpacity: 0.12,
        canvasItemShadowNormal: 0.08,
        canvasItemShadowSelected: 0.15,
        canvasItemShadowRadiusNormal: 10,
        canvasItemShadowRadiusSelected: 18,
        canvasItemShadowYNormal: 3,
        canvasItemShadowYSelected: 6,
        chartCardFill: Color(nsColor: NSColor.white.withAlphaComponent(0.78)),
        chartCardBorderOpacity: 0.14,
        selectionStrokeColor: Color.accentColor.opacity(0.92),
        selectionStrokeWidth: 1.5,
        sidebarListTint: Color.white.opacity(0.09),
        sidebarFooterUseSystemBar: false,
        sidebarFooterMaterial: .thin,
        toolbarMaterial: .regular,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color.white.opacity(0.14)
    )

    private static let glassDark = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.09, green: 0.1, blue: 0.12, alpha: 1)),
        gridLineOpacity: 0.075,
        canvasGridInk: Color.primary,
        homeCardFill: Color.white.opacity(0.06),
        homeCardMaterial: .regular,
        homeCardBorderNormal: 0.18,
        homeCardBorderHover: 0.28,
        homeCardShadowOpacityNormal: 0.45,
        homeCardShadowOpacityHover: 0.62,
        homeCardShadowRadiusNormal: 14,
        homeCardShadowRadiusHover: 22,
        canvasTextBlockFill: Color(nsColor: NSColor.white.withAlphaComponent(0.1)),
        canvasTextBlockBorderOpacity: 0.22,
        canvasItemShadowNormal: 0.5,
        canvasItemShadowSelected: 0.68,
        canvasItemShadowRadiusNormal: 12,
        canvasItemShadowRadiusSelected: 20,
        canvasItemShadowYNormal: 4,
        canvasItemShadowYSelected: 7,
        chartCardFill: Color(nsColor: NSColor.white.withAlphaComponent(0.12)),
        chartCardBorderOpacity: 0.24,
        selectionStrokeColor: Color.accentColor.opacity(0.95),
        selectionStrokeWidth: 1.5,
        sidebarListTint: Color.white.opacity(0.035),
        sidebarFooterUseSystemBar: false,
        sidebarFooterMaterial: .thin,
        toolbarMaterial: .regular,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color.white.opacity(0.06)
    )

    // MARK: - Solid

    private static let solidLight = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.96, green: 0.96, blue: 0.96, alpha: 1)),
        gridLineOpacity: 0.065,
        canvasGridInk: Color.primary,
        homeCardFill: Color(nsColor: NSColor(red: 1, green: 1, blue: 1, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.14,
        homeCardBorderHover: 0.22,
        homeCardShadowOpacityNormal: 0.035,
        homeCardShadowOpacityHover: 0.07,
        homeCardShadowRadiusNormal: 4,
        homeCardShadowRadiusHover: 8,
        canvasTextBlockFill: Color(nsColor: .textBackgroundColor),
        canvasTextBlockBorderOpacity: 0.12,
        canvasItemShadowNormal: 0.04,
        canvasItemShadowSelected: 0.09,
        canvasItemShadowRadiusNormal: 4,
        canvasItemShadowRadiusSelected: 8,
        canvasItemShadowYNormal: 1,
        canvasItemShadowYSelected: 2,
        chartCardFill: Color(nsColor: NSColor(red: 1, green: 1, blue: 1, alpha: 1)),
        chartCardBorderOpacity: 0.14,
        selectionStrokeColor: Color.primary.opacity(0.85),
        selectionStrokeWidth: 2,
        sidebarListTint: Color(nsColor: NSColor(red: 0.94, green: 0.94, blue: 0.94, alpha: 0.55)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .none,
        toolbarFlatBackground: Color(nsColor: NSColor.windowBackgroundColor),
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.96, green: 0.96, blue: 0.96, alpha: 0.92))
    )

    private static let solidDark = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.13, green: 0.13, blue: 0.13, alpha: 1)),
        gridLineOpacity: 0.1,
        canvasGridInk: Color.primary,
        homeCardFill: Color(nsColor: NSColor(red: 0.18, green: 0.18, blue: 0.18, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.22,
        homeCardBorderHover: 0.32,
        homeCardShadowOpacityNormal: 0.5,
        homeCardShadowOpacityHover: 0.65,
        homeCardShadowRadiusNormal: 4,
        homeCardShadowRadiusHover: 8,
        canvasTextBlockFill: Color(nsColor: NSColor(red: 0.2, green: 0.2, blue: 0.2, alpha: 1)),
        canvasTextBlockBorderOpacity: 0.25,
        canvasItemShadowNormal: 0.45,
        canvasItemShadowSelected: 0.6,
        canvasItemShadowRadiusNormal: 4,
        canvasItemShadowRadiusSelected: 8,
        canvasItemShadowYNormal: 2,
        canvasItemShadowYSelected: 3,
        chartCardFill: Color(nsColor: NSColor(red: 0.19, green: 0.19, blue: 0.19, alpha: 1)),
        chartCardBorderOpacity: 0.28,
        selectionStrokeColor: Color.white.opacity(0.75),
        selectionStrokeWidth: 2,
        sidebarListTint: Color(nsColor: NSColor(red: 0.16, green: 0.16, blue: 0.16, alpha: 0.62)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .none,
        toolbarFlatBackground: Color(nsColor: NSColor(red: 0.15, green: 0.15, blue: 0.15, alpha: 1)),
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.17, green: 0.17, blue: 0.17, alpha: 0.88))
    )
}
