import Foundation

/// Serializable canvas snapshot. Kept separate from `@Model` types so collaboration/sync can
/// later sync or merge JSON without touching SwiftData entity shapes.
struct CanvasBoardState: Codable, Equatable, Sendable {
    static let currentFormatVersion = 1

    var formatVersion: Int
    var viewport: ViewportState
    var elements: [CanvasElementRecord]
    /// Set when created from the home screen; omitted in legacy JSON.
    var boardTemplate: FlowDeskBoardTemplate?

    init(
        formatVersion: Int = Self.currentFormatVersion,
        viewport: ViewportState = .init(),
        elements: [CanvasElementRecord] = [],
        boardTemplate: FlowDeskBoardTemplate? = nil
    ) {
        self.formatVersion = formatVersion
        self.viewport = viewport
        self.elements = elements
        self.boardTemplate = boardTemplate
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
    case connector
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
    /// Populated when `kind == .textBlock`; omitted in JSON for other kinds and legacy boards.
    var textBlock: TextBlockPayload?
    /// Populated when `kind == .stickyNote`; omitted otherwise.
    var stickyNote: StickyNotePayload?
    /// Populated when `kind == .shape`; omitted otherwise.
    var shapePayload: ShapePayload?
    /// Populated when `kind == .stroke`; omitted otherwise.
    var strokePayload: StrokePayload?
    /// Populated when `kind == .chart`; omitted otherwise.
    var chartPayload: ChartPayload?
    /// Populated when `kind == .connector`; omitted otherwise.
    var connectorPayload: ConnectorPayload?

    init(
        id: UUID = UUID(),
        kind: CanvasElementKind,
        x: Double,
        y: Double,
        width: Double,
        height: Double,
        zIndex: Int = 0,
        textBlock: TextBlockPayload? = nil,
        stickyNote: StickyNotePayload? = nil,
        shapePayload: ShapePayload? = nil,
        strokePayload: StrokePayload? = nil,
        chartPayload: ChartPayload? = nil,
        connectorPayload: ConnectorPayload? = nil
    ) {
        self.id = id
        self.kind = kind
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.zIndex = zIndex
        self.textBlock = textBlock
        self.stickyNote = stickyNote
        self.shapePayload = shapePayload
        self.strokePayload = strokePayload
        self.chartPayload = chartPayload
        self.connectorPayload = connectorPayload
    }
}

extension CanvasElementRecord {
    /// Legacy or partial data: ensure text blocks always have a renderable payload.
    func resolvedTextPayload() -> TextBlockPayload {
        guard kind == .textBlock else { return .default }
        return textBlock ?? .default
    }

    /// Legacy or partial data: sticky notes without payload still render sensibly.
    func resolvedStickyNotePayload() -> StickyNotePayload {
        guard kind == .stickyNote else { return .default }
        return stickyNote ?? .default
    }

    func resolvedShapePayload() -> ShapePayload {
        guard kind == .shape else { return .default }
        return shapePayload ?? .default
    }

    func resolvedStrokePayload() -> StrokePayload {
        guard kind == .stroke else { return .default }
        return strokePayload ?? .default
    }

    func resolvedChartPayload() -> ChartPayload {
        guard kind == .chart else { return .default }
        return chartPayload ?? .default
    }

    func resolvedConnectorPayload() -> ConnectorPayload? {
        guard kind == .connector else { return nil }
        return connectorPayload
    }

    // MARK: - Duplicate / paste (connectors)

    /// Creates a copy for board duplicate or clipboard paste.
    ///
    /// **Connectors:** Returned only when `endpointIDRemap` maps **both** payload endpoints to new ids
    /// (same batch duplicate / paste). Otherwise `nil` — links are not shallow-copied onto the same nodes.
    /// **Other kinds:** Always returns a copy; `endpointIDRemap` is ignored.
    func boardDuplicatedCopy(
        newId: UUID,
        deltaX: Double,
        deltaY: Double,
        zIndex: Int,
        endpointIDRemap: [UUID: UUID]?
    ) -> CanvasElementRecord? {
        if kind == .connector {
            guard let payload = connectorPayload,
                  let remap = endpointIDRemap,
                  let newStart = remap[payload.startElementID],
                  let newEnd = remap[payload.endElementID]
            else { return nil }
            var p = payload
            p.startElementID = newStart
            p.endElementID = newEnd
            return CanvasElementRecord(
                id: newId,
                kind: .connector,
                x: x + deltaX,
                y: y + deltaY,
                width: width,
                height: height,
                zIndex: zIndex,
                connectorPayload: p
            )
        }
        return CanvasElementRecord(
            id: newId,
            kind: kind,
            x: x + deltaX,
            y: y + deltaY,
            width: width,
            height: height,
            zIndex: zIndex,
            textBlock: textBlock,
            stickyNote: stickyNote,
            shapePayload: shapePayload,
            strokePayload: strokePayload,
            chartPayload: chartPayload,
            connectorPayload: nil
        )
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
