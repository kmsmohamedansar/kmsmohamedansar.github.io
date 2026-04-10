import SwiftUI

/// Prominent “continue where you left off” target for the most recently updated board.
struct ContinueBoardHeroView: View {
    let document: FlowDocument
    let onOpen: () -> Void

    @Environment(\.flowDeskTokens) private var tokens

    @State private var isHovered = false

    private var template: FlowDeskBoardTemplate? {
        document.resolvedBoardTemplate
    }

    var body: some View {
        Button(action: onOpen) {
            HStack(alignment: .center, spacing: FlowDeskLayout.spaceL) {
                VStack(alignment: .leading, spacing: FlowDeskLayout.spaceS) {
                    HStack(alignment: .center, spacing: FlowDeskLayout.spaceS) {
                        Image(systemName: "arrow.turn.down.left")
                            .font(.callout.weight(.semibold))
                            .foregroundStyle(.tertiary)
                        if let template {
                            FlowDeskTemplateChip(label: template.homeChipLabel)
                        }
                    }
                    .frame(minWidth: 0, maxWidth: .infinity, alignment: .leading)

                    Text(document.title)
                        .font(FlowDeskTypography.continueTitle)
                        .foregroundStyle(.primary)
                        .multilineTextAlignment(.leading)
                        .lineLimit(2)
                        .truncationMode(.tail)
                        .fixedSize(horizontal: false, vertical: true)

                    Text("Last edited \(document.updatedAt.formatted(.relative(presentation: .named)))")
                        .font(FlowDeskTypography.continueMeta)
                        .foregroundStyle(.tertiary)
                        .lineSpacing(2)
                        .lineLimit(2)
                        .truncationMode(.tail)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .frame(minWidth: 0, maxWidth: .infinity, alignment: .leading)

                Color.clear
                    .frame(width: 24, height: 28)
                    .overlay {
                        Image(systemName: "chevron.forward")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(
                                isHovered
                                    ? tokens.selectionStrokeColor.opacity(0.88)
                                    : Color.secondary.opacity(0.42)
                            )
                            .offset(x: isHovered ? 3 : 0)
                    }
                    .clipped()
                    .contentShape(Rectangle())
                    .animation(.easeOut(duration: 0.16), value: isHovered)
            }
            .frame(maxWidth: .infinity, minHeight: FlowDeskLayout.homeContinueMinHeight, alignment: .leading)
            .cardContainer(isHovered: $isHovered, scaleOnHover: 1.03)
        }
        .buttonStyle(FlowDeskHomeCardButtonStyle())
        .onHover { isHovered = $0 }
        .contentShape(RoundedRectangle(cornerRadius: FlowDeskLayout.cardCornerRadius, style: .continuous))
        .accessibilityLabel(accessibilityLabel)
    }

    private var accessibilityLabel: String {
        let base = "Continue with \(document.title), last edited \(document.updatedAt.formatted(.relative(presentation: .named)))"
        if let template {
            return "\(base), \(template.homeChipLabel) board"
        }
        return base
    }
}
