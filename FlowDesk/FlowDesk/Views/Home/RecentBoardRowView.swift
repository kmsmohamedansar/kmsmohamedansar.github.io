import SwiftUI

/// Single recent board entry on the home dashboard (not a plain List row).
struct RecentBoardRowView: View {
    @Environment(\.flowDeskTokens) private var tokens

    let document: FlowDocument
    let onOpen: () -> Void

    @State private var isHovered = false

    private var template: FlowDeskBoardTemplate? {
        document.resolvedBoardTemplate
    }

    var body: some View {
        Button(action: onOpen) {
            HStack(alignment: .center, spacing: FlowDeskLayout.spaceM) {
                Image(systemName: "rectangle.on.rectangle.angled")
                    .font(.title3)
                    .foregroundStyle(.secondary)
                    .frame(width: 28, alignment: .center)

                VStack(alignment: .leading, spacing: FlowDeskLayout.spaceXS) {
                    Text(document.title)
                        .font(FlowDeskTypography.recentTitle)
                        .foregroundStyle(.primary)
                        .lineLimit(1)

                    Text(document.updatedAt.formatted(.relative(presentation: .named)))
                        .font(FlowDeskTypography.recentMeta)
                        .foregroundStyle(.tertiary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                if let template {
                    Text(template.homeChipLabel)
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, FlowDeskLayout.spaceS)
                        .padding(.vertical, 3)
                        .background(
                            Capsule(style: .continuous)
                                .fill(Color.primary.opacity(FlowDeskLayout.chipBackgroundOpacity))
                        )
                }

                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
            .padding(.horizontal, FlowDeskLayout.homeRecentRowHorizontalPadding)
            .padding(.vertical, FlowDeskLayout.homeRecentRowVerticalPadding)
            .background {
                tokens.homeCardFillBackground(cornerRadius: FlowDeskLayout.cardCornerRadius)
                    .opacity(isHovered ? 0.92 : 0.78)
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
                RoundedRectangle(cornerRadius: FlowDeskLayout.cardCornerRadius, style: .continuous)
                    .strokeBorder(
                        Color.primary.opacity(
                            isHovered ? tokens.homeCardBorderHover : tokens.homeCardBorderNormal
                        ),
                        lineWidth: isHovered
                            ? FlowDeskLayout.cardBorderLineWidthHover
                            : FlowDeskLayout.cardBorderLineWidth
                    )
            }
            .animation(.easeOut(duration: 0.16), value: isHovered)
        }
        .buttonStyle(FlowDeskPlainCardButtonStyle())
        .onHover { isHovered = $0 }
        .contentShape(RoundedRectangle(cornerRadius: FlowDeskLayout.cardCornerRadius, style: .continuous))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityLabel)
    }

    private var accessibilityLabel: String {
        var parts = ["\(document.title), edited \(document.updatedAt.formatted(.relative(presentation: .named)))"]
        if let template {
            parts.append(template.homeChipLabel)
        }
        return parts.joined(separator: ", ")
    }
}
