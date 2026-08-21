import AppKit
import SwiftUI

/// Renders board content for export only: no selection, guides, draft ink, or resize handles.
/// Reuses existing display/building blocks (`TextBlockDisplayView`, charts, shapes, strokes).
struct CanvasBoardExportContentView: View {
    let boardState: CanvasBoardState
    let exportRect: CGRect
    /// Matches the user’s light/dark + style preset for background and grid (see `CanvasExportService`).
    let tokens: FlowDeskAppearanceTokens
    let colorScheme: ColorScheme

    private var sortedElements: [CanvasElementRecord] {
        boardState.elements.sorted {
            if $0.zIndex != $1.zIndex { return $0.zIndex < $1.zIndex }
            return $0.id.uuidString < $1.id.uuidString
        }
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            exportBackground(showGrid: boardState.viewport.showGrid)
                .frame(width: exportRect.width, height: exportRect.height)

            ForEach(sortedElements) { element in
                exportElement(element)
                    .frame(width: CGFloat(element.width), height: CGFloat(element.height))
                    .offset(
                        x: CGFloat(element.x) - exportRect.minX,
                        y: CGFloat(element.y) - exportRect.minY
                    )
                    .zIndex(Double(element.zIndex))
            }
        }
        .frame(width: exportRect.width, height: exportRect.height)
        .environment(\.flowDeskTokens, tokens)
    }

    @ViewBuilder
    private func exportBackground(showGrid: Bool) -> some View {
        FlowDeskTheme.canvasWorkspaceMatBackground(
            tokens: tokens,
            colorScheme: colorScheme,
            showGrid: showGrid,
            includeFilmGrain: false
        )
    }

    @ViewBuilder
    private func exportElement(_ element: CanvasElementRecord) -> some View {
        switch element.kind {
        case .textBlock:
            exportTextBlock(element)
        case .stickyNote:
            exportStickyNote(element)
        case .shape:
            ShapeCanvasShapeView(payload: element.resolvedShapePayload())
        case .stroke:
            let payload = element.resolvedStrokePayload()
            FreehandStrokeShapeView(
                points: payload.points,
                color: payload.color,
                lineWidth: CGFloat(payload.lineWidth),
                opacity: payload.opacity
            )
        case .chart:
            exportChart(element)
        case .connector:
            if let payload = element.resolvedConnectorPayload(),
               let a = boardState.elements.first(where: { $0.id == payload.startElementID }),
               let b = boardState.elements.first(where: { $0.id == payload.endElementID }) {
                let ra = CGRect(x: CGFloat(a.x), y: CGFloat(a.y), width: CGFloat(a.width), height: CGFloat(a.height))
                let rb = CGRect(x: CGFloat(b.x), y: CGFloat(b.y), width: CGFloat(b.width), height: CGFloat(b.height))
                let pa = CanvasConnectorGeometry.pointOnElementFrame(edge: payload.startEdge, t: CGFloat(payload.startT), rect: ra)
                let pb = CanvasConnectorGeometry.pointOnElementFrame(edge: payload.endEdge, t: CGFloat(payload.endT), rect: rb)
                let o = CGPoint(x: CGFloat(element.x), y: CGFloat(element.y))
                let poly = CanvasConnectorGeometry.routingPolyline(
                    start: pa,
                    end: pb,
                    startEdge: payload.startEdge,
                    endEdge: payload.endEdge,
                    lineStyle: payload.style
                )
                let lw = CGFloat(payload.lineWidth)
                let strokeColor = payload.strokeColor.swiftUIColor
                let labelText = payload.label.trimmingCharacters(in: .whitespacesAndNewlines)
                let connectorPathLen = CanvasConnectorGeometry.polylineTotalLength(poly)
                ZStack {
                    Path { path in
                        guard let first = poly.first else { return }
                        path.move(to: CGPoint(x: first.x - o.x, y: first.y - o.y))
                        for pt in poly.dropFirst() {
                            path.addLine(to: CGPoint(x: pt.x - o.x, y: pt.y - o.y))
                        }
                    }
                    .stroke(
                        strokeColor,
                        style: StrokeStyle(lineWidth: lw, lineCap: .round, lineJoin: .round)
                    )
                    if payload.style == .arrow,
                       poly.count >= 2,
                       let tipCanvas = poly.last,
                       let fromCanvas = poly.dropLast().last {
                        let tip = CGPoint(x: tipCanvas.x - o.x, y: tipCanvas.y - o.y)
                        let from = CGPoint(x: fromCanvas.x - o.x, y: fromCanvas.y - o.y)
                        let g = FlowDeskConnectorVisuals.arrowheadGeometry(tip: tip, from: from, lineWidth: lw)
                        let tri = FlowDeskConnectorVisuals.arrowheadTrianglePath(g)
                        tri
                            .stroke(Color.primary.opacity(FlowDeskConnectorVisuals.arrowOutlineOpacity), lineWidth: g.outlineLineWidth)
                        tri
                            .fill(strokeColor)
                    }
                    if !labelText.isEmpty,
                       connectorPathLen >= FlowDeskConnectorVisuals.connectorLabelMinPathLengthToShow,
                       let midCanvas = CanvasConnectorGeometry.pointAtMidLengthAlongPolyline(poly) {
                        let midLocal = CGPoint(x: midCanvas.x - o.x, y: midCanvas.y - o.y)
                        Text(labelText)
                            .font(.system(size: FlowDeskConnectorVisuals.connectorLabelFontSize, weight: .medium))
                            .foregroundStyle(strokeColor)
                            .lineLimit(1)
                            .truncationMode(.tail)
                            .frame(maxWidth: FlowDeskConnectorVisuals.connectorLabelMaxWidth)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(nsColor: .textBackgroundColor).opacity(0.94), in: Capsule())
                            .overlay {
                                Capsule().strokeBorder(Color.primary.opacity(0.07), lineWidth: 0.5)
                            }
                            .shadow(color: Color.black.opacity(0.1), radius: 2, y: 1)
                            .position(midLocal)
                    }
                }
            }
        @unknown default:
            CanvasElementChrome(element: element, isSelected: false)
        }
    }

    private func exportTextBlock(_ element: CanvasElementRecord) -> some View {
        let payload = element.resolvedTextPayload()
        let padding = FlowDeskTheme.textBlockContentPadding
        return ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: FlowDeskTheme.textBlockCornerRadius, style: .continuous)
                .fill(Color(nsColor: .textBackgroundColor))
                .shadow(
                    color: Color.black.opacity(FlowDeskTheme.cardShadowOpacity(selected: false)),
                    radius: FlowDeskTheme.cardShadowRadius(selected: false),
                    x: 0,
                    y: FlowDeskTheme.cardShadowY(selected: false)
                )
                .overlay {
                    RoundedRectangle(cornerRadius: FlowDeskTheme.textBlockCornerRadius, style: .continuous)
                        .strokeBorder(Color.primary.opacity(0.06), lineWidth: 0.5)
                }

            Group {
                if payload.text.isEmpty {
                    Color.clear
                } else {
                    TextBlockDisplayView(payload: payload)
                }
            }
            .padding(padding)
        }
    }

    private func exportStickyNote(_ element: CanvasElementRecord) -> some View {
        let payload = element.resolvedStickyNotePayload()
        let shape = RoundedRectangle(cornerRadius: CanvasStickyNoteLayout.cornerRadius, style: .continuous)
        return ZStack(alignment: .topLeading) {
            shape
                .fill(payload.backgroundColor.swiftUIColor)
                .shadow(
                    color: Color.black.opacity(FlowDeskTheme.cardShadowOpacity(selected: false)),
                    radius: FlowDeskTheme.cardShadowRadius(selected: false),
                    x: 0,
                    y: FlowDeskTheme.cardShadowY(selected: false)
                )
                .overlay {
                    shape
                        .strokeBorder(Color.white.opacity(0.35), lineWidth: 0.5)
                        .blendMode(.plusLighter)
                }

            Group {
                if payload.text.isEmpty {
                    Color.clear
                } else {
                    StickyNoteDisplayView(payload: payload)
                }
            }
            .padding(CanvasStickyNoteLayout.contentPadding)
        }
    }

    private func exportChart(_ element: CanvasElementRecord) -> some View {
        let payload = element.resolvedChartPayload()
        let cardShape = RoundedRectangle(cornerRadius: FlowDeskTheme.chartCardCornerRadius, style: .continuous)
        return ZStack {
            cardShape
                .fill(Color(nsColor: .textBackgroundColor))
                .shadow(
                    color: Color.black.opacity(FlowDeskTheme.cardShadowOpacity(selected: false)),
                    radius: FlowDeskTheme.cardShadowRadius(selected: false),
                    x: 0,
                    y: FlowDeskTheme.cardShadowY(selected: false)
                )
            cardShape
                .strokeBorder(Color.primary.opacity(0.055), lineWidth: 0.75)

            VStack(alignment: .leading, spacing: FlowDeskTheme.chartTitleSpacing) {
                if payload.showTitle {
                    Text(payload.title.isEmpty ? "Chart" : payload.title)
                        .font(.headline)
                        .foregroundStyle(payload.title.isEmpty ? .tertiary : .primary)
                        .lineLimit(1)
                }
                ChartBlockChartView(payload: payload)
                    .frame(minHeight: 80)
            }
            .padding(FlowDeskTheme.chartCardContentPadding)
        }
    }
}
