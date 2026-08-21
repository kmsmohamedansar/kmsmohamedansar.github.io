import SwiftUI

/// Dashed union bounds for multi-selected framed elements (canvas coordinates).
struct CanvasMultiSelectionBoundsOverlay: View {
    @Environment(\.flowDeskTokens) private var tokens

    let elements: [CanvasElementRecord]
    let selectedIDs: Set<UUID>

    private var unionRect: CGRect? {
        let framed = elements.filter {
            selectedIDs.contains($0.id) && CanvasSnapEngine.participatesInSnapping($0.kind)
        }
        guard framed.count > 1 else { return nil }
        var r = CGRect(
            x: CGFloat(framed[0].x),
            y: CGFloat(framed[0].y),
            width: CGFloat(framed[0].width),
            height: CGFloat(framed[0].height)
        )
        for el in framed.dropFirst() {
            r = r.union(
                CGRect(x: CGFloat(el.x), y: CGFloat(el.y), width: CGFloat(el.width), height: CGFloat(el.height))
            )
        }
        return r
    }

    var body: some View {
        if let rect = unionRect {
            Path { path in
                path.addRect(rect)
            }
            .stroke(
                tokens.selectionStrokeColor.opacity(0.95),
                style: StrokeStyle(lineWidth: tokens.selectionStrokeWidth, dash: [7, 5])
            )
        }
    }
}
