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
        workspaceBackground: Color(nsColor: NSColor(red: 0.996, green: 0.992, blue: 0.984, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.798, green: 0.778, blue: 0.748, alpha: 1)),
        gridLineOpacity: 0.05,
        canvasGridInk: Color(nsColor: NSColor(red: 0.36, green: 0.30, blue: 0.25, alpha: 1)),
        canvasBottomDepthOpacity: 0.046,
        canvasTopWashOpacity: 0.017,
        canvasVignetteOpacity: 0.064,
        canvasGrainOpacity: 0.02,
        canvasGridEmphasis: 0.86,
        homeCardFill: Color(nsColor: NSColor(red: 1, green: 0.998, blue: 0.992, alpha: 1)),
        homeCardFillTop: Color(nsColor: NSColor(red: 1, green: 0.998, blue: 0.992, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.14,
        homeCardBorderHover: 0.2,
        homeCardShadowOpacityNormal: 0.05,
        homeCardShadowOpacityHover: 0.078,
        homeCardShadowRadiusNormal: 6,
        homeCardShadowRadiusHover: 9,
        canvasTextBlockFill: Color(nsColor: NSColor(red: 1, green: 0.996, blue: 0.988, alpha: 1)),
        canvasTextBlockBorderOpacity: 0.12,
        canvasItemShadowNormal: 0.065,
        canvasItemShadowSelected: 0.11,
        canvasItemShadowRadiusNormal: 7,
        canvasItemShadowRadiusSelected: 10,
        canvasItemShadowYNormal: 2.5,
        canvasItemShadowYSelected: 3.5,
        chartCardFill: Color(nsColor: NSColor(red: 1, green: 0.996, blue: 0.988, alpha: 1)),
        chartCardBorderOpacity: 0.12,
        selectionStrokeColor: accentStrokeLight.opacity(0.94),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color(nsColor: NSColor(red: 0.948, green: 0.938, blue: 0.915, alpha: 0.96)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .thin,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.992, green: 0.984, blue: 0.972, alpha: 0.98))
    )

    private static let warmPaperDark = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.118, green: 0.102, blue: 0.092, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.048, green: 0.042, blue: 0.038, alpha: 1)),
        gridLineOpacity: 0.082,
        canvasGridInk: Color(nsColor: NSColor(red: 0.58, green: 0.53, blue: 0.49, alpha: 1)),
        canvasBottomDepthOpacity: 0.059,
        canvasTopWashOpacity: 0.01,
        canvasVignetteOpacity: 0.094,
        canvasGrainOpacity: 0.026,
        canvasGridEmphasis: 0.88,
        homeCardFill: Color(nsColor: NSColor(red: 0.27, green: 0.232, blue: 0.212, alpha: 1)),
        homeCardFillTop: Color(nsColor: NSColor(red: 0.27, green: 0.232, blue: 0.212, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.22,
        homeCardBorderHover: 0.32,
        homeCardShadowOpacityNormal: 0.32,
        homeCardShadowOpacityHover: 0.44,
        homeCardShadowRadiusNormal: 8,
        homeCardShadowRadiusHover: 11,
        canvasTextBlockFill: Color(nsColor: NSColor(red: 0.26, green: 0.228, blue: 0.208, alpha: 1)),
        canvasTextBlockBorderOpacity: 0.22,
        canvasItemShadowNormal: 0.42,
        canvasItemShadowSelected: 0.56,
        canvasItemShadowRadiusNormal: 8,
        canvasItemShadowRadiusSelected: 12,
        canvasItemShadowYNormal: 2.75,
        canvasItemShadowYSelected: 4,
        chartCardFill: Color(nsColor: NSColor(red: 0.262, green: 0.23, blue: 0.21, alpha: 1)),
        chartCardBorderOpacity: 0.24,
        selectionStrokeColor: accentStrokeDark.opacity(0.94),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color(nsColor: NSColor(red: 0.152, green: 0.128, blue: 0.114, alpha: 0.94)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .thin,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.21, green: 0.182, blue: 0.165, alpha: 0.92))
    )

    // MARK: - Graphite

    private static let graphiteLight = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.972, green: 0.976, blue: 0.984, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.785, green: 0.792, blue: 0.808, alpha: 1)),
        gridLineOpacity: 0.065,
        canvasGridInk: Color.primary,
        canvasBottomDepthOpacity: 0.045,
        canvasTopWashOpacity: 0.013,
        canvasVignetteOpacity: 0.054,
        canvasGrainOpacity: 0.018,
        canvasGridEmphasis: 0.86,
        homeCardFill: Color(nsColor: NSColor(red: 0.998, green: 0.999, blue: 1, alpha: 1)),
        homeCardFillTop: Color(nsColor: NSColor(red: 0.998, green: 0.999, blue: 1, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.15,
        homeCardBorderHover: 0.22,
        homeCardShadowOpacityNormal: 0.055,
        homeCardShadowOpacityHover: 0.085,
        homeCardShadowRadiusNormal: 6,
        homeCardShadowRadiusHover: 9,
        canvasTextBlockFill: Color(nsColor: NSColor(red: 0.994, green: 0.996, blue: 1, alpha: 1)),
        canvasTextBlockBorderOpacity: 0.125,
        canvasItemShadowNormal: 0.065,
        canvasItemShadowSelected: 0.11,
        canvasItemShadowRadiusNormal: 7,
        canvasItemShadowRadiusSelected: 10,
        canvasItemShadowYNormal: 2.5,
        canvasItemShadowYSelected: 3.5,
        chartCardFill: Color(nsColor: NSColor(red: 0.992, green: 0.994, blue: 1, alpha: 1)),
        chartCardBorderOpacity: 0.125,
        selectionStrokeColor: accentStrokeLight.opacity(0.94),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color(nsColor: NSColor(red: 0.898, green: 0.905, blue: 0.922, alpha: 0.94)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .ultraThin,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.948, green: 0.952, blue: 0.962, alpha: 0.96))
    )

    private static let graphiteDark = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.098, green: 0.104, blue: 0.124, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.048, green: 0.054, blue: 0.072, alpha: 1)),
        gridLineOpacity: 0.092,
        canvasGridInk: Color.primary,
        canvasBottomDepthOpacity: 0.061,
        canvasTopWashOpacity: 0.009,
        canvasVignetteOpacity: 0.092,
        canvasGrainOpacity: 0.028,
        canvasGridEmphasis: 0.88,
        homeCardFill: Color(nsColor: NSColor(red: 0.22, green: 0.226, blue: 0.246, alpha: 1)),
        homeCardFillTop: Color(nsColor: NSColor(red: 0.22, green: 0.226, blue: 0.246, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.24,
        homeCardBorderHover: 0.34,
        homeCardShadowOpacityNormal: 0.36,
        homeCardShadowOpacityHover: 0.48,
        homeCardShadowRadiusNormal: 8,
        homeCardShadowRadiusHover: 11,
        canvasTextBlockFill: Color(nsColor: NSColor(red: 0.214, green: 0.222, blue: 0.242, alpha: 1)),
        canvasTextBlockBorderOpacity: 0.26,
        canvasItemShadowNormal: 0.44,
        canvasItemShadowSelected: 0.58,
        canvasItemShadowRadiusNormal: 8,
        canvasItemShadowRadiusSelected: 12,
        canvasItemShadowYNormal: 2.75,
        canvasItemShadowYSelected: 4,
        chartCardFill: Color(nsColor: NSColor(red: 0.218, green: 0.226, blue: 0.246, alpha: 1)),
        chartCardBorderOpacity: 0.27,
        selectionStrokeColor: accentStrokeDark.opacity(0.93),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color(nsColor: NSColor(red: 0.118, green: 0.126, blue: 0.148, alpha: 0.92)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .ultraThin,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.175, green: 0.184, blue: 0.204, alpha: 0.88))
    )

    // MARK: - Glass

    private static let glassLight = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.965, green: 0.968, blue: 0.978, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.805, green: 0.812, blue: 0.828, alpha: 1)),
        gridLineOpacity: 0.055,
        canvasGridInk: Color.primary,
        canvasBottomDepthOpacity: 0.038,
        canvasTopWashOpacity: 0.012,
        canvasVignetteOpacity: 0.046,
        canvasGrainOpacity: 0.016,
        canvasGridEmphasis: 0.84,
        homeCardFill: Color.white.opacity(0.34),
        homeCardFillTop: Color.white.opacity(0.34),
        homeCardMaterial: .regular,
        homeCardBorderNormal: 0.16,
        homeCardBorderHover: 0.24,
        homeCardShadowOpacityNormal: 0.06,
        homeCardShadowOpacityHover: 0.092,
        homeCardShadowRadiusNormal: 6,
        homeCardShadowRadiusHover: 9,
        canvasTextBlockFill: Color(nsColor: NSColor.white.withAlphaComponent(0.88)),
        canvasTextBlockBorderOpacity: 0.14,
        canvasItemShadowNormal: 0.07,
        canvasItemShadowSelected: 0.12,
        canvasItemShadowRadiusNormal: 7,
        canvasItemShadowRadiusSelected: 10,
        canvasItemShadowYNormal: 2.5,
        canvasItemShadowYSelected: 3.75,
        chartCardFill: Color(nsColor: NSColor.white.withAlphaComponent(0.9)),
        chartCardBorderOpacity: 0.15,
        selectionStrokeColor: accentStrokeLight.opacity(0.94),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color(nsColor: NSColor.white.withAlphaComponent(0.28)),
        sidebarFooterUseSystemBar: false,
        sidebarFooterMaterial: .thin,
        toolbarMaterial: .regular,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color.white.opacity(0.32)
    )

    private static let glassDark = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.082, green: 0.09, blue: 0.112, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.038, green: 0.046, blue: 0.064, alpha: 1)),
        gridLineOpacity: 0.09,
        canvasGridInk: Color.primary,
        canvasBottomDepthOpacity: 0.056,
        canvasTopWashOpacity: 0.008,
        canvasVignetteOpacity: 0.084,
        canvasGrainOpacity: 0.024,
        canvasGridEmphasis: 0.86,
        homeCardFill: Color.white.opacity(0.11),
        homeCardFillTop: Color.white.opacity(0.11),
        homeCardMaterial: .regular,
        homeCardBorderNormal: 0.26,
        homeCardBorderHover: 0.36,
        homeCardShadowOpacityNormal: 0.38,
        homeCardShadowOpacityHover: 0.5,
        homeCardShadowRadiusNormal: 8,
        homeCardShadowRadiusHover: 11,
        canvasTextBlockFill: Color(nsColor: NSColor.white.withAlphaComponent(0.14)),
        canvasTextBlockBorderOpacity: 0.26,
        canvasItemShadowNormal: 0.45,
        canvasItemShadowSelected: 0.6,
        canvasItemShadowRadiusNormal: 8,
        canvasItemShadowRadiusSelected: 12,
        canvasItemShadowYNormal: 3,
        canvasItemShadowYSelected: 4.5,
        chartCardFill: Color(nsColor: NSColor.white.withAlphaComponent(0.16)),
        chartCardBorderOpacity: 0.28,
        selectionStrokeColor: accentStrokeDark.opacity(0.94),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color.white.opacity(0.12),
        sidebarFooterUseSystemBar: false,
        sidebarFooterMaterial: .thin,
        toolbarMaterial: .regular,
        toolbarFlatBackground: nil,
        inspectorChromeBackground: Color.white.opacity(0.14)
    )

    // MARK: - Solid

    private static let solidLight = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.988, green: 0.988, blue: 0.992, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.858, green: 0.862, blue: 0.875, alpha: 1)),
        gridLineOpacity: 0.075,
        canvasGridInk: Color.primary,
        canvasBottomDepthOpacity: 0.048,
        canvasTopWashOpacity: 0.011,
        canvasVignetteOpacity: 0.049,
        canvasGrainOpacity: 0.015,
        canvasGridEmphasis: 0.86,
        homeCardFill: Color(nsColor: NSColor(red: 1, green: 1, blue: 1, alpha: 1)),
        homeCardFillTop: Color(nsColor: NSColor(red: 1, green: 1, blue: 1, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.16,
        homeCardBorderHover: 0.24,
        homeCardShadowOpacityNormal: 0.048,
        homeCardShadowOpacityHover: 0.075,
        homeCardShadowRadiusNormal: 6,
        homeCardShadowRadiusHover: 9,
        canvasTextBlockFill: Color(nsColor: NSColor(red: 0.996, green: 0.997, blue: 1, alpha: 1)),
        canvasTextBlockBorderOpacity: 0.135,
        canvasItemShadowNormal: 0.06,
        canvasItemShadowSelected: 0.1,
        canvasItemShadowRadiusNormal: 7,
        canvasItemShadowRadiusSelected: 10,
        canvasItemShadowYNormal: 2.25,
        canvasItemShadowYSelected: 3.25,
        chartCardFill: Color(nsColor: NSColor(red: 0.994, green: 0.995, blue: 1, alpha: 1)),
        chartCardBorderOpacity: 0.135,
        selectionStrokeColor: accentStrokeLight.opacity(0.92),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color(nsColor: NSColor(red: 0.918, green: 0.918, blue: 0.93, alpha: 0.94)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .none,
        toolbarFlatBackground: Color(nsColor: NSColor.windowBackgroundColor),
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.972, green: 0.972, blue: 0.98, alpha: 0.98))
    )

    private static let solidDark = FlowDeskAppearanceTokens(
        workspaceBackground: Color(nsColor: NSColor(red: 0.112, green: 0.11, blue: 0.116, alpha: 1)),
        canvasWorkspaceBackground: Color(nsColor: NSColor(red: 0.055, green: 0.055, blue: 0.06, alpha: 1)),
        gridLineOpacity: 0.108,
        canvasGridInk: Color.primary,
        canvasBottomDepthOpacity: 0.062,
        canvasTopWashOpacity: 0.008,
        canvasVignetteOpacity: 0.096,
        canvasGrainOpacity: 0.028,
        canvasGridEmphasis: 0.88,
        homeCardFill: Color(nsColor: NSColor(red: 0.232, green: 0.23, blue: 0.236, alpha: 1)),
        homeCardFillTop: Color(nsColor: NSColor(red: 0.232, green: 0.23, blue: 0.236, alpha: 1)),
        homeCardMaterial: .none,
        homeCardBorderNormal: 0.28,
        homeCardBorderHover: 0.38,
        homeCardShadowOpacityNormal: 0.4,
        homeCardShadowOpacityHover: 0.52,
        homeCardShadowRadiusNormal: 8,
        homeCardShadowRadiusHover: 11,
        canvasTextBlockFill: Color(nsColor: NSColor(red: 0.228, green: 0.226, blue: 0.232, alpha: 1)),
        canvasTextBlockBorderOpacity: 0.28,
        canvasItemShadowNormal: 0.45,
        canvasItemShadowSelected: 0.58,
        canvasItemShadowRadiusNormal: 7,
        canvasItemShadowRadiusSelected: 10,
        canvasItemShadowYNormal: 2.5,
        canvasItemShadowYSelected: 3.5,
        chartCardFill: Color(nsColor: NSColor(red: 0.224, green: 0.222, blue: 0.228, alpha: 1)),
        chartCardBorderOpacity: 0.3,
        selectionStrokeColor: accentStrokeDark.opacity(0.93),
        selectionStrokeWidth: 1.25,
        sidebarListTint: Color(nsColor: NSColor(red: 0.148, green: 0.146, blue: 0.152, alpha: 0.92)),
        sidebarFooterUseSystemBar: true,
        sidebarFooterMaterial: .none,
        toolbarMaterial: .none,
        toolbarFlatBackground: Color(nsColor: NSColor(red: 0.15, green: 0.15, blue: 0.15, alpha: 1)),
        inspectorChromeBackground: Color(nsColor: NSColor(red: 0.192, green: 0.19, blue: 0.196, alpha: 0.94))
    )
}
