import SwiftUI

/// Canvas shortcuts: edit commands, single-key tools (V/T/N/R/S/P/G), and ⌘⌥1–3 viewport framing.
struct CanvasScreenKeyCommands: ViewModifier {
    var boardViewModel: CanvasBoardViewModel
    var selection: CanvasSelectionModel

    func body(content: Content) -> some View {
        content
            .onKeyPress(.escape) {
                if boardViewModel.editingConnectorLabelElementID != nil {
                    boardViewModel.stopEditingConnectorLabel()
                    return .handled
                }
                if boardViewModel.connectorEndpointAdjustDraft != nil {
                    boardViewModel.cancelConnectorEndpointAdjust()
                    return .handled
                }
                if boardViewModel.connectorDragDraft != nil {
                    boardViewModel.cancelConnectorDrag()
                    return .handled
                }
                return .ignored
            }
            .onKeyPress(keys: ["c"]) { press in
                guard press.modifiers.contains(.command) else { return .ignored }
                if inlineEditingActive { return .ignored }
                guard selection.hasSelection else { return .ignored }
                boardViewModel.copySelectedElementsToPasteboard(selection: selection)
                return .handled
            }
            .onKeyPress(keys: ["v"]) { press in
                if press.modifiers.contains(.command) {
                    if inlineEditingActive { return .ignored }
                    guard boardViewModel.canPasteFromClipboard else { return .ignored }
                    boardViewModel.pasteClipboardElements(selection: selection)
                    return .handled
                }
                guard !press.modifiers.contains(.option), !press.modifiers.contains(.control) else { return .ignored }
                if inlineEditingActive { return .ignored }
                boardViewModel.applyCanvasToolSelection(.select, fromKeyboard: true)
                return .handled
            }
            .onKeyPress(keys: ["d"]) { press in
                guard press.modifiers.contains(.command) else { return .ignored }
                if inlineEditingActive { return .ignored }
                guard selection.hasSelection else { return .ignored }
                boardViewModel.duplicateAllSelectedElements(selection: selection)
                return .handled
            }
            .onKeyPress(keys: ["1", "2", "3"]) { press in
                guard press.modifiers.contains(.command), press.modifiers.contains(.option) else { return .ignored }
                if inlineEditingActive { return .ignored }
                switch press.characters {
                case "1":
                    boardViewModel.fitViewportToBoardContent()
                case "2":
                    boardViewModel.centerViewportOnBoardContent(canvasMargin: 48)
                case "3":
                    guard selection.hasSelection else { return .ignored }
                    boardViewModel.fitViewportToSelection(selection: selection)
                default:
                    return .ignored
                }
                return .handled
            }
            .onKeyPress(keys: ["=", "+"]) { press in
                guard press.modifiers.contains(.command) else { return .ignored }
                if inlineEditingActive { return .ignored }
                boardViewModel.nudgeViewportZoomIn()
                return .handled
            }
            .onKeyPress(keys: ["-"]) { press in
                guard press.modifiers.contains(.command) else { return .ignored }
                if inlineEditingActive { return .ignored }
                boardViewModel.nudgeViewportZoomOut()
                return .handled
            }
            .onKeyPress(keys: ["t"]) { press in
                singleKeyToolPress(press) {
                    boardViewModel.applyCanvasToolSelection(.placeText, fromKeyboard: true)
                }
            }
            .onKeyPress(keys: ["n"]) { press in
                singleKeyToolPress(press) {
                    boardViewModel.applyCanvasToolSelection(.placeSticky, fromKeyboard: true)
                }
            }
            .onKeyPress(keys: ["r"]) { press in
                singleKeyToolPress(press) {
                    boardViewModel.applyCanvasToolSelection(.placeShape, fromKeyboard: true, rectanglePlacementShape: true)
                }
            }
            .onKeyPress(keys: ["s"]) { press in
                singleKeyToolPress(press) {
                    boardViewModel.applyCanvasToolSelection(.placeShape, fromKeyboard: true, rectanglePlacementShape: false)
                }
            }
            .onKeyPress(keys: ["p"]) { press in
                singleKeyToolPress(press) {
                    boardViewModel.applyCanvasToolSelection(.draw, fromKeyboard: true)
                }
            }
            .onKeyPress(keys: ["g"]) { press in
                singleKeyToolPress(press) {
                    boardViewModel.toggleViewportShowGrid()
                }
            }
    }

    private var inlineEditingActive: Bool {
        boardViewModel.editingTextElementID != nil
            || boardViewModel.editingStickyNoteElementID != nil
            || boardViewModel.editingConnectorLabelElementID != nil
    }

    private func singleKeyToolPress(_ press: KeyPress, activate: () -> Void) -> KeyPress.Result {
        if press.modifiers.contains(.command) || press.modifiers.contains(.option) || press.modifiers.contains(.control) {
            return .ignored
        }
        if inlineEditingActive {
            return .ignored
        }
        activate()
        return .handled
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
