import SwiftUI

/// Left-edge floating tools (canvas-first); keeps Edit/Export in the window toolbar.
struct CanvasFloatingToolPalette: View {
    @Environment(\.flowDeskTokens) private var tokens
    @Bindable var boardViewModel: CanvasBoardViewModel

    var body: some View {
        VStack(spacing: 6) {
            paletteButton(mode: .select)
            paletteButton(mode: .draw)
            Divider()
                .opacity(0.35)
                .padding(.vertical, 2)
            paletteButton(mode: .placeSticky)
            paletteButton(mode: .placeText)
            shapeMenuPaletteButton
        }
        .padding(8)
        .background {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(.ultraThinMaterial)
                .shadow(color: Color.black.opacity(0.14), radius: 14, x: 0, y: 6)
        }
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .strokeBorder(Color.primary.opacity(0.09), lineWidth: 1)
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Canvas tools")
    }

    private func paletteButton(mode: CanvasToolMode) -> some View {
        let selected = boardViewModel.canvasTool == mode
        return Button {
            boardViewModel.canvasTool = mode
        } label: {
            Image(systemName: symbol(for: mode))
                .font(.system(size: 16, weight: .semibold))
                .frame(width: 42, height: 36)
                .foregroundStyle(selected ? tokens.selectionStrokeColor : Color.primary)
                .background {
                    RoundedRectangle(cornerRadius: 9, style: .continuous)
                        .fill(selected ? Color.accentColor.opacity(0.22) : Color.clear)
                }
                .overlay {
                    RoundedRectangle(cornerRadius: 9, style: .continuous)
                        .strokeBorder(
                            selected ? tokens.selectionStrokeColor.opacity(0.55) : Color.clear,
                            lineWidth: 1.25
                        )
                }
        }
        .buttonStyle(.plain)
        .help(help(for: mode))
    }

    private var shapeMenuPaletteButton: some View {
        let selected = boardViewModel.canvasTool == .placeShape
        return Menu {
            ForEach(FlowDeskShapeKind.allCases, id: \.self) { kind in
                Button(kind.inspectorTitle) {
                    boardViewModel.placeShapeKind = kind
                    boardViewModel.canvasTool = .placeShape
                }
            }
        } label: {
            Image(systemName: "square.on.circle")
                .font(.system(size: 16, weight: .semibold))
                .frame(width: 42, height: 36)
                .foregroundStyle(selected ? tokens.selectionStrokeColor : Color.primary)
                .background {
                    RoundedRectangle(cornerRadius: 9, style: .continuous)
                        .fill(selected ? Color.accentColor.opacity(0.22) : Color.clear)
                }
                .overlay {
                    RoundedRectangle(cornerRadius: 9, style: .continuous)
                        .strokeBorder(
                            selected ? tokens.selectionStrokeColor.opacity(0.55) : Color.clear,
                            lineWidth: 1.25
                        )
                }
        }
        .menuStyle(.button)
        .menuIndicator(.hidden)
        .help("Place a shape — click the canvas. Choose kind from the menu.")
    }

    private func symbol(for mode: CanvasToolMode) -> String {
        switch mode {
        case .select: return "cursorarrow"
        case .draw: return "pencil.tip"
        case .placeSticky: return "note.text"
        case .placeText: return "textformat"
        case .placeShape: return "square.on.circle"
        }
    }

    private func help(for mode: CanvasToolMode) -> String {
        switch mode {
        case .select: return "Select and pan the canvas"
        case .draw: return "Draw freehand strokes"
        case .placeSticky: return "Click the canvas to place a sticky note"
        case .placeText: return "Click the canvas to place a text block"
        case .placeShape: return "Place a shape"
        }
    }
}
