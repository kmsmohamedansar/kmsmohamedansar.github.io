import SwiftUI

/// Align / distribute for multi-selected framed elements (canvas overlay, view coordinates).
struct CanvasMultiSelectionToolbarView: View {
    @Bindable var boardViewModel: CanvasBoardViewModel
    @Bindable var selection: CanvasSelectionModel

    var body: some View {
        VStack(alignment: .leading, spacing: FlowDeskLayout.floatingPanelMultiSelectOuterStackSpacing) {
            Text("ALIGN & DISTRIBUTE")
                .font(.system(size: 9, weight: .semibold))
                .tracking(0.6)
                .foregroundStyle(Color.primary.opacity(0.42))
                .padding(.leading, FlowDeskLayout.spaceXS / 2)

            VStack(spacing: FlowDeskLayout.floatingPanelToolbarInnerSpacing) {
                HStack(spacing: 4) {
                    chromeIcon("align.horizontal.left") {
                        boardViewModel.alignSelectedElements(selection: selection, kind: .left)
                    }
                    .help("Align left")

                    chromeIcon("align.horizontal.center") {
                        boardViewModel.alignSelectedElements(selection: selection, kind: .centerX)
                    }
                    .help("Align horizontal centers")

                    chromeIcon("align.horizontal.right") {
                        boardViewModel.alignSelectedElements(selection: selection, kind: .right)
                    }
                    .help("Align right")

                    Rectangle()
                        .fill(Color.primary.opacity(0.1))
                        .frame(width: 1, height: 20)

                    chromeIcon("distribute.horizontal") {
                        boardViewModel.distributeSelectedElements(selection: selection, axis: .horizontal)
                    }
                    .help("Distribute horizontally (3+ items)")

                    chromeIcon("distribute.vertical") {
                        boardViewModel.distributeSelectedElements(selection: selection, axis: .vertical)
                    }
                    .help("Distribute vertically (3+ items)")
                }
                HStack(spacing: 4) {
                    chromeIcon("align.vertical.top") {
                        boardViewModel.alignSelectedElements(selection: selection, kind: .top)
                    }
                    .help("Align top")

                    chromeIcon("align.vertical.center") {
                        boardViewModel.alignSelectedElements(selection: selection, kind: .centerY)
                    }
                    .help("Align vertical centers")

                    chromeIcon("align.vertical.bottom") {
                        boardViewModel.alignSelectedElements(selection: selection, kind: .bottom)
                    }
                    .help("Align bottom")

                    Spacer(minLength: 0)
                }
            }
        }
        .padding(.horizontal, FlowDeskLayout.floatingPanelMultiSelectPaddingH)
        .padding(.vertical, FlowDeskLayout.floatingPanelMultiSelectPaddingV)
        .flowDeskFloatingPanelChrome(
            shadowStyle: .contextualToolbar,
            lightTintOpacity: 0.11,
            darkTintOpacity: 0.07
        )
        .fixedSize()
    }

    private func chromeIcon(_ systemName: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 13, weight: .medium))
                .frame(width: 30, height: 28)
                .foregroundStyle(Color.primary.opacity(0.76))
                .contentShape(Rectangle())
        }
        .buttonStyle(MultiSelectionToolbarIconButtonStyle())
    }
}

private struct MultiSelectionToolbarIconButtonStyle: ButtonStyle {
    @Environment(\.flowDeskTokens) private var tokens

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .background {
                RoundedRectangle(cornerRadius: FlowDeskLayout.chromeInsetCornerRadius, style: .continuous)
                    .fill(tokens.selectionStrokeColor.opacity(configuration.isPressed ? 0.12 : 0))
            }
            .overlay {
                RoundedRectangle(cornerRadius: FlowDeskLayout.chromeInsetCornerRadius, style: .continuous)
                    .strokeBorder(tokens.selectionStrokeColor.opacity(configuration.isPressed ? 0.22 : 0), lineWidth: 1)
            }
    }
}
