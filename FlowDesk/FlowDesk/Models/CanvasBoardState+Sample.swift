import Foundation

extension CanvasBoardState {
    /// Demo elements exercising each `CanvasElementKind` for UI wiring.
    static func sampleWelcomeBoard() -> CanvasBoardState {
        CanvasBoardState(
            viewport: ViewportState(scale: 1, offsetX: 0, offsetY: 0, showGrid: true),
            elements: [
                CanvasElementRecord(
                    kind: .textBlock,
                    x: 140,
                    y: 180,
                    width: 360,
                    height: 140,
                    zIndex: 10,
                    textBlock: TextBlockPayload(
                        text: "Welcome to Cerebra. Double-click text to edit. Drag empty space to pan; pinch on a trackpad to zoom. Add items with the tools on the left; use Export in the toolbar for PNG or PDF.",
                        fontSize: 17,
                        isBold: true,
                        color: .defaultText,
                        alignment: .leading
                    )
                ),
                CanvasElementRecord(
                    kind: .stickyNote,
                    x: 520,
                    y: 200,
                    width: 220,
                    height: 200,
                    zIndex: 20,
                    stickyNote: StickyNotePayload(
                        text: "Capture side thoughts here—drag, resize, or change paper color in the inspector.",
                        backgroundColor: StickyNoteColorPreset.blush.rgba,
                        fontSize: 14,
                        isBold: false,
                        textColor: .defaultText
                    )
                ),
                CanvasElementRecord(
                    kind: .shape,
                    x: 160,
                    y: 380,
                    width: 280,
                    height: 180,
                    zIndex: 15,
                    shapePayload: ShapePayload(
                        kind: .roundedRectangle,
                        strokeColor: CanvasRGBAColor(red: 0.12, green: 0.52, blue: 0.38, opacity: 1),
                        fillColor: CanvasRGBAColor(red: 0.35, green: 0.78, blue: 0.62, opacity: 0.18),
                        lineWidth: 2.5,
                        cornerRadius: 16
                    )
                ),
                CanvasElementRecord(
                    kind: .chart,
                    x: 500,
                    y: 400,
                    width: 320,
                    height: 220,
                    zIndex: 25,
                    chartPayload: ChartPayload(
                        kind: .bar,
                        title: "Sample revenue",
                        showTitle: true,
                        points: [
                            ChartDataPoint(label: "Mon", value: 42),
                            ChartDataPoint(label: "Tue", value: 58),
                            ChartDataPoint(label: "Wed", value: 49),
                            ChartDataPoint(label: "Thu", value: 71),
                            ChartDataPoint(label: "Fri", value: 64),
                        ]
                    )
                ),
                CanvasElementRecord(
                    kind: .stroke,
                    x: 300,
                    y: 280,
                    width: 160,
                    height: 100,
                    zIndex: 30,
                    strokePayload: StrokePayload(
                        points: [
                            StrokePathPoint(x: 8, y: 72),
                            StrokePathPoint(x: 32, y: 24),
                            StrokePathPoint(x: 72, y: 80),
                            StrokePathPoint(x: 112, y: 16),
                            StrokePathPoint(x: 148, y: 64),
                        ],
                        color: CanvasRGBAColor(red: 0.35, green: 0.35, blue: 0.42, opacity: 1),
                        lineWidth: 3.5,
                        opacity: 1
                    )
                ),
            ]
        )
    }
}
