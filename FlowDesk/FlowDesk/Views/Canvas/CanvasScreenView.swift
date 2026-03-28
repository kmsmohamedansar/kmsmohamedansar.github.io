import SwiftUI

/// macOS canvas screen: toolbar + board. Keeps navigation subtitles here.
struct CanvasScreenView: View {
    let document: FlowDocument
    @Bindable var boardViewModel: CanvasBoardViewModel
    @Bindable var selection: CanvasSelectionModel

    var body: some View {
        CanvasBoardView(
            boardViewModel: boardViewModel,
            selection: selection
        )
        .navigationTitle(document.title)
        #if os(macOS)
        .navigationSubtitle("Last edited \(document.updatedAt.formatted(date: .abbreviated, time: .shortened))")
        #endif
        .onDeleteCommand {
            boardViewModel.deleteSelectedElements(selection: selection)
        }
        .toolbar {
            ToolbarItemGroup(placement: .automatic) {
                Menu("Edit") {
                    Button("Undo") {
                        boardViewModel.undoBoard()
                    }
                    .disabled(!boardViewModel.canUndoBoard)
                    .keyboardShortcut("z", modifiers: [.command])

                    Button("Redo") {
                        boardViewModel.redoBoard()
                    }
                    .disabled(!boardViewModel.canRedoBoard)
                    .keyboardShortcut("z", modifiers: [.command, .shift])

                    Divider()

                    Button("Duplicate") {
                        boardViewModel.duplicatePrimarySelection(selection: selection)
                    }
                    .disabled(selection.primarySelectedID == nil)
                    .keyboardShortcut("d", modifiers: [.command])

                    Divider()

                    Menu("Arrange") {
                        Button("Bring to Front") {
                            boardViewModel.bringSelectionToFront(selection: selection)
                        }
                        Button("Bring Forward") {
                            boardViewModel.bringSelectionForward(selection: selection)
                        }
                        .disabled(!boardViewModel.canBringSelectionForward(selection: selection))
                        Button("Send Backward") {
                            boardViewModel.sendSelectionBackward(selection: selection)
                        }
                        .disabled(!boardViewModel.canSendSelectionBackward(selection: selection))
                        Button("Send to Back") {
                            boardViewModel.sendSelectionToBack(selection: selection)
                        }
                    }
                    .disabled(selection.primarySelectedID == nil)

                    Divider()

                    Button("Delete", role: .destructive) {
                        boardViewModel.deleteSelectedElements(selection: selection)
                    }
                    .disabled(!selection.hasSelection)
                }

                Menu("Export") {
                    Button("Export PNG…") {
                        CanvasExportService.presentExportPanel(
                            boardState: boardViewModel.boardState,
                            documentTitle: document.title,
                            format: .png
                        )
                    }
                    Button("Export PDF…") {
                        CanvasExportService.presentExportPanel(
                            boardState: boardViewModel.boardState,
                            documentTitle: document.title,
                            format: .pdf
                        )
                    }
                }
            }
            ToolbarItemGroup(placement: .primaryAction) {
                Picker("Tool", selection: $boardViewModel.canvasTool) {
                    Label("Select", systemImage: "cursorarrow").tag(CanvasToolMode.select)
                    Label("Draw", systemImage: "pencil.tip").tag(CanvasToolMode.draw)
                }
                .pickerStyle(.segmented)
                .controlSize(.regular)
                .frame(minWidth: 168)
                .help("Select and pan, or draw freehand strokes")
            }
            ToolbarItemGroup(placement: .primaryAction) {
                Button {
                    boardViewModel.insertTextBlock(selection: selection, beginEditing: true)
                } label: {
                    Label("Text block", systemImage: "textformat")
                }
                .help("Insert a text block")
                .keyboardShortcut("t", modifiers: [.command])

                Button {
                    boardViewModel.insertStickyNote(selection: selection, beginEditing: true)
                } label: {
                    Label("Sticky note", systemImage: "note.text")
                }
                .help("Insert a sticky note")
                .keyboardShortcut("n", modifiers: [.command, .shift])

                Menu {
                    Button("Rectangle") {
                        boardViewModel.insertShape(kind: .rectangle, selection: selection)
                    }
                    Button("Rounded rectangle") {
                        boardViewModel.insertShape(kind: .roundedRectangle, selection: selection)
                    }
                    Button("Ellipse") {
                        boardViewModel.insertShape(kind: .ellipse, selection: selection)
                    }
                    Button("Line") {
                        boardViewModel.insertShape(kind: .line, selection: selection)
                    }
                    Button("Arrow") {
                        boardViewModel.insertShape(kind: .arrow, selection: selection)
                    }
                } label: {
                    Label("Shape", systemImage: "square.on.circle")
                }
                .help("Insert a shape")

                Menu {
                    Button("Bar chart") {
                        boardViewModel.insertChart(kind: .bar, selection: selection)
                    }
                    Button("Line chart") {
                        boardViewModel.insertChart(kind: .line, selection: selection)
                    }
                } label: {
                    Label("Chart", systemImage: "chart.bar")
                }
                .help("Insert a chart block")
            }
        }
    }
}
