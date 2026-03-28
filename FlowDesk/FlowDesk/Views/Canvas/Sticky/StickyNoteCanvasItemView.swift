import AppKit
import SwiftUI

/// Renders and edits a sticky note: paper color, soft shadow, inline text editing, move/resize.
struct StickyNoteCanvasItemView: View {
    let element: CanvasElementRecord
    @Bindable var boardViewModel: CanvasBoardViewModel
    @Bindable var selection: CanvasSelectionModel

    @State private var draftText: String = ""
    @State private var moveDragTranslation: CGSize = .zero
    @State private var moveDragStartCanvasOrigin: CGPoint?
    @State private var resizeDragStartSize: CGSize?
    @FocusState private var editorFocused: Bool

    private var payload: StickyNotePayload {
        element.resolvedStickyNotePayload()
    }

    private var isEditing: Bool {
        boardViewModel.editingStickyNoteElementID == element.id
    }

    private var isSelected: Bool {
        selection.isSelected(element.id)
    }

    private var cardShape: RoundedRectangle {
        RoundedRectangle(cornerRadius: CanvasStickyNoteLayout.cornerRadius, style: .continuous)
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            cardShape
                .fill(payload.backgroundColor.swiftUIColor)
                .shadow(
                    color: Color.black.opacity(FlowDeskTheme.cardShadowOpacity(selected: isSelected)),
                    radius: FlowDeskTheme.cardShadowRadius(selected: isSelected),
                    x: 0,
                    y: FlowDeskTheme.cardShadowY(selected: isSelected)
                )
                .overlay {
                    cardShape
                        .strokeBorder(Color.white.opacity(0.28), lineWidth: 0.5)
                        .blendMode(.plusLighter)
                }

            Group {
                if isEditing {
                    let font = NSFont.systemFont(
                        ofSize: CGFloat(payload.fontSize),
                        weight: payload.isBold ? .semibold : .regular
                    )
                    TextEditor(text: $draftText)
                        .font(Font(font))
                        .foregroundStyle(payload.textColor.swiftUIColor)
                        .scrollContentBackground(.hidden)
                        .scrollIndicators(.hidden)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                        .background(Color.clear)
                        .focused($editorFocused)
                } else {
                    StickyNoteDisplayView(payload: payload)
                }
            }
            .padding(CanvasStickyNoteLayout.contentPadding)

            if isSelected {
                cardShape
                    .strokeBorder(FlowDeskTheme.selectionStrokeColor, lineWidth: FlowDeskTheme.selectionStrokeWidth)
                    .allowsHitTesting(false)
            }
        }
        .overlay(alignment: .bottomTrailing) {
            if isSelected, !isEditing {
                CanvasTextBlockResizeHandle()
                    .padding(7)
                    .gesture(resizeGesture)
            }
        }
        .offset(moveDragTranslation)
        .contentShape(cardShape)
        .highPriorityGesture(
            TapGesture(count: 2).onEnded {
                selection.selectOnly(element.id)
                beginEditing()
            }
        )
        .onTapGesture {
            selection.selectOnly(element.id)
        }
        .simultaneousGesture(moveGesture)
        .contextMenu {
            Button("Edit") { beginEditing() }
            Divider()
            CanvasElementEditorContextMenuItems(
                elementID: element.id,
                boardViewModel: boardViewModel,
                selection: selection
            )
        }
        .onAppear {
            if isEditing {
                draftText = payload.text
                DispatchQueue.main.async { editorFocused = true }
            }
        }
        .onChange(of: isEditing) { _, editing in
            if editing {
                draftText = payload.text
                DispatchQueue.main.async { editorFocused = true }
            }
        }
        .onChange(of: boardViewModel.editingStickyNoteElementID) { oldValue, newValue in
            if oldValue == element.id, newValue != element.id {
                commitDraftIfNeeded()
                editorFocused = false
            }
        }
        .onChange(of: selection.primarySelectedID) { _, newId in
            guard isEditing else { return }
            if newId != element.id {
                commitDraftIfNeeded()
                editorFocused = false
                boardViewModel.stopEditingStickyNote()
            }
        }
        .onChange(of: editorFocused) { _, focused in
            if !focused, isEditing {
                commitDraftIfNeeded()
                boardViewModel.stopEditingStickyNote()
            }
        }
        .onDisappear {
            if isEditing {
                commitDraftIfNeeded()
            }
        }
    }

    private func beginEditing() {
        boardViewModel.beginEditingStickyNote(id: element.id)
    }

    private func commitDraftIfNeeded() {
        boardViewModel.updateStickyNotePayload(id: element.id) { $0.text = draftText }
    }

    private var moveGesture: some Gesture {
        DragGesture(minimumDistance: 3)
            .onChanged { value in
                guard !isEditing else { return }
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
                guard !isEditing else { return }
                boardViewModel.clearAlignmentGuides()
                let start = moveDragStartCanvasOrigin ?? CGPoint(x: element.x, y: element.y)
                let rawX = start.x + value.translation.width
                let rawY = start.y + value.translation.height
                let (snapped, _) = boardViewModel.snapMoveFrame(
                    rawOrigin: CGPoint(x: rawX, y: rawY),
                    size: CGSize(width: element.width, height: element.height),
                    elementId: element.id
                )
                boardViewModel.setStickyNoteFrame(
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
                let nw = max(CanvasStickyNoteLayout.minWidth, Double(start.width) + Double(value.translation.width))
                let nh = max(CanvasStickyNoteLayout.minHeight, Double(start.height) + Double(value.translation.height))
                let (snappedSize, guides) = boardViewModel.snapResizeBottomRightFrame(
                    origin: CGPoint(x: element.x, y: element.y),
                    rawSize: CGSize(width: nw, height: nh),
                    elementId: element.id,
                    minWidth: CGFloat(CanvasStickyNoteLayout.minWidth),
                    minHeight: CGFloat(CanvasStickyNoteLayout.minHeight)
                )
                boardViewModel.setStickyNoteFrame(
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
