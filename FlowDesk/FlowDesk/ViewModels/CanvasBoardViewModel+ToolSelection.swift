import Foundation

extension CanvasBoardViewModel {
    /// Switches the active canvas tool. Keyboard activation keeps the rail but closes progressive panels so tools switch instantly.
    func applyCanvasToolSelection(_ mode: CanvasToolMode, fromKeyboard: Bool, rectanglePlacementShape: Bool = false) {
        cancelConnectorDrag()
        cancelConnectorEndpointAdjust()
        stopAllInlineEditing()
        switch mode {
        case .select:
            canvasTool = .select
            canvasContextPanel = nil
        case .draw:
            canvasTool = .draw
            if fromKeyboard {
                canvasContextPanel = nil
            } else if canvasContextPanel == .drawStroke {
                canvasContextPanel = nil
            } else {
                canvasContextPanel = .drawStroke
            }
        case .placeText:
            canvasTool = .placeText
            canvasContextPanel = nil
        case .placeSticky:
            canvasTool = .placeSticky
            canvasContextPanel = nil
        case .placeShape:
            canvasTool = .placeShape
            if rectanglePlacementShape {
                placeShapeKind = .rectangle
            }
            if fromKeyboard {
                canvasContextPanel = nil
            } else if canvasContextPanel == .shapes {
                canvasContextPanel = nil
            } else {
                canvasContextPanel = .shapes
            }
        }
    }
}
