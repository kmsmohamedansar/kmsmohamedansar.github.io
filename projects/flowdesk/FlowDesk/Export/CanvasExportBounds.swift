import CoreGraphics
import Foundation

/// Decides the canvas-space rectangle exported to PNG/PDF.
/// v1: union of element frames, padded, clamped to the logical board; empty boards use a centered fallback.
enum CanvasExportBounds {
    /// Keep in sync with `CanvasBoardView` canvas extent.
    static let logicalCanvasSize: CGFloat = 4000

    static let contentPadding: CGFloat = 48

    static let emptyFallbackWidth: CGFloat = 960
    static let emptyFallbackHeight: CGFloat = 540

    /// Logical points (canvas coordinates). Width/height always ≥ 1.
    static func exportRect(elements: [CanvasElementRecord]) -> CGRect {
        let canvasRect = CGRect(x: 0, y: 0, width: logicalCanvasSize, height: logicalCanvasSize)

        guard !elements.isEmpty else {
            let x = (logicalCanvasSize - emptyFallbackWidth) / 2
            let y = (logicalCanvasSize - emptyFallbackHeight) / 2
            return CGRect(x: x, y: y, width: emptyFallbackWidth, height: emptyFallbackHeight)
        }

        var union = CGRect.null
        for element in elements {
            var r = CGRect(x: element.x, y: element.y, width: element.width, height: element.height)
            if element.kind == .stroke, let payload = element.strokePayload {
                let pad = max(3, payload.lineWidth * 0.5 + 2)
                r = r.insetBy(dx: -pad, dy: -pad)
            }
            union = union.union(r)
        }

        let padded = union.insetBy(dx: -contentPadding, dy: -contentPadding)
        let clipped = padded.intersection(canvasRect)

        if clipped.isNull || clipped.width < 1 || clipped.height < 1 {
            let x = (logicalCanvasSize - emptyFallbackWidth) / 2
            let y = (logicalCanvasSize - emptyFallbackHeight) / 2
            return CGRect(x: x, y: y, width: emptyFallbackWidth, height: emptyFallbackHeight)
        }

        return clipped
    }
}
