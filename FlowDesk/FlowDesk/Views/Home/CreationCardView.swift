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

    private var hoverScale: CGFloat {
        prominence == .hero ? 1.015 : 1.02
    }

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: FlowDeskLayout.homeCreationCardInnerSpacing) {
                Image(systemName: systemImage)
                    .font(.system(size: iconPointSize, weight: .medium))
                    .symbolRenderingMode(.hierarchical)
                    .foregroundStyle(.primary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                VStack(alignment: .leading, spacing: FlowDeskLayout.homeCreationCardTitleSubtitleSpacing) {
                    Text(title)
                        .font(titleFont)
                        .foregroundStyle(.primary)
                        .multilineTextAlignment(.leading)
                    Text(subtitle)
                        .font(FlowDeskTypography.cardSubtitle)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .frame(maxWidth: .infinity, minHeight: minHeight, alignment: .topLeading)
            .padding(FlowDeskLayout.homeCardPadding)
            .flowDeskCardChrome(isHovered: $isHovered, scaleOnHover: hoverScale)
        }
        .buttonStyle(FlowDeskPlainCardButtonStyle())
        .onHover { isHovered = $0 }
        .contentShape(RoundedRectangle(cornerRadius: FlowDeskLayout.cardCornerRadius, style: .continuous))
        .accessibilityLabel("\(title). \(subtitle)")
    }
}
