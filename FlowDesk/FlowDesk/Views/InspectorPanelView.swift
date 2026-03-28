import SwiftUI

struct InspectorPanelView: View {
    let document: FlowDocument
    @Bindable var canvasViewModel: CanvasBoardViewModel
    @Bindable var selection: CanvasSelectionModel

    var body: some View {
        Form {
            Section {
                LabeledContent("Title") {
                    Text(document.title)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
                LabeledContent("Updated") {
                    Text(document.updatedAt.formatted(date: .abbreviated, time: .shortened))
                        .foregroundStyle(.secondary)
                }
            } header: {
                FlowDeskInspectorSectionHeader("Board")
            }

            Section {
                LabeledContent("Zoom") {
                    Text(String(format: "%.0f%%", canvasViewModel.boardState.viewport.scale * 100))
                        .monospacedDigit()
                }
                Toggle("Show grid", isOn: gridBinding)
                LabeledContent("Elements") {
                    Text("\(canvasViewModel.boardState.elements.count)")
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                }
            } header: {
                FlowDeskInspectorSectionHeader("Canvas")
            }

            Section {
                if let id = selection.primarySelectedID,
                   let element = canvasViewModel.boardState.elements.first(where: { $0.id == id }) {
                    LabeledContent("Kind") {
                        Text(elementKindLabel(element.kind))
                            .foregroundStyle(.secondary)
                    }
                    LabeledContent("Frame") {
                        Text("\(Int(element.x)), \(Int(element.y)) · \(Int(element.width))×\(Int(element.height))")
                            .font(.caption.monospacedDigit())
                            .foregroundStyle(.secondary)
                    }
                    LabeledContent("Stack") {
                        Text("\(element.zIndex)")
                            .foregroundStyle(.secondary)
                            .monospacedDigit()
                    }
                } else {
                    Text(selection.hasSelection ? "\(selection.selectedElementIDs.count) selected" : "None")
                        .font(.subheadline)
                        .foregroundStyle(.tertiary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            } header: {
                FlowDeskInspectorSectionHeader("Selection")
            }

            if selection.hasSelection {
                CanvasEditorInspectorSection(canvasViewModel: canvasViewModel, selection: selection)
            }

            if let id = selection.primarySelectedID,
               let element = canvasViewModel.boardState.elements.first(where: { $0.id == id }),
               element.kind == .textBlock {
                TextBlockInspectorSection(elementID: id, canvasViewModel: canvasViewModel)
            }

            if let id = selection.primarySelectedID,
               let element = canvasViewModel.boardState.elements.first(where: { $0.id == id }),
               element.kind == .stickyNote {
                StickyNoteInspectorSection(elementID: id, canvasViewModel: canvasViewModel)
            }

            if let id = selection.primarySelectedID,
               let element = canvasViewModel.boardState.elements.first(where: { $0.id == id }),
               element.kind == .shape {
                ShapeInspectorSection(elementID: id, canvasViewModel: canvasViewModel)
            }

            if canvasViewModel.canvasTool == .draw {
                DrawingToolInspectorSection(canvasViewModel: canvasViewModel)
            }

            if let id = selection.primarySelectedID,
               let element = canvasViewModel.boardState.elements.first(where: { $0.id == id }),
               element.kind == .stroke {
                StrokeInspectorSection(elementID: id, canvasViewModel: canvasViewModel)
            }

            if let id = selection.primarySelectedID,
               let element = canvasViewModel.boardState.elements.first(where: { $0.id == id }),
               element.kind == .chart {
                ChartInspectorSection(elementID: id, canvasViewModel: canvasViewModel)
            }
        }
        .formStyle(.grouped)
        .frame(maxHeight: .infinity, alignment: .top)
    }

    private func elementKindLabel(_ kind: CanvasElementKind) -> String {
        switch kind {
        case .textBlock: return "Text"
        case .stickyNote: return "Sticky note"
        case .shape: return "Shape"
        case .stroke: return "Drawing"
        case .chart: return "Chart"
        @unknown default: return "Element"
        }
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
