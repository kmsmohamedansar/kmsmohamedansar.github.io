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
        workspaceBackground: Color(nsColor: NSColor(red: 0.983, green: 0.976, blue: 0.964, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.876, green: 0.864, blue: 0.844, alpha: 1)),
        gridLineOpacity: 0.036,
        canvasGridInk: Color(nsColor: NSColor(red: 0.36, green: 0.30, blue: 0.25, alpha: 1)),
        canvasBottomDepthOpacity: 0.072,
        canvasTopWashOpacity: 0.026,
        canvasVignetteOpacity: 0.10,
        canvasGrainOpacity: 0.036,
        canvasGridEmphasis: 0.88,
        homeCardFill: Color(nsColor: NSColor(red: 1, green: 0.997, blue: 0.992, alpha: 1)),
        homeCardFillTop: Color(nsColor: NSColor(red: 1, green: 0.999, blue: 0.996, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.062,
        homeCardBorderHover: 0.11,
        homeCardShadowOpacityNormal: 0.046,
        homeCardShadowOpacityHover: 0.086,
        homeCardShadowRadiusNormal: 10,
        homeCardShadowRadiusHover: 16,
        canvasTextBlockFill: Color(nsColor: NSColor(red: 0.996, green: 0.991, blue: 0.978, alpha: 1)),
        canvasTextBlockBorderOpacity: 0.096,
        canvasItemShadowNormal: 0.078,
        canvasItemShadowSelected: 0.124,
        canvasItemShadowRadiusNormal: 8,
        canvasItemShadowRadiusSelected: 13,
        canvasItemShadowYNormal: 2.75,
        canvasItemShadowYSelected: 4.25,
        chartCardFill: Color(nsColor: NSColor(red: 0.994, green: 0.988, blue: 0.976, alpha: 1)),
        chartCardBorderOpacity: 0.098,
        selectionStrokeColor: accentStrokeLight.opacity(0.94),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color(nsColor: NSColor(red: 0.978, green: 0.970, blue: 0.956, alpha: 0.74)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .thin,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.980, green: 0.972, blue: 0.958, alpha: 0.94))
    )

    private static let warmPaperDark = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.162, green: 0.138, blue: 0.126, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.088, green: 0.076, blue: 0.068, alpha: 1)),
        gridLineOpacity: 0.07,
        canvasGridInk: Color(nsColor: NSColor(red: 0.58, green: 0.53, blue: 0.49, alpha: 1)),
        canvasBottomDepthOpacity: 0.105,
        canvasTopWashOpacity: 0.017,
        canvasVignetteOpacity: 0.165,
        canvasGrainOpacity: 0.046,
        canvasGridEmphasis: 0.90,
        homeCardFill: Color(nsColor: NSColor(red: 0.228, green: 0.198, blue: 0.182, alpha: 1)),
        homeCardFillTop: Color(nsColor: NSColor(red: 0.275, green: 0.238, blue: 0.218, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.11,
        homeCardBorderHover: 0.19,
        homeCardShadowOpacityNormal: 0.32,
        homeCardShadowOpacityHover: 0.46,
        homeCardShadowRadiusNormal: 12,
        homeCardShadowRadiusHover: 17,
        canvasTextBlockFill: Color(nsColor: NSColor(red: 0.232, green: 0.204, blue: 0.188, alpha: 1)),
        canvasTextBlockBorderOpacity: 0.17,
        canvasItemShadowNormal: 0.46,
        canvasItemShadowSelected: 0.6,
        canvasItemShadowRadiusNormal: 10,
        canvasItemShadowRadiusSelected: 15,
        canvasItemShadowYNormal: 3.25,
        canvasItemShadowYSelected: 4.75,
        chartCardFill: Color(nsColor: NSColor(red: 0.236, green: 0.208, blue: 0.192, alpha: 1)),
        chartCardBorderOpacity: 0.2,
        selectionStrokeColor: accentStrokeDark.opacity(0.94),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color(nsColor: NSColor(red: 0.168, green: 0.144, blue: 0.130, alpha: 0.6)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .thin,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.186, green: 0.162, blue: 0.148, alpha: 0.72))
    )

    // MARK: - Graphite

    private static let graphiteLight = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.942, green: 0.946, blue: 0.956, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.868, green: 0.876, blue: 0.892, alpha: 1)),
        gridLineOpacity: 0.056,
        canvasGridInk: Color.primary,
        canvasBottomDepthOpacity: 0.078,
        canvasTopWashOpacity: 0.022,
        canvasVignetteOpacity: 0.092,
        canvasGrainOpacity: 0.032,
        canvasGridEmphasis: 0.88,
        homeCardFill: Color(nsColor: NSColor(red: 0.994, green: 0.995, blue: 0.998, alpha: 1)),
        homeCardFillTop: Color(nsColor: NSColor(red: 1, green: 1, blue: 1, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.09,
        homeCardBorderHover: 0.15,
        homeCardShadowOpacityNormal: 0.056,
        homeCardShadowOpacityHover: 0.098,
        homeCardShadowRadiusNormal: 8,
        homeCardShadowRadiusHover: 13,
        canvasTextBlockFill: Color(nsColor: NSColor(red: 0.988, green: 0.990, blue: 0.996, alpha: 1)),
        canvasTextBlockBorderOpacity: 0.095,
        canvasItemShadowNormal: 0.068,
        canvasItemShadowSelected: 0.115,
        canvasItemShadowRadiusNormal: 7,
        canvasItemShadowRadiusSelected: 12,
        canvasItemShadowYNormal: 2.5,
        canvasItemShadowYSelected: 4,
        chartCardFill: Color(nsColor: NSColor(red: 0.986, green: 0.988, blue: 0.995, alpha: 1)),
        chartCardBorderOpacity: 0.102,
        selectionStrokeColor: accentStrokeLight.opacity(0.94),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color(nsColor: NSColor(red: 0.918, green: 0.924, blue: 0.938, alpha: 0.55)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .ultraThin,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.928, green: 0.934, blue: 0.946, alpha: 0.78))
    )

    private static let graphiteDark = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.12, green: 0.125, blue: 0.145, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.078, green: 0.084, blue: 0.102, alpha: 1)),
        gridLineOpacity: 0.082,
        canvasGridInk: Color.primary,
        canvasBottomDepthOpacity: 0.11,
        canvasTopWashOpacity: 0.015,
        canvasVignetteOpacity: 0.17,
        canvasGrainOpacity: 0.05,
        canvasGridEmphasis: 0.90,
        homeCardFill: Color(nsColor: NSColor(red: 0.185, green: 0.192, blue: 0.212, alpha: 1)),
        homeCardFillTop: Color(nsColor: NSColor(red: 0.228, green: 0.232, blue: 0.252, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.14,
        homeCardBorderHover: 0.22,
        homeCardShadowOpacityNormal: 0.4,
        homeCardShadowOpacityHover: 0.54,
        homeCardShadowRadiusNormal: 10,
        homeCardShadowRadiusHover: 14,
        canvasTextBlockFill: Color(nsColor: NSColor(red: 0.19, green: 0.198, blue: 0.218, alpha: 1)),
        canvasTextBlockBorderOpacity: 0.21,
        canvasItemShadowNormal: 0.48,
        canvasItemShadowSelected: 0.62,
        canvasItemShadowRadiusNormal: 9,
        canvasItemShadowRadiusSelected: 14,
        canvasItemShadowYNormal: 3,
        canvasItemShadowYSelected: 4.5,
        chartCardFill: Color(nsColor: NSColor(red: 0.20, green: 0.208, blue: 0.228, alpha: 1)),
        chartCardBorderOpacity: 0.23,
        selectionStrokeColor: accentStrokeDark.opacity(0.93),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color(nsColor: NSColor(red: 0.128, green: 0.136, blue: 0.158, alpha: 0.52)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .ultraThin,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.152, green: 0.162, blue: 0.182, alpha: 0.62))
    )

    // MARK: - Glass

    private static let glassLight = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.945, green: 0.948, blue: 0.958, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.878, green: 0.884, blue: 0.898, alpha: 1)),
        gridLineOpacity: 0.044,
        canvasGridInk: Color.primary,
        canvasBottomDepthOpacity: 0.062,
        canvasTopWashOpacity: 0.02,
        canvasVignetteOpacity: 0.076,
        canvasGrainOpacity: 0.028,
        canvasGridEmphasis: 0.82,
        homeCardFill: Color.white.opacity(0.22),
        homeCardFillTop: Color.white.opacity(0.38),
        homeCardMaterial: .regular,
        homeCardBorderNormal: 0.11,
        homeCardBorderHover: 0.18,
        homeCardShadowOpacityNormal: 0.072,
        homeCardShadowOpacityHover: 0.118,
        homeCardShadowRadiusNormal: 10,
        homeCardShadowRadiusHover: 15,
        canvasTextBlockFill: Color(nsColor: NSColor.white.withAlphaComponent(0.82)),
        canvasTextBlockBorderOpacity: 0.115,
        canvasItemShadowNormal: 0.078,
        canvasItemShadowSelected: 0.135,
        canvasItemShadowRadiusNormal: 10,
        canvasItemShadowRadiusSelected: 15,
        canvasItemShadowYNormal: 3,
        canvasItemShadowYSelected: 5,
        chartCardFill: Color(nsColor: NSColor.white.withAlphaComponent(0.86)),
        chartCardBorderOpacity: 0.132,
        selectionStrokeColor: accentStrokeLight.opacity(0.94),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color(nsColor: NSColor.white.withAlphaComponent(0.14)),
        sidebarFooterUseSystemBar: false,
        sidebarFooterMaterial: .thin,
        toolbarMaterial: .regular,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color.white.opacity(0.22)
    )

    private static let glassDark = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.10, green: 0.108, blue: 0.128, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.062, green: 0.072, blue: 0.092, alpha: 1)),
        gridLineOpacity: 0.078,
        canvasGridInk: Color.primary,
        canvasBottomDepthOpacity: 0.098,
        canvasTopWashOpacity: 0.013,
        canvasVignetteOpacity: 0.15,
        canvasGrainOpacity: 0.042,
        canvasGridEmphasis: 0.86,
        homeCardFill: Color.white.opacity(0.07),
        homeCardFillTop: Color.white.opacity(0.118),
        homeCardMaterial: .regular,
        homeCardBorderNormal: 0.18,
        homeCardBorderHover: 0.27,
        homeCardShadowOpacityNormal: 0.44,
        homeCardShadowOpacityHover: 0.58,
        homeCardShadowRadiusNormal: 12,
        homeCardShadowRadiusHover: 17,
        canvasTextBlockFill: Color(nsColor: NSColor.white.withAlphaComponent(0.125)),
        canvasTextBlockBorderOpacity: 0.22,
        canvasItemShadowNormal: 0.5,
        canvasItemShadowSelected: 0.66,
        canvasItemShadowRadiusNormal: 11,
        canvasItemShadowRadiusSelected: 16,
        canvasItemShadowYNormal: 4,
        canvasItemShadowYSelected: 6,
        chartCardFill: Color(nsColor: NSColor.white.withAlphaComponent(0.14)),
        chartCardBorderOpacity: 0.24,
        selectionStrokeColor: accentStrokeDark.opacity(0.94),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color.white.opacity(0.065),
        sidebarFooterUseSystemBar: false,
        sidebarFooterMaterial: .thin,
        toolbarMaterial: .regular,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color.white.opacity(0.095)
    )

    // MARK: - Solid

    private static let solidLight = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.972, green: 0.972, blue: 0.978, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.908, green: 0.910, blue: 0.920, alpha: 1)),
        gridLineOpacity: 0.064,
        canvasGridInk: Color.primary,
        canvasBottomDepthOpacity: 0.085,
        canvasTopWashOpacity: 0.02,
        canvasVignetteOpacity: 0.088,
        canvasGrainOpacity: 0.026,
        canvasGridEmphasis: 0.87,
        homeCardFill: Color(nsColor: NSColor(red: 0.998, green: 0.998, blue: 1.0, alpha: 1)),
        homeCardFillTop: Color(nsColor: NSColor(red: 1, green: 1, blue: 1, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.108,
        homeCardBorderHover: 0.178,
        homeCardShadowOpacityNormal: 0.045,
        homeCardShadowOpacityHover: 0.082,
        homeCardShadowRadiusNormal: 6,
        homeCardShadowRadiusHover: 10,
        canvasTextBlockFill: Color(nsColor: NSColor(red: 0.992, green: 0.993, blue: 0.998, alpha: 1)),
        canvasTextBlockBorderOpacity: 0.11,
        canvasItemShadowNormal: 0.055,
        canvasItemShadowSelected: 0.098,
        canvasItemShadowRadiusNormal: 7,
        canvasItemShadowRadiusSelected: 11,
        canvasItemShadowYNormal: 1.75,
        canvasItemShadowYSelected: 2.75,
        chartCardFill: Color(nsColor: NSColor(red: 0.990, green: 0.991, blue: 0.997, alpha: 1)),
        chartCardBorderOpacity: 0.118,
        selectionStrokeColor: accentStrokeLight.opacity(0.92),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color(nsColor: NSColor(red: 0.948, green: 0.948, blue: 0.956, alpha: 0.62)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .none,
        toolbarFlatBackground: Color(nsColor: NSColor.windowBackgroundColor),
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.958, green: 0.958, blue: 0.966, alpha: 0.97))
    )

    private static let solidDark = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.138, green: 0.136, blue: 0.142, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.088, green: 0.088, blue: 0.092, alpha: 1)),
        gridLineOpacity: 0.098,
        canvasGridInk: Color.primary,
        canvasBottomDepthOpacity: 0.112,
        canvasTopWashOpacity: 0.014,
        canvasVignetteOpacity: 0.175,
        canvasGrainOpacity: 0.052,
        canvasGridEmphasis: 0.90,
        homeCardFill: Color(nsColor: NSColor(red: 0.195, green: 0.193, blue: 0.198, alpha: 1)),
        homeCardFillTop: Color(nsColor: NSColor(red: 0.232, green: 0.228, blue: 0.236, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.2,
        homeCardBorderHover: 0.3,
        homeCardShadowOpacityNormal: 0.48,
        homeCardShadowOpacityHover: 0.62,
        homeCardShadowRadiusNormal: 6,
        homeCardShadowRadiusHover: 10,
        canvasTextBlockFill: Color(nsColor: NSColor(red: 0.218, green: 0.216, blue: 0.222, alpha: 1)),
        canvasTextBlockBorderOpacity: 0.25,
        canvasItemShadowNormal: 0.48,
        canvasItemShadowSelected: 0.62,
        canvasItemShadowRadiusNormal: 7,
        canvasItemShadowRadiusSelected: 11,
        canvasItemShadowYNormal: 2.5,
        canvasItemShadowYSelected: 3.5,
        chartCardFill: Color(nsColor: NSColor(red: 0.208, green: 0.206, blue: 0.212, alpha: 1)),
        chartCardBorderOpacity: 0.28,
        selectionStrokeColor: accentStrokeDark.opacity(0.93),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color(nsColor: NSColor(red: 0.158, green: 0.156, blue: 0.162, alpha: 0.66)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .none,
        toolbarFlatBackground: Color(nsColor: NSColor(red: 0.15, green: 0.15, blue: 0.15, alpha: 1)),
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.172, green: 0.170, blue: 0.176, alpha: 0.94))
    )
}
