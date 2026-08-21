import Foundation

// MARK: - Viewport + board mutations (with undo)

extension CanvasBoardViewModel {
    func setViewport(_ viewport: ViewportState, recordUndo: Bool = true) {
        if canvasUndoApplying {
            mutateBoardState { $0.viewport = viewport }
            persist()
            return
        }

        let snapshotBefore = boardState
        mutateBoardState { $0.viewport = viewport }
        persist()

        guard recordUndo, boardState != snapshotBefore else {
            refreshBoardUndoAvailability()
            return
        }

        canvasRedoStack.removeAll()
        if canvasUndoCoalescingDepth > 0, let baseline = canvasUndoCoalesceBaseline {
            canvasUndoStack.append(baseline)
            canvasUndoCoalesceBaseline = nil
            trimCanvasUndoStackIfNeeded()
        } else if canvasUndoCoalescingDepth == 0 {
            canvasUndoStack.append(snapshotBefore)
            trimCanvasUndoStackIfNeeded()
        }
        refreshBoardUndoAvailability()
    }

    /// Applies a change to `boardState` and persists. Records one undo step unless `recordUndo` is false or state is unchanged.
    func applyBoardMutation(recordUndo: Bool = true, _ body: (inout CanvasBoardState) -> Void) {
        if canvasUndoApplying {
            mutateBoardState { state in
                body(&state)
                CanvasConnectorGeometry.reconcileConnectorFrames(in: &state.elements)
            }
            persist()
            return
        }

        let snapshotBeforeMutation = boardState
        mutateBoardState { state in
            body(&state)
            CanvasConnectorGeometry.reconcileConnectorFrames(in: &state.elements)
        }
        persist()

        guard recordUndo, boardState != snapshotBeforeMutation else {
            refreshBoardUndoAvailability()
            return
        }

        canvasRedoStack.removeAll()
        if canvasUndoCoalescingDepth > 0, let baseline = canvasUndoCoalesceBaseline {
            canvasUndoStack.append(baseline)
            canvasUndoCoalesceBaseline = nil
            trimCanvasUndoStackIfNeeded()
        } else if canvasUndoCoalescingDepth == 0 {
            canvasUndoStack.append(snapshotBeforeMutation)
            trimCanvasUndoStackIfNeeded()
        }
        refreshBoardUndoAvailability()
    }
}

// MARK: - Coalescing (one undo step per continuous resize, etc.)

extension CanvasBoardViewModel {
    /// Call when starting a gesture that will issue many `applyBoardMutation` calls (e.g. live resize).
    func beginBoardUndoCoalescing() {
        if canvasUndoCoalescingDepth == 0 {
            canvasUndoCoalesceBaseline = boardState
        }
        canvasUndoCoalescingDepth += 1
    }

    /// Call when the gesture ends. Pairs with `beginBoardUndoCoalescing()`.
    func endBoardUndoCoalescing() {
        guard canvasUndoCoalescingDepth > 0 else { return }
        canvasUndoCoalescingDepth -= 1
        if canvasUndoCoalescingDepth == 0 {
            canvasUndoCoalesceBaseline = nil
        }
    }
}

// MARK: - Undo / redo actions

extension CanvasBoardViewModel {
    func undoBoard() {
        guard let previous = canvasUndoStack.popLast() else { return }
        canvasRedoStack.append(boardState)
        canvasUndoApplying = true
        replaceEntireBoardState(previous)
        canvasUndoApplying = false
        persist()
        canvasUndoCoalesceBaseline = nil
        canvasUndoCoalescingDepth = 0
        refreshBoardUndoAvailability()
    }

    func redoBoard() {
        guard let next = canvasRedoStack.popLast() else { return }
        canvasUndoStack.append(boardState)
        canvasUndoApplying = true
        replaceEntireBoardState(next)
        canvasUndoApplying = false
        persist()
        canvasUndoCoalesceBaseline = nil
        canvasUndoCoalescingDepth = 0
        refreshBoardUndoAvailability()
    }

    func resetCanvasUndoHistory() {
        canvasUndoStack.removeAll()
        canvasRedoStack.removeAll()
        canvasUndoCoalesceBaseline = nil
        canvasUndoCoalescingDepth = 0
        canvasUndoApplying = false
        refreshBoardUndoAvailability()
    }

    func trimCanvasUndoStackIfNeeded() {
        while canvasUndoStack.count > canvasUndoStackLimit {
            canvasUndoStack.removeFirst()
        }
    }
}
