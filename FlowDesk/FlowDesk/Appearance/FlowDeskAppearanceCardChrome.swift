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
    /// Fills a rounded rect for home-style cards (solid and/or material per preset).
    @ViewBuilder
    func homeCardFillBackground(cornerRadius: CGFloat) -> some View {
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
        if let material = homeCardMaterial.material {
            shape
                .fill(.clear)
                .background(material, in: shape)
        } else {
            shape.fill(homeCardFill)
        }
    }
}

// MARK: - Unified home / dashboard card chrome

struct FlowDeskCardChromeModifier: ViewModifier {
    @Environment(\.flowDeskTokens) private var tokens

    let cornerRadius: CGFloat
    @Binding var isHovered: Bool
    var scaleOnHover: CGFloat = 1.0

    func body(content: Content) -> some View {
        content
            .background {
                tokens.homeCardFillBackground(cornerRadius: cornerRadius)
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
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
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
            .animation(.spring(response: 0.34, dampingFraction: 0.86), value: isHovered)
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
