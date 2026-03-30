import Foundation

extension CanvasBoardViewModel {
    /// Inserts a copy of a template’s starter elements near the visible center (new UUIDs, stacked z-order).
    func insertTemplateLayout(_ template: FlowDeskBoardTemplate, selection: CanvasSelectionModel) {
        stopAllInlineEditing()
        let templateState = template.makeInitialCanvasState()
        let elems = templateState.elements
        guard !elems.isEmpty else { return }

        var minX = Double.infinity
        var minY = Double.infinity
        var maxX = -Double.infinity
        var maxY = -Double.infinity
        for e in elems {
            minX = min(minX, e.x)
            minY = min(minY, e.y)
            maxX = max(maxX, e.x + e.width)
            maxY = max(maxY, e.y + e.height)
        }
        let templateCenterX = (minX + maxX) * 0.5
        let templateCenterY = (minY + maxY) * 0.5
        let templateW = max(1, maxX - minX)
        let templateH = max(1, maxY - minY)

        let (ox, oy) = insertionOriginForNewElement(width: templateW, height: templateH)
        let destCenterX = ox + templateW * 0.5
        let destCenterY = oy + templateH * 0.5
        let dx = destCenterX - templateCenterX
        let dy = destCenterY - templateCenterY

        var z = nextZIndex()
        applyBoardMutation { state in
            for e in elems {
                var copy = e
                copy.id = UUID()
                copy.x += dx
                copy.y += dy
                copy.zIndex = z
                z += 1
                state.elements.append(copy)
            }
        }
        selection.clear()
        canvasContextPanel = nil
        canvasTool = .select
    }

    /// Whiteboard preset: grid on, switch to draw—no new elements.
    func applyWhiteboardSessionPreset(selection: CanvasSelectionModel) {
        stopAllInlineEditing()
        applyBoardMutation { state in
            state.viewport.showGrid = true
            state.viewport.scale = min(max(state.viewport.scale, 0.25), 4)
        }
        selection.clear()
        canvasTool = .draw
        canvasContextPanel = .drawStroke
    }
}
