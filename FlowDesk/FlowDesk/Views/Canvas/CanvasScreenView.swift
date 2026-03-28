import SwiftUI

/// macOS canvas screen: canvas-first tools + lightweight window toolbar (Edit / View / Export).
struct CanvasScreenView: View {
    let document: FlowDocument
    @Bindable var boardViewModel: CanvasBoardViewModel
    @Bindable var selection: CanvasSelectionModel

    @Environment(FlowDeskOnboardingStore.self) private var onboarding

    var body: some View {
        ZStack(alignment: .leading) {
            CanvasBoardView(
                boardViewModel: boardViewModel,
                selection: selection
            )

            CanvasFloatingToolPalette(boardViewModel: boardViewModel)
                .padding(.leading, 18)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)

            if !onboarding.canvasTipsDismissed {
                FlowDeskCanvasOnboardingCallout()
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                    .padding(.top, 10)
                    .padding(.trailing, 14)
            }
        }
        .animation(.easeOut(duration: 0.2), value: onboarding.canvasTipsDismissed)
        .navigationTitle(document.title)
        #if os(macOS)
        .navigationSubtitle("Last edited \(document.updatedAt.formatted(date: .abbreviated, time: .shortened))")
        #endif
        .canvasScreenKeyCommands(boardViewModel: boardViewModel, selection: selection)
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
                        boardViewModel.duplicateAllSelectedElements(selection: selection)
                    }
                    .disabled(!selection.hasSelection)
                    .keyboardShortcut("d", modifiers: [.command])

                    Divider()

                    Button("Copy") {
                        boardViewModel.copySelectedElementsToPasteboard(selection: selection)
                    }
                    .disabled(!selection.hasSelection)
                    .keyboardShortcut("c", modifiers: [.command])

                    Button("Paste") {
                        boardViewModel.pasteClipboardElements(selection: selection)
                    }
                    .disabled(!boardViewModel.canPasteFromClipboard)
                    .keyboardShortcut("v", modifiers: [.command])

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

                Menu {
                    Toggle("Show grid", isOn: gridBinding)
                    Divider()
                    Button("Text block at viewport center") {
                        boardViewModel.insertTextBlock(selection: selection, beginEditing: true)
                    }
                    .keyboardShortcut("t", modifiers: [.command])
                    Button("Sticky note at viewport center") {
                        boardViewModel.insertStickyNote(selection: selection, beginEditing: true)
                    }
                    .keyboardShortcut("n", modifiers: [.command, .shift])
                    Divider()
                    Button("Bar chart") {
                        boardViewModel.insertChart(kind: .bar, selection: selection)
                    }
                    Button("Line chart") {
                        boardViewModel.insertChart(kind: .line, selection: selection)
                    }
                } label: {
                    Label("View", systemImage: "rectangle.split.2x1")
                }
                .help("Grid, quick inserts, and charts")

                Menu {
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
                } label: {
                    Image(systemName: "square.and.arrow.up")
                }
                .help("Export")
                .buttonStyle(FlowDeskToolbarButtonStyle())
            }
        }
    }

    private var gridBinding: Binding<Bool> {
        Binding(
            get: { boardViewModel.boardState.viewport.showGrid },
            set: { newValue in
                var viewport = boardViewModel.boardState.viewport
                viewport.showGrid = newValue
                boardViewModel.setViewport(viewport)
            }
        )
    }
}
