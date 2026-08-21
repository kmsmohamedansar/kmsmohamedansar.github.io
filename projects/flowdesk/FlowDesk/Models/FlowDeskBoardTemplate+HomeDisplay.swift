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

    /// Templates surfaced in the canvas sidebar panel (insert into current board).
    static let canvasInsertableTemplates: [FlowDeskBoardTemplate] = [
        .smartCanvas, .flowDiagram, .document, .whiteboard
    ]

    var canvasPanelTitle: String {
        switch self {
        case .smartCanvas: return "Smart layout"
        case .flowDiagram: return "Flow starter"
        case .document: return "Writing surface"
        case .whiteboard: return "Sketch mode"
        case .blankBoard: return "Blank"
        }
    }

    var canvasPanelSubtitle: String {
        switch self {
        case .smartCanvas:
            return "Text, sticky, and frame—placed for you."
        case .flowDiagram:
            return "Three nodes and connectors."
        case .document:
            return "One large text area."
        case .whiteboard:
            return "Grid on, draw tool ready."
        case .blankBoard:
            return ""
        }
    }
}
