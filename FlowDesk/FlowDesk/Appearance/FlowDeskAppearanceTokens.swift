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
    /// Infinite-board “mat”: subtly distinct from `workspaceBackground` (home / window chrome) so the canvas reads as the work surface, not generic UI chrome.
    let canvasWorkspaceBackground: Color
    let gridLineOpacity: Double
    /// Base color for canvas grid lines (scaled by `gridLineOpacity`). Warm presets use ink with a slight paper tone.
    let canvasGridInk: Color
    /// Multiply-blended vertical shade toward the bottom (keeps the mat slightly darker than chrome).
    let canvasBottomDepthOpacity: Double
    /// Soft top highlight for a `softLight` wash (keep small; avoids a “bright” ceiling).
    let canvasTopWashOpacity: Double
    /// Edge vignette strength using `canvasGridInk` (multiply toward the perimeter).
    let canvasVignetteOpacity: Double
    /// Tiled neutral grain (`overlay`). Use 0 to disable.
    let canvasGrainOpacity: Double
    /// Scales effective grid line opacity so lines read etched into the mat, not pasted on top.
    let canvasGridEmphasis: Double

    let homeCardFill: Color
    /// Top-leading partner for a subtle surface gradient on home/dashboard cards (pairs with `homeCardFill`).
    let homeCardFillTop: Color
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

    /// Product accent — slightly richer for Miro-like interaction clarity while staying calm (not system blue).
    private static let accentStrokeLight = Color(nsColor: NSColor(red: 0.20, green: 0.45, blue: 0.84, alpha: 1))
    private static let accentStrokeDark = Color(nsColor: NSColor(red: 0.55, green: 0.76, blue: 1.0, alpha: 1))

    // MARK: - Warm Paper

    private static let warmPaperLight = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.991, green: 0.982, blue: 0.966, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.848, green: 0.830, blue: 0.805, alpha: 1)),
        gridLineOpacity: 0.042,
        canvasGridInk: Color(nsColor: NSColor(red: 0.36, green: 0.30, blue: 0.25, alpha: 1)),
        canvasBottomDepthOpacity: 0.092,
        canvasTopWashOpacity: 0.034,
        canvasVignetteOpacity: 0.128,
        canvasGrainOpacity: 0.048,
        canvasGridEmphasis: 0.91,
        homeCardFill: Color(nsColor: NSColor(red: 0.997, green: 0.991, blue: 0.982, alpha: 1)),
        homeCardFillTop: Color(nsColor: NSColor(red: 1, green: 0.999, blue: 0.993, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.082,
        homeCardBorderHover: 0.128,
        homeCardShadowOpacityNormal: 0.068,
        homeCardShadowOpacityHover: 0.104,
        homeCardShadowRadiusNormal: 13,
        homeCardShadowRadiusHover: 20,
        canvasTextBlockFill: Color(nsColor: NSColor(red: 0.996, green: 0.991, blue: 0.978, alpha: 1)),
        canvasTextBlockBorderOpacity: 0.104,
        canvasItemShadowNormal: 0.086,
        canvasItemShadowSelected: 0.132,
        canvasItemShadowRadiusNormal: 9,
        canvasItemShadowRadiusSelected: 14,
        canvasItemShadowYNormal: 3,
        canvasItemShadowYSelected: 4.5,
        chartCardFill: Color(nsColor: NSColor(red: 0.994, green: 0.988, blue: 0.976, alpha: 1)),
        chartCardBorderOpacity: 0.105,
        selectionStrokeColor: accentStrokeLight.opacity(0.94),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color(nsColor: NSColor(red: 0.972, green: 0.962, blue: 0.943, alpha: 0.88)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .thin,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.988, green: 0.978, blue: 0.962, alpha: 0.97))
    )

    private static let warmPaperDark = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.138, green: 0.118, blue: 0.108, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.072, green: 0.062, blue: 0.055, alpha: 1)),
        gridLineOpacity: 0.076,
        canvasGridInk: Color(nsColor: NSColor(red: 0.58, green: 0.53, blue: 0.49, alpha: 1)),
        canvasBottomDepthOpacity: 0.118,
        canvasTopWashOpacity: 0.02,
        canvasVignetteOpacity: 0.188,
        canvasGrainOpacity: 0.052,
        canvasGridEmphasis: 0.92,
        homeCardFill: Color(nsColor: NSColor(red: 0.24, green: 0.208, blue: 0.19, alpha: 1)),
        homeCardFillTop: Color(nsColor: NSColor(red: 0.29, green: 0.252, blue: 0.228, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.125,
        homeCardBorderHover: 0.21,
        homeCardShadowOpacityNormal: 0.38,
        homeCardShadowOpacityHover: 0.52,
        homeCardShadowRadiusNormal: 14,
        homeCardShadowRadiusHover: 20,
        canvasTextBlockFill: Color(nsColor: NSColor(red: 0.236, green: 0.208, blue: 0.192, alpha: 1)),
        canvasTextBlockBorderOpacity: 0.185,
        canvasItemShadowNormal: 0.5,
        canvasItemShadowSelected: 0.64,
        canvasItemShadowRadiusNormal: 11,
        canvasItemShadowRadiusSelected: 16,
        canvasItemShadowYNormal: 3.5,
        canvasItemShadowYSelected: 5,
        chartCardFill: Color(nsColor: NSColor(red: 0.24, green: 0.212, blue: 0.196, alpha: 1)),
        chartCardBorderOpacity: 0.215,
        selectionStrokeColor: accentStrokeDark.opacity(0.94),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color(nsColor: NSColor(red: 0.175, green: 0.15, blue: 0.136, alpha: 0.78)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .thin,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.195, green: 0.17, blue: 0.155, alpha: 0.84))
    )

    // MARK: - Graphite

    private static let graphiteLight = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.958, green: 0.962, blue: 0.972, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.832, green: 0.842, blue: 0.862, alpha: 1)),
        gridLineOpacity: 0.06,
        canvasGridInk: Color.primary,
        canvasBottomDepthOpacity: 0.09,
        canvasTopWashOpacity: 0.026,
        canvasVignetteOpacity: 0.108,
        canvasGrainOpacity: 0.036,
        canvasGridEmphasis: 0.9,
        homeCardFill: Color(nsColor: NSColor(red: 0.992, green: 0.994, blue: 0.998, alpha: 1)),
        homeCardFillTop: Color(nsColor: NSColor(red: 1, green: 1, blue: 1, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.1,
        homeCardBorderHover: 0.162,
        homeCardShadowOpacityNormal: 0.072,
        homeCardShadowOpacityHover: 0.112,
        homeCardShadowRadiusNormal: 11,
        homeCardShadowRadiusHover: 17,
        canvasTextBlockFill: Color(nsColor: NSColor(red: 0.988, green: 0.990, blue: 0.996, alpha: 1)),
        canvasTextBlockBorderOpacity: 0.102,
        canvasItemShadowNormal: 0.082,
        canvasItemShadowSelected: 0.128,
        canvasItemShadowRadiusNormal: 8,
        canvasItemShadowRadiusSelected: 13,
        canvasItemShadowYNormal: 2.75,
        canvasItemShadowYSelected: 4.25,
        chartCardFill: Color(nsColor: NSColor(red: 0.986, green: 0.988, blue: 0.995, alpha: 1)),
        chartCardBorderOpacity: 0.108,
        selectionStrokeColor: accentStrokeLight.opacity(0.94),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color(nsColor: NSColor(red: 0.908, green: 0.916, blue: 0.932, alpha: 0.82)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .ultraThin,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.936, green: 0.942, blue: 0.954, alpha: 0.9))
    )

    private static let graphiteDark = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.108, green: 0.114, blue: 0.136, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.062, green: 0.068, blue: 0.088, alpha: 1)),
        gridLineOpacity: 0.088,
        canvasGridInk: Color.primary,
        canvasBottomDepthOpacity: 0.122,
        canvasTopWashOpacity: 0.017,
        canvasVignetteOpacity: 0.185,
        canvasGrainOpacity: 0.054,
        canvasGridEmphasis: 0.92,
        homeCardFill: Color(nsColor: NSColor(red: 0.192, green: 0.198, blue: 0.218, alpha: 1)),
        homeCardFillTop: Color(nsColor: NSColor(red: 0.238, green: 0.242, blue: 0.262, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.155,
        homeCardBorderHover: 0.24,
        homeCardShadowOpacityNormal: 0.44,
        homeCardShadowOpacityHover: 0.58,
        homeCardShadowRadiusNormal: 12,
        homeCardShadowRadiusHover: 17,
        canvasTextBlockFill: Color(nsColor: NSColor(red: 0.196, green: 0.204, blue: 0.224, alpha: 1)),
        canvasTextBlockBorderOpacity: 0.225,
        canvasItemShadowNormal: 0.52,
        canvasItemShadowSelected: 0.66,
        canvasItemShadowRadiusNormal: 10,
        canvasItemShadowRadiusSelected: 15,
        canvasItemShadowYNormal: 3.25,
        canvasItemShadowYSelected: 4.75,
        chartCardFill: Color(nsColor: NSColor(red: 0.206, green: 0.214, blue: 0.234, alpha: 1)),
        chartCardBorderOpacity: 0.245,
        selectionStrokeColor: accentStrokeDark.opacity(0.93),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color(nsColor: NSColor(red: 0.132, green: 0.14, blue: 0.164, alpha: 0.72)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .ultraThin,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.162, green: 0.172, blue: 0.192, alpha: 0.78))
    )

    // MARK: - Glass

    private static let glassLight = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.952, green: 0.955, blue: 0.965, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.848, green: 0.856, blue: 0.874, alpha: 1)),
        gridLineOpacity: 0.05,
        canvasGridInk: Color.primary,
        canvasBottomDepthOpacity: 0.076,
        canvasTopWashOpacity: 0.024,
        canvasVignetteOpacity: 0.092,
        canvasGrainOpacity: 0.032,
        canvasGridEmphasis: 0.86,
        homeCardFill: Color.white.opacity(0.26),
        homeCardFillTop: Color.white.opacity(0.44),
        homeCardMaterial: .regular,
        homeCardBorderNormal: 0.125,
        homeCardBorderHover: 0.195,
        homeCardShadowOpacityNormal: 0.086,
        homeCardShadowOpacityHover: 0.132,
        homeCardShadowRadiusNormal: 12,
        homeCardShadowRadiusHover: 18,
        canvasTextBlockFill: Color(nsColor: NSColor.white.withAlphaComponent(0.82)),
        canvasTextBlockBorderOpacity: 0.122,
        canvasItemShadowNormal: 0.09,
        canvasItemShadowSelected: 0.148,
        canvasItemShadowRadiusNormal: 11,
        canvasItemShadowRadiusSelected: 16,
        canvasItemShadowYNormal: 3.25,
        canvasItemShadowYSelected: 5.25,
        chartCardFill: Color(nsColor: NSColor.white.withAlphaComponent(0.86)),
        chartCardBorderOpacity: 0.14,
        selectionStrokeColor: accentStrokeLight.opacity(0.94),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color(nsColor: NSColor.white.withAlphaComponent(0.2)),
        sidebarFooterUseSystemBar: false,
        sidebarFooterMaterial: .thin,
        toolbarMaterial: .regular,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color.white.opacity(0.28)
    )

    private static let glassDark = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.092, green: 0.1, blue: 0.122, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.052, green: 0.062, blue: 0.084, alpha: 1)),
        gridLineOpacity: 0.084,
        canvasGridInk: Color.primary,
        canvasBottomDepthOpacity: 0.112,
        canvasTopWashOpacity: 0.015,
        canvasVignetteOpacity: 0.168,
        canvasGrainOpacity: 0.048,
        canvasGridEmphasis: 0.88,
        homeCardFill: Color.white.opacity(0.085),
        homeCardFillTop: Color.white.opacity(0.14),
        homeCardMaterial: .regular,
        homeCardBorderNormal: 0.2,
        homeCardBorderHover: 0.3,
        homeCardShadowOpacityNormal: 0.48,
        homeCardShadowOpacityHover: 0.62,
        homeCardShadowRadiusNormal: 13,
        homeCardShadowRadiusHover: 19,
        canvasTextBlockFill: Color(nsColor: NSColor.white.withAlphaComponent(0.125)),
        canvasTextBlockBorderOpacity: 0.232,
        canvasItemShadowNormal: 0.54,
        canvasItemShadowSelected: 0.7,
        canvasItemShadowRadiusNormal: 12,
        canvasItemShadowRadiusSelected: 17,
        canvasItemShadowYNormal: 4.25,
        canvasItemShadowYSelected: 6.25,
        chartCardFill: Color(nsColor: NSColor.white.withAlphaComponent(0.14)),
        chartCardBorderOpacity: 0.255,
        selectionStrokeColor: accentStrokeDark.opacity(0.94),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color.white.opacity(0.09),
        sidebarFooterUseSystemBar: false,
        sidebarFooterMaterial: .thin,
        toolbarMaterial: .regular,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color.white.opacity(0.12)
    )

    // MARK: - Solid

    private static let solidLight = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.978, green: 0.978, blue: 0.984, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.888, green: 0.892, blue: 0.904, alpha: 1)),
        gridLineOpacity: 0.07,
        canvasGridInk: Color.primary,
        canvasBottomDepthOpacity: 0.096,
        canvasTopWashOpacity: 0.022,
        canvasVignetteOpacity: 0.098,
        canvasGrainOpacity: 0.03,
        canvasGridEmphasis: 0.89,
        homeCardFill: Color(nsColor: NSColor(red: 0.998, green: 0.998, blue: 1.0, alpha: 1)),
        homeCardFillTop: Color(nsColor: NSColor(red: 1, green: 1, blue: 1, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.118,
        homeCardBorderHover: 0.188,
        homeCardShadowOpacityNormal: 0.062,
        homeCardShadowOpacityHover: 0.102,
        homeCardShadowRadiusNormal: 10,
        homeCardShadowRadiusHover: 15,
        canvasTextBlockFill: Color(nsColor: NSColor(red: 0.992, green: 0.993, blue: 0.998, alpha: 1)),
        canvasTextBlockBorderOpacity: 0.118,
        canvasItemShadowNormal: 0.072,
        canvasItemShadowSelected: 0.118,
        canvasItemShadowRadiusNormal: 8,
        canvasItemShadowRadiusSelected: 12,
        canvasItemShadowYNormal: 2.25,
        canvasItemShadowYSelected: 3.5,
        chartCardFill: Color(nsColor: NSColor(red: 0.990, green: 0.991, blue: 0.997, alpha: 1)),
        chartCardBorderOpacity: 0.125,
        selectionStrokeColor: accentStrokeLight.opacity(0.92),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color(nsColor: NSColor(red: 0.938, green: 0.938, blue: 0.948, alpha: 0.78)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .none,
        toolbarFlatBackground: Color(nsColor: NSColor.windowBackgroundColor),
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.962, green: 0.962, blue: 0.972, alpha: 0.98))
    )

    private static let solidDark = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.128, green: 0.126, blue: 0.132, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.072, green: 0.072, blue: 0.078, alpha: 1)),
        gridLineOpacity: 0.104,
        canvasGridInk: Color.primary,
        canvasBottomDepthOpacity: 0.124,
        canvasTopWashOpacity: 0.016,
        canvasVignetteOpacity: 0.192,
        canvasGrainOpacity: 0.056,
        canvasGridEmphasis: 0.92,
        homeCardFill: Color(nsColor: NSColor(red: 0.202, green: 0.2, blue: 0.206, alpha: 1)),
        homeCardFillTop: Color(nsColor: NSColor(red: 0.242, green: 0.238, blue: 0.246, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.22,
        homeCardBorderHover: 0.32,
        homeCardShadowOpacityNormal: 0.52,
        homeCardShadowOpacityHover: 0.66,
        homeCardShadowRadiusNormal: 10,
        homeCardShadowRadiusHover: 15,
        canvasTextBlockFill: Color(nsColor: NSColor(red: 0.222, green: 0.22, blue: 0.226, alpha: 1)),
        canvasTextBlockBorderOpacity: 0.265,
        canvasItemShadowNormal: 0.54,
        canvasItemShadowSelected: 0.68,
        canvasItemShadowRadiusNormal: 8,
        canvasItemShadowRadiusSelected: 12,
        canvasItemShadowYNormal: 2.75,
        canvasItemShadowYSelected: 4,
        chartCardFill: Color(nsColor: NSColor(red: 0.212, green: 0.21, blue: 0.216, alpha: 1)),
        chartCardBorderOpacity: 0.295,
        selectionStrokeColor: accentStrokeDark.opacity(0.93),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color(nsColor: NSColor(red: 0.162, green: 0.16, blue: 0.166, alpha: 0.78)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .none,
        toolbarFlatBackground: Color(nsColor: NSColor(red: 0.15, green: 0.15, blue: 0.15, alpha: 1)),
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.178, green: 0.176, blue: 0.182, alpha: 0.96))
    )
}
