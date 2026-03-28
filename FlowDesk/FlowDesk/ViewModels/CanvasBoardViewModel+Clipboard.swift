import Foundation

// MARK: - Copy / paste (pasteboard + undo via `applyBoardMutation`)

extension CanvasBoardViewModel {
    /// Copies the current selection (any element kinds) to the app pasteboard as JSON. Does not change the board.
    func copySelectedElementsToPasteboard(selection: CanvasSelectionModel) {
        let ordered = elementsSortedByZIndex().filter { selection.selectedElementIDs.contains($0.id) }
        guard !ordered.isEmpty else { return }
        stopAllInlineEditing()
        guard FlowDeskCanvasClipboard.write(elements: ordered) else { return }
        clipboardPasteGeneration = 0
        clipboardRevision += 1
    }

    /// Whether the pasteboard contains a decodable FlowDesk element payload (depends on `clipboardRevision` for observation).
    var canPasteFromClipboard: Bool {
        _ = clipboardRevision
        return FlowDeskCanvasClipboard.canPaste
    }

    /// Pastes clipboard elements with new ids, stacked z-order, and a cascading offset from the copied coordinates.
    func pasteClipboardElements(selection: CanvasSelectionModel) {
        guard let elements = FlowDeskCanvasClipboard.readElements(), !elements.isEmpty else { return }
        stopAllInlineEditing()

        let step = CanvasBoardViewModel.boardCascadeOffset * Double(clipboardPasteGeneration + 1)
        clipboardPasteGeneration += 1

        var newIDs: [UUID] = []
        applyBoardMutation { state in
            var z = state.elements.map(\.zIndex).max() ?? 0
            for el in elements {
                z += 1
                let newId = UUID()
                let copy = CanvasElementRecord(
                    id: newId,
                    kind: el.kind,
                    x: el.x + step,
                    y: el.y + step,
                    width: el.width,
                    height: el.height,
                    zIndex: z,
                    textBlock: el.textBlock,
                    stickyNote: el.stickyNote,
                    shapePayload: el.shapePayload,
                    strokePayload: el.strokePayload,
                    chartPayload: el.chartPayload
                )
                state.elements.append(copy)
                newIDs.append(newId)
            }
        }
        if !newIDs.isEmpty {
            selection.replaceSelection(Set(newIDs))
        }
    }
}
