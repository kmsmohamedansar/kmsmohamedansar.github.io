import CoreGraphics
import Foundation

// MARK: - Multi-select framed move (one undo step, shared translation)

extension CanvasBoardViewModel {
    func resetGroupMoveState() {
        groupMoveLeaderID = nil
        groupMovePreviewTranslation = .zero
        groupMoveLiveCanvasTranslation = .zero
        groupMoveParticipantIDs = []
    }

    /// Selected elements that participate in framed multi-move (excludes strokes).
    func framedSelectedElementIDs(selection: CanvasSelectionModel) -> Set<UUID> {
        let ids = selection.selectedElementIDs
        return Set(
            boardState.elements
                .filter { ids.contains($0.id) && CanvasSnapEngine.participatesInSnapping($0.kind) }
                .map(\.id)
        )
    }

    /// Call on first `moveGesture` change for the dragged framed element.
    func configureGroupMoveIfNeeded(leaderId: UUID, selection: CanvasSelectionModel) {
        cancelConnectorEndpointAdjust()
        let framed = framedSelectedElementIDs(selection: selection)
        guard framed.count > 1, framed.contains(leaderId) else {
            resetGroupMoveState()
            return
        }
        groupMoveLeaderID = leaderId
        groupMoveParticipantIDs = framed
        groupMovePreviewTranslation = .zero
    }

    func syncGroupMovePreview(leaderId: UUID, translation: CGSize) {
        guard groupMoveLeaderID == leaderId else { return }
        groupMovePreviewTranslation = translation
        groupMoveLiveCanvasTranslation = translation
    }

    /// IDs to exclude from snap targets while dragging `leaderId` (co-moving selection + leader).
    func snapExclusionsForFramedMove(leaderId: UUID, selection: CanvasSelectionModel) -> Set<UUID> {
        let framed = framedSelectedElementIDs(selection: selection)
        if framed.count > 1, framed.contains(leaderId) {
            return framed
        }
        return Set([leaderId])
    }

    /// Applies the same canvas delta to all framed participants in one mutation (undo).
    func applyFramedGroupPositionDelta(ids: Set<UUID>, dx: Double, dy: Double) {
        guard !ids.isEmpty, (dx != 0 || dy != 0) else { return }
        let canvasSize = Double(CanvasSnapEngine.defaultCanvasLogicalSize)
        applyBoardMutation { state in
            for i in state.elements.indices {
                guard ids.contains(state.elements[i].id) else { continue }
                let el = state.elements[i]
                guard CanvasSnapEngine.participatesInSnapping(el.kind) else { continue }
                var nx = el.x + dx
                var ny = el.y + dy
                nx = max(0, min(nx, canvasSize - el.width))
                ny = max(0, min(ny, canvasSize - el.height))
                state.elements[i].x = nx
                state.elements[i].y = ny
            }
        }
    }
}
