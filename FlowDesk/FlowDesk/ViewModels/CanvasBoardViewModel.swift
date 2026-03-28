import Foundation
import Observation
import SwiftData

/// In-memory canvas state for the selected document. Persists back to `FlowDocument.canvasPayload`
/// on meaningful changes (Phase 1: viewport + future elements).
@Observable
final class CanvasBoardViewModel {
    private weak var document: FlowDocument?
    private var modelContext: ModelContext?

    private(set) var boardState: CanvasBoardState = .empty()

    func attach(document: FlowDocument, modelContext: ModelContext) {
        self.document = document
        self.modelContext = modelContext
        boardState = CanvasBoardCoding.decode(from: document.canvasPayload)
    }

    func detach() {
        document = nil
        modelContext = nil
        boardState = .empty()
    }

    func setViewport(_ viewport: ViewportState) {
        boardState.viewport = viewport
        persist()
    }

    private func persist() {
        guard let document, let modelContext else { return }
        document.canvasPayload = CanvasBoardCoding.encode(boardState)
        document.markUpdated()
        try? modelContext.save()
    }
}
