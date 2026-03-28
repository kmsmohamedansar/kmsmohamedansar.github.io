import SwiftUI

/// Selectable shape on the board: vector body, accent chrome, move + resize.
struct ShapeCanvasItemView: View {
    let element: CanvasElementRecord
    @Bindable var boardViewModel: CanvasBoardViewModel
    @Bindable var selection: CanvasSelectionModel

    @State private var moveDragTranslation: CGSize = .zero
    @State private var moveDragStartCanvasOrigin: CGPoint?
    @State private var resizeDragStartSize: CGSize?

    private var payload: ShapePayload {
        element.resolvedShapePayload()
    }

    private var isSelected: Bool {
        selection.isSelected(element.id)
    }

    private var chromeCorner: CGFloat { FlowDeskTheme.shapeSelectionChromeCorner }

    var body: some View {
        ZStack {
            ShapeCanvasShapeView(payload: payload)

            if isSelected {
                RoundedRectangle(cornerRadius: chromeCorner, style: .continuous)
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
        .contentShape(Rectangle())
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
                boardViewModel.setShapeFrame(
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
                let nw = max(CanvasShapeLayout.minWidth, Double(start.width) + Double(value.translation.width))
                let nh = max(CanvasShapeLayout.minHeight, Double(start.height) + Double(value.translation.height))
                let (snappedSize, guides) = boardViewModel.snapResizeBottomRightFrame(
                    origin: CGPoint(x: element.x, y: element.y),
                    rawSize: CGSize(width: nw, height: nh),
                    elementId: element.id,
                    minWidth: CGFloat(CanvasShapeLayout.minWidth),
                    minHeight: CGFloat(CanvasShapeLayout.minHeight)
                )
                boardViewModel.setShapeFrame(
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

enum CanvasShapeLayout {
    static let minWidth: Double = 44
    static let minHeight: Double = 28
}
