import AppKit
import Foundation

extension CanvasBoardViewModel {
    /// When non-nil, the view for `optionDuplicateSourceElementID` is dragging but frame updates apply to `optionDuplicateTargetElementID`.
    var isOptionDuplicateDragActive: Bool {
        optionDuplicateSourceElementID != nil && optionDuplicateTargetElementID != nil
    }

    func clearOptionDuplicateDragState() {
        if optionDuplicateUndoCoalescingActive {
            endBoardUndoCoalescing()
            optionDuplicateUndoCoalescingActive = false
        }
        optionDuplicateSourceElementID = nil
        optionDuplicateTargetElementID = nil
    }

    /// Element id whose frame should update during a canvas item move gesture.
    func moveGestureSubjectElementId(viewElementId: UUID) -> UUID {
        if optionDuplicateSourceElementID == viewElementId, let t = optionDuplicateTargetElementID {
            return t
        }
        return viewElementId
    }

    /// If ⌥ is down and selection is a single framed item, duplicate at the same frame and select the copy; returns whether a duplicate was created.
    /// Connectors are excluded (`participatesInSnapping` is false for `.connector`), so option-drag never duplicates links.
    @discardableResult
    func beginOptionDuplicateIfNeeded(fromElementId: UUID, selection: CanvasSelectionModel) -> Bool {
        guard !isOptionDuplicateDragActive else { return false }
        guard selection.selectedElementIDs.count <= 1, selection.isSelected(fromElementId) else { return false }
        guard NSEvent.modifierFlags.contains(.option) else { return false }
        guard let el = boardState.elements.first(where: { $0.id == fromElementId }) else { return false }
        guard CanvasSnapEngine.participatesInSnapping(el.kind) else { return false }
        stopAllInlineEditing()
        beginBoardUndoCoalescing()
        optionDuplicateUndoCoalescingActive = true
        let newId = UUID()
        let z = nextZIndex()
        let copy = CanvasElementRecord(
            id: newId,
            kind: el.kind,
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            zIndex: z,
            textBlock: el.textBlock,
            stickyNote: el.stickyNote,
            shapePayload: el.shapePayload,
            strokePayload: el.strokePayload,
            chartPayload: el.chartPayload,
            connectorPayload: el.connectorPayload
        )
        applyBoardMutation { state in
            state.elements.append(copy)
        }
        optionDuplicateSourceElementID = fromElementId
        optionDuplicateTargetElementID = newId
        selection.selectOnly(newId)
        return true
    }
}
