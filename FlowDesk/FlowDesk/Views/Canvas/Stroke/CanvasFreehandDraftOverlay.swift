import SwiftUI

/// Live preview while drawing in canvas space (absolute coordinates, full board size).
struct CanvasFreehandDraftOverlay: View {
    let canvasPoints: [CGPoint]
    let color: CanvasRGBAColor
    let lineWidth: CGFloat
    let opacity: Double

    var body: some View {
        let path = StrokePathSmoothing.smoothPath(from: canvasPoints)
        path
            .stroke(
                color.swiftUIColor.opacity(opacity),
                style: StrokeStyle(lineWidth: lineWidth, lineCap: .round, lineJoin: .round)
            )
            .allowsHitTesting(false)
    }
}
