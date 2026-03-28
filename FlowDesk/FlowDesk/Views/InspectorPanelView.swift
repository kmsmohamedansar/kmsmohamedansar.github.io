import SwiftUI

struct InspectorPanelView: View {
    let document: FlowDocument
    @Bindable var canvasViewModel: CanvasBoardViewModel

    var body: some View {
        Form {
            Section("Board") {
                LabeledContent("Title") {
                    Text(document.title)
                        .foregroundStyle(.secondary)
                }
                LabeledContent("Updated") {
                    Text(document.updatedAt.formatted(date: .abbreviated, time: .shortened))
                }
            }

            Section("Canvas") {
                LabeledContent("Zoom") {
                    Text(String(format: "%.0f%%", canvasViewModel.boardState.viewport.scale * 100))
                }
                Toggle("Show grid", isOn: gridBinding)
            }

            Section("Phase 1") {
                Text("Selection, styling, and element inspectors arrive in later phases.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .formStyle(.grouped)
        .frame(maxHeight: .infinity, alignment: .top)
    }

    private var gridBinding: Binding<Bool> {
        Binding(
            get: { canvasViewModel.boardState.viewport.showGrid },
            set: { newValue in
                var viewport = canvasViewModel.boardState.viewport
                viewport.showGrid = newValue
                canvasViewModel.setViewport(viewport)
            }
        )
    }
}
