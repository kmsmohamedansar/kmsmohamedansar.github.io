import CoreGraphics
import Foundation

/// Which side of a framed element a connector attaches to.
enum ConnectorEdge: String, Codable, Sendable, CaseIterable {
    case top
    case right
    case bottom
    case left
}

enum ConnectorLineStyle: String, Codable, Sendable {
    case straight
    case arrow
}

/// Persistent connector between two elements; frame on `CanvasElementRecord` is derived (hit target + bounds).
struct ConnectorPayload: Codable, Equatable, Sendable {
    var startElementID: UUID
    var endElementID: UUID
    var startEdge: ConnectorEdge
    var endEdge: ConnectorEdge
    /// 0...1 along the edge from low coordinate to high (top: left→right, right: top→bottom, etc.).
    var startT: Double
    var endT: Double
    var style: ConnectorLineStyle
    var strokeColor: CanvasRGBAColor
    var lineWidth: Double
    /// One-line plain text; empty string means no label on canvas.
    var label: String

    enum CodingKeys: String, CodingKey {
        case startElementID
        case endElementID
        case startEdge
        case endEdge
        case startT
        case endT
        case style
        case strokeColor
        case lineWidth
        case label
    }

    init(
        startElementID: UUID,
        endElementID: UUID,
        startEdge: ConnectorEdge,
        endEdge: ConnectorEdge,
        startT: Double,
        endT: Double,
        style: ConnectorLineStyle,
        strokeColor: CanvasRGBAColor,
        lineWidth: Double,
        label: String = ""
    ) {
        self.startElementID = startElementID
        self.endElementID = endElementID
        self.startEdge = startEdge
        self.endEdge = endEdge
        self.startT = startT
        self.endT = endT
        self.style = style
        self.strokeColor = strokeColor
        self.lineWidth = lineWidth
        self.label = label
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        startElementID = try c.decode(UUID.self, forKey: .startElementID)
        endElementID = try c.decode(UUID.self, forKey: .endElementID)
        startEdge = try c.decode(ConnectorEdge.self, forKey: .startEdge)
        endEdge = try c.decode(ConnectorEdge.self, forKey: .endEdge)
        startT = try c.decode(Double.self, forKey: .startT)
        endT = try c.decode(Double.self, forKey: .endT)
        style = try c.decode(ConnectorLineStyle.self, forKey: .style)
        strokeColor = try c.decode(CanvasRGBAColor.self, forKey: .strokeColor)
        lineWidth = try c.decode(Double.self, forKey: .lineWidth)
        label = try c.decodeIfPresent(String.self, forKey: .label) ?? ""
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(startElementID, forKey: .startElementID)
        try c.encode(endElementID, forKey: .endElementID)
        try c.encode(startEdge, forKey: .startEdge)
        try c.encode(endEdge, forKey: .endEdge)
        try c.encode(startT, forKey: .startT)
        try c.encode(endT, forKey: .endT)
        try c.encode(style, forKey: .style)
        try c.encode(strokeColor, forKey: .strokeColor)
        try c.encode(lineWidth, forKey: .lineWidth)
        if !label.isEmpty {
            try c.encode(label, forKey: .label)
        }
    }
}
