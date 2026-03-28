import SwiftUI

/// Chart block on the board: card chrome, Swift Charts body, selection, move, resize.
struct ChartCanvasItemView: View {
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

    private var cardShape: RoundedRectangle {
        RoundedRectangle(cornerRadius: FlowDeskTheme.chartCardCornerRadius, style: .continuous)
    }

    var body: some View {
        ZStack {
            cardShape
                .fill(Color(nsColor: .textBackgroundColor))
                .shadow(
                    color: Color.black.opacity(FlowDeskTheme.cardShadowOpacity(selected: isSelected)),
                    radius: FlowDeskTheme.cardShadowRadius(selected: isSelected),
                    x: 0,
                    y: FlowDeskTheme.cardShadowY(selected: isSelected)
                )

            cardShape
                .strokeBorder(Color.primary.opacity(0.055), lineWidth: 0.75)

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

            if isSelected {
                cardShape
                    .strokeBorder(FlowDeskTheme.selectionStrokeColor, lineWidth: FlowDeskTheme.selectionStrokeWidth)
                    .allowsHitTesting(false)
            }
        }
        .overlay(alignment: .bottomTrailing) {
            if isSelected {
                CanvasTextBlockResizeHandle()
                    .padding(7)
                    .gesture(resizeGesture)
            }
        }
        .offset(moveDragTranslation)
        .contentShape(cardShape)
        .onTapGesture {
            boardViewModel.stopAllInlineEditing()
            selection.selectOnly(element.id)
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
        DragGesture(minimumDistance: 3)
            .onChanged { value in
                if moveDragStartCanvasOrigin == nil {
                    moveDragStartCanvasOrigin = CGPoint(x: element.x, y: element.y)
                }
                let start = moveDragStartCanvasOrigin ?? CGPoint(x: element.x, y: element.y)
                let rawX = start.x + value.translation.width
                let rawY = start.y + value.translation.height
                let (snapped, guides) = boardViewModel.snapMoveFrame(
                    rawOrigin: CGPoint(x: rawX, y: rawY),
                    size: CGSize(width: element.width, height: element.height),
                    elementId: element.id
                )
                moveDragTranslation = CGSize(
                    width: snapped.x - element.x,
                    height: snapped.y - element.y
                )
                boardViewModel.updateAlignmentGuides(guides)
            }
            .onEnded { value in
                boardViewModel.clearAlignmentGuides()
                let start = moveDragStartCanvasOrigin ?? CGPoint(x: element.x, y: element.y)
                let rawX = start.x + value.translation.width
                let rawY = start.y + value.translation.height
                let (snapped, _) = boardViewModel.snapMoveFrame(
                    rawOrigin: CGPoint(x: rawX, y: rawY),
                    size: CGSize(width: element.width, height: element.height),
                    elementId: element.id
                )
                boardViewModel.setChartFrame(
                    id: element.id,
                    x: Double(snapped.x),
                    y: Double(snapped.y),
                    width: element.width,
                    height: element.height
                )
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
