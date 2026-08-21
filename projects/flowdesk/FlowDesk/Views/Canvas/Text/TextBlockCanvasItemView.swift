import AppKit
import SwiftUI

/// Renders and edits a single text block on the board (display, selection chrome, move, resize).
struct TextBlockCanvasItemView: View {
    @Environment(\.flowDeskTokens) private var tokens

    let element: CanvasElementRecord
    @Bindable var boardViewModel: CanvasBoardViewModel
    @Bindable var selection: CanvasSelectionModel

    @State private var draftText: String = ""
    @State private var moveDragTranslation: CGSize = .zero
    @State private var moveDragStartCanvasOrigin: CGPoint?
    @State private var resizeDragStartSize: CGSize?
    @FocusState private var editorFocused: Bool

    private var isEditing: Bool {
        boardViewModel.editingTextElementID == element.id
    }

    private var isSelected: Bool {
        selection.isSelected(element.id)
    }

    /// Multi-select drag: leader uses local snap translation; followers mirror shared preview.
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

    var body: some View {
        let displayPayload = element.resolvedTextPayload()

        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: FlowDeskTheme.textBlockCornerRadius, style: .continuous)
                .fill(tokens.canvasTextBlockFill)
                .shadow(
                    color: Color.black.opacity(
                        isSelected ? tokens.canvasItemShadowSelected : tokens.canvasItemShadowNormal
                    ),
                    radius: isSelected ? tokens.canvasItemShadowRadiusSelected : tokens.canvasItemShadowRadiusNormal,
                    x: 0,
                    y: isSelected ? tokens.canvasItemShadowYSelected : tokens.canvasItemShadowYNormal
                )
                .overlay {
                    RoundedRectangle(cornerRadius: FlowDeskTheme.textBlockCornerRadius, style: .continuous)
                        .strokeBorder(Color.primary.opacity(tokens.canvasTextBlockBorderOpacity), lineWidth: 0.5)
                }

            Group {
                if isEditing {
                    let font = NSFont.systemFont(
                        ofSize: CGFloat(displayPayload.fontSize),
                        weight: displayPayload.isBold ? .semibold : .regular
                    )
                    TextEditor(text: $draftText)
                        .font(Font(font))
                        .foregroundStyle(displayPayload.color.swiftUIColor)
                        .scrollContentBackground(.hidden)
                        .scrollIndicators(.hidden)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                        .background(Color.clear)
                        .focused($editorFocused)
                } else {
                    TextBlockDisplayView(payload: displayPayload)
                }
            }
            .padding(FlowDeskTheme.textBlockContentPadding)

            RoundedRectangle(cornerRadius: FlowDeskTheme.textBlockCornerRadius, style: .continuous)
                .strokeBorder(tokens.selectionStrokeColor, lineWidth: tokens.selectionStrokeWidth)
                .opacity(isSelected ? 1 : 0)
                .allowsHitTesting(false)
        }
        .animation(.easeOut(duration: 0.18), value: isSelected)
        .overlay(alignment: .bottomTrailing) {
            if isSelected, !isEditing, !selection.isMultiSelection {
                CanvasTextBlockResizeHandle()
                    .padding(FlowDeskLayout.canvasSelectionChromeInset)
                    .gesture(resizeGesture)
            }
        }
        .overlay {
            if boardViewModel.canvasTool == .select, isSelected, !isEditing, !selection.isMultiSelection {
                ShapeConnectorHandlesOverlay(
                    element: element,
                    boardViewModel: boardViewModel,
                    selection: selection
                )
                .allowsHitTesting(true)
                .help("Drag a blue dot to connect to another object (⇧ straight line)")
            }
        }
        .offset(composedMoveOffset)
        .contentShape(RoundedRectangle(cornerRadius: FlowDeskTheme.textBlockCornerRadius, style: .continuous))
        .highPriorityGesture(
            TapGesture(count: 2).onEnded {
                selection.selectOnly(element.id)
                beginEditing()
            }
        )
        .onTapGesture {
            boardViewModel.stopAllInlineEditing()
            let extend = NSEvent.modifierFlags.contains(.shift)
            selection.handleCanvasTap(elementID: element.id, extendSelection: extend)
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
                draftText = displayPayload.text
                DispatchQueue.main.async { editorFocused = true }
            }
        }
        .onChange(of: isEditing) { _, editing in
            if editing {
                draftText = displayPayload.text
                DispatchQueue.main.async {
                    editorFocused = true
                }
            }
        }
        .onChange(of: boardViewModel.editingTextElementID) { oldValue, newValue in
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
                boardViewModel.stopEditingText()
            }
        }
        .onChange(of: editorFocused) { _, focused in
            if !focused, isEditing {
                commitDraftIfNeeded()
                boardViewModel.stopEditingText()
            }
        }
        .onDisappear {
            if isEditing {
                commitDraftIfNeeded()
            }
        }
    }

    private func beginEditing() {
        boardViewModel.beginEditingTextBlock(id: element.id)
    }

    private func commitDraftIfNeeded() {
        let trimmed = draftText
        boardViewModel.updateTextPayload(id: element.id) { $0.text = trimmed }
    }

    private var moveGesture: some Gesture {
        DragGesture(minimumDistance: 1)
            .onChanged { value in
                guard !isEditing else { return }
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
                    boardViewModel.setTextBlockFrame(
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
                guard !isEditing else { return }
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
                    boardViewModel.setTextBlockFrame(
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
                let nw = max(CanvasTextBlockLayout.minWidth, Double(start.width) + Double(value.translation.width))
                let nh = max(CanvasTextBlockLayout.minHeight, Double(start.height) + Double(value.translation.height))
                let (snappedSize, guides) = boardViewModel.snapResizeBottomRightFrame(
                    origin: CGPoint(x: element.x, y: element.y),
                    rawSize: CGSize(width: nw, height: nh),
                    elementId: element.id,
                    minWidth: CGFloat(CanvasTextBlockLayout.minWidth),
                    minHeight: CGFloat(CanvasTextBlockLayout.minHeight)
                )
                boardViewModel.setTextBlockFrame(
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
