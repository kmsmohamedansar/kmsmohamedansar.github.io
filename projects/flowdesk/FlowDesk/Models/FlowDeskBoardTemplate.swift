import Foundation

/// How a board was first created. Persisted in `CanvasBoardState.boardTemplate` (JSON).
///
/// **Product:** Cerebra is a **smart canvas** app for solo thinking. Only ``smartCanvas`` and ``blankBoard`` appear in the
/// creation UI. Cases ``document``, ``whiteboard``, and ``flowDiagram`` remain for decoding existing data.
enum FlowDeskBoardTemplate: String, Codable, Sendable, CaseIterable, Identifiable {
    case document
    case whiteboard
    case smartCanvas
    case flowDiagram
    case blankBoard

    var id: String { rawValue }

    /// Templates offered on Home and as the default “new board” action (sidebar).
    static let creationFlowTemplates: [FlowDeskBoardTemplate] = [.smartCanvas, .blankBoard]

    /// Title for a new board; `ordinal` is 1-based count among all boards at creation time.
    func suggestedTitle(ordinal: Int) -> String {
        let n = max(1, ordinal)
        switch self {
        case .blankBoard:
            return n == 1 ? "Untitled Board" : "Untitled Board \(n)"
        case .smartCanvas:
            return n == 1 ? "Untitled Canvas" : "Untitled Canvas \(n)"
        case .document:
            return n == 1 ? "Untitled Document" : "Untitled Document \(n)"
        case .whiteboard:
            return n == 1 ? "Untitled Whiteboard" : "Untitled Whiteboard \(n)"
        case .flowDiagram:
            return n == 1 ? "Untitled Flow Diagram" : "Untitled Flow Diagram \(n)"
        }
    }
}
