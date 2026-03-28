import AppKit
import SwiftUI

/// Renders board content for export only: no selection, guides, draft ink, or resize handles.
/// Reuses existing display/building blocks (`TextBlockDisplayView`, charts, shapes, strokes).
struct CanvasBoardExportContentView: View {
    let boardState: CanvasBoardState
    let exportRect: CGRect

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
    }

    @ViewBuilder
    private func exportBackground(showGrid: Bool) -> some View {
        ZStack {
            FlowDeskTheme.canvasWorkspaceBackgroundExport
            if showGrid {
                CanvasGridOverlay(
                    spacing: 24,
                    lineWidth: 0.35,
                    lineOpacity: FlowDeskTheme.gridLineOpacity(for: .light)
                )
            }
        }
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
