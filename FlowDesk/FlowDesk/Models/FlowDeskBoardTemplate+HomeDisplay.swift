import Foundation

extension FlowDeskBoardTemplate {
    /// Short label for chips on continue/recent rows. Legacy templates use a neutral “Canvas” label.
    var homeChipLabel: String {
        switch self {
        case .smartCanvas: return "Smart canvas"
        case .blankBoard: return "Blank"
        case .document, .whiteboard, .flowDiagram:
            return "Canvas"
        }
    }
}
