import SwiftUI

/// Left-edge floating tools (canvas-first); keeps Edit/Export in the window toolbar.
struct CanvasFloatingToolPalette: View {
    @Environment(\.flowDeskTokens) private var tokens
    @Bindable var boardViewModel: CanvasBoardViewModel

    @Environment(\.colorScheme) private var colorScheme

    private let iconFont = Font.system(size: 14.5, weight: .medium)

    var body: some View {
        VStack(spacing: 6) {
            paletteButton(mode: .select)
            paletteButton(mode: .draw)
            Divider()
                .opacity(0.18)
                .padding(.vertical, 1)
            paletteButton(mode: .placeSticky)
            paletteButton(mode: .placeText)
            shapeMenuPaletteButton
        }
        .padding(FlowDeskLayout.floatingPanelContentPadding)
        .background {
            ZStack {
                RoundedRectangle(cornerRadius: FlowDeskLayout.floatingPanelCornerRadius, style: .continuous)
                    .fill(.ultraThinMaterial)
                RoundedRectangle(cornerRadius: FlowDeskLayout.floatingPanelCornerRadius, style: .continuous)
                    .fill(tokens.homeCardFill.opacity(colorScheme == .dark ? 0.08 : 0.12))
            }
            .shadow(
                color: Color.black.opacity(FlowDeskTheme.floatingPanelShadowOpacity),
                radius: FlowDeskTheme.floatingPanelShadowRadius,
                x: 0,
                y: FlowDeskTheme.floatingPanelShadowY
            )
        }
        .overlay {
            RoundedRectangle(cornerRadius: FlowDeskLayout.floatingPanelCornerRadius, style: .continuous)
                .strokeBorder(
                    LinearGradient(
                        colors: [
                            Color.primary.opacity(0.09),
                            Color.primary.opacity(0.035)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 0.75
                )
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Canvas tools")
    }

    private func paletteButton(mode: CanvasToolMode) -> some View {
        PaletteToolButton(
            selected: boardViewModel.canvasTool == mode,
            help: help(for: mode),
            action: { boardViewModel.canvasTool = mode },
            iconFont: iconFont,
            tokens: tokens
        ) {
            Image(systemName: symbol(for: mode))
        }
    }

    private var shapeMenuPaletteButton: some View {
        ShapePaletteMenuButton(
            selected: boardViewModel.canvasTool == .placeShape,
            iconFont: iconFont,
            tokens: tokens,
            boardViewModel: boardViewModel
        )
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
        case .select:
            return "Select and move items. Drag empty space to pan; pinch on a trackpad to zoom."
        case .draw:
            return "Draw freehand—click and drag on the canvas."
        case .placeSticky:
            return "Click where you want a sticky note."
        case .placeText:
            return "Click where you want a text block."
        case .placeShape:
            return "Choose a shape from the menu, then click the canvas."
        }
    }
}

// MARK: - Palette controls (hover / press motion)

private struct PaletteToolButton<Icon: View>: View {
    let selected: Bool
    let help: String
    let action: () -> Void
    let iconFont: Font
    let tokens: FlowDeskAppearanceTokens
    @ViewBuilder let icon: () -> Icon

    @State private var hovered = false

    var body: some View {
        Button(action: action) {
            icon()
                .font(iconFont)
                .frame(width: 40, height: 34)
                .foregroundStyle(selected ? tokens.selectionStrokeColor : Color.primary.opacity(0.88))
                .background {
                    RoundedRectangle(cornerRadius: 9, style: .continuous)
                        .fill(chipFill)
                }
                .overlay {
                    RoundedRectangle(cornerRadius: 9, style: .continuous)
                        .strokeBorder(strokeColor, lineWidth: selected ? 1 : (hovered ? 0.75 : 0))
                }
        }
        .buttonStyle(FlowDeskCanvasToolButtonStyle(isHovered: hovered))
        .onHover { hovered = $0 }
        .help(help)
    }

    private var chipFill: Color {
        if selected { return Color.accentColor.opacity(0.2) }
        if hovered { return Color.primary.opacity(0.06) }
        return Color.clear
    }

    private var strokeColor: Color {
        if selected { return tokens.selectionStrokeColor.opacity(0.5) }
        return Color.primary.opacity(0.1)
    }
}

private struct ShapePaletteMenuButton: View {
    let selected: Bool
    let iconFont: Font
    let tokens: FlowDeskAppearanceTokens
    @Bindable var boardViewModel: CanvasBoardViewModel

    @State private var hovered = false

    var body: some View {
        Menu {
            ForEach(FlowDeskShapeKind.allCases, id: \.self) { kind in
                Button(kind.inspectorTitle) {
                    boardViewModel.placeShapeKind = kind
                    boardViewModel.canvasTool = .placeShape
                }
            }
        } label: {
            Image(systemName: "square.on.circle")
                .font(iconFont)
                .frame(width: 40, height: 34)
                .foregroundStyle(selected ? tokens.selectionStrokeColor : Color.primary.opacity(0.88))
                .background {
                    RoundedRectangle(cornerRadius: 9, style: .continuous)
                        .fill(chipFill)
                }
                .overlay {
                    RoundedRectangle(cornerRadius: 9, style: .continuous)
                        .strokeBorder(strokeColor, lineWidth: selected ? 1 : (hovered ? 0.75 : 0))
                }
        }
        .menuStyle(.button)
        .menuIndicator(.hidden)
        .buttonStyle(FlowDeskCanvasToolButtonStyle(isHovered: hovered))
        .onHover { hovered = $0 }
        .help("Place a shape — click the canvas. Choose kind from the menu.")
    }

    private var chipFill: Color {
        if selected { return Color.accentColor.opacity(0.2) }
        if hovered { return Color.primary.opacity(0.06) }
        return Color.clear
    }

    private var strokeColor: Color {
        if selected { return tokens.selectionStrokeColor.opacity(0.5) }
        return Color.primary.opacity(0.1)
    }
}
