import SwiftUI

/// Edit / arrange: duplicate/delete use full selection; stacking (Arrange) stays primary-only in v1.
struct CanvasEditorInspectorSection: View {
    @Bindable var canvasViewModel: CanvasBoardViewModel
    @Bindable var selection: CanvasSelectionModel

    var body: some View {
        Section {
            HStack(spacing: 10) {
                Button("Duplicate") {
                    canvasViewModel.duplicateAllSelectedElements(selection: selection)
                }
                .buttonStyle(.bordered)
                .controlSize(.regular)
                .disabled(!selection.hasSelection)

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

            if selection.isMultiSelection {
                Text("Arrange applies to one item at a time. Select a single element for stacking controls.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        } header: {
            FlowDeskInspectorSectionHeader("Edit")
        }
    }
}
