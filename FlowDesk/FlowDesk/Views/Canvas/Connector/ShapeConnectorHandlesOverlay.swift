import AppKit
import SwiftUI

/// Edge anchors on a selected framed item—shape, sticky note, or text block (select tool)—to start a connector drag in canvas space.
struct ShapeConnectorHandlesOverlay: View {
    let element: CanvasElementRecord
    @Bindable var boardViewModel: CanvasBoardViewModel
    @Bindable var selection: CanvasSelectionModel

    @Environment(\.flowDeskTokens) private var tokens

    @State private var hoveredEdge: ConnectorEdge?

    private let dotSize: CGFloat = 9

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            ZStack {
                handle(edge: .top, t: 0.5, at: CGPoint(x: w * 0.5, y: 0))
                handle(edge: .bottom, t: 0.5, at: CGPoint(x: w * 0.5, y: h))
                handle(edge: .left, t: 0.5, at: CGPoint(x: 0, y: h * 0.5))
                handle(edge: .right, t: 0.5, at: CGPoint(x: w, y: h * 0.5))
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .onChange(of: hoveredEdge) { _, edge in
            if edge != nil {
                NSCursor.crosshair.set()
            } else {
                NSCursor.arrow.set()
            }
        }
    }

    private func handle(edge: ConnectorEdge, t: Double, at local: CGPoint) -> some View {
        let canvasStart = CGPoint(
            x: CGFloat(element.x) + local.x,
            y: CGFloat(element.y) + local.y
        )
        let style: ConnectorLineStyle = NSEvent.modifierFlags.contains(.shift) ? .straight : .arrow
        let isHover = hoveredEdge == edge
        let visualDiameter = dotSize * (isHover ? 1.2 : 1)
        return ZStack {
            if isHover {
                Circle()
                    .strokeBorder(tokens.selectionStrokeColor.opacity(0.5), lineWidth: 1.25)
                    .frame(width: dotSize + 12, height: dotSize + 12)
            }
            Circle()
                .fill(tokens.selectionStrokeColor.opacity(isHover ? 1 : 0.9))
                .frame(width: visualDiameter, height: visualDiameter)
                .overlay {
                    Circle().strokeBorder(Color.white.opacity(isHover ? 0.5 : 0.34), lineWidth: 0.85)
                }
                .shadow(
                    color: Color.black.opacity(
                        isHover
                            ? FlowDeskTheme.canvasAuxiliaryLabelShadowOpacityHover
                            : FlowDeskTheme.canvasAuxiliaryLabelShadowOpacity
                    ),
                    radius: isHover ? FlowDeskTheme.canvasAuxiliaryLabelShadowRadiusHover : FlowDeskTheme.canvasAuxiliaryLabelShadowRadius * 0.75,
                    y: FlowDeskTheme.canvasAuxiliaryLabelShadowY
                )
        }
        .frame(width: 24, height: 24)
        .contentShape(Circle())
        .position(local)
        .animation(.easeOut(duration: 0.14), value: hoveredEdge)
        .onHover { inside in
            if inside {
                hoveredEdge = edge
            } else if hoveredEdge == edge {
                hoveredEdge = nil
            }
        }
        .highPriorityGesture(
                DragGesture(minimumDistance: 1, coordinateSpace: .named(FlowDeskLayout.canvasInnerCoordinateSpaceName))
                    .onChanged { value in
                        if boardViewModel.connectorDragDraft == nil {
                            boardViewModel.beginConnectorDrag(
                                startElementID: element.id,
                                startEdge: edge,
                                startT: t,
                                startCanvasPoint: canvasStart,
                                style: style
                            )
                        }
                        boardViewModel.updateConnectorDrag(currentCanvasPoint: value.location)
                    }
                    .onEnded { _ in
                        boardViewModel.commitConnectorDrag(selection: selection)
                    }
            )
    }
}
