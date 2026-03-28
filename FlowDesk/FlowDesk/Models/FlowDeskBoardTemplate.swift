import Foundation

/// How the board was created from the home screen. Stored in `CanvasBoardState` JSON (optional for legacy boards).
enum FlowDeskBoardTemplate: String, Codable, Sendable, CaseIterable, Identifiable {
    case document
    case whiteboard
    case smartCanvas
    case flowDiagram
    case blankBoard

    var id: String { rawValue }

    /// Title for a new board; `ordinal` is 1-based count among all boards at creation time.
    func suggestedTitle(ordinal: Int) -> String {
        let n = max(1, ordinal)
        switch self {
        case .blankBoard:
            return "Untitled Board \(n)"
        case .document:
            return n == 1 ? "Untitled Document" : "Untitled Document \(n)"
        case .whiteboard:
            return n == 1 ? "Untitled Whiteboard" : "Untitled Whiteboard \(n)"
        case .smartCanvas:
            return n == 1 ? "Untitled Smart Canvas" : "Untitled Smart Canvas \(n)"
        case .flowDiagram:
            return n == 1 ? "Untitled Flow Diagram" : "Untitled Flow Diagram \(n)"
        }
    }
}
