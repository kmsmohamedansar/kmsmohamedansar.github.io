import CoreGraphics
import Foundation

extension CanvasBoardViewModel {
    /// Commits a freehand stroke from **absolute** canvas coordinates (same space as element frames).
    func commitFreehandStroke(absoluteCanvasPoints: [CGPoint], selection: CanvasSelectionModel) {
        let decimated = StrokePathSmoothing.decimatedCanvasPoints(absoluteCanvasPoints, minDistance: 2)
        guard decimated.count >= 2 else { return }

        stopAllInlineEditing()

        let pad = max(6, CGFloat(drawingLineWidth) * 0.5 + 4)
        let xs = decimated.map(\.x)
        let ys = decimated.map(\.y)
        guard let minX = xs.min(), let maxX = xs.max(), let minY = ys.min(), let maxY = ys.max() else { return }

        let originX = Double(minX) - Double(pad)
        let originY = Double(minY) - Double(pad)
        let w = max(8, Double(maxX - minX) + Double(pad) * 2)
        let h = max(8, Double(maxY - minY) + Double(pad) * 2)

        let localPoints: [StrokePathPoint] = decimated.map { p in
            StrokePathPoint(x: Double(p.x) - originX, y: Double(p.y) - originY)
        }

        var payload = StrokePayload.default
        payload.points = localPoints
        payload.color = drawingStrokeColor
        payload.lineWidth = drawingLineWidth
        payload.opacity = drawingStrokeOpacity.clamped(to: 0...1)

        let id = UUID()
        let record = CanvasElementRecord(
            id: id,
            kind: .stroke,
            x: originX,
            y: originY,
            width: w,
            height: h,
            zIndex: nextZIndex(),
            strokePayload: payload
        )

        applyBoardMutation { state in
            state.elements.append(record)
        }

        selection.selectOnly(id)
    }

    func updateStrokePayload(id: UUID, _ body: (inout StrokePayload) -> Void) {
        updateElement(id: id) { element in
            guard element.kind == .stroke else { return }
            var payload = element.resolvedStrokePayload()
            body(&payload)
            payload.opacity = payload.opacity.clamped(to: 0...1)
            element.strokePayload = payload
        }
    }

    func setStrokeFrame(id: UUID, x: Double, y: Double, width: Double, height: Double) {
        updateElement(id: id) { element in
            guard element.kind == .stroke else { return }
            element.x = x
            element.y = y
            element.width = max(width, 1)
            element.height = max(height, 1)
        }
    }

}

private extension Double {
    func clamped(to range: ClosedRange<Double>) -> Double {
        min(max(self, range.lowerBound), range.upperBound)
    }
}
