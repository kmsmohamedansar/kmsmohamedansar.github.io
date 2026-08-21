import Foundation
import Observation

/// Canvas-scoped selection (element UUIDs). Cleared when the active `FlowDocument` changes.
@Observable
final class CanvasSelectionModel {
    private(set) var selectedElementIDs: Set<UUID> = []

    var primarySelectedID: UUID? {
        if selectedElementIDs.count == 1 { return selectedElementIDs.first }
        return nil
    }

    /// More than one element selected (inspector uses lightweight multi state).
    var isMultiSelection: Bool { selectedElementIDs.count > 1 }

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

    /// Replaces the selection (e.g. after paste or multi-duplicate).
    func replaceSelection(_ ids: Set<UUID>) {
        selectedElementIDs = ids
    }

    /// Normal click: single select. Shift-click: add/remove without clearing others.
    func handleCanvasTap(elementID: UUID, extendSelection: Bool) {
        if extendSelection {
            toggleSelection(elementID)
        } else {
            selectOnly(elementID)
        }
    }

    func toggleSelection(_ id: UUID) {
        if selectedElementIDs.contains(id) {
            selectedElementIDs.remove(id)
        } else {
            selectedElementIDs.insert(id)
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
