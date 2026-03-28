import Foundation
import SwiftUI

extension CanvasBoardViewModel {
    private static let stickyDefaultWidth: Double = 220
    private static let stickyDefaultHeight: Double = 200

    @discardableResult
    func insertStickyNote(
        selection: CanvasSelectionModel,
        beginEditing: Bool = true
    ) -> UUID {
        canvasTool = .select
        let id = UUID()
        var payload = StickyNotePayload.default
        payload.text = ""
        let origin = insertionOriginForNewElement(width: Self.stickyDefaultWidth, height: Self.stickyDefaultHeight)
        let record = CanvasElementRecord(
            id: id,
            kind: .stickyNote,
            x: origin.x,
            y: origin.y,
            width: Self.stickyDefaultWidth,
            height: Self.stickyDefaultHeight,
            zIndex: nextZIndex(),
            stickyNote: payload
        )

        applyBoardMutation { state in
            state.elements.append(record)
        }

        selection.selectOnly(id)
        if beginEditing {
            editingTextElementID = nil
            editingStickyNoteElementID = id
        }
        return id
    }

    /// Click-to-place while `canvasTool == .placeSticky`; does not change the active tool.
    @discardableResult
    func insertStickyNoteAtCanvasPoint(
        _ point: CGPoint,
        selection: CanvasSelectionModel,
        beginEditing: Bool = true
    ) -> UUID {
        stopAllInlineEditing()
        let w = Self.stickyDefaultWidth
        let h = Self.stickyDefaultHeight
        let origin = CanvasInsertionPlacement.topLeftFromCenter(
            centerX: Double(point.x),
            centerY: Double(point.y),
            elementWidth: w,
            elementHeight: h,
            canvasLogicalSize: 4000
        )
        let id = UUID()
        var payload = StickyNotePayload.default
        payload.text = ""
        let record = CanvasElementRecord(
            id: id,
            kind: .stickyNote,
            x: origin.x,
            y: origin.y,
            width: w,
            height: h,
            zIndex: nextZIndex(),
            stickyNote: payload
        )
        applyBoardMutation { state in
            state.elements.append(record)
        }
        selection.selectOnly(id)
        if beginEditing {
            editingTextElementID = nil
            editingStickyNoteElementID = id
        }
        return id
    }

    func stopEditingStickyNote() {
        editingStickyNoteElementID = nil
    }

    /// Clears any inline editor (text block or sticky).
    func stopAllInlineEditing() {
        editingTextElementID = nil
        editingStickyNoteElementID = nil
    }

    func beginEditingStickyNote(id: UUID) {
        guard boardState.elements.contains(where: { $0.id == id && $0.kind == .stickyNote }) else { return }
        editingTextElementID = nil
        editingStickyNoteElementID = id
    }

    func updateStickyNotePayload(id: UUID, _ body: (inout StickyNotePayload) -> Void) {
        updateElement(id: id) { element in
            guard element.kind == .stickyNote else { return }
            var payload = element.resolvedStickyNotePayload()
            body(&payload)
            element.stickyNote = payload
        }
    }

    func setStickyNoteFrame(id: UUID, x: Double, y: Double, width: Double, height: Double) {
        updateElement(id: id) { element in
            guard element.kind == .stickyNote else { return }
            element.x = x
            element.y = y
            element.width = max(width, CanvasStickyNoteLayout.minWidth)
            element.height = max(height, CanvasStickyNoteLayout.minHeight)
        }
    }
}

enum CanvasStickyNoteLayout {
    static let minWidth: Double = 100
    static let minHeight: Double = 80
    static let cornerRadius: CGFloat = FlowDeskLayout.cardCornerRadius
    static let contentPadding = FlowDeskLayout.canvasCardContentPadding
}
