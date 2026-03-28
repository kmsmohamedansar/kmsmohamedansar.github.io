import SwiftUI

/// Tappable creation tile for the home screen (icon, title, one-line blurb, hover polish).
struct CreationCardView: View {
    let systemImage: String
    let title: String
    let subtitle: String
    let action: () -> Void

    @State private var isHovered = false

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: FlowDeskLayout.homeCreationCardInnerSpacing) {
                Image(systemName: systemImage)
                    .font(.system(size: FlowDeskTypography.cardIconPointSize, weight: .medium))
                    .symbolRenderingMode(.hierarchical)
                    .foregroundStyle(.primary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                VStack(alignment: .leading, spacing: FlowDeskLayout.homeCreationCardTitleSubtitleSpacing) {
                    Text(title)
                        .font(FlowDeskTypography.cardTitle)
                        .foregroundStyle(.primary)
                        .multilineTextAlignment(.leading)
                    Text(subtitle)
                        .font(FlowDeskTypography.cardSubtitle)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .frame(maxWidth: .infinity, minHeight: FlowDeskLayout.homeCreationCardMinHeight, alignment: .topLeading)
            .padding(FlowDeskLayout.homeCardPadding)
            .flowDeskCardChrome(isHovered: $isHovered, scaleOnHover: 1.02)
        }
        .buttonStyle(FlowDeskPlainCardButtonStyle())
        .onHover { isHovered = $0 }
        .contentShape(RoundedRectangle(cornerRadius: FlowDeskLayout.cardCornerRadius, style: .continuous))
        .accessibilityLabel("\(title). \(subtitle)")
    }
}
