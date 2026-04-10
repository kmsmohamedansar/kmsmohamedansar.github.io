import SwiftUI

struct BoardEmptySelectionView: View {
    var onNewBoard: () -> Void

    var body: some View {
        ContentUnavailableView {
            VStack(spacing: FlowDeskLayout.spaceM + FlowDeskLayout.spaceXS / 2) {
                Image(systemName: "square.dashed")
                    .font(.system(size: 40, weight: .ultraLight))
                    .symbolRenderingMode(.hierarchical)
                    .foregroundStyle(.secondary)
                Text("Choose a board")
                    .font(.title3.weight(.semibold))
            }
        } description: {
            Text("Select a document in the sidebar, or create a new board to arrange text, notes, shapes, and charts on the canvas.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .frame(maxWidth: 420)
        } actions: {
            Button("New Board", action: onNewBoard)
                .keyboardShortcut("n", modifiers: [.command])
                .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(FlowDeskLayout.spaceXXL)
    }
}
