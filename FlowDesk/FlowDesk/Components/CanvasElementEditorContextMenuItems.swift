import SwiftUI

/// Shared context menu content for canvas elements (duplicate, z-order, delete). Pass the element under the menu.
struct CanvasElementEditorContextMenuItems: View {
    let elementID: UUID
    @Bindable var boardViewModel: CanvasBoardViewModel
    @Bindable var selection: CanvasSelectionModel

    private var duplicateAllIfInMultiSelect: Bool {
        selection.selectedElementIDs.count > 1 && selection.isSelected(elementID)
    }

    private var contextElementKind: CanvasElementKind? {
        boardViewModel.boardState.elements.first(where: { $0.id == elementID })?.kind
    }

    var body: some View {
        Button("Duplicate") {
            if duplicateAllIfInMultiSelect {
                boardViewModel.duplicateAllSelectedElements(selection: selection)
            } else {
                boardViewModel.duplicateElement(id: elementID, selection: selection)
            }
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

        if contextElementKind == .connector {
            Button("Edit Label…") {
                selection.selectOnly(elementID)
                boardViewModel.beginEditingConnectorLabel(id: elementID)
            }
        }

        Divider()

        Button("Delete", role: .destructive) {
            if selection.isSelected(elementID) {
                boardViewModel.deleteSelectedElements(selection: selection)
            } else {
                boardViewModel.deleteElements(ids: Set([elementID]), selection: selection)
            }
        }
    }
}
