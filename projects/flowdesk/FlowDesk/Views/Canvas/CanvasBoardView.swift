import AppKit
import SwiftUI

/// Renders the infinite-style board: viewport transform, grid, and element layers.
struct CanvasBoardView: View {
    @Bindable var boardViewModel: CanvasBoardViewModel
    @Bindable var selection: CanvasSelectionModel

    @Environment(\.flowDeskTokens) private var tokens
    @Environment(\.colorScheme) private var colorScheme

    @State private var panDragTranslation: CGSize = .zero
    @State private var draftCanvasPoints: [CGPoint] = []
    @State private var placementDragStart: CGPoint?
    @State private var placementPreviewRect: CGRect?

    private let canvasSize: CGFloat = 4000

    private var sortedElements: [CanvasElementRecord] {
        boardViewModel.boardState.elements.sorted { $0.zIndex < $1.zIndex }
    }

    private var connectorSnapTargetElementID: UUID? {
        boardViewModel.connectorDragDraft?.snapElementID ?? boardViewModel.connectorEndpointAdjustDraft?.snapElementID
    }

    var body: some View {
        GeometryReader { geo in
            let viewport = boardViewModel.boardState.viewport
            let scale = max(0.25, min(4, CGFloat(viewport.scale)))

            ZStack(alignment: .topLeading) {
                ZStack(alignment: .topLeading) {
                    canvasBackgroundLayer(viewport: viewport, selection: selection)

                    ForEach(sortedElements) { element in
                        canvasElementView(for: element)
                            .frame(width: CGFloat(element.width), height: CGFloat(element.height))
                            .offset(x: CGFloat(element.x), y: CGFloat(element.y))
                            .opacity(canvasReadabilityOpacity(for: element.id))
                            .zIndex(Double(element.zIndex))
                    }

                    if sortedElements.isEmpty {
                        FlowDeskCanvasWorkspaceHint()
                            .position(x: canvasSize * 0.5, y: canvasSize * 0.5)
                            .allowsHitTesting(false)
                            .zIndex(2)
                    }

                    CanvasMultiSelectionBoundsOverlay(
                        elements: boardViewModel.boardState.elements,
                        selectedIDs: selection.selectedElementIDs
                    )
                    .allowsHitTesting(false)
                    .zIndex(450_000)

                    CanvasAlignmentGuidesOverlay(
                        guides: boardViewModel.activeAlignmentGuides,
                        canvasSize: canvasSize
                    )
                    .zIndex(500_000)

                    if let r = placementPreviewRect {
                        RoundedRectangle(cornerRadius: FlowDeskLayout.chromePlacementPreviewCornerRadius, style: .continuous)
                            .strokeBorder(tokens.selectionStrokeColor.opacity(0.88), style: StrokeStyle(lineWidth: 1.25, dash: [7, 5]))
                            .frame(width: r.width, height: r.height)
                            .position(x: r.midX, y: r.midY)
                            .allowsHitTesting(false)
                            .zIndex(480_000)
                    }

                    if !draftCanvasPoints.isEmpty {
                        CanvasFreehandDraftOverlay(
                            canvasPoints: draftCanvasPoints,
                            color: boardViewModel.drawingStrokeColor,
                            lineWidth: CGFloat(boardViewModel.drawingLineWidth),
                            opacity: boardViewModel.drawingStrokeOpacity
                        )
                        .frame(width: canvasSize, height: canvasSize)
                        .allowsHitTesting(false)
                    }

                    if boardViewModel.canvasTool == .draw {
                        Color.clear
                            .contentShape(Rectangle())
                            .frame(width: canvasSize, height: canvasSize)
                            .gesture(freehandDrawGesture(selection: selection))
                    }

                    if let snapId = connectorSnapTargetElementID,
                       let snapEl = boardViewModel.boardState.elements.first(where: { $0.id == snapId }) {
                        connectorSnapTargetHighlight(element: snapEl)
                            .allowsHitTesting(false)
                            .zIndex(488_000)
                    }

                    if let draft = boardViewModel.connectorDragDraft {
                        connectorDragDraftOverlay(draft: draft)
                            .allowsHitTesting(false)
                            .zIndex(490_000)
                    }

                    if let epDraft = boardViewModel.connectorEndpointAdjustDraft {
                        connectorEndpointAdjustOverlay(draft: epDraft)
                            .allowsHitTesting(false)
                            .zIndex(491_000)
                    }
                }
                .coordinateSpace(name: FlowDeskLayout.canvasInnerCoordinateSpaceName)
                .frame(width: canvasSize, height: canvasSize)
                .scaleEffect(scale, anchor: .topLeading)
                .offset(
                    x: CGFloat(viewport.offsetX) + panDragTranslation.width,
                    y: CGFloat(viewport.offsetY) + panDragTranslation.height
                )

                selectionToolbarOverlay(
                    geo: geo,
                    safeArea: geo.safeAreaInsets,
                    viewport: viewport,
                    scale: scale
                )
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .clipped()
            .contentShape(Rectangle())
            .onHover { hovering in
                guard hovering else {
                    NSCursor.arrow.set()
                    return
                }
                switch boardViewModel.canvasTool {
                case .select:
                    NSCursor.arrow.set()
                case .draw, .placeText, .placeSticky, .placeShape:
                    NSCursor.crosshair.set()
                }
            }
            .simultaneousGesture(zoomGesture(currentScale: viewport.scale))
            .task(id: insertionSnapshotTaskID(geo: geo, viewport: viewport, pan: panDragTranslation)) {
                boardViewModel.syncInsertionViewportSnapshot(
                    CanvasInsertionViewportSnapshot(
                        visibleWidth: Double(geo.size.width),
                        visibleHeight: Double(geo.size.height),
                        viewport: viewport,
                        panDragWidth: Double(panDragTranslation.width),
                        panDragHeight: Double(panDragTranslation.height),
                        canvasLogicalSize: Double(canvasSize)
                    )
                )
            }
        }
    }

    private func insertionSnapshotTaskID(geo: GeometryProxy, viewport: ViewportState, pan: CGSize) -> String {
        "\(geo.size.width),\(geo.size.height),\(viewport.offsetX),\(viewport.offsetY),\(viewport.scale),\(pan.width),\(pan.height)"
    }

    /// While something is selected, deemphasize items that are not the selection, an incident link, or an endpoint of an incident link. Disabled during connector drag/adjust so snap targets stay clear.
    private func canvasReadabilityOpacity(for elementID: UUID) -> CGFloat {
        if selection.selectedElementIDs.isEmpty { return 1 }
        if boardViewModel.connectorDragDraft != nil || boardViewModel.connectorEndpointAdjustDraft != nil { return 1 }
        if boardViewModel.editingConnectorLabelElementID != nil { return 1 }
        let retained = Self.readabilityRetainedElementIDs(
            selectedIDs: selection.selectedElementIDs,
            elements: boardViewModel.boardState.elements
        )
        return retained.contains(elementID) ? 1 : FlowDeskTheme.canvasBoardReadabilityDeemphasisOpacity
    }

    /// Selected ids, plus endpoints of any selected connector, plus every connector touching a selected non-connector and that connector’s endpoints.
    private static func readabilityRetainedElementIDs(selectedIDs: Set<UUID>, elements: [CanvasElementRecord]) -> Set<UUID> {
        guard !selectedIDs.isEmpty else { return [] }
        var r = selectedIDs
        for el in elements {
            guard el.kind == .connector, let p = el.connectorPayload else { continue }
            if selectedIDs.contains(el.id) {
                r.insert(p.startElementID)
                r.insert(p.endElementID)
            }
        }
        var framedSelected = Set<UUID>()
        for id in selectedIDs {
            guard let el = elements.first(where: { $0.id == id }) else { continue }
            if el.kind != .connector { framedSelected.insert(id) }
        }
        guard !framedSelected.isEmpty else { return r }
        for el in elements {
            guard el.kind == .connector, let p = el.connectorPayload else { continue }
            if framedSelected.contains(p.startElementID) || framedSelected.contains(p.endElementID) {
                r.insert(el.id)
                r.insert(p.startElementID)
                r.insert(p.endElementID)
            }
        }
        return r
    }

    @ViewBuilder
    private func canvasBackgroundLayer(viewport: ViewportState, selection: CanvasSelectionModel) -> some View {
        let bg = canvasBackground(showGrid: viewport.showGrid)
            .frame(width: canvasSize, height: canvasSize)
            .contentShape(Rectangle())

        switch boardViewModel.canvasTool {
        case .select:
            bg
                .gesture(panGesture(viewport: viewport))
                .onTapGesture {
                    boardViewModel.cancelConnectorEndpointAdjust()
                    boardViewModel.cancelConnectorDrag()
                    selection.clear()
                    boardViewModel.stopAllInlineEditing()
                    boardViewModel.resetGroupMoveState()
                }
        case .draw:
            bg
        case .placeText, .placeSticky, .placeShape:
            bg
                .gesture(placementCreateGesture(selection: selection))
        }
    }

    /// Text/sticky: short drag = click-place; longer drag = sized insert. Shapes: drag defines frame (short drag = default size at point).
    private func placementCreateGesture(selection: CanvasSelectionModel) -> some Gesture {
        DragGesture(minimumDistance: 0, coordinateSpace: .local)
            .onChanged { value in
                if placementDragStart == nil {
                    boardViewModel.stopAllInlineEditing()
                    boardViewModel.resetGroupMoveState()
                    selection.clear()
                    placementDragStart = value.startLocation
                }
                guard let start = placementDragStart else { return }
                let raw = placementRawRect(from: start, to: value.location)
                let dist = hypot(value.translation.width, value.translation.height)
                let previewFloor: CGFloat = 5
                guard dist >= previewFloor else {
                    placementPreviewRect = nil
                    boardViewModel.clearAlignmentGuides()
                    return
                }
                let (minW, minH) = placementMinimumSize(boardViewModel.canvasTool)
                let (snapped, guides) = boardViewModel.snapPlacementDraftRect(
                    rawRect: raw,
                    minWidth: minW,
                    minHeight: minH
                )
                placementPreviewRect = snapped
                boardViewModel.updateAlignmentGuides(guides)
            }
            .onEnded { value in
                defer {
                    placementDragStart = nil
                    placementPreviewRect = nil
                    boardViewModel.clearAlignmentGuides()
                }
                let start = placementDragStart ?? value.startLocation
                let dist = hypot(value.translation.width, value.translation.height)
                let end = value.location
                let raw = placementRawRect(from: start, to: end)
                switch boardViewModel.canvasTool {
                case .placeText:
                    if dist < Self.placementTextStickyTapThreshold {
                        boardViewModel.insertTextBlockAtCanvasPoint(start, selection: selection)
                    } else {
                        let (minW, minH) = placementMinimumSize(.placeText)
                        let (snapped, _) = boardViewModel.snapPlacementDraftRect(
                            rawRect: raw,
                            minWidth: minW,
                            minHeight: minH
                        )
                        boardViewModel.insertTextBlockInCanvasRect(snapped, selection: selection)
                    }
                case .placeSticky:
                    if dist < Self.placementTextStickyTapThreshold {
                        boardViewModel.insertStickyNoteAtCanvasPoint(start, selection: selection)
                    } else {
                        let (minW, minH) = placementMinimumSize(.placeSticky)
                        let (snapped, _) = boardViewModel.snapPlacementDraftRect(
                            rawRect: raw,
                            minWidth: minW,
                            minHeight: minH
                        )
                        boardViewModel.insertStickyNoteInCanvasRect(snapped, selection: selection)
                    }
                case .placeShape:
                    if dist < Self.placementShapeTapThreshold {
                        boardViewModel.insertShapeAtCanvasPoint(
                            kind: boardViewModel.placeShapeKind,
                            point: start,
                            selection: selection
                        )
                    } else {
                        let (minW, minH) = placementMinimumSize(.placeShape)
                        let (snapped, _) = boardViewModel.snapPlacementDraftRect(
                            rawRect: raw,
                            minWidth: minW,
                            minHeight: minH
                        )
                        boardViewModel.insertShapeInCanvasRect(
                            kind: boardViewModel.placeShapeKind,
                            rect: snapped,
                            selection: selection
                        )
                    }
                default:
                    break
                }
            }
    }

    private static let placementTextStickyTapThreshold: CGFloat = 8
    private static let placementShapeTapThreshold: CGFloat = 6

    private func placementRawRect(from start: CGPoint, to end: CGPoint) -> CGRect {
        CGRect(
            x: min(start.x, end.x),
            y: min(start.y, end.y),
            width: abs(end.x - start.x),
            height: abs(end.y - start.y)
        )
    }

    private func placementMinimumSize(_ tool: CanvasToolMode) -> (CGFloat, CGFloat) {
        switch tool {
        case .placeText:
            (CGFloat(CanvasTextBlockLayout.minWidth), CGFloat(CanvasTextBlockLayout.minHeight))
        case .placeSticky:
            (CGFloat(CanvasStickyNoteLayout.minWidth), CGFloat(CanvasStickyNoteLayout.minHeight))
        case .placeShape:
            (CGFloat(CanvasShapeLayout.minWidth), CGFloat(CanvasShapeLayout.minHeight))
        default:
            (44, 44)
        }
    }

    private func freehandDrawGesture(selection: CanvasSelectionModel) -> some Gesture {
        DragGesture(minimumDistance: 0, coordinateSpace: .local)
            .onChanged { value in
                if draftCanvasPoints.isEmpty {
                    boardViewModel.stopAllInlineEditing()
                }
                let loc = value.location
                if let last = draftCanvasPoints.last {
                    if hypot(loc.x - last.x, loc.y - last.y) >= 1.5 {
                        draftCanvasPoints.append(loc)
                    }
                } else {
                    draftCanvasPoints.append(loc)
                }
            }
            .onEnded { value in
                let loc = value.location
                if let last = draftCanvasPoints.last, hypot(last.x - loc.x, last.y - loc.y) > 0.25 {
                    draftCanvasPoints.append(loc)
                } else if draftCanvasPoints.isEmpty {
                    draftCanvasPoints.append(loc)
                }
                boardViewModel.commitFreehandStroke(absoluteCanvasPoints: draftCanvasPoints, selection: selection)
                draftCanvasPoints = []
            }
    }

    @ViewBuilder
    private func canvasElementView(for element: CanvasElementRecord) -> some View {
        switch element.kind {
        case .textBlock:
            TextBlockCanvasItemView(
                element: element,
                boardViewModel: boardViewModel,
                selection: selection
            )
        case .stickyNote:
            StickyNoteCanvasItemView(
                element: element,
                boardViewModel: boardViewModel,
                selection: selection
            )
        case .shape:
            ShapeCanvasItemView(
                element: element,
                boardViewModel: boardViewModel,
                selection: selection
            )
        case .stroke:
            StrokeCanvasItemView(
                element: element,
                boardViewModel: boardViewModel,
                selection: selection
            )
        case .chart:
            ChartCanvasItemView(
                element: element,
                boardViewModel: boardViewModel,
                selection: selection
            )
        case .connector:
            ConnectorCanvasItemView(
                element: element,
                boardViewModel: boardViewModel,
                selection: selection
            )
        @unknown default:
            CanvasElementChrome(
                element: element,
                isSelected: selection.isSelected(element.id)
            )
            .onTapGesture {
                boardViewModel.stopAllInlineEditing()
                let extend = NSEvent.modifierFlags.contains(.shift)
                selection.handleCanvasTap(elementID: element.id, extendSelection: extend)
            }
        }
    }

    private func panGesture(viewport: ViewportState) -> some Gesture {
        DragGesture()
            .onChanged { value in
                panDragTranslation = value.translation
            }
            .onEnded { value in
                var next = viewport
                next.offsetX += Double(value.translation.width)
                next.offsetY += Double(value.translation.height)
                boardViewModel.setViewport(next)
                panDragTranslation = .zero
            }
    }

    private func zoomGesture(currentScale: Double) -> some Gesture {
        MagnifyGesture()
            .onEnded { value in
                var next = boardViewModel.boardState.viewport
                let factor = Double(value.magnification)
                next.scale = max(0.25, min(4, currentScale * factor))
                boardViewModel.setViewport(next)
            }
    }

    @ViewBuilder
    private func canvasBackground(showGrid: Bool) -> some View {
        FlowDeskTheme.canvasWorkspaceMatBackground(
            tokens: tokens,
            colorScheme: colorScheme,
            showGrid: showGrid,
            includeFilmGrain: true
        )
    }

    // MARK: - Selection toolbar (view-space overlay)

    private let selectionToolbarEstimatedWidth: CGFloat = 300
    private let selectionToolbarEstimatedHeight: CGFloat = 78
    private let multiSelectionToolbarEstimatedWidth: CGFloat = 320
    private let multiSelectionToolbarEstimatedHeight: CGFloat = 112

    @ViewBuilder
    private func selectionToolbarOverlay(
        geo: GeometryProxy,
        safeArea: EdgeInsets,
        viewport: ViewportState,
        scale: CGFloat
    ) -> some View {
        Group {
            if selection.isMultiSelection {
                let framed = boardViewModel.boardState.elements.filter {
                    selection.selectedElementIDs.contains($0.id) && CanvasSnapEngine.participatesInSnapping($0.kind)
                }
                if framed.count >= 2, let union = unionCanvasRect(of: framed) {
                    CanvasMultiSelectionToolbarView(
                        boardViewModel: boardViewModel,
                        selection: selection
                    )
                    .zIndex(600_000)
                    .position(
                        selectionToolbarCenterForCanvasRect(
                            rect: union,
                            viewSize: geo.size,
                            safeArea: safeArea,
                            viewport: viewport,
                            scale: scale,
                            pan: panDragTranslation,
                            toolbarWidth: multiSelectionToolbarEstimatedWidth,
                            toolbarHeight: multiSelectionToolbarEstimatedHeight
                        )
                    )
                    .transition(
                        .opacity.combined(with: .move(edge: .bottom))
                            .combined(with: .scale(scale: 0.96, anchor: UnitPoint(x: 0.5, y: 1)))
                    )
                }
            } else if let id = selection.primarySelectedID,
                      let el = boardViewModel.boardState.elements.first(where: { $0.id == id }),
                      selectionToolbarSupportsKind(el.kind) {
                CanvasSelectionToolbarView(
                    elementID: id,
                    elementKind: el.kind,
                    boardViewModel: boardViewModel,
                    selection: selection
                )
                .zIndex(600_000)
                .position(
                    selectionToolbarCenter(
                        element: el,
                        viewSize: geo.size,
                        safeArea: safeArea,
                        viewport: viewport,
                        scale: scale,
                        pan: panDragTranslation,
                        toolbarWidth: selectionToolbarEstimatedWidth,
                        toolbarHeight: selectionToolbarEstimatedHeight
                    )
                )
                .transition(
                    .opacity.combined(with: .move(edge: .bottom))
                        .combined(with: .scale(scale: 0.96, anchor: UnitPoint(x: 0.5, y: 1)))
                )
            }
        }
        .animation(.spring(response: 0.25, dampingFraction: 0.8), value: selectionToolbarMotionIdentity())
    }

    private func unionCanvasRect(of elements: [CanvasElementRecord]) -> CGRect? {
        guard let first = elements.first else { return nil }
        var r = CGRect(x: CGFloat(first.x), y: CGFloat(first.y), width: CGFloat(first.width), height: CGFloat(first.height))
        for el in elements.dropFirst() {
            r = r.union(CGRect(x: CGFloat(el.x), y: CGFloat(el.y), width: CGFloat(el.width), height: CGFloat(el.height)))
        }
        return r
    }

    private func selectionToolbarCenterForCanvasRect(
        rect: CGRect,
        viewSize: CGSize,
        safeArea: EdgeInsets,
        viewport: ViewportState,
        scale: CGFloat,
        pan: CGSize,
        toolbarWidth: CGFloat,
        toolbarHeight: CGFloat
    ) -> CGPoint {
        let ox = CGFloat(viewport.offsetX) + pan.width
        let oy = CGFloat(viewport.offsetY) + pan.height
        let elLeft = rect.minX * scale + ox
        let elTop = rect.minY * scale + oy
        let elW = rect.width * scale
        let gap: CGFloat = 12
        var midX = elLeft + elW * 0.5
        var centerY = elTop - gap - toolbarHeight * 0.5
        let margin: CGFloat = 10
        let halfW = toolbarWidth * 0.5
        let halfH = toolbarHeight * 0.5
        let insetLeft = safeArea.leading + margin
        let insetRight = safeArea.trailing + margin
        let insetTop = safeArea.top + margin
        let insetBottom = safeArea.bottom + margin
        let minMidX = max(halfW + insetLeft, minimumSelectionToolbarLeadingEdge() + halfW)
        let maxMidX = viewSize.width - halfW - insetRight
        midX = min(max(midX, minMidX), max(maxMidX, minMidX))
        let minCenterY = halfH + insetTop
        let maxCenterY = viewSize.height - halfH - insetBottom
        centerY = min(max(centerY, minCenterY), max(maxCenterY, minCenterY))
        return CGPoint(x: midX, y: centerY)
    }

    /// Left edge of the selection bar must stay past the rail and optional context panel (dynamic = less dead space when the panel is closed).
    private func minimumSelectionToolbarLeadingEdge() -> CGFloat {
        let pad = FlowDeskLayout.canvasChromeLeadingPadding
        let rail = FlowDeskLayout.canvasToolRailWidth
        var edge = pad + rail + 8
        if boardViewModel.canvasContextPanel != nil {
            edge += FlowDeskLayout.canvasChromeInterColumnSpacing + FlowDeskLayout.canvasContextPanelWidth + 10
        }
        return edge
    }

    /// Maps the element’s canvas frame through the same scale + offset as the board, then places the toolbar centered above it (view coordinates).
    private func selectionToolbarCenter(
        element: CanvasElementRecord,
        viewSize: CGSize,
        safeArea: EdgeInsets,
        viewport: ViewportState,
        scale: CGFloat,
        pan: CGSize,
        toolbarWidth: CGFloat,
        toolbarHeight: CGFloat
    ) -> CGPoint {
        let ox = CGFloat(viewport.offsetX) + pan.width
        let oy = CGFloat(viewport.offsetY) + pan.height
        let elLeft = CGFloat(element.x) * scale + ox
        let elTop = CGFloat(element.y) * scale + oy
        let elW = CGFloat(element.width) * scale
        let gap: CGFloat = 12
        var midX = elLeft + elW * 0.5
        var centerY = elTop - gap - toolbarHeight * 0.5
        let margin: CGFloat = 10
        let halfW = toolbarWidth * 0.5
        let halfH = toolbarHeight * 0.5
        let insetLeft = safeArea.leading + margin
        let insetRight = safeArea.trailing + margin
        let insetTop = safeArea.top + margin
        let insetBottom = safeArea.bottom + margin
        let minMidX = max(halfW + insetLeft, minimumSelectionToolbarLeadingEdge() + halfW)
        let maxMidX = viewSize.width - halfW - insetRight
        midX = min(max(midX, minMidX), max(maxMidX, minMidX))
        let minCenterY = halfH + insetTop
        let maxCenterY = viewSize.height - halfH - insetBottom
        centerY = min(max(centerY, minCenterY), max(maxCenterY, minCenterY))
        return CGPoint(x: midX, y: centerY)
    }

    // MARK: - Connector draft / snap target (canvas space)

    private func connectorSnapTargetHighlight(element: CanvasElementRecord) -> some View {
        let pad: CGFloat = 7
        let w = CGFloat(element.width) + pad * 2
        let h = CGFloat(element.height) + pad * 2
        let cr = min(20, min(w, h) * 0.28)
        return RoundedRectangle(cornerRadius: cr, style: .continuous)
            .strokeBorder(tokens.selectionStrokeColor.opacity(0.78), lineWidth: 1.75)
            .background {
                RoundedRectangle(cornerRadius: cr, style: .continuous)
                    .fill(tokens.selectionStrokeColor.opacity(0.09))
            }
            .frame(width: w, height: h)
            .position(
                x: CGFloat(element.x) + CGFloat(element.width) * 0.5,
                y: CGFloat(element.y) + CGFloat(element.height) * 0.5
            )
    }

    private func connectorDragDraftOverlay(draft: ConnectorDragDraft) -> some View {
        let endPt = draft.snapCanvasPoint ?? draft.currentCanvasPoint
        let ink = FlowDeskConnectorVisuals.defaultStrokeSwiftUI()
        let snapping = draft.snapCanvasPoint != nil
        let polyline: [CGPoint] = {
            if let snapEdge = draft.snapEdge, draft.snapCanvasPoint != nil {
                return CanvasConnectorGeometry.routingPolyline(
                    start: draft.startCanvasPoint,
                    end: endPt,
                    startEdge: draft.startEdge,
                    endEdge: snapEdge,
                    lineStyle: draft.style
                )
            }
            return [draft.startCanvasPoint, endPt]
        }()
        let draftPath: Path = {
            var path = Path()
            guard let first = polyline.first else { return path }
            path.move(to: first)
            for pt in polyline.dropFirst() {
                path.addLine(to: pt)
            }
            return path
        }()
        return ZStack {
            draftPath
                .stroke(
                    ink.opacity(FlowDeskConnectorVisuals.draftHaloOpacity),
                    style: StrokeStyle(
                        lineWidth: FlowDeskConnectorVisuals.draftHaloWidth,
                        lineCap: .round,
                        lineJoin: .round
                    )
                )
            draftPath
                .stroke(
                    ink.opacity(snapping ? 1 : 0.78),
                    style: StrokeStyle(
                        lineWidth: FlowDeskConnectorVisuals.draftForegroundWidth,
                        lineCap: .round,
                        lineJoin: .round,
                        dash: FlowDeskConnectorVisuals.draftDashPattern
                    )
                )
            Circle()
                .fill(ink.opacity(0.95))
                .frame(
                    width: FlowDeskConnectorVisuals.draftEndpointDotRadius * 2,
                    height: FlowDeskConnectorVisuals.draftEndpointDotRadius * 2
                )
                .overlay {
                    Circle().strokeBorder(Color.white.opacity(0.38), lineWidth: 0.75)
                }
                .position(draft.startCanvasPoint)
            if snapping {
                Circle()
                    .fill(tokens.selectionStrokeColor.opacity(0.18))
                    .frame(
                        width: FlowDeskConnectorVisuals.draftSnapRingOuterRadius * 2,
                        height: FlowDeskConnectorVisuals.draftSnapRingOuterRadius * 2
                    )
                    .overlay {
                        Circle().strokeBorder(
                            tokens.selectionStrokeColor.opacity(0.82),
                            lineWidth: FlowDeskConnectorVisuals.draftSnapRingLineWidth
                        )
                    }
                    .position(endPt)
            } else {
                Circle()
                    .strokeBorder(ink.opacity(0.62), lineWidth: 1.2)
                    .background(Circle().fill(ink.opacity(0.07)))
                    .frame(width: 7, height: 7)
                    .position(endPt)
            }
            if draft.style == .arrow, polyline.count >= 2,
               let tip = polyline.last,
               let stem = polyline.dropLast().last,
               hypot(tip.x - stem.x, tip.y - stem.y) > 6 {
                connectorDraftArrowheadPaths(tip: tip, from: stem, fill: ink.opacity(snapping ? 1 : 0.86))
            }
        }
        .frame(width: canvasSize, height: canvasSize)
    }

    private func connectorEndpointAdjustOverlay(draft: ConnectorEndpointAdjustDraft) -> some View {
        let moving = draft.snapCanvasPoint ?? draft.movingCanvasPoint
        let polyline: [CGPoint] = {
            if let snapEdge = draft.snapEdge, draft.snapCanvasPoint != nil {
                if draft.isAdjustingStart {
                    return CanvasConnectorGeometry.routingPolyline(
                        start: moving,
                        end: draft.anchorCanvasPoint,
                        startEdge: snapEdge,
                        endEdge: draft.anchorEdge,
                        lineStyle: draft.lineStyle
                    )
                }
                return CanvasConnectorGeometry.routingPolyline(
                    start: draft.anchorCanvasPoint,
                    end: moving,
                    startEdge: draft.anchorEdge,
                    endEdge: snapEdge,
                    lineStyle: draft.lineStyle
                )
            }
            if draft.isAdjustingStart {
                return [moving, draft.anchorCanvasPoint]
            }
            return [draft.anchorCanvasPoint, moving]
        }()
        let ink = FlowDeskConnectorVisuals.defaultStrokeSwiftUI()
        let snapping = draft.snapCanvasPoint != nil
        let path: Path = {
            var p = Path()
            guard let first = polyline.first else { return p }
            p.move(to: first)
            for pt in polyline.dropFirst() {
                p.addLine(to: pt)
            }
            return p
        }()
        let arrowTipStem: (tip: CGPoint, stem: CGPoint)? = {
            guard draft.lineStyle == .arrow, polyline.count >= 2,
                  let stem = polyline.dropLast().last
            else { return nil }
            if draft.isAdjustingStart {
                return (draft.anchorCanvasPoint, stem)
            }
            guard let tip = polyline.last else { return nil }
            return (tip, stem)
        }()
        return ZStack {
            path
                .stroke(
                    ink.opacity(FlowDeskConnectorVisuals.draftHaloOpacity),
                    style: StrokeStyle(
                        lineWidth: FlowDeskConnectorVisuals.draftHaloWidth,
                        lineCap: .round,
                        lineJoin: .round
                    )
                )
            path
                .stroke(
                    ink.opacity(snapping ? 1 : 0.78),
                    style: StrokeStyle(
                        lineWidth: FlowDeskConnectorVisuals.draftForegroundWidth,
                        lineCap: .round,
                        lineJoin: .round,
                        dash: FlowDeskConnectorVisuals.draftDashPattern
                    )
                )
            if let arrow = arrowTipStem,
               hypot(arrow.tip.x - arrow.stem.x, arrow.tip.y - arrow.stem.y) > 6 {
                connectorDraftArrowheadPaths(
                    tip: arrow.tip,
                    from: arrow.stem,
                    fill: ink.opacity(snapping ? 1 : 0.86)
                )
            }
        }
        .frame(width: canvasSize, height: canvasSize)
    }

    private func connectorDraftArrowheadPaths(tip: CGPoint, from: CGPoint, fill: Color) -> some View {
        let dx = tip.x - from.x
        let dy = tip.y - from.y
        let len = max(0.001, hypot(dx, dy))
        let ux = dx / len
        let uy = dy / len
        let s: CGFloat = 11
        let back = CGPoint(x: tip.x - ux * s, y: tip.y - uy * s)
        let perp = CGPoint(x: -uy, y: ux)
        let w = s * 0.4
        let left = CGPoint(x: back.x + perp.x * w, y: back.y + perp.y * w)
        let right = CGPoint(x: back.x - perp.x * w, y: back.y - perp.y * w)
        return ZStack {
            Path { p in
                p.move(to: tip)
                p.addLine(to: left)
                p.addLine(to: right)
                p.closeSubpath()
            }
            .stroke(Color.primary.opacity(0.2), lineWidth: 0.9)
            Path { p in
                p.move(to: tip)
                p.addLine(to: left)
                p.addLine(to: right)
                p.closeSubpath()
            }
            .fill(fill)
        }
    }

    private func selectionToolbarSupportsKind(_ kind: CanvasElementKind) -> Bool {
        switch kind {
        case .textBlock, .stickyNote, .shape: true
        case .stroke, .chart, .connector: false
        @unknown default: false
        }
    }

    private func selectionToolbarMotionIdentity() -> String {
        let panel = boardViewModel.canvasContextPanel?.rawValue ?? "none"
        if selection.isMultiSelection {
            let framed = boardViewModel.boardState.elements.filter {
                selection.selectedElementIDs.contains($0.id) && CanvasSnapEngine.participatesInSnapping($0.kind)
            }
            guard framed.count >= 2, let u = unionCanvasRect(of: framed) else { return "none" }
            let keys = selection.selectedElementIDs.map(\.uuidString).sorted().joined(separator: ",")
            return "multi-\(keys)-\(u.minX)-\(u.minY)-\(u.width)-\(u.height)-\(panel)"
        }
        guard let id = selection.primarySelectedID,
              let el = boardViewModel.boardState.elements.first(where: { $0.id == id }),
              selectionToolbarSupportsKind(el.kind)
        else { return "none" }
        return "\(id.uuidString)-\(el.x)-\(el.y)-\(el.width)-\(el.height)-\(panel)"
    }
}
