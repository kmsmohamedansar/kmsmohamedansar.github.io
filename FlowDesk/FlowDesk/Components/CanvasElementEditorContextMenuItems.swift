import SwiftUI

/// Shared context menu content for canvas elements (duplicate, z-order, delete). Pass the element under the menu.
struct CanvasElementEditorContextMenuItems: View {
    let elementID: UUID
    @Bindable var boardViewModel: CanvasBoardViewModel
    @Bindable var selection: CanvasSelectionModel

    var body: some View {
        Button("Duplicate") {
            boardViewModel.duplicateElement(id: elementID, selection: selection)
        }

        Menu("Arrange") {
            Button("Bring to Front") {
                boardViewModel.bringElementToFront(id: elementID)
            }
            Button("Bring Forward") {
                boardViewModel.bringElementForward(id: elementID)
            }
            .disabled(!boardViewModel.canBringElementForward(id: elementID))
            Button("Send Backward") {
                boardViewModel.sendElementBackward(id: elementID)
            }
            .disabled(!boardViewModel.canSendElementBackward(id: elementID))
            Button("Send to Back") {
                boardViewModel.sendElementToBack(id: elementID)
            }
        }

        Divider()

        Button("Delete", role: .destructive) {
            boardViewModel.deleteElements(ids: Set([elementID]), selection: selection)
        }
    }
}
