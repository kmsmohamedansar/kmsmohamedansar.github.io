import Foundation

/// Primary canvas interaction mode (session UI only; not persisted on `CanvasBoardState`).
enum CanvasToolMode: String, Codable, Sendable, Hashable {
    case select
    case draw
    /// Click empty canvas to place a text block (stays active for repeated placement).
    case placeText
    /// Click empty canvas to place a sticky note.
    case placeSticky
    /// Click empty canvas to place `CanvasBoardViewModel.placeShapeKind`.
    case placeShape

    var isPlacementMode: Bool {
        switch self {
        case .placeText, .placeSticky, .placeShape: return true
        case .select, .draw: return false
        }
    }
}
