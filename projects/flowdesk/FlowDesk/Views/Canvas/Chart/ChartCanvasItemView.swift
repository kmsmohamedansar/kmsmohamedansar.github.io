import AppKit
import SwiftUI

/// Chart block on the board: card chrome, Swift Charts body, selection, move, resize.
struct ChartCanvasItemView: View {
    @Environment(\.flowDeskTokens) private var tokens

    let element: CanvasElementRecord
    @Bindable var boardViewModel: CanvasBoardViewModel
    @Bindable var selection: CanvasSelectionModel

    @State private var moveDragTranslation: CGSize = .zero
    @State private var moveDragStartCanvasOrigin: CGPoint?
    @State private var resizeDragStartSize: CGSize?

    private var payload: ChartPayload {
        element.resolvedChartPayload()
    }

    private var isSelected: Bool {
        selection.isSelected(element.id)
    }

    private var composedMoveOffset: CGSize {
        if boardViewModel.optionDuplicateSourceElementID == element.id {
            return .zero
        }
        if boardViewModel.groupMoveLeaderID == element.id {
            return moveDragTranslation
        }
        if boardViewModel.groupMoveParticipantIDs.contains(element.id) {
            return boardViewModel.groupMovePreviewTranslation
        }
        return moveDragTranslation
    }

    private var cardShape: RoundedRectangle {
        RoundedRectangle(cornerRadius: FlowDeskTheme.chartCardCornerRadius, style: .continuous)
    }

    var body: some View {
        ZStack {
            cardShape
                .fill(tokens.chartCardFill)
                .shadow(
                    color: Color.black.opacity(
                        isSelected ? tokens.canvasItemShadowSelected : tokens.canvasItemShadowNormal
                    ),
                    radius: isSelected ? tokens.canvasItemShadowRadiusSelected : tokens.canvasItemShadowRadiusNormal,
                    x: 0,
                    y: isSelected ? tokens.canvasItemShadowYSelected : tokens.canvasItemShadowYNormal
                )

            cardShape
                .strokeBorder(Color.primary.opacity(tokens.chartCardBorderOpacity), lineWidth: 0.75)

            VStack(alignment: .leading, spacing: FlowDeskTheme.chartTitleSpacing) {
                if payload.showTitle {
                    Text(payload.title.isEmpty ? "Chart" : payload.title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(payload.title.isEmpty ? .tertiary : .primary)
                        .lineLimit(1)
                }

                ChartBlockChartView(payload: payload)
                    .frame(minHeight: 80)
            }
            .padding(FlowDeskTheme.chartCardContentPadding)

            cardShape
                .strokeBorder(tokens.selectionStrokeColor, lineWidth: tokens.selectionStrokeWidth)
                .opacity(isSelected ? 1 : 0)
                .allowsHitTesting(false)
        }
        .animation(.easeOut(duration: 0.18), value: isSelected)
        .overlay(alignment: .bottomTrailing) {
            if isSelected, !selection.isMultiSelection {
                CanvasTextBlockResizeHandle()
                    .padding(FlowDeskLayout.canvasSelectionChromeInset)
                    .gesture(resizeGesture)
            }
        }
        .offset(composedMoveOffset)
        .contentShape(cardShape)
        .onTapGesture {
            boardViewModel.stopAllInlineEditing()
            let extend = NSEvent.modifierFlags.contains(.shift)
            selection.handleCanvasTap(elementID: element.id, extendSelection: extend)
        }
        .simultaneousGesture(moveGesture)
        .contextMenu {
            CanvasElementEditorContextMenuItems(
                elementID: element.id,
                boardViewModel: boardViewModel,
                selection: selection
            )
        }
    }

    private var moveGesture: some Gesture {
        DragGesture(minimumDistance: 1)
            .onChanged { value in
                if moveDragStartCanvasOrigin == nil {
                    if boardViewModel.beginOptionDuplicateIfNeeded(fromElementId: element.id, selection: selection) {
                        let subject = boardViewModel.moveGestureSubjectElementId(viewElementId: element.id)
                        if let rec = boardViewModel.boardState.elements.first(where: { $0.id == subject }) {
                            moveDragStartCanvasOrigin = CGPoint(x: CGFloat(rec.x), y: CGFloat(rec.y))
                        }
                    } else {
                        moveDragStartCanvasOrigin = CGPoint(x: element.x, y: element.y)
                        boardViewModel.configureGroupMoveIfNeeded(leaderId: element.id, selection: selection)
                    }
                }
                let subjectId = boardViewModel.moveGestureSubjectElementId(viewElementId: element.id)
                guard let subjectRec = boardViewModel.boardState.elements.first(where: { $0.id == subjectId }) else { return }
                let start = moveDragStartCanvasOrigin ?? CGPoint(x: subjectRec.x, y: subjectRec.y)
                let rawX = start.x + value.translation.width
                let rawY = start.y + value.translation.height
                let exclude = boardViewModel.snapExclusionsForFramedMove(leaderId: subjectId, selection: selection)
                let (snapped, guides) = boardViewModel.snapMoveFrame(
                    rawOrigin: CGPoint(x: rawX, y: rawY),
                    size: CGSize(width: subjectRec.width, height: subjectRec.height),
                    excludingElementIds: exclude,
                    movingElementId: subjectId
                )
                if boardViewModel.optionDuplicateSourceElementID == element.id {
                    boardViewModel.setChartFrame(
                        id: subjectId,
                        x: Double(snapped.x),
                        y: Double(snapped.y),
                        width: subjectRec.width,
                        height: subjectRec.height
                    )
                    moveDragTranslation = .zero
                } else {
                    moveDragTranslation = CGSize(
                        width: snapped.x - CGFloat(subjectRec.x),
                        height: snapped.y - CGFloat(subjectRec.y)
                    )
                }
                boardViewModel.syncGroupMovePreview(leaderId: element.id, translation: moveDragTranslation)
                boardViewModel.updateAlignmentGuides(guides)
            }
            .onEnded { value in
                boardViewModel.clearAlignmentGuides()
                let subjectId = boardViewModel.moveGestureSubjectElementId(viewElementId: element.id)
                guard let subjectRec = boardViewModel.boardState.elements.first(where: { $0.id == subjectId }) else {
                    boardViewModel.resetGroupMoveState()
                    boardViewModel.clearOptionDuplicateDragState()
                    moveDragTranslation = .zero
                    moveDragStartCanvasOrigin = nil
                    return
                }
                let start = moveDragStartCanvasOrigin ?? CGPoint(x: subjectRec.x, y: subjectRec.y)
                let rawX = start.x + value.translation.width
                let rawY = start.y + value.translation.height
                let exclude = boardViewModel.snapExclusionsForFramedMove(leaderId: subjectId, selection: selection)
                let (snapped, _) = boardViewModel.snapMoveFrame(
                    rawOrigin: CGPoint(x: rawX, y: rawY),
                    size: CGSize(width: subjectRec.width, height: subjectRec.height),
                    excludingElementIds: exclude,
                    movingElementId: subjectId
                )
                let participants = boardViewModel.groupMoveParticipantIDs
                if boardViewModel.groupMoveLeaderID == element.id,
                   participants.count > 1 {
                    let dx = Double(snapped.x - start.x)
                    let dy = Double(snapped.y - start.y)
                    boardViewModel.applyFramedGroupPositionDelta(ids: participants, dx: dx, dy: dy)
                } else {
                    boardViewModel.setChartFrame(
                        id: subjectId,
                        x: Double(snapped.x),
                        y: Double(snapped.y),
                        width: subjectRec.width,
                        height: subjectRec.height
                    )
                }
                boardViewModel.resetGroupMoveState()
                boardViewModel.clearOptionDuplicateDragState()
                moveDragTranslation = .zero
                moveDragStartCanvasOrigin = nil
            }
    }

    private var resizeGesture: some Gesture {
        DragGesture(minimumDistance: 1)
            .onChanged { value in
                if resizeDragStartSize == nil {
                    boardViewModel.beginBoardUndoCoalescing()
                    resizeDragStartSize = CGSize(width: element.width, height: element.height)
                }
                guard let start = resizeDragStartSize else { return }
                let nw = max(CanvasChartLayout.minWidth, Double(start.width) + Double(value.translation.width))
                let nh = max(CanvasChartLayout.minHeight, Double(start.height) + Double(value.translation.height))
                let (snappedSize, guides) = boardViewModel.snapResizeBottomRightFrame(
                    origin: CGPoint(x: element.x, y: element.y),
                    rawSize: CGSize(width: nw, height: nh),
                    elementId: element.id,
                    minWidth: CGFloat(CanvasChartLayout.minWidth),
                    minHeight: CGFloat(CanvasChartLayout.minHeight)
                )
                boardViewModel.setChartFrame(
                    id: element.id,
                    x: element.x,
                    y: element.y,
                    width: Double(snappedSize.width),
                    height: Double(snappedSize.height)
                )
                boardViewModel.updateAlignmentGuides(guides)
            }
            .onEnded { _ in
                boardViewModel.clearAlignmentGuides()
                boardViewModel.endBoardUndoCoalescing()
                resizeDragStartSize = nil
            }
    }
}

enum CanvasChartLayout {
    static let minWidth: Double = 200
    static let minHeight: Double = 160
}
