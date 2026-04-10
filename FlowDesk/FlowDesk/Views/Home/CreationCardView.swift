import SwiftUI

/// Tappable creation tile for the home screen (icon, title, one-line blurb, hover polish).
struct CreationCardView: View {
    enum Prominence {
        /// Full-width hero (default smart canvas path).
        case hero
        /// Smaller secondary choice (e.g. blank board).
        case standard
    }

    let systemImage: String
    let title: String
    let subtitle: String
    let action: () -> Void
    var prominence: Prominence = .standard

    @Environment(\.flowDeskTokens) private var tokens
    @Environment(\.colorScheme) private var colorScheme

    @State private var isHovered = false

    private var iconPointSize: CGFloat {
        prominence == .hero ? FlowDeskTypography.heroCardIconPointSize : FlowDeskTypography.cardIconPointSize
    }

    private var titleFont: Font {
        prominence == .hero ? FlowDeskTypography.heroCardTitle : FlowDeskTypography.cardTitle
    }

    private var minHeight: CGFloat {
        prominence == .hero ? FlowDeskLayout.homeCreationCardHeroMinHeight : FlowDeskLayout.homeCreationCardMinHeight
    }

    private var iconWellSide: CGFloat {
        prominence == .hero ? 54 : 48
    }

    private var iconWellCorner: CGFloat {
        prominence == .hero
            ? FlowDeskLayout.homeIconWellCornerHero
            : FlowDeskLayout.homeIconWellCornerStandard
    }

    private var hoverScale: CGFloat {
        prominence == .hero ? 1.034 : 1.026
    }

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: FlowDeskLayout.homeCreationCardInnerSpacing) {
                ZStack {
                    RoundedRectangle(cornerRadius: iconWellCorner, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [
                                    tokens.selectionStrokeColor.opacity(isHovered ? 0.24 : 0.15),
                                    tokens.selectionStrokeColor.opacity(isHovered ? 0.09 : 0.055)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .overlay {
                            RoundedRectangle(cornerRadius: iconWellCorner, style: .continuous)
                                .strokeBorder(
                                    LinearGradient(
                                        colors: [
                                            Color.white.opacity(colorScheme == .dark ? 0.14 : 0.38),
                                            Color.clear
                                        ],
                                        startPoint: .topLeading,
                                        endPoint: UnitPoint(x: 0.65, y: 0.65)
                                    ),
                                    lineWidth: 1
                                )
                        }

                    Image(systemName: systemImage)
                        .font(.system(size: iconPointSize, weight: .semibold))
                        .symbolRenderingMode(.hierarchical)
                        .foregroundStyle(.primary)
                        .scaleEffect(isHovered ? 1.07 : 1)
                        .animation(.spring(response: 0.32, dampingFraction: 0.78), value: isHovered)
                }
                .frame(width: iconWellSide, height: iconWellSide)
                .clipped()
                .contentShape(Rectangle())
                .frame(maxWidth: .infinity, alignment: .leading)

                VStack(alignment: .leading, spacing: FlowDeskLayout.homeCreationCardTitleSubtitleSpacing) {
                    Text(title)
                        .font(titleFont)
                        .foregroundStyle(.primary)
                        .multilineTextAlignment(.leading)
                        .lineLimit(prominence == .hero ? 3 : 2)
                        .truncationMode(.tail)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(subtitle)
                        .font(FlowDeskTypography.cardSubtitle)
                        .foregroundStyle(.tertiary)
                        .multilineTextAlignment(.leading)
                        .lineSpacing(3)
                        .lineLimit(prominence == .hero ? 6 : 4)
                        .truncationMode(.tail)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .frame(minWidth: 0, maxWidth: .infinity, alignment: .leading)
            }
            .frame(maxWidth: .infinity, minHeight: minHeight, alignment: .topLeading)
            .cardContainer(isHovered: $isHovered, scaleOnHover: hoverScale)
        }
        .buttonStyle(FlowDeskHomeCardButtonStyle())
        .onHover { isHovered = $0 }
        .contentShape(RoundedRectangle(cornerRadius: FlowDeskLayout.cardCornerRadius, style: .continuous))
        .accessibilityLabel("\(title). \(subtitle)")
    }
}
