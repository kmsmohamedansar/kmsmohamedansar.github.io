import AppKit
import SwiftUI

/// Renders and edits a single text block on the board (display, selection chrome, move, resize).
struct TextBlockCanvasItemView: View {
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

    var body: some View {
        let displayPayload = element.resolvedTextPayload()

        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: FlowDeskTheme.textBlockCornerRadius, style: .continuous)
                .fill(Color(nsColor: .textBackgroundColor))
                .shadow(
                    color: Color.black.opacity(FlowDeskTheme.cardShadowOpacity(selected: isSelected)),
                    radius: FlowDeskTheme.cardShadowRadius(selected: isSelected),
                    x: 0,
                    y: FlowDeskTheme.cardShadowY(selected: isSelected)
                )
                .overlay {
                    RoundedRectangle(cornerRadius: FlowDeskTheme.textBlockCornerRadius, style: .continuous)
                        .strokeBorder(Color.primary.opacity(0.06), lineWidth: 0.5)
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
        .contentShape(RoundedRectangle(cornerRadius: FlowDeskTheme.textBlockCornerRadius, style: .continuous))
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
                boardViewModel.setTextBlockFrame(
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
