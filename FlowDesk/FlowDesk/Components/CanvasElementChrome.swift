import SwiftUI

/// Placeholder chrome for a canvas element until per-kind editors exist.
struct CanvasElementChrome: View {
    let element: CanvasElementRecord
    var isSelected: Bool

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(fillColor.opacity(0.35))
                .overlay {
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .strokeBorder(
                            isSelected ? Color.accentColor : Color.primary.opacity(0.2),
                            lineWidth: isSelected ? 2 : 1
                        )
                }

            VStack(alignment: .leading, spacing: 4) {
                Label(element.kind.displayName, systemImage: element.kind.systemImage)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.primary)
                Text("z \(element.zIndex)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .padding(10)
        }
    }

    private var fillColor: Color {
        switch element.kind {
        case .textBlock: return .blue
        case .stickyNote: return .yellow
        case .stroke: return .purple
        case .shape: return .gray
        case .chart: return .green
        case .connector: return .cyan
        @unknown default: return .gray
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
