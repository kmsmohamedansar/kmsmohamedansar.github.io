import SwiftUI

struct InspectorPanelView: View {
    @Environment(\.flowDeskTokens) private var tokens
    @Environment(\.colorScheme) private var colorScheme

    @Bindable var document: FlowDocument
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
                    .tint(tokens.selectionStrokeColor)
                LabeledContent("Elements") {
                    Text("\(canvasViewModel.boardState.elements.count)")
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                }
            } header: {
                FlowDeskInspectorSectionHeader("Viewport")
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
                } else if selection.isMultiSelection {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("\(selection.selectedElementIDs.count) items selected")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Text("Shift-click to add or remove. Drag any selected framed item to move the group together.")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                } else {
                    Text("Nothing selected—click an item on the canvas, or choose a tool to add one.")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                        .fixedSize(horizontal: false, vertical: true)
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
        .scrollContentBackground(.hidden)
        .background {
            ZStack {
                tokens.inspectorChromeBackground
                FlowDeskTheme.homeAtmosphereWash(colorScheme: colorScheme)
                    .opacity(colorScheme == .dark ? 0.35 : 0.22)
                    .allowsHitTesting(false)
            }
        }
        .overlay(alignment: .leading) {
            Rectangle()
                .fill(Color.primary.opacity(colorScheme == .dark ? 0.088 : 0.032))
                .frame(width: 1)
                .allowsHitTesting(false)
        }
        .padding(.horizontal, FlowDeskLayout.inspectorHorizontalPadding)
        .frame(maxHeight: .infinity, alignment: .top)
    }

    private func elementKindLabel(_ kind: CanvasElementKind) -> String {
        switch kind {
        case .textBlock: return "Text"
        case .stickyNote: return "Sticky note"
        case .shape: return "Shape"
        case .stroke: return "Drawing"
        case .chart: return "Chart"
        case .connector: return "Connector"
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
