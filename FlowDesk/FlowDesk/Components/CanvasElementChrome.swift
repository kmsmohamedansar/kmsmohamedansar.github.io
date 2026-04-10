import SwiftUI

/// Placeholder chrome for a canvas element until per-kind editors exist.
struct CanvasElementChrome: View {
    @Environment(\.flowDeskTokens) private var tokens
    @Environment(\.colorScheme) private var colorScheme

    let element: CanvasElementRecord
    var isSelected: Bool

    var body: some View {
        let corner = FlowDeskLayout.chromeCompactCornerRadius
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: corner, style: .continuous)
                .fill(tokens.homeCardFill.opacity(colorScheme == .dark ? 0.14 : 0.22))
                .overlay {
                    RoundedRectangle(cornerRadius: corner, style: .continuous)
                        .strokeBorder(
                            isSelected ? tokens.selectionStrokeColor : Color.primary.opacity(0.14),
                            lineWidth: isSelected ? FlowDeskLayout.chromeHairlineBorderWidth + 0.5 : FlowDeskLayout.chromeHairlineBorderWidth
                        )
                }
                .shadow(
                    color: Color.black.opacity(colorScheme == .dark ? 0.22 : 0.07),
                    radius: 5,
                    x: 0,
                    y: 2
                )

            VStack(alignment: .leading, spacing: FlowDeskLayout.spaceXS) {
                Label(element.kind.displayName, systemImage: element.kind.systemImage)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.primary)
                Text("z \(element.zIndex)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .padding(FlowDeskLayout.canvasContextTemplateRowPadding)
        }
    }
}

private extension CanvasElementKind {
    var displayName: String {
        switch self {
        case .textBlock: return "Text block"
        case .stickyNote: return "Sticky note"
        case .stroke: return "Drawing"
        case .shape: return "Shape"
        case .chart: return "Chart"
        case .connector: return "Connector"
        @unknown default: return "Element"
        }
    }

    var systemImage: String {
        switch self {
        case .textBlock: return "text.alignleft"
        case .stickyNote: return "note.text"
        case .stroke: return "scribble.variable"
        case .shape: return "square.on.circle"
        case .chart: return "chart.bar"
        case .connector: return "arrow.triangle.branch"
        @unknown default: return "square.dashed"
        }
    }
}
