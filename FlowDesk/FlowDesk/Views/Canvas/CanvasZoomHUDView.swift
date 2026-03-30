import SwiftUI

/// Small zoom readout + step buttons (view space; does not affect canvas architecture).
struct CanvasZoomHUDView: View {
    @Bindable var boardViewModel: CanvasBoardViewModel
    @Bindable var selection: CanvasSelectionModel

    @Environment(\.flowDeskTokens) private var tokens
    @Environment(\.colorScheme) private var colorScheme

    private var scalePercent: Int {
        Int((boardViewModel.boardState.viewport.scale * 100).rounded())
    }

    var body: some View {
        HStack(spacing: 6) {
            Menu {
                Button("Fit board to content") {
                    boardViewModel.fitViewportToBoardContent()
                }
                .keyboardShortcut("1", modifiers: [.command, .option])
                Button("Center on content") {
                    boardViewModel.centerViewportOnBoardContent(canvasMargin: 48)
                }
                .keyboardShortcut("2", modifiers: [.command, .option])
                Divider()
                Button("Zoom to selection") {
                    boardViewModel.fitViewportToSelection(selection: selection)
                }
                .disabled(!selection.hasSelection)
                .keyboardShortcut("3", modifiers: [.command, .option])
            } label: {
                Image(systemName: "arrow.down.right.and.arrow.up.left")
                    .font(.system(size: 11, weight: .semibold))
            }
            .menuStyle(.borderlessButton)
            .menuIndicator(.hidden)
            .buttonStyle(.plain)
            .frame(width: 26, height: 26)
            .contentShape(Rectangle())
            .help("Framing: fit (⌘⌥1), center (⌘⌥2), zoom to selection (⌘⌥3)")

            Button {
                boardViewModel.nudgeViewportZoomOut()
            } label: {
                Image(systemName: "minus.magnifyingglass")
                    .font(.system(size: 12, weight: .semibold))
            }
            .buttonStyle(.plain)
            .help("Zoom out (⌘−)")

            Text("\(scalePercent)%")
                .font(.caption.weight(.semibold))
                .monospacedDigit()
                .frame(minWidth: 44)

            Button {
                boardViewModel.nudgeViewportZoomIn()
            } label: {
                Image(systemName: "plus.magnifyingglass")
                    .font(.system(size: 12, weight: .semibold))
            }
            .buttonStyle(.plain)
            .help("Zoom in (⌘+)")
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background {
            ZStack {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(.ultraThinMaterial)
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(tokens.homeCardFill.opacity(colorScheme == .dark ? 0.08 : 0.12))
            }
        }
        .overlay {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .strokeBorder(Color.primary.opacity(0.08), lineWidth: 0.75)
        }
    }

}
