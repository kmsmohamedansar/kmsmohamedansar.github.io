import CoreGraphics
import Foundation

/// In-progress drag moving one end of an existing connector to a new attach target.
struct ConnectorEndpointAdjustDraft: Equatable {
    var connectorID: UUID
    /// `true` = moving the start attachment; `false` = moving the end.
    var isAdjustingStart: Bool
    var lineStyle: ConnectorLineStyle
    /// Canvas point of the fixed end (still attached).
    var anchorCanvasPoint: CGPoint
    var anchorEdge: ConnectorEdge
    var movingCanvasPoint: CGPoint
    var snapElementID: UUID?
    var snapEdge: ConnectorEdge?
    var snapT: Double?
    var snapCanvasPoint: CGPoint?
}

/// In-progress connector drag (not persisted).
struct ConnectorDragDraft: Equatable {
    var startElementID: UUID
    var startEdge: ConnectorEdge
    var startT: Double
    var style: ConnectorLineStyle
    var startCanvasPoint: CGPoint
    var currentCanvasPoint: CGPoint
    var snapElementID: UUID?
    var snapEdge: ConnectorEdge?
    var snapT: Double?
    var snapCanvasPoint: CGPoint?
}

extension CanvasBoardViewModel {
    func beginConnectorDrag(
        startElementID: UUID,
        startEdge: ConnectorEdge,
        startT: Double,
        startCanvasPoint: CGPoint,
        style: ConnectorLineStyle
    ) {
        cancelConnectorEndpointAdjust()
        stopAllInlineEditing()
        connectorDragDraft = ConnectorDragDraft(
            startElementID: startElementID,
            startEdge: startEdge,
            startT: startT,
            style: style,
            startCanvasPoint: startCanvasPoint,
            currentCanvasPoint: startCanvasPoint,
            snapElementID: nil,
            snapEdge: nil,
            snapT: nil,
            snapCanvasPoint: nil
        )
    }

    func updateConnectorDrag(currentCanvasPoint: CGPoint) {
        guard var draft = connectorDragDraft else { return }
        draft.currentCanvasPoint = currentCanvasPoint

        if let locked = draft.snapCanvasPoint {
            let pull = hypot(currentCanvasPoint.x - locked.x, currentCanvasPoint.y - locked.y)
            if pull < CanvasConnectorGeometry.attachSnapLockDistance {
                connectorDragDraft = draft
                return
            }
        }

        if let hit = CanvasConnectorGeometry.nearestAttachTarget(
            point: currentCanvasPoint,
            elements: boardState.elements,
            excludingElementID: draft.startElementID
        ), hit.elementID != draft.startElementID {
            draft.snapElementID = hit.elementID
            draft.snapEdge = hit.edge
            draft.snapT = Double(hit.t)
            draft.snapCanvasPoint = hit.snappedPoint
        } else {
            draft.snapElementID = nil
            draft.snapEdge = nil
            draft.snapT = nil
            draft.snapCanvasPoint = nil
        }
        connectorDragDraft = draft
    }

    func commitConnectorDrag(selection: CanvasSelectionModel) {
        guard let draft = connectorDragDraft,
              let endId = draft.snapElementID,
              let endEdge = draft.snapEdge,
              let endT = draft.snapT,
              let endPt = draft.snapCanvasPoint,
              endId != draft.startElementID
        else {
            connectorDragDraft = nil
            return
        }
        connectorDragDraft = nil
        let startEl = boardState.elements.first(where: { $0.id == draft.startElementID })
        let endEl = boardState.elements.first(where: { $0.id == endId })
        guard startEl != nil, endEl != nil else { return }
        let id = UUID()
        let z = nextZIndex()
        let pa = draft.startCanvasPoint
        let pb = endPt
        let poly = CanvasConnectorGeometry.routingPolyline(
            start: pa,
            end: pb,
            startEdge: draft.startEdge,
            endEdge: endEdge,
            lineStyle: draft.style
        )
        let box = CanvasConnectorGeometry.boundingFrame(polyline: poly, padding: CanvasConnectorGeometry.framePadding)
        let payload = ConnectorPayload(
            startElementID: draft.startElementID,
            endElementID: endId,
            startEdge: draft.startEdge,
            endEdge: endEdge,
            startT: draft.startT,
            endT: endT,
            style: draft.style,
            strokeColor: FlowDeskConnectorVisuals.defaultStrokeRGBA,
            lineWidth: FlowDeskConnectorVisuals.defaultLineWidthDouble,
            label: ""
        )
        let record = CanvasElementRecord(
            id: id,
            kind: .connector,
            x: Double(box.minX),
            y: Double(box.minY),
            width: Double(box.width),
            height: Double(box.height),
            zIndex: z,
            connectorPayload: payload
        )
        applyBoardMutation { state in
            state.elements.append(record)
        }
        // Select target element so the next connector (or duplicate) chains without hunting for handles.
        selection.selectOnly(endId)
    }

    func cancelConnectorDrag() {
        connectorDragDraft = nil
    }

    // MARK: - Reconnect (adjust endpoint)

    func beginConnectorEndpointAdjust(
        connectorID: UUID,
        isAdjustingStart: Bool,
        anchorCanvasPoint: CGPoint,
        anchorEdge: ConnectorEdge,
        lineStyle: ConnectorLineStyle,
        startDragCanvasPoint: CGPoint
    ) {
        cancelConnectorDrag()
        stopAllInlineEditing()
        connectorEndpointAdjustDraft = ConnectorEndpointAdjustDraft(
            connectorID: connectorID,
            isAdjustingStart: isAdjustingStart,
            lineStyle: lineStyle,
            anchorCanvasPoint: anchorCanvasPoint,
            anchorEdge: anchorEdge,
            movingCanvasPoint: startDragCanvasPoint,
            snapElementID: nil,
            snapEdge: nil,
            snapT: nil,
            snapCanvasPoint: nil
        )
        updateConnectorEndpointAdjust(currentCanvasPoint: startDragCanvasPoint)
    }

    func updateConnectorEndpointAdjust(currentCanvasPoint: CGPoint) {
        guard var draft = connectorEndpointAdjustDraft else { return }
        draft.movingCanvasPoint = currentCanvasPoint

        if let locked = draft.snapCanvasPoint {
            let pull = hypot(currentCanvasPoint.x - locked.x, currentCanvasPoint.y - locked.y)
            if pull < CanvasConnectorGeometry.attachSnapLockDistance {
                connectorEndpointAdjustDraft = draft
                return
            }
        }

        if let hit = CanvasConnectorGeometry.nearestAttachTarget(
            point: currentCanvasPoint,
            elements: boardState.elements,
            excludingElementID: nil
        ) {
            draft.snapElementID = hit.elementID
            draft.snapEdge = hit.edge
            draft.snapT = Double(hit.t)
            draft.snapCanvasPoint = hit.snappedPoint
        } else {
            draft.snapElementID = nil
            draft.snapEdge = nil
            draft.snapT = nil
            draft.snapCanvasPoint = nil
        }
        connectorEndpointAdjustDraft = draft
    }

    func commitConnectorEndpointAdjust(selection: CanvasSelectionModel) {
        guard let draft = connectorEndpointAdjustDraft,
              let snapEl = draft.snapElementID,
              let edge = draft.snapEdge,
              let t = draft.snapT,
              draft.snapCanvasPoint != nil
        else {
            cancelConnectorEndpointAdjust()
            return
        }
        connectorEndpointAdjustDraft = nil
        let connectorUUID = draft.connectorID
        applyBoardMutation { state in
            guard let i = state.elements.firstIndex(where: { $0.id == connectorUUID }),
                  var payload = state.elements[i].connectorPayload
            else { return }
            if draft.isAdjustingStart {
                payload.startElementID = snapEl
                payload.startEdge = edge
                payload.startT = t
            } else {
                payload.endElementID = snapEl
                payload.endEdge = edge
                payload.endT = t
            }
            state.elements[i].connectorPayload = payload
        }
        selection.selectOnly(snapEl)
    }

    func cancelConnectorEndpointAdjust() {
        connectorEndpointAdjustDraft = nil
    }

    // MARK: - Connector label (inline, one line)

    func beginEditingConnectorLabel(id: UUID) {
        guard boardState.elements.contains(where: { $0.id == id && $0.kind == .connector }) else { return }
        editingTextElementID = nil
        editingStickyNoteElementID = nil
        editingConnectorLabelElementID = id
    }

    func stopEditingConnectorLabel() {
        editingConnectorLabelElementID = nil
    }

    func commitConnectorLabel(id: UUID, text: String) {
        let maxLen = FlowDeskConnectorVisuals.connectorLabelMaxCharacters
        let trimmed = String(text.prefix(maxLen)).trimmingCharacters(in: .whitespacesAndNewlines)
        updateElement(id: id) { el in
            guard el.kind == .connector, var p = el.connectorPayload else { return }
            p.label = trimmed
            el.connectorPayload = p
        }
    }
}
