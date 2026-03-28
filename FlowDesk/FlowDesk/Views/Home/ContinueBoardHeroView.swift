import SwiftUI

/// Prominent “continue where you left off” target for the most recently updated board.
struct ContinueBoardHeroView: View {
    let document: FlowDocument
    let onOpen: () -> Void

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
                            .font(.body.weight(.semibold))
                            .foregroundStyle(.secondary)
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
                        .foregroundStyle(.secondary)
                }

                Spacer(minLength: FlowDeskLayout.spaceM)

                Image(systemName: "chevron.right")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
            .padding(FlowDeskLayout.homeCardPadding)
            .frame(maxWidth: .infinity, minHeight: FlowDeskLayout.homeContinueMinHeight, alignment: .leading)
            .flowDeskCardChrome(isHovered: $isHovered, scaleOnHover: 1.02)
        }
        .buttonStyle(FlowDeskPlainCardButtonStyle())
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
