import Foundation

/// Primary canvas interaction mode. Extend with `.eraser`, `.highlighter`, etc. without changing element kinds.
enum CanvasToolMode: String, Codable, CaseIterable, Sendable, Hashable {
    case select
    case draw
}
