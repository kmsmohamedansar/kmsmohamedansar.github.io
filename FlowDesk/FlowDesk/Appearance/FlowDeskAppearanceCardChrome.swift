import SwiftUI

extension View {
    /// Applies toolbar material or flat fill from the active appearance preset.
    @ViewBuilder
    func flowDeskToolbarChrome(_ tokens: FlowDeskAppearanceTokens) -> some View {
        if let flat = tokens.toolbarFlatBackground {
            toolbarBackground(flat, for: .windowToolbar)
        } else if let material = tokens.toolbarMaterial.material {
            toolbarBackground(material, for: .windowToolbar)
        } else {
            self
        }
    }

    @ViewBuilder
    func flowDeskSidebarFooterBackground(_ tokens: FlowDeskAppearanceTokens) -> some View {
        if tokens.sidebarFooterUseSystemBar {
            background(.bar)
        } else if let material = tokens.sidebarFooterMaterial.material {
            background(material)
        } else {
            background(.bar)
        }
    }
}

extension FlowDeskAppearanceTokens {
    /// Fills a rounded rect for home-style cards (subtle surface gradient + optional material per preset).
    @ViewBuilder
    func homeCardFillBackground(cornerRadius: CGFloat) -> some View {
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
        let surface = LinearGradient(
            colors: [homeCardFillTop, homeCardFill],
            startPoint: UnitPoint(x: 0.12, y: 0),
            endPoint: UnitPoint(x: 0.88, y: 1)
        )
        if let material = homeCardMaterial.material {
            ZStack {
                shape.fill(surface)
                shape.fill(.clear).background(material, in: shape)
            }
        } else {
            shape.fill(surface)
        }
    }
}

// MARK: - Unified home / dashboard card chrome

struct FlowDeskCardChromeModifier: ViewModifier {
    @Environment(\.flowDeskTokens) private var tokens
    @Environment(\.colorScheme) private var colorScheme

    let cornerRadius: CGFloat
    @Binding var isHovered: Bool
    var scaleOnHover: CGFloat = 1.0

    func body(content: Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
        content
            .background {
                tokens.homeCardFillBackground(cornerRadius: cornerRadius)
                    // Tight “contact” shadow + soft ambient (Linear-style lift without harsh edges).
                    .shadow(color: Color.black.opacity(isHovered ? 0.11 : 0.065), radius: 1.5, x: 0, y: 1)
                    .shadow(
                        color: Color.black.opacity(
                            isHovered ? tokens.homeCardShadowOpacityHover : tokens.homeCardShadowOpacityNormal
                        ),
                        radius: isHovered ? tokens.homeCardShadowRadiusHover : tokens.homeCardShadowRadiusNormal,
                        x: 0,
                        y: isHovered ? FlowDeskLayout.cardShadowYHover : FlowDeskLayout.cardShadowYNormal
                    )
            }
            .overlay {
                shape
                    .fill(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(colorScheme == .dark ? (isHovered ? 0.11 : 0.07) : (isHovered ? 0.22 : 0.14)),
                                Color.clear
                            ],
                            startPoint: .top,
                            endPoint: UnitPoint(x: 0.5, y: 0.42)
                        )
                    )
                    .allowsHitTesting(false)
            }
            .overlay {
                shape
                    .strokeBorder(
                        isHovered
                            ? tokens.selectionStrokeColor.opacity(0.48)
                            : Color.primary.opacity(tokens.homeCardBorderNormal),
                        lineWidth: isHovered
                            ? FlowDeskLayout.cardBorderLineWidthHover
                            : FlowDeskLayout.cardBorderLineWidth
                    )
            }
            .scaleEffect(isHovered ? scaleOnHover : 1)
            .animation(.spring(response: 0.30, dampingFraction: 0.82), value: isHovered)
    }
}

extension View {
    func flowDeskCardChrome(
        cornerRadius: CGFloat = FlowDeskLayout.cardCornerRadius,
        isHovered: Binding<Bool>,
        scaleOnHover: CGFloat = 1.0
    ) -> some View {
        modifier(FlowDeskCardChromeModifier(
            cornerRadius: cornerRadius,
            isHovered: isHovered,
            scaleOnHover: scaleOnHover
        ))
    }
}

/// Reusable template / metadata capsule (home cards).
struct FlowDeskTemplateChip: View {
    let label: String

    var body: some View {
        Text(label)
            .font(.caption.weight(.semibold))
            .foregroundStyle(.secondary)
            .padding(.horizontal, FlowDeskLayout.spaceS)
            .padding(.vertical, FlowDeskLayout.spaceXS)
            .background(
                Capsule(style: .continuous)
                    .fill(Color.primary.opacity(FlowDeskLayout.chipBackgroundOpacity))
            )
    }
}

// MARK: - Floating canvas chrome (palette, toolbars, HUD, tips)

/// Shadow tier for one family of lifted surfaces (see `flowDeskFloatingPanelChrome`).
enum FlowDeskFloatingChromeShadowStyle {
    case toolPalette
    case contextualToolbar
    case compactHUD

    fileprivate var shadowFactors: (opacity: CGFloat, radius: CGFloat, y: CGFloat) {
        switch self {
        case .toolPalette:
            return (1, 1, 1)
        case .contextualToolbar:
            return (0.92, 0.68, 0.62)
        case .compactHUD:
            return (0.88, 0.74, 0.58)
        }
    }
}

private struct FlowDeskFloatingPanelChromeModifier: ViewModifier {
    @Environment(\.flowDeskTokens) private var tokens
    @Environment(\.colorScheme) private var colorScheme

    var cornerRadius: CGFloat
    var shadowStyle: FlowDeskFloatingChromeShadowStyle
    var lightOpacity: Double
    var darkOpacity: Double

    func body(content: Content) -> some View {
        let f = shadowStyle.shadowFactors
        content
            .background {
                FlowDeskTheme.floatingPanelStackedFill(
                    tokens: tokens,
                    colorScheme: colorScheme,
                    cornerRadius: cornerRadius,
                    lightOpacity: lightOpacity,
                    darkOpacity: darkOpacity
                )
                .shadow(
                    color: Color.black.opacity(FlowDeskTheme.floatingPanelShadowOpacity * Double(f.opacity)),
                    radius: FlowDeskTheme.floatingPanelShadowRadius * f.radius,
                    x: 0,
                    y: FlowDeskTheme.floatingPanelShadowY * f.y
                )
            }
            .overlay {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(
                        FlowDeskTheme.chromeHairlineBorderGradient,
                        lineWidth: FlowDeskLayout.chromeHairlineBorderWidth
                    )
            }
    }
}

extension View {
    func flowDeskFloatingPanelChrome(
        cornerRadius: CGFloat = FlowDeskLayout.floatingPanelCornerRadius,
        shadowStyle: FlowDeskFloatingChromeShadowStyle,
        lightTintOpacity: Double = 0.11,
        darkTintOpacity: Double = 0.08
    ) -> some View {
        modifier(FlowDeskFloatingPanelChromeModifier(
            cornerRadius: cornerRadius,
            shadowStyle: shadowStyle,
            lightOpacity: lightTintOpacity,
            darkOpacity: darkTintOpacity
        ))
    }
}
