import Foundation
import Observation
import SwiftData

/// Sidebar + document CRUD. Uses `ModelContext` from the environment; keeps views thin.
@Observable
final class DocumentListViewModel {
    private var modelContext: ModelContext?

    func attach(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    func createUntitledBoard() -> FlowDocument? {
        guard let modelContext else { return nil }
        let descriptor = FetchDescriptor<FlowDocument>()
        let index = (try? modelContext.fetch(descriptor).count) ?? 0
        let doc = FlowDocument(title: "Untitled Board \(index + 1)")
        modelContext.insert(doc)
        try? modelContext.save()
        return doc
    }

    func delete(_ document: FlowDocument) {
        guard let modelContext else { return }
        modelContext.delete(document)
        try? modelContext.save()
    }

    func rename(_ document: FlowDocument, to newTitle: String) {
        let trimmed = newTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        document.title = trimmed
        document.markUpdated()
        try? modelContext?.save()
    }
}
