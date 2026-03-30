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

        var idRemap: [UUID: UUID] = [:]
        for el in elements {
            idRemap[el.id] = UUID()
        }
        var newIDs: [UUID] = []
        applyBoardMutation { state in
            var z = state.elements.map(\.zIndex).max() ?? 0
            for el in elements {
                guard let newId = idRemap[el.id] else { continue }
                z += 1
                guard let copy = el.boardDuplicatedCopy(
                    newId: newId,
                    deltaX: step,
                    deltaY: step,
                    zIndex: z,
                    endpointIDRemap: idRemap
                ) else { continue }
                state.elements.append(copy)
                newIDs.append(newId)
            }
        }
        if !newIDs.isEmpty {
            selection.replaceSelection(Set(newIDs))
        }
    }
}
