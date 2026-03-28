import Foundation

/// Live viewport context from `CanvasBoardView` (visible size, pan, zoom). Not persisted.
struct CanvasInsertionViewportSnapshot: Equatable, Sendable {
    var visibleWidth: Double
    var visibleHeight: Double
    var viewport: ViewportState
    var panDragWidth: Double
    var panDragHeight: Double
    /// Logical board edge length in canvas space (matches `CanvasBoardView.canvasSize`).
    var canvasLogicalSize: Double
}

/// Maps between the clipped canvas view and board coordinates using the same transform as `CanvasBoardView`.
enum CanvasInsertionPlacement {
    /// Must stay in sync with `CanvasBoardView` scale clamp.
    static func clampedDisplayScale(for viewport: ViewportState) -> Double {
        min(max(viewport.scale, 0.25), 4)
    }

    /// Top-left `(x, y)` in canvas space so the element is centered on the visible viewport center, with light staggering.
    static func topLeftForVisibleCenter(
        elementWidth: Double,
        elementHeight: Double,
        staggerIndex: Int,
        snapshot: CanvasInsertionViewportSnapshot
    ) -> (x: Double, y: Double)? {
        guard snapshot.visibleWidth > 1, snapshot.visibleHeight > 1 else { return nil }

        let scale = clampedDisplayScale(for: snapshot.viewport)
        let ox = snapshot.viewport.offsetX + snapshot.panDragWidth
        let oy = snapshot.viewport.offsetY + snapshot.panDragHeight

        let midVX = snapshot.visibleWidth * 0.5
        let midVY = snapshot.visibleHeight * 0.5

        var cx = (midVX - ox) / scale
        var cy = (midVY - oy) / scale

        let sx = staggerIndex % 7
        let sy = (staggerIndex / 7) % 7
        cx += Double(sx) * 22
        cy += Double(sy) * 22

        var x = cx - elementWidth * 0.5
        var y = cy - elementHeight * 0.5

        let maxX = max(0, snapshot.canvasLogicalSize - elementWidth)
        let maxY = max(0, snapshot.canvasLogicalSize - elementHeight)
        x = min(max(0, x), maxX)
        y = min(max(0, y), maxY)
        return (x, y)
    }

    /// When no snapshot exists, center the element on the board in canvas space.
    static func topLeftBoardCentered(
        elementWidth: Double,
        elementHeight: Double,
        canvasLogicalSize: Double,
        staggerIndex: Int
    ) -> (x: Double, y: Double) {
        var cx = canvasLogicalSize * 0.5
        var cy = canvasLogicalSize * 0.5
        let sx = staggerIndex % 7
        let sy = (staggerIndex / 7) % 7
        cx += Double(sx) * 22
        cy += Double(sy) * 22
        var x = cx - elementWidth * 0.5
        var y = cy - elementHeight * 0.5
        let maxX = max(0, canvasLogicalSize - elementWidth)
        let maxY = max(0, canvasLogicalSize - elementHeight)
        x = min(max(0, x), maxX)
        y = min(max(0, y), maxY)
        return (x, y)
    }

    /// Top-left for an element whose **center** is at `(centerX, centerY)` in canvas space (e.g. click-to-place).
    static func topLeftFromCenter(
        centerX: Double,
        centerY: Double,
        elementWidth: Double,
        elementHeight: Double,
        canvasLogicalSize: Double
    ) -> (x: Double, y: Double) {
        var x = centerX - elementWidth * 0.5
        var y = centerY - elementHeight * 0.5
        let maxX = max(0, canvasLogicalSize - elementWidth)
        let maxY = max(0, canvasLogicalSize - elementHeight)
        x = min(max(0, x), maxX)
        y = min(max(0, y), maxY)
        return (x, y)
    }
}

extension CanvasBoardViewModel {
    func syncInsertionViewportSnapshot(_ snapshot: CanvasInsertionViewportSnapshot) {
        insertionViewportSnapshot = snapshot
    }

    /// Call before each insert so repeated creations do not stack exactly.
    func nextInsertionStaggerIndex() -> Int {
        defer { insertionStaggerCounter += 1 }
        return insertionStaggerCounter
    }

    func insertionOriginForNewElement(
        width: Double,
        height: Double,
        canvasLogicalSize: Double = 4000
    ) -> (x: Double, y: Double) {
        let stagger = nextInsertionStaggerIndex()
        if let snap = insertionViewportSnapshot,
           let o = CanvasInsertionPlacement.topLeftForVisibleCenter(
            elementWidth: width,
            elementHeight: height,
            staggerIndex: stagger,
            snapshot: snap
           ) {
            return o
        }
        return CanvasInsertionPlacement.topLeftBoardCentered(
            elementWidth: width,
            elementHeight: height,
            canvasLogicalSize: canvasLogicalSize,
            staggerIndex: stagger
        )
    }
}
