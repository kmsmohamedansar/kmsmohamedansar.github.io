import Foundation

// MARK: - Delete

extension CanvasBoardViewModel {
    func deleteElements(ids: Set<UUID>, selection: CanvasSelectionModel) {
        guard !ids.isEmpty else { return }
        stopAllInlineEditing()
        applyBoardMutation { state in
            state.elements.removeAll { ids.contains($0.id) }
        }
        selection.removeFromSelection(ids)
    }

    /// Deletes the current selection (Delete / Backspace, toolbar).
    func deleteSelectedElements(selection: CanvasSelectionModel) {
        let ids = selection.selectedElementIDs
        guard !ids.isEmpty else { return }
        deleteElements(ids: ids, selection: selection)
    }
}

// MARK: - Duplicate

extension CanvasBoardViewModel {
    /// Copies one element (any kind except connector alone); new id, offset frame, top z-index, selects the copy.
    func duplicateElement(id: UUID, selection: CanvasSelectionModel) {
        guard let el = boardState.elements.first(where: { $0.id == id }) else { return }
        guard el.kind != .connector else { return }
        stopAllInlineEditing()
        let newId = UUID()
        let z = nextZIndex()
        let o = Self.boardCascadeOffset
        guard let copy = el.boardDuplicatedCopy(
            newId: newId,
            deltaX: o,
            deltaY: o,
            zIndex: z,
            endpointIDRemap: nil
        ) else { return }
        applyBoardMutation { state in
            state.elements.append(copy)
        }
        selection.selectOnly(newId)
    }

    /// Duplicates the sole primary selection (exactly one selected element). Toolbar / ⌘D.
    func duplicatePrimarySelection(selection: CanvasSelectionModel) {
        guard let id = selection.primarySelectedID else { return }
        duplicateElement(id: id, selection: selection)
    }

    /// When multi-select exists later, duplicate each selected item in z-order in one persist and select the top copy.
    func duplicateAllSelectedElements(selection: CanvasSelectionModel) {
        let ordered = elementsSortedByZIndex().filter { selection.selectedElementIDs.contains($0.id) }
        guard let first = ordered.first else { return }
        if ordered.count == 1 {
            duplicateElement(id: first.id, selection: selection)
            return
        }
        stopAllInlineEditing()
        let stagger: Double = 12
        var idRemap: [UUID: UUID] = [:]
        for el in ordered {
            idRemap[el.id] = UUID()
        }
        var newIDs: [UUID] = []
        applyBoardMutation { state in
            var maxZ = state.elements.map(\.zIndex).max() ?? 0
            for (i, el) in ordered.enumerated() {
                guard let newId = idRemap[el.id] else { continue }
                maxZ += 1
                let dx = Self.boardCascadeOffset + Double(i) * stagger
                let dy = Self.boardCascadeOffset + Double(i) * stagger
                guard let copy = el.boardDuplicatedCopy(
                    newId: newId,
                    deltaX: dx,
                    deltaY: dy,
                    zIndex: maxZ,
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

// MARK: - Z-order (per element)

extension CanvasBoardViewModel {
    /// Sort key for stacking: `zIndex` then stable id tie-break (matches interaction order when z collides).
    func elementsSortedByZIndex() -> [CanvasElementRecord] {
        boardState.elements.sorted {
            if $0.zIndex != $1.zIndex { return $0.zIndex < $1.zIndex }
            return $0.id.uuidString < $1.id.uuidString
        }
    }

    func canBringElementForward(id: UUID) -> Bool {
        let s = elementsSortedByZIndex()
        guard let i = s.firstIndex(where: { $0.id == id }) else { return false }
        return i < s.count - 1
    }

    func canSendElementBackward(id: UUID) -> Bool {
        let s = elementsSortedByZIndex()
        guard let i = s.firstIndex(where: { $0.id == id }) else { return false }
        return i > 0
    }

    func bringElementForward(id: UUID) {
        let s = elementsSortedByZIndex()
        guard let i = s.firstIndex(where: { $0.id == id }), i < s.count - 1 else { return }
        swapZIndex(a: s[i].id, b: s[i + 1].id)
    }

    func sendElementBackward(id: UUID) {
        let s = elementsSortedByZIndex()
        guard let i = s.firstIndex(where: { $0.id == id }), i > 0 else { return }
        swapZIndex(a: s[i].id, b: s[i - 1].id)
    }

    func bringElementToFront(id: UUID) {
        guard boardState.elements.contains(where: { $0.id == id }) else { return }
        let maxZ = boardState.elements.map(\.zIndex).max() ?? 0
        updateElement(id: id) { $0.zIndex = maxZ + 1 }
    }

    func sendElementToBack(id: UUID) {
        guard boardState.elements.contains(where: { $0.id == id }) else { return }
        let minZ = boardState.elements.map(\.zIndex).min() ?? 0
        updateElement(id: id) { $0.zIndex = minZ - 1 }
    }

    // MARK: Selection-based stacking (v1: primary only; multi-select uses Arrange after selecting one item)

    func canBringSelectionForward(selection: CanvasSelectionModel) -> Bool {
        guard let id = selection.primarySelectedID else { return false }
        return canBringElementForward(id: id)
    }

    func canSendSelectionBackward(selection: CanvasSelectionModel) -> Bool {
        guard let id = selection.primarySelectedID else { return false }
        return canSendElementBackward(id: id)
    }

    func bringSelectionForward(selection: CanvasSelectionModel) {
        guard let id = selection.primarySelectedID else { return }
        bringElementForward(id: id)
    }

    func sendSelectionBackward(selection: CanvasSelectionModel) {
        guard let id = selection.primarySelectedID else { return }
        sendElementBackward(id: id)
    }

    func bringSelectionToFront(selection: CanvasSelectionModel) {
        guard let id = selection.primarySelectedID else { return }
        bringElementToFront(id: id)
    }

    func sendSelectionToBack(selection: CanvasSelectionModel) {
        guard let id = selection.primarySelectedID else { return }
        sendElementToBack(id: id)
    }

    private func swapZIndex(a: UUID, b: UUID) {
        applyBoardMutation { state in
            guard let ia = state.elements.firstIndex(where: { $0.id == a }),
                  let ib = state.elements.firstIndex(where: { $0.id == b })
            else { return }
            let za = state.elements[ia].zIndex
            state.elements[ia].zIndex = state.elements[ib].zIndex
            state.elements[ib].zIndex = za
        }
    }
}
