import SwiftUI

/// Lightweight grid drawn in the canvas coordinate space (scales with the board).
struct CanvasGridOverlay: View {
    var spacing: CGFloat
    var lineWidth: CGFloat
    /// Subtle line weight; use `FlowDeskTheme.gridLineOpacity(for:)` from the parent.
    var lineOpacity: Double

    var body: some View {
        Canvas { context, size in
            var path = Path()
            var x: CGFloat = 0
            while x <= size.width {
                path.move(to: CGPoint(x: x, y: 0))
                path.addLine(to: CGPoint(x: x, y: size.height))
                x += spacing
            }
            var y: CGFloat = 0
            while y <= size.height {
                path.move(to: CGPoint(x: 0, y: y))
                path.addLine(to: CGPoint(x: size.width, y: y))
                y += spacing
            }
            context.stroke(
                path,
                with: .color(Color.primary.opacity(lineOpacity)),
                lineWidth: lineWidth
            )
        }
    }
}
