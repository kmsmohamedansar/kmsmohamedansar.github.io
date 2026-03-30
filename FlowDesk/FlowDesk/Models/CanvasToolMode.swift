import Foundation

/// Primary canvas interaction mode (session UI only; not persisted on `CanvasBoardState`).
enum CanvasToolMode: String, Codable, Sendable, Hashable {
    case select
    case draw
    /// Click to place a text block, or drag to define its frame (stays active for repeated placement).
    case placeText
    /// Click to place a sticky, or drag to define its area.
    case placeSticky
    /// Drag on the canvas to size a shape (or click for default size) using `CanvasBoardViewModel.placeShapeKind`.
    case placeShape

    var isPlacementMode: Bool {
        switch self {
        case .placeText, .placeSticky, .placeShape: return true
        case .select, .draw: return false
        }
    }
}

/// Lightweight context UI beside the primary tool rail (progressive disclosure).
enum CanvasContextPanel: String, Equatable {
    case templates
    case shapes
    case drawStroke
}
