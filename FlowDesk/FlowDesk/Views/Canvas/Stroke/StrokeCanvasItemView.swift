import AppKit
import SwiftUI

/// Bounding-box chrome, selection, and move for a persisted freehand stroke (no resize in v1).
struct StrokeCanvasItemView: View {
    @Environment(\.flowDeskTokens) private var tokens

    let element: CanvasElementRecord
    @Bindable var boardViewModel: CanvasBoardViewModel
    @Bindable var selection: CanvasSelectionModel

    @State private var moveDragTranslation: CGSize = .zero
    @State private var moveDragStartCanvasOrigin: CGPoint?

    private var payload: StrokePayload {
        element.resolvedStrokePayload()
    }

    private var isSelected: Bool {
        selection.isSelected(element.id)
    }

    private var chromeCorner: CGFloat { FlowDeskTheme.strokeSelectionChromeCorner }

    var body: some View {
        ZStack {
            FreehandStrokeShapeView(
                points: payload.points,
                color: payload.color,
                lineWidth: CGFloat(payload.lineWidth),
                opacity: payload.opacity
            )

            if isSelected {
                RoundedRectangle(cornerRadius: chromeCorner, style: .continuous)
                    .strokeBorder(tokens.selectionStrokeColor, lineWidth: tokens.selectionStrokeWidth)
                    .allowsHitTesting(false)
            }
        }
        .offset(moveDragTranslation)
        .contentShape(Rectangle())
        .onTapGesture {
            guard boardViewModel.canvasTool == .select else { return }
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
        DragGesture(minimumDistance: 3)
            .onChanged { value in
                guard boardViewModel.canvasTool == .select, isSelected else { return }
                if moveDragStartCanvasOrigin == nil {
                    moveDragStartCanvasOrigin = CGPoint(x: element.x, y: element.y)
                }
                moveDragTranslation = value.translation
            }
            .onEnded { value in
                guard boardViewModel.canvasTool == .select, isSelected else {
                    moveDragTranslation = .zero
                    moveDragStartCanvasOrigin = nil
                    return
                }
                let start = moveDragStartCanvasOrigin ?? CGPoint(x: element.x, y: element.y)
                let nx = Double(start.x) + Double(value.translation.width)
                let ny = Double(start.y) + Double(value.translation.height)
                boardViewModel.setStrokeFrame(
                    id: element.id,
                    x: nx,
                    y: ny,
                    width: element.width,
                    height: element.height
                )
                moveDragTranslation = .zero
                moveDragStartCanvasOrigin = nil
            }
    }
}
