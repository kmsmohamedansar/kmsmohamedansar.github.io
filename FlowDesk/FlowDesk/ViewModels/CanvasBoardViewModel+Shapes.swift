import Foundation

extension CanvasBoardViewModel {
    @discardableResult
    func insertShape(
        kind: FlowDeskShapeKind,
        selection: CanvasSelectionModel
    ) -> UUID {
        canvasTool = .select
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
