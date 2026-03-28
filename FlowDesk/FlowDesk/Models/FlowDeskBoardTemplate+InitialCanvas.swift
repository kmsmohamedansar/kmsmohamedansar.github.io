import Foundation

// MARK: - Initial persisted state (centralized; JSON-only, backward compatible)
//
// User-facing creation uses `.smartCanvas` and `.blankBoard` only. Other cases stay for decode + older boards.

extension FlowDeskBoardTemplate {
    /// Full board snapshot for a new document from this template.
    func makeInitialCanvasState() -> CanvasBoardState {
        var state = CanvasBoardState()
        state.boardTemplate = self
        state.viewport = Self.viewport(for: self)
        state.elements = Self.elements(for: self)
        return state
    }

    /// Tool to activate when the editor opens this board. Session-only UI state lives in the view model, not JSON.
    var preferredInitialCanvasTool: CanvasToolMode {
        switch self {
        case .whiteboard:
            return .draw
        case .document, .smartCanvas, .flowDiagram, .blankBoard:
            return .select
        }
    }

    private static func viewport(for template: FlowDeskBoardTemplate) -> ViewportState {
        switch template {
        case .document:
            // Slight zoom reads as a focused writing surface; grid off keeps noise low.
            return ViewportState(scale: 1.06, offsetX: 0, offsetY: 0, showGrid: false)
        case .whiteboard:
            return ViewportState(scale: 1, offsetX: 0, offsetY: 0, showGrid: true)
        case .smartCanvas:
            return ViewportState(scale: 1, offsetX: 0, offsetY: 0, showGrid: true)
        case .flowDiagram:
            // Pull back slightly so the starter diagram reads at a glance.
            return ViewportState(scale: 0.92, offsetX: 0, offsetY: 0, showGrid: true)
        case .blankBoard:
            return ViewportState(scale: 1, offsetX: 0, offsetY: 0, showGrid: false)
        }
    }

    private static func elements(for template: FlowDeskBoardTemplate) -> [CanvasElementRecord] {
        switch template {
        case .document:
            return [documentWritingSurface()]
        case .whiteboard:
            return []
        case .smartCanvas:
            return smartCanvasHybrid()
        case .flowDiagram:
            return flowDiagramStarter()
        case .blankBoard:
            return []
        }
    }

    // MARK: Document

    private static func documentWritingSurface() -> CanvasElementRecord {
        var body = TextBlockPayload.default
        body.text = ""
        body.fontSize = 18
        body.alignment = .leading
        return CanvasElementRecord(
            id: UUID(),
            kind: .textBlock,
            x: 88,
            y: 64,
            width: 720,
            height: 520,
            zIndex: 0,
            textBlock: body
        )
    }

    // MARK: Smart canvas

    private static func smartCanvasHybrid() -> [CanvasElementRecord] {
        var mainText = TextBlockPayload.default
        mainText.text = ""
        mainText.fontSize = 16
        mainText.alignment = .leading

        var sticky = StickyNotePayload.default
        sticky.text = ""
        sticky.backgroundColor = StickyNoteColorPreset.mint.rgba

        let frameFill = CanvasRGBAColor(red: 0.55, green: 0.58, blue: 0.62, opacity: 0.06)
        let frameStroke = CanvasRGBAColor(red: 0.45, green: 0.48, blue: 0.52, opacity: 0.35)
        let scratchFrame = ShapePayload(
            kind: .roundedRectangle,
            strokeColor: frameStroke,
            fillColor: frameFill,
            lineWidth: 1.5,
            cornerRadius: 18
        )

        return [
            CanvasElementRecord(
                id: UUID(),
                kind: .textBlock,
                x: 72,
                y: 88,
                width: 440,
                height: 300,
                zIndex: 12,
                textBlock: mainText
            ),
            CanvasElementRecord(
                id: UUID(),
                kind: .stickyNote,
                x: 540,
                y: 96,
                width: 228,
                height: 200,
                zIndex: 14,
                stickyNote: sticky
            ),
            CanvasElementRecord(
                id: UUID(),
                kind: .shape,
                x: 488,
                y: 340,
                width: 320,
                height: 220,
                zIndex: 6,
                shapePayload: scratchFrame
            ),
        ]
    }

    // MARK: Flow diagram

    private static func flowDiagramStarter() -> [CanvasElementRecord] {
        let nodeStroke = CanvasRGBAColor(red: 0.22, green: 0.28, blue: 0.38, opacity: 1)
        let nodeFill = CanvasRGBAColor(red: 0.42, green: 0.55, blue: 0.92, opacity: 0.12)
        let endFill = CanvasRGBAColor(red: 0.38, green: 0.72, blue: 0.55, opacity: 0.14)
        let arrowStroke = CanvasRGBAColor(red: 0.32, green: 0.36, blue: 0.44, opacity: 1)

        func nodeRounded(x: Double, y: Double, w: Double, h: Double, z: Int, fill: CanvasRGBAColor) -> CanvasElementRecord {
            CanvasElementRecord(
                id: UUID(),
                kind: .shape,
                x: x,
                y: y,
                width: w,
                height: h,
                zIndex: z,
                shapePayload: ShapePayload(
                    kind: .roundedRectangle,
                    strokeColor: nodeStroke,
                    fillColor: fill,
                    lineWidth: 2,
                    cornerRadius: min(16, h * 0.22)
                )
            )
        }

        func arrowConnector(x: Double, y: Double, w: Double, h: Double, z: Int) -> CanvasElementRecord {
            CanvasElementRecord(
                id: UUID(),
                kind: .shape,
                x: x,
                y: y,
                width: w,
                height: h,
                zIndex: z,
                shapePayload: ShapePayload(
                    kind: .arrow,
                    strokeColor: arrowStroke,
                    fillColor: .defaultText,
                    lineWidth: 2.5,
                    cornerRadius: 0
                )
            )
        }

        // Horizontal three-step flow: Start → Step → End (ellipse for visual distinction).
        let n1 = nodeRounded(x: 120, y: 210, w: 132, h: 72, z: 20, fill: nodeFill)
        let a1 = arrowConnector(x: 252, y: 234, w: 76, h: 28, z: 15)
        let n2 = nodeRounded(x: 328, y: 200, w: 148, h: 92, z: 20, fill: nodeFill)
        let a2 = arrowConnector(x: 476, y: 234, w: 76, h: 28, z: 15)
        let n3 = CanvasElementRecord(
            id: UUID(),
            kind: .shape,
            x: 552,
            y: 208,
            width: 124,
            height: 76,
            zIndex: 20,
            shapePayload: ShapePayload(
                kind: .ellipse,
                strokeColor: nodeStroke,
                fillColor: endFill,
                lineWidth: 2,
                cornerRadius: 0
            )
        )

        return [n1, a1, n2, a2, n3]
    }
}
