import SwiftUI

/// Single recent board entry on the home dashboard (not a plain List row).
struct RecentBoardRowView: View {
    let document: FlowDocument
    let onOpen: () -> Void

    @Environment(\.flowDeskTokens) private var tokens
    @Environment(\.colorScheme) private var colorScheme

    @State private var isHovered = false

    private var template: FlowDeskBoardTemplate? {
        document.resolvedBoardTemplate
    }

    var body: some View {
        Button(action: onOpen) {
            HStack(alignment: .center, spacing: FlowDeskLayout.spaceM) {
                ZStack {
                    RoundedRectangle(cornerRadius: FlowDeskLayout.homeIconWellCornerRecent, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [
                                    tokens.selectionStrokeColor.opacity(isHovered ? 0.2 : 0.12),
                                    tokens.selectionStrokeColor.opacity(isHovered ? 0.07 : 0.045)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .overlay {
                            RoundedRectangle(cornerRadius: FlowDeskLayout.homeIconWellCornerRecent, style: .continuous)
                                .strokeBorder(
                                    Color.white.opacity(colorScheme == .dark ? 0.1 : 0.28),
                                    lineWidth: 1
                                )
                        }
                        .frame(width: 44, height: 44)

                    Image(systemName: "rectangle.stack.fill")
                        .font(.system(size: 18, weight: .semibold))
                        .symbolRenderingMode(.hierarchical)
                        .foregroundStyle(.primary)
                        .scaleEffect(isHovered ? 1.06 : 1)
                        .animation(.spring(response: 0.30, dampingFraction: 0.78), value: isHovered)
                }

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
                    .offset(x: isHovered ? 4 : 0)
                    .animation(.spring(response: 0.32, dampingFraction: 0.8), value: isHovered)
            }
            .padding(.horizontal, FlowDeskLayout.homeRecentRowHorizontalPadding)
            .padding(.vertical, FlowDeskLayout.homeRecentRowVerticalPadding)
            .flowDeskCardChrome(isHovered: $isHovered, scaleOnHover: 1.024)
        }
        .buttonStyle(FlowDeskHomeCardButtonStyle())
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
