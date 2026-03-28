import SwiftUI

/// Vector drawing for a shape inside its element bounds (stroke-aligned inset).
struct ShapeCanvasShapeView: View {
    let payload: ShapePayload

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            let lw = max(1, CGFloat(payload.lineWidth))
            let inset = lw * 0.5
            let rect = CGRect(
                x: inset,
                y: inset,
                width: max(0, w - lw),
                height: max(0, h - lw)
            )

            ZStack {
                switch payload.kind {
                case .rectangle:
                    rectangleBody(rect: rect, lw: lw)
                case .roundedRectangle:
                    roundedRectBody(rect: rect, lw: lw)
                case .ellipse:
                    ellipseBody(rect: rect, lw: lw)
                case .line:
                    lineBody(rect: rect, lw: lw, arrow: false)
                case .arrow:
                    lineBody(rect: rect, lw: lw, arrow: true)
                }
            }
            .frame(width: w, height: h)
        }
    }

    @ViewBuilder
    private func rectangleBody(rect: CGRect, lw: CGFloat) -> some View {
        let fill = payload.fillColor.swiftUIColor
        let stroke = payload.strokeColor.swiftUIColor
        Rectangle()
            .path(in: rect)
            .fill(payload.supportsFill ? fill : .clear)
        Rectangle()
            .path(in: rect)
            .stroke(stroke, style: StrokeStyle(lineWidth: lw, lineJoin: .miter))
    }

    @ViewBuilder
    private func roundedRectBody(rect: CGRect, lw: CGFloat) -> some View {
        let r = min(CGFloat(payload.cornerRadius), min(rect.width, rect.height) * 0.5)
        let fill = payload.fillColor.swiftUIColor
        let stroke = payload.strokeColor.swiftUIColor
        RoundedRectangle(cornerRadius: r, style: .continuous)
            .path(in: rect)
            .fill(payload.supportsFill ? fill : .clear)
        RoundedRectangle(cornerRadius: r, style: .continuous)
            .path(in: rect)
            .stroke(stroke, style: StrokeStyle(lineWidth: lw, lineJoin: .round))
    }

    @ViewBuilder
    private func ellipseBody(rect: CGRect, lw: CGFloat) -> some View {
        let fill = payload.fillColor.swiftUIColor
        let stroke = payload.strokeColor.swiftUIColor
        Ellipse()
            .path(in: rect)
            .fill(payload.supportsFill ? fill : .clear)
        Ellipse()
            .path(in: rect)
            .stroke(stroke, style: StrokeStyle(lineWidth: lw, lineJoin: .round))
    }

    @ViewBuilder
    private func lineBody(rect: CGRect, lw: CGFloat, arrow: Bool) -> some View {
        let stroke = payload.strokeColor.swiftUIColor
        let start = CGPoint(x: rect.minX, y: rect.midY)
        let endX = arrow ? rect.maxX - min(18, rect.width * 0.12) : rect.maxX
        let end = CGPoint(x: endX, y: rect.midY)

        Path { path in
            path.move(to: start)
            path.addLine(to: end)
        }
        .stroke(stroke, style: StrokeStyle(lineWidth: lw, lineCap: .round, lineJoin: .round))

        if arrow {
            let headLen = min(14, max(8, rect.height * 0.35))
            let headHalf = headLen * 0.55
            let tip = CGPoint(x: rect.maxX, y: rect.midY)
            let base = CGPoint(x: end.x, y: end.y)
            Path { path in
                path.move(to: tip)
                path.addLine(to: CGPoint(x: base.x - headLen, y: base.y - headHalf))
                path.addLine(to: CGPoint(x: base.x - headLen, y: base.y + headHalf))
                path.closeSubpath()
            }
            .fill(stroke)
        }
    }
}
