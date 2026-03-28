import SwiftUI

struct BoardEmptySelectionView: View {
    var onNewBoard: () -> Void

    var body: some View {
        ContentUnavailableView {
            Label("No Board Selected", systemImage: "square.dashed")
        } description: {
            Text("Create a board to start sketching ideas, notes, and diagrams.")
        } actions: {
            Button("New Board", action: onNewBoard)
                .keyboardShortcut("n", modifiers: [.command])
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
