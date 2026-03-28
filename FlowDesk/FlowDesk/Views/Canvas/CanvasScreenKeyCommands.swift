import SwiftUI

/// ⌘C / ⌘V for canvas elements when not inline-editing text or a sticky note.
struct CanvasScreenKeyCommands: ViewModifier {
    var boardViewModel: CanvasBoardViewModel
    var selection: CanvasSelectionModel

    func body(content: Content) -> some View {
        content
            .onKeyPress(keys: ["c"]) { press in
                guard press.modifiers.contains(.command) else { return .ignored }
                if boardViewModel.editingTextElementID != nil || boardViewModel.editingStickyNoteElementID != nil {
                    return .ignored
                }
                guard selection.hasSelection else { return .ignored }
                boardViewModel.copySelectedElementsToPasteboard(selection: selection)
                return .handled
            }
            .onKeyPress(keys: ["v"]) { press in
                guard press.modifiers.contains(.command) else { return .ignored }
                if boardViewModel.editingTextElementID != nil || boardViewModel.editingStickyNoteElementID != nil {
                    return .ignored
                }
                guard boardViewModel.canPasteFromClipboard else { return .ignored }
                boardViewModel.pasteClipboardElements(selection: selection)
                return .handled
            }
            .onKeyPress(keys: ["d"]) { press in
                guard press.modifiers.contains(.command) else { return .ignored }
                if boardViewModel.editingTextElementID != nil || boardViewModel.editingStickyNoteElementID != nil {
                    return .ignored
                }
                guard selection.hasSelection else { return .ignored }
                boardViewModel.duplicateAllSelectedElements(selection: selection)
                return .handled
            }
    }
}

extension View {
    func canvasScreenKeyCommands(
        boardViewModel: CanvasBoardViewModel,
        selection: CanvasSelectionModel
    ) -> some View {
        modifier(CanvasScreenKeyCommands(boardViewModel: boardViewModel, selection: selection))
    }
}
