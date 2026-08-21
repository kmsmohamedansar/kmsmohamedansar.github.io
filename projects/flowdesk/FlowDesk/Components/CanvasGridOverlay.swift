import SwiftUI

/// Lightweight grid drawn in the canvas coordinate space (scales with the board).
struct CanvasGridOverlay: View {
    var spacing: CGFloat
    /// Softer than hairline for a premium “space” read.
    var lineWidth: CGFloat
    /// Subtle line weight; use tokens from the parent.
    var lineOpacity: Double
    /// Base stroke color before `lineOpacity` (e.g. warm ink on paper presets).
    var gridInk: Color = .primary
    /// Draw every Nth line slightly stronger for depth (default from `FlowDeskLayout.gridMajorLineStride`).
    var majorLineStride: Int = FlowDeskLayout.gridMajorLineStride

    var body: some View {
        Canvas { context, size in
            var minor = Path()
            var major = Path()
            var x: CGFloat = 0
            var column = 0
            while x <= size.width {
                if majorLineStride > 0, column.isMultiple(of: majorLineStride) {
                    major.move(to: CGPoint(x: x, y: 0))
                    major.addLine(to: CGPoint(x: x, y: size.height))
                } else {
                    minor.move(to: CGPoint(x: x, y: 0))
                    minor.addLine(to: CGPoint(x: x, y: size.height))
                }
                x += spacing
                column += 1
            }
            var y: CGFloat = 0
            var row = 0
            while y <= size.height {
                if majorLineStride > 0, row.isMultiple(of: majorLineStride) {
                    major.move(to: CGPoint(x: 0, y: y))
                    major.addLine(to: CGPoint(x: size.width, y: y))
                } else {
                    minor.move(to: CGPoint(x: 0, y: y))
                    minor.addLine(to: CGPoint(x: size.width, y: y))
                }
                y += spacing
                row += 1
            }
            let minorColor = gridInk.opacity(lineOpacity)
            let majorColor = gridInk.opacity(min(lineOpacity * 1.55, 0.22))
            context.stroke(minor, with: .color(minorColor), lineWidth: lineWidth)
            context.stroke(major, with: .color(majorColor), lineWidth: lineWidth * 1.15)
        }
    }
}
