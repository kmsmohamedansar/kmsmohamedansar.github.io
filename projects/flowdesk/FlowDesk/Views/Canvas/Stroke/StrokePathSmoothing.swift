import CoreGraphics
import SwiftUI

enum StrokePathSmoothing {
    /// Builds a path for stroking: smooth quad segments through samples, round caps/joins.
    static func smoothPath(from points: [CGPoint]) -> Path {
        var path = Path()
        guard !points.isEmpty else { return path }
        if points.count == 1 {
            let p = points[0]
            path.addEllipse(in: CGRect(x: p.x - 0.5, y: p.y - 0.5, width: 1, height: 1))
            return path
        }

        path.move(to: points[0])
        if points.count == 2 {
            path.addLine(to: points[1])
            return path
        }

        for i in 1 ..< (points.count - 1) {
            let mid = CGPoint(
                x: (points[i].x + points[i + 1].x) * 0.5,
                y: (points[i].y + points[i + 1].y) * 0.5
            )
            path.addQuadCurve(to: mid, control: points[i])
        }
        path.addQuadCurve(
            to: points[points.count - 1],
            control: points[points.count - 2]
        )
        return path
    }

    /// Skip samples closer than `minDistance` (canvas points) to keep payloads smaller.
    static func decimatedCanvasPoints(_ raw: [CGPoint], minDistance: CGFloat) -> [CGPoint] {
        guard let first = raw.first else { return [] }
        var out: [CGPoint] = [first]
        var last = first
        for p in raw.dropFirst() {
            if hypot(p.x - last.x, p.y - last.y) >= minDistance {
                out.append(p)
                last = p
            }
        }
        if let end = raw.last, let o = out.last, hypot(o.x - end.x, o.y - end.y) > 0.25 {
            out.append(end)
        }
        return out
    }
}
