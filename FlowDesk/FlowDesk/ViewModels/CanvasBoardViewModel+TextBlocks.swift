import Foundation

extension CanvasBoardViewModel {
    private static let textBlockDefaultWidth: Double = 340
    private static let textBlockDefaultHeight: Double = 160

    func nextZIndex() -> Int {
        boardState.elements.map(\.zIndex).max().map { $0 + 1 } ?? 0
    }

    /// Inserts a new text block, selects it in `selection`, and returns its id for editing.
    @discardableResult
    func insertTextBlock(
        selection: CanvasSelectionModel,
        beginEditing: Bool = true
    ) -> UUID {
        canvasTool = .select
        let id = UUID()
        var payload = TextBlockPayload.default
        payload.text = ""
        let origin = insertionOriginForNewElement(width: Self.textBlockDefaultWidth, height: Self.textBlockDefaultHeight)
        let record = CanvasElementRecord(
            id: id,
            kind: .textBlock,
            x: origin.x,
            y: origin.y,
            width: Self.textBlockDefaultWidth,
            height: Self.textBlockDefaultHeight,
            zIndex: nextZIndex(),
            textBlock: payload
        )

        applyBoardMutation { state in
            state.elements.append(record)
        }

        selection.selectOnly(id)
        if beginEditing {
            editingStickyNoteElementID = nil
            editingTextElementID = id
        }
        return id
    }

    func stopEditingText() {
        editingTextElementID = nil
    }

    func beginEditingTextBlock(id: UUID) {
        guard boardState.elements.contains(where: { $0.id == id && $0.kind == .textBlock }) else { return }
        editingStickyNoteElementID = nil
        editingTextElementID = id
    }

    func updateElement(id: UUID, _ body: (inout CanvasElementRecord) -> Void) {
        applyBoardMutation { state in
            guard let i = state.elements.firstIndex(where: { $0.id == id }) else { return }
            body(&state.elements[i])
        }
    }

    func updateTextPayload(id: UUID, _ body: (inout TextBlockPayload) -> Void) {
        updateElement(id: id) { element in
            guard element.kind == .textBlock else { return }
            var payload = element.resolvedTextPayload()
            body(&payload)
            element.textBlock = payload
        }
    }

    func setTextBlockFrame(id: UUID, x: Double, y: Double, width: Double, height: Double) {
        updateElement(id: id) { element in
            guard element.kind == .textBlock else { return }
            element.x = x
            element.y = y
            element.width = max(width, CanvasTextBlockLayout.minWidth)
            element.height = max(height, CanvasTextBlockLayout.minHeight)
        }
    }
}

/// Shared layout constants for text blocks (used by view + view model).
enum CanvasTextBlockLayout {
    static let minWidth: Double = 120
    static let minHeight: Double = 72
}
