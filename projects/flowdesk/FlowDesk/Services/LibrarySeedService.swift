import Foundation
import SwiftData

/// Inserts sample boards on first launch so the canvas API is visible without manual setup.
enum LibrarySeedService {
    static func seedIfNeeded(in context: ModelContext) {
        var descriptor = FetchDescriptor<FlowDocument>()
        descriptor.fetchLimit = 1
        let any = (try? context.fetch(descriptor)) ?? []
        guard any.isEmpty else { return }

        let welcome = FlowDocument(
            title: "Welcome to Cerebra",
            canvasPayload: CanvasBoardCoding.encode(.sampleWelcomeBoard())
        )
        context.insert(welcome)

        let scratch = FlowDocument(
            title: "Scratch",
            canvasPayload: CanvasBoardState.emptyEncoded()
        )
        context.insert(scratch)

        try? context.save()
    }
}
