import Foundation

/// Serializable canvas snapshot. Kept separate from `@Model` types so collaboration/sync can
/// later sync or merge JSON without touching SwiftData entity shapes.
struct CanvasBoardState: Codable, Equatable, Sendable {
    static let currentFormatVersion = 1

    var formatVersion: Int
    var viewport: ViewportState
    var elements: [CanvasElementRecord]

    init(
        formatVersion: Int = Self.currentFormatVersion,
        viewport: ViewportState = .init(),
        elements: [CanvasElementRecord] = []
    ) {
        self.formatVersion = formatVersion
        self.viewport = viewport
        self.elements = elements
    }

    static func empty() -> CanvasBoardState {
        CanvasBoardState()
    }

    static func emptyEncoded() -> Data {
        (try? JSONEncoder.flowDesk.encode(empty())) ?? Data()
    }
}

struct ViewportState: Codable, Equatable, Sendable {
    var scale: Double
    var offsetX: Double
    var offsetY: Double
    var showGrid: Bool

    init(scale: Double = 1, offsetX: Double = 0, offsetY: Double = 0, showGrid: Bool = true) {
        self.scale = scale
        self.offsetX = offsetX
        self.offsetY = offsetY
        self.showGrid = showGrid
    }
}

/// Discriminated element kinds for v1+; payloads expand per kind without breaking decode
/// if we use `decodeIfPresent` in per-kind structs later.
enum CanvasElementKind: String, Codable, Sendable {
    case textBlock
    case stickyNote
    case stroke
    case shape
    case chart
}

struct CanvasElementRecord: Codable, Identifiable, Equatable, Sendable {
    var id: UUID
    var kind: CanvasElementKind
    /// Normalized frame in canvas space (points).
    var x: Double
    var y: Double
    var width: Double
    var height: Double
    var zIndex: Int

    init(
        id: UUID = UUID(),
        kind: CanvasElementKind,
        x: Double,
        y: Double,
        width: Double,
        height: Double,
        zIndex: Int = 0
    ) {
        self.id = id
        self.kind = kind
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.zIndex = zIndex
    }
}

enum CanvasBoardCoding {
    static func decode(from data: Data) -> CanvasBoardState {
        guard !data.isEmpty else { return .empty() }
        do {
            return try JSONDecoder.flowDesk.decode(CanvasBoardState.self, from: data)
        } catch {
            return .empty()
        }
    }

    static func encode(_ state: CanvasBoardState) -> Data {
        (try? JSONEncoder.flowDesk.encode(state)) ?? CanvasBoardState.emptyEncoded()
    }
}
