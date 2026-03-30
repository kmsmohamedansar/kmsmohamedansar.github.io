import CoreGraphics
import Foundation

extension CanvasBoardViewModel {
    /// Clears alignment guides (call when drag/resize ends or context changes).
    func clearAlignmentGuides() {
        activeAlignmentGuides = []
    }

    func updateAlignmentGuides(_ guides: [CanvasAlignmentGuide]) {
        activeAlignmentGuides = guides
    }

    func snapMoveFrame(
        rawOrigin: CGPoint,
        size: CGSize,
        excludingElementIds: Set<UUID>,
        movingElementId: UUID? = nil
    ) -> (origin: CGPoint, guides: [CanvasAlignmentGuide]) {
        let proposed = CGRect(origin: rawOrigin, size: size)
        let (snapped, guides) = CanvasSnapEngine.snapMove(
            proposed: proposed,
            excludingElementIds: excludingElementIds,
            elements: boardState.elements,
            canvasSize: CanvasSnapEngine.defaultCanvasLogicalSize,
            threshold: CanvasSnapEngine.defaultThreshold
        )
        var r = CGRect(origin: snapped.origin, size: proposed.size)
        var merged = guides
        if let mid = movingElementId {
            let (rh, gh) = CanvasSnapEngine.refineEqualHorizontalMargins(
                rect: r,
                movingElementId: mid,
                excludingElementIds: excludingElementIds,
                elements: boardState.elements,
                canvasSize: CanvasSnapEngine.defaultCanvasLogicalSize,
                threshold: CanvasSnapEngine.defaultThreshold
            )
            r = rh
            for g in gh where !merged.contains(g) { merged.append(g) }
            let (rv, gv) = CanvasSnapEngine.refineEqualVerticalMargins(
                rect: r,
                movingElementId: mid,
                excludingElementIds: excludingElementIds,
                elements: boardState.elements,
                canvasSize: CanvasSnapEngine.defaultCanvasLogicalSize,
                threshold: CanvasSnapEngine.defaultThreshold
            )
            r = rv
            for g in gv where !merged.contains(g) { merged.append(g) }
        }
        return (r.origin, merged)
    }

    func snapResizeBottomRightFrame(
        origin: CGPoint,
        rawSize: CGSize,
        elementId: UUID,
        minWidth: CGFloat,
        minHeight: CGFloat
    ) -> (size: CGSize, guides: [CanvasAlignmentGuide]) {
        let proposed = CGRect(origin: origin, size: rawSize)
        let (snapped, guides) = CanvasSnapEngine.snapResizeBottomRight(
            proposed: proposed,
            resizingElementId: elementId,
            elements: boardState.elements,
            minWidth: minWidth,
            minHeight: minHeight,
            canvasSize: CanvasSnapEngine.defaultCanvasLogicalSize,
            threshold: CanvasSnapEngine.defaultThreshold
        )
        return (snapped.size, guides)
    }

    func snapPlacementDraftRect(
        rawRect: CGRect,
        minWidth: CGFloat,
        minHeight: CGFloat
    ) -> (rect: CGRect, guides: [CanvasAlignmentGuide]) {
        CanvasSnapEngine.snapPlacementDraft(
            proposed: rawRect,
            elements: boardState.elements,
            minWidth: minWidth,
            minHeight: minHeight,
            canvasSize: CanvasSnapEngine.defaultCanvasLogicalSize,
            threshold: CanvasSnapEngine.defaultThreshold
        )
    }
}
