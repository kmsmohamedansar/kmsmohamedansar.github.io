import Foundation

extension FlowDocument {
    /// Template stored in canvas JSON, if any. Legacy or unlabeled boards return `nil`.
    var resolvedBoardTemplate: FlowDeskBoardTemplate? {
        CanvasBoardCoding.decode(from: canvasPayload).boardTemplate
    }
}
