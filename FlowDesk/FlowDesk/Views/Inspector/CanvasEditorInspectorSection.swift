import SwiftUI

/// Edit / arrange actions for the primary selected element (v1: single selection for z-order and duplicate).
struct CanvasEditorInspectorSection: View {
    @Bindable var canvasViewModel: CanvasBoardViewModel
    @Bindable var selection: CanvasSelectionModel

    var body: some View {
        Section {
            HStack(spacing: 10) {
                Button("Duplicate") {
                    canvasViewModel.duplicatePrimarySelection(selection: selection)
                }
                .buttonStyle(.bordered)
                .controlSize(.regular)
                .disabled(selection.primarySelectedID == nil)

                Spacer(minLength: 0)

                Button(role: .destructive) {
                    canvasViewModel.deleteSelectedElements(selection: selection)
                } label: {
                    Text("Delete")
                }
                .buttonStyle(.bordered)
                .controlSize(.regular)
                .disabled(!selection.hasSelection)
            }

            Menu {
                Button("Bring to Front") {
                    canvasViewModel.bringSelectionToFront(selection: selection)
                }
                Button("Bring Forward") {
                    canvasViewModel.bringSelectionForward(selection: selection)
                }
                .disabled(!canvasViewModel.canBringSelectionForward(selection: selection))
                Button("Send Backward") {
                    canvasViewModel.sendSelectionBackward(selection: selection)
                }
                .disabled(!canvasViewModel.canSendSelectionBackward(selection: selection))
                Button("Send to Back") {
                    canvasViewModel.sendSelectionToBack(selection: selection)
                }
            } label: {
                Label("Arrange stacking", systemImage: "square.3.layers.3d")
            }
            .disabled(selection.primarySelectedID == nil)
        } header: {
            FlowDeskInspectorSectionHeader("Edit")
        }
    }
}
