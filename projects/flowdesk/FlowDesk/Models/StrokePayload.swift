import Foundation

/// One sample in stroke path, stored **relative to** `CanvasElementRecord.x` / `y` (element-local space).
struct StrokePathPoint: Codable, Equatable, Sendable {
    var x: Double
    var y: Double
}

/// Freehand vector stroke. Points are element-local; add `element.x`/`y` for absolute canvas coordinates.
struct StrokePayload: Codable, Equatable, Sendable {
    var points: [StrokePathPoint]
    var color: CanvasRGBAColor
    var lineWidth: Double
    /// 0...1; combined with `color.opacity` when rendering.
    var opacity: Double

    static let `default` = StrokePayload(
        points: [],
        color: .defaultText,
        lineWidth: 3,
        opacity: 1
    )
}
