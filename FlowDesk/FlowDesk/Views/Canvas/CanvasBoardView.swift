import AppKit
import SwiftUI

/// Renders the infinite-style board: viewport transform, grid, and element layers.
struct CanvasBoardView: View {
    @Bindable var boardViewModel: CanvasBoardViewModel
    @Bindable var selection: CanvasSelectionModel

    @Environment(\.flowDeskTokens) private var tokens

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
                    canvasBackgroundLayer(viewport: viewport)

                    ForEach(sortedElements) { element in
                        canvasElementView(for: element)
                            .frame(width: CGFloat(element.width), height: CGFloat(element.height))
                            .offset(x: CGFloat(element.x), y: CGFloat(element.y))
                            .zIndex(Double(element.zIndex))
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
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .clipped()
            .contentShape(Rectangle())
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
    private func canvasBackgroundLayer(viewport: ViewportState) -> some View {
        let bg = canvasBackground(showGrid: viewport.showGrid)
            .frame(width: canvasSize, height: canvasSize)
            .contentShape(Rectangle())

        if boardViewModel.canvasTool == .select {
            bg
                .gesture(panGesture(viewport: viewport))
                .onTapGesture {
                    boardViewModel.stopAllInlineEditing()
                    boardViewModel.resetGroupMoveState()
                    selection.clear()
                }
        } else {
            bg
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
            if showGrid {
                CanvasGridOverlay(
                    spacing: 24,
                    lineWidth: FlowDeskLayout.gridLineWidth,
                    lineOpacity: tokens.gridLineOpacity
                )
            }
        }
    }
}
