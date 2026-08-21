import SwiftUI

/// macOS canvas screen: canvas-first tools + lightweight window toolbar (Edit / View / Export).
struct CanvasScreenView: View {
    @Bindable var document: FlowDocument
    @Bindable var boardViewModel: CanvasBoardViewModel
    @Bindable var selection: CanvasSelectionModel

    @Environment(FlowDeskOnboardingStore.self) private var onboarding

    var body: some View {
        ZStack(alignment: .leading) {
            CanvasBoardView(
                boardViewModel: boardViewModel,
                selection: selection
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            CerebraCanvasChromeColumn(
                boardViewModel: boardViewModel,
                selection: selection
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        // Overlay keeps hit testing to the card only (no invisible full-screen blocker).
        .overlay(alignment: .topTrailing) {
            if !onboarding.canvasTipsDismissed {
                FlowDeskCanvasOnboardingCallout()
                    .padding(.top, FlowDeskLayout.canvasOnboardingCalloutTopInset)
                    .padding(.trailing, FlowDeskLayout.canvasOnboardingCalloutTrailingInset)
            }
        }
        .overlay(alignment: .bottomTrailing) {
            CanvasZoomHUDView(boardViewModel: boardViewModel, selection: selection)
                .padding(.trailing, FlowDeskLayout.canvasOverlayTrailingInset)
                .padding(.bottom, FlowDeskLayout.canvasOverlayBottomInset)
        }
        .animation(.spring(response: 0.36, dampingFraction: 0.86), value: onboarding.canvasTipsDismissed)
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
                Menu {
                    Button("Undo") {
                        boardViewModel.undoBoard()
                    }
                    .disabled(!boardViewModel.canUndoBoard)
                    .keyboardShortcut("z", modifiers: [.command])
                    .help("Undo the last change on this board")

                    Button("Redo") {
                        boardViewModel.redoBoard()
                    }
                    .disabled(!boardViewModel.canRedoBoard)
                    .keyboardShortcut("z", modifiers: [.command, .shift])
                    .help("Redo a previously undone change")

                    Divider()

                    Button("Duplicate") {
                        boardViewModel.duplicateAllSelectedElements(selection: selection)
                    }
                    .disabled(!selection.hasSelection)
                    .keyboardShortcut("d", modifiers: [.command])
                    .help("Duplicate the selected items on this board")

                    Divider()

                    Button("Copy") {
                        boardViewModel.copySelectedElementsToPasteboard(selection: selection)
                    }
                    .disabled(!selection.hasSelection)
                    .keyboardShortcut("c", modifiers: [.command])
                    .help("Copy selected canvas items to paste elsewhere on this board")

                    Button("Paste") {
                        boardViewModel.pasteClipboardElements(selection: selection)
                    }
                    .disabled(!boardViewModel.canPasteFromClipboard)
                    .keyboardShortcut("v", modifiers: [.command])
                    .help("Paste items copied from this board in Cerebra (not plain text from other apps)")

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
                    .help("Remove selected items from the board")
                } label: {
                    HStack(spacing: 5) {
                        Text("Edit")
                            .font(.subheadline.weight(.medium))
                    }
                }

                Menu {
                    Toggle("Show grid", isOn: gridBinding)
                    Divider()
                    Button("Fit board to content") {
                        boardViewModel.fitViewportToBoardContent()
                    }
                    .keyboardShortcut("1", modifiers: [.command, .option])
                    .help("Zoom and pan so everything on the board is visible (⌘⌥1)")
                    Button("Center on content") {
                        boardViewModel.centerViewportOnBoardContent(canvasMargin: 48)
                    }
                    .keyboardShortcut("2", modifiers: [.command, .option])
                    .help("Pan so exported content is centered at the current zoom (⌘⌥2)")
                    Button("Zoom to selection") {
                        boardViewModel.fitViewportToSelection(selection: selection)
                    }
                    .disabled(!selection.hasSelection)
                    .keyboardShortcut("3", modifiers: [.command, .option])
                    .help("Zoom and pan to fit the selected items (⌘⌥3)")
                    Divider()
                    Button("Insert text block") {
                        boardViewModel.insertTextBlock(selection: selection, beginEditing: true)
                    }
                    .keyboardShortcut("t", modifiers: [.command])
                    .help("Adds a text block centered in what you see now")
                    Button("Insert sticky note") {
                        boardViewModel.insertStickyNote(selection: selection, beginEditing: true)
                    }
                    .keyboardShortcut("n", modifiers: [.command, .shift])
                    .help("Adds a sticky note centered in the current view")
                    Divider()
                    Button("Bar chart") {
                        boardViewModel.insertChart(kind: .bar, selection: selection)
                    }
                    .help("Insert a sample bar chart at the center of the view")
                    Button("Line chart") {
                        boardViewModel.insertChart(kind: .line, selection: selection)
                    }
                    .help("Insert a sample line chart at the center of the view")
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "rectangle.split.2x1")
                            .font(.system(size: 14, weight: .medium))
                        Text("View")
                            .font(.subheadline.weight(.medium))
                    }
                }
                .help("Grid, canvas framing, insert items in view, and charts")

                Menu {
                    Button("PNG…") {
                        CanvasExportService.presentExportPanel(
                            boardState: boardViewModel.boardState,
                            documentTitle: document.title,
                            format: .png
                        )
                    }
                    .help("Save the board as a PNG image")
                    Button("PDF…") {
                        CanvasExportService.presentExportPanel(
                            boardState: boardViewModel.boardState,
                            documentTitle: document.title,
                            format: .pdf
                        )
                    }
                    .help("Save the board as a one-page PDF")
                } label: {
                    Label("Export", systemImage: "square.and.arrow.up")
                        .font(.system(size: 14, weight: .medium))
                        .labelStyle(.titleAndIcon)
                }
                .help("Save this board as PNG or PDF")
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
