import SwiftUI

/// Renders a freehand stroke in **element-local** coordinates (origin top-left of element frame).
struct FreehandStrokeShapeView: View {
    let points: [StrokePathPoint]
    let color: CanvasRGBAColor
    let lineWidth: CGFloat
    let opacity: Double

    var body: some View {
        GeometryReader { geo in
            let cgPoints = points.map { CGPoint(x: $0.x, y: $0.y) }
            let path = StrokePathSmoothing.smoothPath(from: cgPoints)
            path
                .stroke(
                    color.swiftUIColor.opacity(opacity),
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round, lineJoin: .round)
                )
                .frame(width: geo.size.width, height: geo.size.height)
        }
    }
}
