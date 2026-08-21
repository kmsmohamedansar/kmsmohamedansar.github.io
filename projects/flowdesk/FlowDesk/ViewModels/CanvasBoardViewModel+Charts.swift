import Foundation

extension CanvasBoardViewModel {
    private static let chartDefaultWidth: Double = 340
    private static let chartDefaultHeight: Double = 240

    @discardableResult
    func insertChart(kind: FlowDeskChartKind, selection: CanvasSelectionModel) -> UUID {
        canvasTool = .select
        dismissCanvasContextPanel()
        stopAllInlineEditing()

        let id = UUID()
        var payload = ChartPayload.default
        payload.kind = kind
        payload.title = kind == .bar ? "Quarterly" : "Trend"
        payload.showTitle = true
        payload.points = ChartPayload.sampleStarterPoints

        let origin = insertionOriginForNewElement(width: Self.chartDefaultWidth, height: Self.chartDefaultHeight)
        let record = CanvasElementRecord(
            id: id,
            kind: .chart,
            x: origin.x,
            y: origin.y,
            width: Self.chartDefaultWidth,
            height: Self.chartDefaultHeight,
            zIndex: nextZIndex(),
            chartPayload: payload
        )

        applyBoardMutation { state in
            state.elements.append(record)
        }

        selection.selectOnly(id)
        return id
    }

    func updateChartPayload(id: UUID, _ body: (inout ChartPayload) -> Void) {
        updateElement(id: id) { element in
            guard element.kind == .chart else { return }
            var payload = element.resolvedChartPayload()
            body(&payload)
            element.chartPayload = payload
        }
    }

    func setChartFrame(id: UUID, x: Double, y: Double, width: Double, height: Double) {
        updateElement(id: id) { element in
            guard element.kind == .chart else { return }
            element.x = x
            element.y = y
            element.width = max(width, CanvasChartLayout.minWidth)
            element.height = max(height, CanvasChartLayout.minHeight)
        }
    }
}
