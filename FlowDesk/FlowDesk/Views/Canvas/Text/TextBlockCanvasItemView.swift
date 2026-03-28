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

            if isSelected {
                RoundedRectangle(cornerRadius: FlowDeskTheme.textBlockCornerRadius, style: .continuous)
                    .strokeBorder(tokens.selectionStrokeColor, lineWidth: tokens.selectionStrokeWidth)
                    .allowsHitTesting(false)
            }
        }
        .overlay(alignment: .bottomTrailing) {
            if isSelected, !isEditing, !selection.isMultiSelection {
                CanvasTextBlockResizeHandle()
                    .padding(7)
                    .gesture(resizeGesture)
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
        DragGesture(minimumDistance: 3)
            .onChanged { value in
                guard !isEditing else { return }
                if moveDragStartCanvasOrigin == nil {
                    moveDragStartCanvasOrigin = CGPoint(x: element.x, y: element.y)
                    boardViewModel.configureGroupMoveIfNeeded(leaderId: element.id, selection: selection)
                }
                let start = moveDragStartCanvasOrigin ?? CGPoint(x: element.x, y: element.y)
                let rawX = start.x + value.translation.width
                let rawY = start.y + value.translation.height
                let exclude = boardViewModel.snapExclusionsForFramedMove(leaderId: element.id, selection: selection)
                let (snapped, guides) = boardViewModel.snapMoveFrame(
                    rawOrigin: CGPoint(x: rawX, y: rawY),
                    size: CGSize(width: element.width, height: element.height),
                    excludingElementIds: exclude
                )
                moveDragTranslation = CGSize(
                    width: snapped.x - element.x,
                    height: snapped.y - element.y
                )
                boardViewModel.syncGroupMovePreview(leaderId: element.id, translation: moveDragTranslation)
                boardViewModel.updateAlignmentGuides(guides)
            }
            .onEnded { value in
                guard !isEditing else { return }
                boardViewModel.clearAlignmentGuides()
                let start = moveDragStartCanvasOrigin ?? CGPoint(x: element.x, y: element.y)
                let rawX = start.x + value.translation.width
                let rawY = start.y + value.translation.height
                let exclude = boardViewModel.snapExclusionsForFramedMove(leaderId: element.id, selection: selection)
                let (snapped, _) = boardViewModel.snapMoveFrame(
                    rawOrigin: CGPoint(x: rawX, y: rawY),
                    size: CGSize(width: element.width, height: element.height),
                    excludingElementIds: exclude
                )
                let participants = boardViewModel.groupMoveParticipantIDs
                if boardViewModel.groupMoveLeaderID == element.id,
                   participants.count > 1 {
                    let dx = Double(snapped.x - start.x)
                    let dy = Double(snapped.y - start.y)
                    boardViewModel.applyFramedGroupPositionDelta(ids: participants, dx: dx, dy: dy)
                } else {
                    boardViewModel.setTextBlockFrame(
                        id: element.id,
                        x: Double(snapped.x),
                        y: Double(snapped.y),
                        width: element.width,
                        height: element.height
                    )
                }
                boardViewModel.resetGroupMoveState()
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
