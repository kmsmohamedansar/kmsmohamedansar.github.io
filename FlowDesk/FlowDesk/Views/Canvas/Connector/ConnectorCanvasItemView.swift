import AppKit
import SwiftUI

/// Renders a persisted connector; geometry follows endpoint elements (see `CanvasConnectorGeometry.reconcileConnectorFrames`).
struct ConnectorCanvasItemView: View {
    @Environment(\.flowDeskTokens) private var tokens

    let element: CanvasElementRecord
    @Bindable var boardViewModel: CanvasBoardViewModel
    @Bindable var selection: CanvasSelectionModel

    @State private var hoveredEndpoint: Bool?
    @State private var labelDraft: String = ""
    @FocusState private var labelFieldFocused: Bool

    private var payload: ConnectorPayload? {
        element.resolvedConnectorPayload()
    }

    private var isEditingLabel: Bool {
        boardViewModel.editingConnectorLabelElementID == element.id
    }

    private var isSelected: Bool {
        selection.isSelected(element.id)
    }

    private var isAdjustingThisEndpoint: Bool {
        boardViewModel.connectorEndpointAdjustDraft?.connectorID == element.id
    }

    private var endpointHandlesVisible: Bool {
        isSelected
            && boardViewModel.canvasTool == .select
            && boardViewModel.connectorDragDraft == nil
            && boardViewModel.connectorEndpointAdjustDraft == nil
    }

    var body: some View {
        Group {
            if let payload {
                ZStack {
                    if !isAdjustingThisEndpoint {
                        connectorBody(payload: payload)
                    }
                    if endpointHandlesVisible {
                        connectorEndpointHandles(payload: payload)
                    }
                }
            }
        }
        .background(Color.clear.contentShape(Rectangle()))
        .highPriorityGesture(
            TapGesture(count: 2).onEnded {
                guard boardViewModel.canvasTool == .select else { return }
                selection.selectOnly(element.id)
                boardViewModel.beginEditingConnectorLabel(id: element.id)
            }
        )
        .onTapGesture {
            boardViewModel.stopAllInlineEditing()
            let extend = NSEvent.modifierFlags.contains(.shift)
            selection.handleCanvasTap(elementID: element.id, extendSelection: extend)
        }
        .onChange(of: boardViewModel.editingConnectorLabelElementID) { old, new in
            if new == element.id {
                labelDraft = element.resolvedConnectorPayload()?.label ?? ""
                DispatchQueue.main.async {
                    labelFieldFocused = true
                }
            } else {
                labelFieldFocused = false
                if old == element.id {
                    labelDraft = element.resolvedConnectorPayload()?.label ?? ""
                }
            }
        }
        .onChange(of: selection.selectedElementIDs) { _, newSet in
            guard boardViewModel.editingConnectorLabelElementID == element.id else { return }
            if !newSet.contains(element.id) {
                boardViewModel.commitConnectorLabel(id: element.id, text: labelDraft)
                boardViewModel.stopEditingConnectorLabel()
                labelFieldFocused = false
            }
        }
        .contextMenu {
            CanvasElementEditorContextMenuItems(
                elementID: element.id,
                boardViewModel: boardViewModel,
                selection: selection
            )
        }
    }

    private func canvasRect(for el: CanvasElementRecord) -> CGRect {
        var r = CGRect(x: CGFloat(el.x), y: CGFloat(el.y), width: CGFloat(el.width), height: CGFloat(el.height))
        if boardViewModel.groupMoveLeaderID != nil,
           boardViewModel.groupMoveParticipantIDs.contains(el.id) {
            let d = boardViewModel.groupMoveLiveCanvasTranslation
            r = r.offsetBy(dx: d.width, dy: d.height)
        }
        return r
    }

    private func endpoints(payload: ConnectorPayload) -> (CGPoint, CGPoint)? {
        guard let a = boardViewModel.boardState.elements.first(where: { $0.id == payload.startElementID }),
              let b = boardViewModel.boardState.elements.first(where: { $0.id == payload.endElementID })
        else { return nil }
        let ra = canvasRect(for: a)
        let rb = canvasRect(for: b)
        let pa = CanvasConnectorGeometry.pointOnElementFrame(
            edge: payload.startEdge,
            t: CGFloat(payload.startT),
            rect: ra
        )
        let pb = CanvasConnectorGeometry.pointOnElementFrame(
            edge: payload.endEdge,
            t: CGFloat(payload.endT),
            rect: rb
        )
        return (pa, pb)
    }

    @ViewBuilder
    private func connectorBody(payload: ConnectorPayload) -> some View {
        if let (pa, pb) = endpoints(payload: payload) {
            let o = CGPoint(x: CGFloat(element.x), y: CGFloat(element.y))
            let canvasPoly = CanvasConnectorGeometry.routingPolyline(
                start: pa,
                end: pb,
                startEdge: payload.startEdge,
                endEdge: payload.endEdge,
                lineStyle: payload.style
            )
            let localPoly = canvasPoly.map { CGPoint(x: $0.x - o.x, y: $0.y - o.y) }
            let lw = CGFloat(payload.lineWidth)
            let stroke = payload.strokeColor.swiftUIColor
            let path = connectorPath(points: localPoly)
            ZStack {
                if isSelected {
                    path
                        .stroke(
                            tokens.selectionStrokeColor.opacity(0.22),
                            style: StrokeStyle(lineWidth: lw + 7, lineCap: .round, lineJoin: .round)
                        )
                }
                if !isSelected {
                    path
                        .stroke(
                            Color.primary.opacity(FlowDeskConnectorVisuals.committedUnderlayOpacity),
                            style: StrokeStyle(
                                lineWidth: lw + FlowDeskConnectorVisuals.committedUnderlayExtraWidth,
                                lineCap: .round,
                                lineJoin: .round
                            )
                        )
                }
                path
                    .stroke(
                        stroke.opacity(isSelected ? 1 : FlowDeskConnectorVisuals.committedUnselectedStrokeOpacity),
                        style: StrokeStyle(lineWidth: lw, lineCap: .round, lineJoin: .round)
                    )
                if payload.style == .arrow, localPoly.count >= 2,
                   let tip = localPoly.last,
                   let from = localPoly.dropLast().last {
                    arrowHead(at: tip, from: from, color: stroke, lineWidth: lw)
                }
                connectorLabelLayer(payload: payload, localPoly: localPoly, stroke: stroke)
                if isSelected {
                    path
                        .stroke(
                            tokens.selectionStrokeColor.opacity(0.72),
                            style: StrokeStyle(lineWidth: max(2.5, lw + 1.75), lineCap: .round, lineJoin: .round)
                        )
                }
            }
        }
    }

    @ViewBuilder
    private func connectorLabelLayer(payload: ConnectorPayload, localPoly: [CGPoint], stroke: Color) -> some View {
        let pathLen = CanvasConnectorGeometry.polylineTotalLength(localPoly)
        if let mid = CanvasConnectorGeometry.pointAtMidLengthAlongPolyline(localPoly) {
            let trimmed = payload.label.trimmingCharacters(in: .whitespacesAndNewlines)
            let roomForReadablePill = pathLen >= FlowDeskConnectorVisuals.connectorLabelMinPathLengthToShow
            let showEditor = isEditingLabel
            let showReadOnly = !trimmed.isEmpty && roomForReadablePill && !isEditingLabel
            if showEditor || showReadOnly {
                let textOpacity = isSelected ? 1.0 : Double(FlowDeskConnectorVisuals.committedUnselectedStrokeOpacity)
                if showEditor {
                    TextField("Label", text: $labelDraft)
                        .textFieldStyle(.plain)
                        .font(.system(size: FlowDeskConnectorVisuals.connectorLabelFontSize, weight: .medium))
                        .multilineTextAlignment(.center)
                        .lineLimit(1)
                        .frame(maxWidth: FlowDeskConnectorVisuals.connectorLabelMaxWidth)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 4)
                        .background(Color(nsColor: .textBackgroundColor), in: Capsule())
                        .overlay {
                            Capsule().strokeBorder(tokens.selectionStrokeColor.opacity(0.42), lineWidth: 1)
                        }
                        .shadow(
                            color: Color.black.opacity(FlowDeskTheme.canvasAuxiliaryLabelShadowOpacity),
                            radius: FlowDeskTheme.canvasAuxiliaryLabelShadowRadius,
                            y: FlowDeskTheme.canvasAuxiliaryLabelShadowY
                        )
                        .position(mid)
                        .focused($labelFieldFocused)
                        .onSubmit {
                            boardViewModel.commitConnectorLabel(id: element.id, text: labelDraft)
                            boardViewModel.stopEditingConnectorLabel()
                            labelFieldFocused = false
                        }
                        .onKeyPress(.escape) {
                            boardViewModel.stopEditingConnectorLabel()
                            labelFieldFocused = false
                            return .handled
                        }
                        .onChange(of: labelFieldFocused) { _, focused in
                            guard !focused, isEditingLabel else { return }
                            boardViewModel.commitConnectorLabel(id: element.id, text: labelDraft)
                            boardViewModel.stopEditingConnectorLabel()
                        }
                        .onChange(of: labelDraft) { _, new in
                            let maxLen = FlowDeskConnectorVisuals.connectorLabelMaxCharacters
                            if new.count > maxLen {
                                labelDraft = String(new.prefix(maxLen))
                            }
                        }
                } else {
                    Text(trimmed)
                        .font(.system(size: FlowDeskConnectorVisuals.connectorLabelFontSize, weight: .medium))
                        .foregroundStyle(stroke.opacity(textOpacity))
                        .lineLimit(1)
                        .truncationMode(.tail)
                        .frame(maxWidth: FlowDeskConnectorVisuals.connectorLabelMaxWidth)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(nsColor: .textBackgroundColor).opacity(0.94), in: Capsule())
                        .overlay {
                            Capsule().strokeBorder(Color.primary.opacity(0.07), lineWidth: 0.5)
                        }
                        .shadow(
                            color: Color.black.opacity(FlowDeskTheme.canvasAuxiliaryLabelShadowOpacity * 0.85),
                            radius: FlowDeskTheme.canvasAuxiliaryLabelShadowRadius,
                            y: FlowDeskTheme.canvasAuxiliaryLabelShadowY
                        )
                        .position(mid)
                        .allowsHitTesting(false)
                }
            }
        }
    }

    private func connectorEndpointHandles(payload: ConnectorPayload) -> some View {
        Group {
            if let (pa, pb) = endpoints(payload: payload) {
                let o = CGPoint(x: CGFloat(element.x), y: CGFloat(element.y))
                let ls = CGPoint(x: pa.x - o.x, y: pa.y - o.y)
                let le = CGPoint(x: pb.x - o.x, y: pb.y - o.y)
                ZStack {
                    endpointHandleDot(
                        isStart: true,
                        local: ls,
                        payload: payload,
                        anchorCanvas: pb,
                        anchorEdge: payload.endEdge
                    )
                    endpointHandleDot(
                        isStart: false,
                        local: le,
                        payload: payload,
                        anchorCanvas: pa,
                        anchorEdge: payload.startEdge
                    )
                }
            }
        }
    }

    private func endpointHandleDot(
        isStart: Bool,
        local: CGPoint,
        payload: ConnectorPayload,
        anchorCanvas: CGPoint,
        anchorEdge: ConnectorEdge
    ) -> some View {
        let isHover = hoveredEndpoint == isStart
        let diameter: CGFloat = isHover ? 11 : 9
        return ZStack {
            if isHover {
                Circle()
                    .strokeBorder(tokens.selectionStrokeColor.opacity(0.45), lineWidth: 1.15)
                    .frame(width: diameter + 12, height: diameter + 12)
            }
            Circle()
                .fill(tokens.selectionStrokeColor.opacity(isHover ? 1 : 0.9))
                .frame(width: diameter, height: diameter)
                .overlay {
                    Circle().strokeBorder(Color.white.opacity(isHover ? 0.48 : 0.34), lineWidth: 0.85)
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
        .animation(.easeOut(duration: 0.14), value: hoveredEndpoint)
        .onHover { inside in
            if inside {
                hoveredEndpoint = isStart
            } else if hoveredEndpoint == isStart {
                hoveredEndpoint = nil
            }
        }
        .help(isStart ? "Drag to reconnect the start of this link" : "Drag to reconnect the end of this link")
        .highPriorityGesture(
            DragGesture(minimumDistance: 1, coordinateSpace: .named(FlowDeskLayout.canvasInnerCoordinateSpaceName))
                .onChanged { value in
                    if boardViewModel.connectorEndpointAdjustDraft == nil {
                        boardViewModel.beginConnectorEndpointAdjust(
                            connectorID: element.id,
                            isAdjustingStart: isStart,
                            anchorCanvasPoint: anchorCanvas,
                            anchorEdge: anchorEdge,
                            lineStyle: payload.style,
                            startDragCanvasPoint: value.location
                        )
                    } else {
                        boardViewModel.updateConnectorEndpointAdjust(currentCanvasPoint: value.location)
                    }
                }
                .onEnded { _ in
                    boardViewModel.commitConnectorEndpointAdjust(selection: selection)
                }
        )
    }

    private func connectorPath(points: [CGPoint]) -> Path {
        var p = Path()
        guard let first = points.first else { return p }
        p.move(to: first)
        for pt in points.dropFirst() {
            p.addLine(to: pt)
        }
        return p
    }

    private func arrowHead(at tip: CGPoint, from: CGPoint, color: Color, lineWidth: CGFloat) -> some View {
        let g = FlowDeskConnectorVisuals.arrowheadGeometry(tip: tip, from: from, lineWidth: lineWidth)
        let tri = FlowDeskConnectorVisuals.arrowheadTrianglePath(g)
        return ZStack {
            tri
                .stroke(Color.primary.opacity(FlowDeskConnectorVisuals.arrowOutlineOpacity), lineWidth: g.outlineLineWidth)
            tri
                .fill(color)
        }
    }
}
