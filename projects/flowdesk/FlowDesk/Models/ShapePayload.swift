import Foundation

/// Visual primitive drawn inside the element frame. Endpoint-based connectors can replace
/// bounding-box semantics later without changing `CanvasElementRecord.kind == .shape`.
enum FlowDeskShapeKind: String, Codable, CaseIterable, Hashable, Sendable {
    case rectangle
    case roundedRectangle
    case ellipse
    case line
    case arrow

    var inspectorTitle: String {
        switch self {
        case .rectangle: "Rectangle"
        case .roundedRectangle: "Rounded rectangle"
        case .ellipse: "Ellipse"
        case .line: "Line"
        case .arrow: "Arrow"
        }
    }
}

struct ShapePayload: Codable, Equatable, Sendable {
    var kind: FlowDeskShapeKind
    var strokeColor: CanvasRGBAColor
    /// Ignored for `.line` and `.arrow` when rendering; kept for format stability / future use.
    var fillColor: CanvasRGBAColor
    var lineWidth: Double
    /// Clamped when drawing relative to frame size.
    var cornerRadius: Double

    static let `default` = ShapePayload(
        kind: .rectangle,
        strokeColor: CanvasRGBAColor(red: 0.38, green: 0.36, blue: 0.34, opacity: 1),
        fillColor: CanvasRGBAColor(red: 0.48, green: 0.42, blue: 0.36, opacity: 0.16),
        lineWidth: 2,
        cornerRadius: 12
    )

    var supportsFill: Bool {
        switch kind {
        case .line, .arrow: return false
        case .rectangle, .roundedRectangle, .ellipse: return true
        }
    }
}
