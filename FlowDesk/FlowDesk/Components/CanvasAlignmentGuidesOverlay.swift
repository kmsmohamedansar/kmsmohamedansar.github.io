import SwiftUI

/// Renders transient alignment guides in board space (full canvas frame).
struct CanvasAlignmentGuidesOverlay: View {
    @Environment(\.flowDeskTokens) private var tokens

    let guides: [CanvasAlignmentGuide]
    let canvasSize: CGFloat

    private var lineColor: Color {
        tokens.selectionStrokeColor.opacity(0.34)
    }

    var body: some View {
        ZStack {
            ForEach(guides) { guide in
                path(for: guide)
                    .stroke(
                        lineColor,
                        style: StrokeStyle(lineWidth: 0.75, lineCap: .round, dash: [4, 5])
                    )
            }
        }
        .frame(width: canvasSize, height: canvasSize)
        .allowsHitTesting(false)
    }

    private func path(for guide: CanvasAlignmentGuide) -> Path {
        var path = Path()
        if guide.isVertical {
            let x = guide.position
            path.move(to: CGPoint(x: x, y: 0))
            path.addLine(to: CGPoint(x: x, y: canvasSize))
        } else {
            let y = guide.position
            path.move(to: CGPoint(x: 0, y: y))
            path.addLine(to: CGPoint(x: canvasSize, y: y))
        }
        return path
    }
}
