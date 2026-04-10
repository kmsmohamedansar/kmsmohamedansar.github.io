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
        if let material = homeCardMaterial.material {
            ZStack {
                shape.fill(homeCardFill)
                shape.fill(.clear).background(material, in: shape)
            }
        } else {
            shape.fill(homeCardFill)
        }
    }
}

// MARK: - Unified home / dashboard card container (ZStack: background → clipped content → overlays)

/// Rounded card shell: background + shadows on a dedicated layer, padded content clipped to the same radius, hairline + border overlays on top.
private struct FlowDeskCardContainerModifier: ViewModifier {
    @Environment(\.flowDeskTokens) private var tokens

    var cornerRadius: CGFloat
    @Binding var isHovered: Bool
    var scaleOnHover: CGFloat
    var contentInsets: EdgeInsets
    var contentAlignment: Alignment
    /// When true, content uses `maxHeight: .infinity` so vertical alignment (e.g. `.center`) can apply in tight rows.
    var contentFillsHeight: Bool

    func body(content: Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)

        ZStack(alignment: .topLeading) {
            tokens.homeCardFillBackground(cornerRadius: cornerRadius)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .allowsHitTesting(false)
                .clipShape(shape)
                .shadow(
                    color: Color.black.opacity(
                        isHovered ? tokens.homeCardShadowOpacityHover : tokens.homeCardShadowOpacityNormal
                    ),
                    radius: isHovered ? tokens.homeCardShadowRadiusHover : tokens.homeCardShadowRadiusNormal,
                    x: 0,
                    y: isHovered ? FlowDeskLayout.cardShadowYHover : FlowDeskLayout.cardShadowYNormal
                )

            Group {
                if contentFillsHeight {
                    content
                        .padding(contentInsets)
                        .frame(minWidth: 0, maxWidth: .infinity, maxHeight: .infinity, alignment: contentAlignment)
                } else {
                    content
                        .padding(contentInsets)
                        .frame(minWidth: 0, maxWidth: .infinity, alignment: contentAlignment)
                }
            }
            .clipped()
            .clipShape(shape)
            .contentShape(shape)
        }
        .overlay {
            shape
                .strokeBorder(
                    isHovered
                        ? tokens.selectionStrokeColor.opacity(0.5)
                        : Color.primary.opacity(tokens.homeCardBorderNormal),
                    lineWidth: isHovered
                        ? FlowDeskLayout.cardBorderLineWidthHover
                        : FlowDeskLayout.cardBorderLineWidth
                )
                .allowsHitTesting(false)
        }
        .scaleEffect(isHovered ? scaleOnHover : 1)
        .animation(.spring(response: 0.30, dampingFraction: 0.82), value: isHovered)
    }
}

extension View {
    /// Home / dashboard cards: background (solid fill + one shadow) → clipped content → stroke only. Corner radius defaults to `FlowDeskLayout.cardCornerRadius`.
    func cardContainer(
        cornerRadius: CGFloat = FlowDeskLayout.cardCornerRadius,
        isHovered: Binding<Bool>,
        scaleOnHover: CGFloat = 1.0,
        contentInsets: EdgeInsets = FlowDeskLayout.homeCardContentInsets,
        contentAlignment: Alignment = .topLeading,
        contentFillsHeight: Bool = false
    ) -> some View {
        modifier(FlowDeskCardContainerModifier(
            cornerRadius: cornerRadius,
            isHovered: isHovered,
            scaleOnHover: scaleOnHover,
            contentInsets: contentInsets,
            contentAlignment: contentAlignment,
            contentFillsHeight: contentFillsHeight
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
            .lineLimit(1)
            .truncationMode(.tail)
            .padding(.horizontal, FlowDeskLayout.spaceS)
            .padding(.vertical, FlowDeskLayout.spaceXS)
            .background(
                Capsule(style: .continuous)
                    .fill(Color.primary.opacity(FlowDeskLayout.chipBackgroundOpacity))
            )
            .frame(maxWidth: 200, alignment: .leading)
            .clipped()
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
