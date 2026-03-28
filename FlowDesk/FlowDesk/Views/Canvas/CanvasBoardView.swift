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

    private let canvasSize: CGFloat = 4000

    private var sortedElements: [CanvasElementRecord] {
        boardViewModel.boardState.elements.sorted { $0.zIndex < $1.zIndex }
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
                }
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
                    boardViewModel.stopAllInlineEditing()
                    boardViewModel.resetGroupMoveState()
                    selection.clear()
                }
        case .draw:
            bg
        case .placeText, .placeSticky, .placeShape:
            bg
                .gesture(placementTapGesture(selection: selection))
        }
    }

    /// Short drag threshold so pan-sized motion does not fire a placement.
    private func placementTapGesture(selection: CanvasSelectionModel) -> some Gesture {
        DragGesture(minimumDistance: 0, coordinateSpace: .local)
            .onEnded { value in
                let drag = hypot(value.translation.width, value.translation.height)
                guard drag < 10 else { return }
                let p = value.startLocation
                switch boardViewModel.canvasTool {
                case .placeText:
                    boardViewModel.insertTextBlockAtCanvasPoint(p, selection: selection)
                case .placeSticky:
                    boardViewModel.insertStickyNoteAtCanvasPoint(p, selection: selection)
                case .placeShape:
                    boardViewModel.insertShapeAtCanvasPoint(
                        kind: boardViewModel.placeShapeKind,
                        point: p,
                        selection: selection
                    )
                default:
                    break
                }
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
        ZStack {
            tokens.workspaceBackground
            FlowDeskTheme.canvasBoardRadialAtmosphere(colorScheme: colorScheme)
                .allowsHitTesting(false)
            FlowDeskTheme.canvasBoardDepthGradient(colorScheme: colorScheme)
                .allowsHitTesting(false)
            if showGrid {
                CanvasGridOverlay(
                    spacing: 24,
                    lineWidth: FlowDeskLayout.gridLineWidth,
                    lineOpacity: tokens.gridLineOpacity,
                    gridInk: tokens.canvasGridInk
                )
            }
        }
    }

    // MARK: - Selection toolbar (view-space overlay)

    private let selectionToolbarEstimatedWidth: CGFloat = 292
    private let selectionToolbarEstimatedHeight: CGFloat = 52

    @ViewBuilder
    private func selectionToolbarOverlay(
        geo: GeometryProxy,
        safeArea: EdgeInsets,
        viewport: ViewportState,
        scale: CGFloat
    ) -> some View {
        Group {
            if let id = selection.primarySelectedID,
               let el = boardViewModel.boardState.elements.first(where: { $0.id == id }),
               selectionToolbarSupportsKind(el.kind) {
                CanvasSelectionToolbarView(
                    elementID: id,
                    elementKind: el.kind,
                    boardViewModel: boardViewModel
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
        let minMidX = max(halfW + insetLeft, FlowDeskLayout.canvasSelectionToolbarLeadingGutter + halfW)
        let maxMidX = viewSize.width - halfW - insetRight
        midX = min(max(midX, minMidX), max(maxMidX, minMidX))
        let minCenterY = halfH + insetTop
        let maxCenterY = viewSize.height - halfH - insetBottom
        centerY = min(max(centerY, minCenterY), max(maxCenterY, minCenterY))
        return CGPoint(x: midX, y: centerY)
    }

    private func selectionToolbarSupportsKind(_ kind: CanvasElementKind) -> Bool {
        switch kind {
        case .textBlock, .stickyNote, .shape: true
        case .stroke, .chart: false
        @unknown default: false
        }
    }

    private func selectionToolbarMotionIdentity() -> String {
        guard let id = selection.primarySelectedID,
              let el = boardViewModel.boardState.elements.first(where: { $0.id == id }),
              selectionToolbarSupportsKind(el.kind)
        else { return "none" }
        return "\(id.uuidString)-\(el.x)-\(el.y)-\(el.width)-\(el.height)"
    }
}
