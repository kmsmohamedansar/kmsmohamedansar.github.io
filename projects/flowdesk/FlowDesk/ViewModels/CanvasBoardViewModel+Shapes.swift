import CoreGraphics
import Foundation

extension CanvasBoardViewModel {
    @discardableResult
    func insertShape(
        kind: FlowDeskShapeKind,
        selection: CanvasSelectionModel
    ) -> UUID {
        canvasTool = .select
        dismissCanvasContextPanel()
        stopAllInlineEditing()

        let id = UUID()
        var payload = ShapePayload.default
        payload.kind = kind

        let (w, h) = Self.defaultSize(for: kind)
        let origin = insertionOriginForNewElement(width: w, height: h)
        let record = CanvasElementRecord(
            id: id,
            kind: .shape,
            x: origin.x,
            y: origin.y,
            width: w,
            height: h,
            zIndex: nextZIndex(),
            shapePayload: payload
        )

        applyBoardMutation { state in
            state.elements.append(record)
        }

        selection.selectOnly(id)
        return id
    }

    /// Click-to-place while `canvasTool == .placeShape`; does not change the active tool.
    @discardableResult
    func insertShapeAtCanvasPoint(
        kind: FlowDeskShapeKind,
        point: CGPoint,
        selection: CanvasSelectionModel
    ) -> UUID {
        stopAllInlineEditing()
        let id = UUID()
        var payload = ShapePayload.default
        payload.kind = kind
        let (w, h) = Self.defaultSize(for: kind)
        let origin = CanvasInsertionPlacement.topLeftFromCenter(
            centerX: Double(point.x),
            centerY: Double(point.y),
            elementWidth: w,
            elementHeight: h,
            canvasLogicalSize: 4000
        )
        let record = CanvasElementRecord(
            id: id,
            kind: .shape,
            x: origin.x,
            y: origin.y,
            width: w,
            height: h,
            zIndex: nextZIndex(),
            shapePayload: payload
        )
        applyBoardMutation { state in
            state.elements.append(record)
        }
        selection.selectOnly(id)
        return id
    }

    /// Drag-to-define frame while `canvasTool == .placeShape`.
    @discardableResult
    func insertShapeInCanvasRect(
        kind: FlowDeskShapeKind,
        rect: CGRect,
        selection: CanvasSelectionModel
    ) -> UUID {
        stopAllInlineEditing()
        let std = rect.standardized
        let (defW, defH) = Self.defaultSize(for: kind)
        let minW = CanvasShapeLayout.minWidth
        let minH = CanvasShapeLayout.minHeight
        let canvasMax: Double = 4000
        var x = Double(std.minX)
        var y = Double(std.minY)
        var w = Double(std.width)
        var h = Double(std.height)
        switch kind {
        case .line, .arrow:
            w = max(defW * 0.35, w, minW)
            h = max(defH, h, minH)
        default:
            w = max(minW, w)
            h = max(minH, h)
        }
        x = max(0, min(x, canvasMax - w))
        y = max(0, min(y, canvasMax - h))
        w = min(w, canvasMax - x)
        h = min(h, canvasMax - y)
        let id = UUID()
        var payload = ShapePayload.default
        payload.kind = kind
        let record = CanvasElementRecord(
            id: id,
            kind: .shape,
            x: x,
            y: y,
            width: w,
            height: h,
            zIndex: nextZIndex(),
            shapePayload: payload
        )
        applyBoardMutation { state in
            state.elements.append(record)
        }
        selection.selectOnly(id)
        return id
    }

    private static func defaultSize(for kind: FlowDeskShapeKind) -> (width: Double, height: Double) {
        switch kind {
        case .rectangle, .roundedRectangle:
            return (200, 130)
        case .ellipse:
            return (180, 120)
        case .line, .arrow:
            return (220, 40)
        }
    }

    func updateShapePayload(id: UUID, _ body: (inout ShapePayload) -> Void) {
        updateElement(id: id) { element in
            guard element.kind == .shape else { return }
            var payload = element.resolvedShapePayload()
            body(&payload)
            element.shapePayload = payload
        }
    }

    func setShapeFrame(id: UUID, x: Double, y: Double, width: Double, height: Double) {
        updateElement(id: id) { element in
            guard element.kind == .shape else { return }
            element.x = x
            element.y = y
            element.width = max(width, CanvasShapeLayout.minWidth)
            element.height = max(height, CanvasShapeLayout.minHeight)
        }
    }
}
