import Foundation
import Observation

/// Canvas-scoped selection (element UUIDs). Cleared when the active `FlowDocument` changes.
/// Future: shift-click multi-select, marquee, and focus order map to `selectedElementIDs`.
@Observable
final class CanvasSelectionModel {
    private(set) var selectedElementIDs: Set<UUID> = []

    var primarySelectedID: UUID? {
        if selectedElementIDs.count == 1 { return selectedElementIDs.first }
        return nil
    }

    var hasSelection: Bool { !selectedElementIDs.isEmpty }

    func clear() {
        selectedElementIDs = []
    }

    func selectOnly(_ id: UUID?) {
        if let id {
            selectedElementIDs = [id]
        } else {
            clear()
        }
    }

    func isSelected(_ id: UUID) -> Bool {
        selectedElementIDs.contains(id)
    }

    /// Call after elements are removed from the board so selection stays consistent.
    func removeFromSelection(_ ids: Set<UUID>) {
        selectedElementIDs.subtract(ids)
    }
}
