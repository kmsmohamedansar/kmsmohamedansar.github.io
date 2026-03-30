import CoreGraphics
import Foundation

enum CanvasConnectorGeometry {
    /// Distance from pointer to an edge segment to acquire a snap target.
    static let attachSnapThreshold: CGFloat = 40
    /// While a snap is active, keep it until the pointer moves this far from the locked snap point (reduces edge flicker).
    static let attachSnapLockDistance: CGFloat = 54
    static let framePadding: CGFloat = 14

    static func pointOnElementFrame(edge: ConnectorEdge, t: CGFloat, rect: CGRect) -> CGPoint {
        let tt = CGFloat(max(0, min(1, t)))
        switch edge {
        case .top:
            return CGPoint(x: rect.minX + rect.width * tt, y: rect.minY)
        case .bottom:
            return CGPoint(x: rect.minX + rect.width * tt, y: rect.maxY)
        case .left:
            return CGPoint(x: rect.minX, y: rect.minY + rect.height * tt)
        case .right:
            return CGPoint(x: rect.maxX, y: rect.minY + rect.height * tt)
        }
    }

    static func boundingFrame(p1: CGPoint, p2: CGPoint, padding: CGFloat) -> CGRect {
        boundingFrame(polyline: [p1, p2], padding: padding)
    }

    /// Union bounds of a polyline (for connector hit targets after orthogonal routing).
    static func boundingFrame(polyline: [CGPoint], padding: CGFloat) -> CGRect {
        guard let first = polyline.first else {
            return CGRect(x: 0, y: 0, width: 1, height: 1)
        }
        var minX = first.x
        var minY = first.y
        var maxX = first.x
        var maxY = first.y
        for pt in polyline.dropFirst() {
            minX = min(minX, pt.x)
            minY = min(minY, pt.y)
            maxX = max(maxX, pt.x)
            maxY = max(maxY, pt.y)
        }
        return CGRect(
            x: minX - padding,
            y: minY - padding,
            width: max(1, maxX - minX + padding * 2),
            height: max(1, maxY - minY + padding * 2)
        )
    }

    /// Total length of a polyline in the same coordinate space as its points.
    static func polylineTotalLength(_ polyline: [CGPoint]) -> CGFloat {
        guard polyline.count >= 2 else { return 0 }
        var sum: CGFloat = 0
        for i in 0..<(polyline.count - 1) {
            let a = polyline[i]
            let b = polyline[i + 1]
            sum += hypot(b.x - a.x, b.y - a.y)
        }
        return sum
    }

    /// Point halfway along the polyline by arc length (for label placement).
    static func pointAtMidLengthAlongPolyline(_ polyline: [CGPoint]) -> CGPoint? {
        guard let first = polyline.first else { return nil }
        guard polyline.count >= 2 else { return first }
        let total = polylineTotalLength(polyline)
        guard total > 0 else { return first }
        var need = total * 0.5
        for i in 0..<(polyline.count - 1) {
            let a = polyline[i]
            let b = polyline[i + 1]
            let d = hypot(b.x - a.x, b.y - a.y)
            if need <= d {
                let t = d > 0 ? need / d : 0
                return CGPoint(x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t)
            }
            need -= d
        }
        return polyline.last
    }

    /// Canvas-space polyline from start attachment to end. `straight` is always a single segment; `arrow` uses stubs + one orthogonal bend when it helps readability.
    static func routingPolyline(
        start: CGPoint,
        end: CGPoint,
        startEdge: ConnectorEdge,
        endEdge: ConnectorEdge,
        lineStyle: ConnectorLineStyle
    ) -> [CGPoint] {
        if lineStyle == .straight {
            return [start, end]
        }
        let dx = end.x - start.x
        let dy = end.y - start.y
        let dist = hypot(dx, dy)
        if dist < 52 {
            return [start, end]
        }
        let adx = abs(dx)
        let ady = abs(dy)
        if adx < 10 || ady < 10 {
            return [start, end]
        }
        let stub = min(28, max(14, dist * 0.07))
        let o0 = outwardUnitVector(startEdge)
        let o1 = outwardUnitVector(endEdge)
        let s1 = CGPoint(x: start.x + o0.dx * stub, y: start.y + o0.dy * stub)
        let e1 = CGPoint(x: end.x + o1.dx * stub, y: end.y + o1.dy * stub)

        let ddx = e1.x - s1.x
        let ddy = e1.y - s1.y
        if abs(ddx) < 2 {
            return [start, s1, CGPoint(x: s1.x, y: e1.y), e1, end]
        }
        if abs(ddy) < 2 {
            return [start, s1, CGPoint(x: e1.x, y: s1.y), e1, end]
        }
        if abs(ddx) >= abs(ddy) {
            let mid = CGPoint(x: e1.x, y: s1.y)
            return [start, s1, mid, e1, end]
        } else {
            let mid = CGPoint(x: s1.x, y: e1.y)
            return [start, s1, mid, e1, end]
        }
    }

    private static func outwardUnitVector(_ edge: ConnectorEdge) -> CGVector {
        switch edge {
        case .top: return CGVector(dx: 0, dy: -1)
        case .bottom: return CGVector(dx: 0, dy: 1)
        case .left: return CGVector(dx: -1, dy: 0)
        case .right: return CGVector(dx: 1, dy: 0)
        }
    }

    /// Nearest attachment on snappable elements; pass `excludingElementID` to ignore one element (e.g. connector drag source).
    static func nearestAttachTarget(
        point: CGPoint,
        elements: [CanvasElementRecord],
        excludingElementID: UUID? = nil
    ) -> (elementID: UUID, edge: ConnectorEdge, t: CGFloat, snappedPoint: CGPoint)? {
        var bestDist = attachSnapThreshold
        var best: (UUID, ConnectorEdge, CGFloat, CGPoint)?
        for el in elements {
            if let ex = excludingElementID, el.id == ex { continue }
            guard CanvasSnapEngine.participatesInSnapping(el.kind) else { continue }
            let r = CGRect(x: CGFloat(el.x), y: CGFloat(el.y), width: CGFloat(el.width), height: CGFloat(el.height))
            for edge in ConnectorEdge.allCases {
                if let hit = projectPointOntoEdge(point: point, edge: edge, rect: r) {
                    if hit.dist < bestDist {
                        bestDist = hit.dist
                        best = (el.id, edge, hit.t, hit.q)
                    }
                }
            }
        }
        guard let b = best else { return nil }
        return (b.0, b.1, b.2, b.3)
    }

    private static func projectPointOntoEdge(point: CGPoint, edge: ConnectorEdge, rect: CGRect) -> (t: CGFloat, q: CGPoint, dist: CGFloat)? {
        let q: CGPoint
        let t: CGFloat
        switch edge {
        case .top:
            let x = min(max(point.x, rect.minX), rect.maxX)
            q = CGPoint(x: x, y: rect.minY)
            t = rect.width > 0 ? (x - rect.minX) / rect.width : 0.5
        case .bottom:
            let x = min(max(point.x, rect.minX), rect.maxX)
            q = CGPoint(x: x, y: rect.maxY)
            t = rect.width > 0 ? (x - rect.minX) / rect.width : 0.5
        case .left:
            let y = min(max(point.y, rect.minY), rect.maxY)
            q = CGPoint(x: rect.minX, y: y)
            t = rect.height > 0 ? (y - rect.minY) / rect.height : 0.5
        case .right:
            let y = min(max(point.y, rect.minY), rect.maxY)
            q = CGPoint(x: rect.maxX, y: y)
            t = rect.height > 0 ? (y - rect.minY) / rect.height : 0.5
        }
        let dist = hypot(point.x - q.x, point.y - q.y)
        guard dist < attachSnapThreshold else { return nil }
        return (t, q, dist)
    }

    /// Updates connector element frames; drops connectors whose endpoints no longer exist.
    static func reconcileConnectorFrames(in elements: inout [CanvasElementRecord]) {
        let ids = Set(elements.map(\.id))
        elements.removeAll { el in
            guard el.kind == .connector, let p = el.connectorPayload else { return false }
            return !ids.contains(p.startElementID) || !ids.contains(p.endElementID)
        }
        for i in elements.indices {
            guard elements[i].kind == .connector, let p = elements[i].connectorPayload else { continue }
            guard let a = elements.first(where: { $0.id == p.startElementID }),
                  let b = elements.first(where: { $0.id == p.endElementID })
            else { continue }
            let ra = CGRect(x: CGFloat(a.x), y: CGFloat(a.y), width: CGFloat(a.width), height: CGFloat(a.height))
            let rb = CGRect(x: CGFloat(b.x), y: CGFloat(b.y), width: CGFloat(b.width), height: CGFloat(b.height))
            let pa = pointOnElementFrame(edge: p.startEdge, t: CGFloat(p.startT), rect: ra)
            let pb = pointOnElementFrame(edge: p.endEdge, t: CGFloat(p.endT), rect: rb)
            let poly = routingPolyline(
                start: pa,
                end: pb,
                startEdge: p.startEdge,
                endEdge: p.endEdge,
                lineStyle: p.style
            )
            let box = boundingFrame(polyline: poly, padding: framePadding)
            elements[i].x = Double(box.minX)
            elements[i].y = Double(box.minY)
            elements[i].width = Double(box.width)
            elements[i].height = Double(box.height)
        }
    }
}
