import CoreGraphics
import SwiftUI

/// Shared connector stroke, draft, and arrow tuning so canvas + inspector stay visually consistent.
enum FlowDeskConnectorVisuals {
    /// Triangle vertices for a committed arrowhead; `tip`/`from` share one coordinate space (e.g. connector-local).
    struct ArrowheadGeometry {
        var tip: CGPoint
        var left: CGPoint
        var right: CGPoint
        var outlineLineWidth: CGFloat
    }

    /// Same sizing as canvas `ConnectorCanvasItemView` arrowheads: unit vector from `from` toward `tip`, stem length clamped by segment length and `minimumArrowLength` / `arrowLength`.
    static func arrowheadGeometry(tip: CGPoint, from: CGPoint, lineWidth: CGFloat) -> ArrowheadGeometry {
        let dx = tip.x - from.x
        let dy = tip.y - from.y
        let segLen = max(0.001, hypot(dx, dy))
        let ux = dx / segLen
        let uy = dy / segLen
        let ideal = arrowLength(lineWidth: lineWidth)
        let s = min(ideal, max(minimumArrowLength, segLen * 0.88))
        let back = CGPoint(x: tip.x - ux * s, y: tip.y - uy * s)
        let perp = CGPoint(x: -uy, y: ux)
        let w = arrowHalfWidth(lineLength: s)
        let left = CGPoint(x: back.x + perp.x * w, y: back.y + perp.y * w)
        let right = CGPoint(x: back.x - perp.x * w, y: back.y - perp.y * w)
        let outlineW = max(0.6, lineWidth * arrowOutlineWidthFactor)
        return ArrowheadGeometry(tip: tip, left: left, right: right, outlineLineWidth: outlineW)
    }

    static func arrowheadTrianglePath(_ g: ArrowheadGeometry) -> Path {
        var p = Path()
        p.move(to: g.tip)
        p.addLine(to: g.left)
        p.addLine(to: g.right)
        p.closeSubpath()
        return p
    }

    /// Default width for newly created connectors (canvas units).
    static let defaultLineWidth: CGFloat = 2.35
    static let defaultLineWidthDouble: Double = 2.35

    static let defaultStrokeRGBA = CanvasRGBAColor(red: 0.2, green: 0.44, blue: 0.92, opacity: 0.9)

    static func defaultStrokeSwiftUI() -> Color {
        defaultStrokeRGBA.swiftUIColor
    }

    // MARK: - Draft (in-progress drag)

    static let draftDashPattern: [CGFloat] = [9, 6]
    static let draftForegroundWidth: CGFloat = 2.4
    static let draftHaloWidth: CGFloat = 6
    static let draftHaloOpacity: CGFloat = 0.14

    static let draftEndpointDotRadius: CGFloat = 4
    static let draftSnapRingOuterRadius: CGFloat = 9
    static let draftSnapRingLineWidth: CGFloat = 1.75

    // MARK: - Committed (dense-board readability)

    /// Slightly soft unselected ink so many links stay calm; selected uses full opacity.
    static let committedUnselectedStrokeOpacity: CGFloat = 0.86

    /// Wide hairline behind the stroke to separate lines where they cross (no extra layers).
    static let committedUnderlayExtraWidth: CGFloat = 5
    static let committedUnderlayOpacity: CGFloat = 0.05

    // MARK: - Arrowhead (committed)

    static func arrowLength(lineWidth: CGFloat) -> CGFloat {
        max(11, lineWidth * 4.2)
    }

    /// Floor so arrowheads on short final segments stay proportional, not oversized.
    static let minimumArrowLength: CGFloat = 7

    static func arrowHalfWidth(lineLength: CGFloat) -> CGFloat {
        lineLength * 0.42
    }

    static let arrowOutlineOpacity: CGFloat = 0.22
    static let arrowOutlineWidthFactor: CGFloat = 0.35

    // MARK: - Label (one-line, optional)

    static let connectorLabelFontSize: CGFloat = 11
    static let connectorLabelMaxWidth: CGFloat = 132
    /// Hide the readable label (not the editor) when the path is shorter than this (canvas points).
    static let connectorLabelMinPathLengthToShow: CGFloat = 28
    static let connectorLabelMaxCharacters: Int = 120
}
