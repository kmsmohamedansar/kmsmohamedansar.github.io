import CoreGraphics
import Foundation

extension CanvasBoardViewModel {
    /// Layout frames of selected elements (canvas coordinates).
    func selectionLayoutBounds(for selection: CanvasSelectionModel) -> CGRect? {
        let ids = selection.selectedElementIDs
        guard !ids.isEmpty else { return nil }
        let elements = boardState.elements.filter { ids.contains($0.id) }
        guard !elements.isEmpty else { return nil }
        var u = CGRect.null
        for el in elements {
            u = u.union(CGRect(x: el.x, y: el.y, width: el.width, height: el.height))
        }
        guard !u.isNull, u.width >= 1, u.height >= 1 else { return nil }
        return u
    }

    /// Scales and pans so all board content fits the current visible viewport (uses live insertion snapshot when available).
    func fitViewportToBoardContent(canvasMargin: Double = 72) {
        let rect = CanvasExportBounds.exportRect(elements: boardState.elements)
        applyViewportFitting(rect: expandRect(rect, margin: canvasMargin))
    }

    /// Pans so export content is centered at the current zoom level.
    func centerViewportOnBoardContent(canvasMargin: Double = 0) {
        var rect = CanvasExportBounds.exportRect(elements: boardState.elements)
        if canvasMargin > 0 {
            rect = expandRect(rect, margin: canvasMargin)
        }
        centerViewport(on: rect)
    }

    /// Fits the viewport around the current selection (disabled when empty).
    func fitViewportToSelection(selection: CanvasSelectionModel, canvasMargin: Double = 56) {
        guard let rect = selectionLayoutBounds(for: selection) else { return }
        applyViewportFitting(rect: expandRect(rect, margin: canvasMargin))
    }

    // MARK: - Private

    private func visibleViewportSize() -> (width: Double, height: Double) {
        if let snap = insertionViewportSnapshot {
            return (snap.visibleWidth, snap.visibleHeight)
        }
        return (900, 600)
    }

    private func expandRect(_ rect: CGRect, margin: Double) -> CGRect {
        rect.insetBy(dx: -margin, dy: -margin)
    }

    /// Avoids extreme zoom when the union rect is a single tiny frame (selection or sparse content).
    private func rectExpandedForStableFitting(_ rect: CGRect) -> CGRect {
        let minW: CGFloat = 168
        let minH: CGFloat = 168
        var r = rect
        if r.width < minW {
            let pad = (minW - r.width) * 0.5
            r = r.insetBy(dx: -pad, dy: 0)
        }
        if r.height < minH {
            let pad = (minH - r.height) * 0.5
            r = r.insetBy(dx: 0, dy: -pad)
        }
        return r
    }

    private func centerViewport(on rect: CGRect) {
        let (W, H) = visibleViewportSize()
        guard W > 8, H > 8 else { return }
        let s = CanvasInsertionPlacement.clampedDisplayScale(for: boardState.viewport)
        let midVX = W * 0.5
        let midVY = H * 0.5
        var vp = boardState.viewport
        vp.offsetX = midVX - Double(rect.midX) * s
        vp.offsetY = midVY - Double(rect.midY) * s
        setViewport(vp)
    }

    private func applyViewportFitting(rect: CGRect) {
        let (W, H) = visibleViewportSize()
        guard W > 8, H > 8 else { return }
        let r = rectExpandedForStableFitting(rect)
        guard r.width >= 8, r.height >= 8 else { return }
        let sx = W / Double(r.width)
        let sy = H / Double(r.height)
        var s = min(sx, sy)
        s = min(4, max(0.25, s))
        let midVX = W * 0.5
        let midVY = H * 0.5
        var vp = boardState.viewport
        vp.scale = s
        vp.offsetX = midVX - Double(r.midX) * s
        vp.offsetY = midVY - Double(r.midY) * s
        setViewport(vp)
    }

    /// Toggles grid visibility (same as View menu); records undo like other viewport changes.
    func toggleViewportShowGrid() {
        var vp = boardState.viewport
        vp.showGrid.toggle()
        setViewport(vp)
    }

    /// Step zoom (matches zoom HUD step factor).
    func nudgeViewportZoomIn() {
        nudgeViewportZoom(multiplyingBy: 1.12)
    }

    /// Step zoom out (matches zoom HUD step factor).
    func nudgeViewportZoomOut() {
        nudgeViewportZoom(multiplyingBy: 1 / 1.12)
    }

    private func nudgeViewportZoom(multiplyingBy factor: Double) {
        var vp = boardState.viewport
        vp.scale = max(0.25, min(4, vp.scale * factor))
        setViewport(vp)
    }
}
