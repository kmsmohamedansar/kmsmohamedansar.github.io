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
                    HStack(spacing: FlowDeskLayout.spaceS) {
                        Image(systemName: "arrow.turn.down.left")
                            .font(.callout.weight(.semibold))
                            .foregroundStyle(.tertiary)
                        if let template {
                            FlowDeskTemplateChip(label: template.homeChipLabel)
                        }
                    }

                    Text(document.title)
                        .font(FlowDeskTypography.continueTitle)
                        .foregroundStyle(.primary)
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    Text("Last edited \(document.updatedAt.formatted(.relative(presentation: .named)))")
                        .font(FlowDeskTypography.continueMeta)
                        .foregroundStyle(.tertiary)
                        .lineSpacing(2)
                }

                Spacer(minLength: FlowDeskLayout.spaceM)

                Image(systemName: "chevron.forward")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(
                        isHovered
                            ? tokens.selectionStrokeColor.opacity(0.88)
                            : Color.secondary.opacity(0.42)
                    )
                    .animation(.easeOut(duration: 0.16), value: isHovered)
            }
            .padding(FlowDeskLayout.homeCardPadding)
            .frame(maxWidth: .infinity, minHeight: FlowDeskLayout.homeContinueMinHeight, alignment: .leading)
            .flowDeskCardChrome(isHovered: $isHovered, scaleOnHover: 1.03)
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
