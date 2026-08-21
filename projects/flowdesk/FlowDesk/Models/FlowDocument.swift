import Foundation
import SwiftData

/// Top-level persisted board. Canvas payload is versioned JSON for forward-compatible evolution
/// and to keep SwiftData schema stable while element models grow.
@Model
final class FlowDocument {
    var id: UUID
    var title: String
    var createdAt: Date
    var updatedAt: Date
    /// Encoded `CanvasBoardState` (JSON).
    @Attribute(.externalStorage) var canvasPayload: Data

    init(
        id: UUID = UUID(),
        title: String,
        createdAt: Date = .now,
        updatedAt: Date = .now,
        canvasPayload: Data = CanvasBoardState.emptyEncoded()
    ) {
        self.id = id
        self.title = title
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.canvasPayload = canvasPayload
    }

    func markUpdated() {
        updatedAt = .now
    }
}
