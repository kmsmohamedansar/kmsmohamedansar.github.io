import Foundation

extension FlowDeskBoardTemplate {
    /// Short label for chips and subtitles on the home dashboard.
    var homeChipLabel: String {
        switch self {
        case .document: return "Document"
        case .whiteboard: return "Whiteboard"
        case .smartCanvas: return "Smart Canvas"
        case .flowDiagram: return "Flow Diagram"
        case .blankBoard: return "Blank Board"
        }
    }
}
