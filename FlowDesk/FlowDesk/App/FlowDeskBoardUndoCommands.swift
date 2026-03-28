import Foundation

extension Notification.Name {
    /// Posted to request a canvas board undo (handled by `MainWindowView` when a document is open).
    static let flowDeskBoardUndo = Notification.Name("FlowDesk.boardUndo")
    /// Posted to request a canvas board redo.
    static let flowDeskBoardRedo = Notification.Name("FlowDesk.boardRedo")
}
