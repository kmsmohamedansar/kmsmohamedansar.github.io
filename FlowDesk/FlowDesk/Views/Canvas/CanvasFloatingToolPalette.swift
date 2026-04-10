import SwiftUI

/// Miro-style left rail + progressive context panels (Figma/Miro “canvas is king” pattern).
struct CerebraCanvasChromeColumn: View {
    @Environment(\.flowDeskTokens) private var tokens
    @Environment(\.colorScheme) private var colorScheme

    @Bindable var boardViewModel: CanvasBoardViewModel
    @Bindable var selection: CanvasSelectionModel

    private let iconFont = Font.system(size: 15, weight: .medium)

    private var chromeMotionIdentity: String {
        let p = boardViewModel.canvasContextPanel?.rawValue ?? "nil"
        return "\(p)-\(boardViewModel.canvasTool.rawValue)"
    }

    var body: some View {
        HStack(alignment: .top, spacing: FlowDeskLayout.canvasChromeInterColumnSpacing) {
            toolRail
                .frame(width: FlowDeskLayout.canvasToolRailWidth)

            if let panel = boardViewModel.canvasContextPanel {
                contextPanel(kind: panel)
                    .frame(width: FlowDeskLayout.canvasContextPanelWidth, alignment: .leading)
                    .transition(
                        .asymmetric(
                            insertion: .move(edge: .leading).combined(with: .opacity),
                            removal: .opacity.combined(with: .scale(scale: 0.98, anchor: .leading))
                        )
                    )
            }
        }
        .padding(.leading, FlowDeskLayout.canvasChromeLeadingPadding)
        .frame(maxHeight: .infinity, alignment: .center)
        .animation(.spring(response: 0.36, dampingFraction: 0.84), value: chromeMotionIdentity)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Canvas tools")
    }

    // MARK: - Rail

    private var toolRail: some View {
        VStack(spacing: FlowDeskLayout.canvasToolRailStackSpacing) {
            railTool(.select, symbol: "cursorarrow", help: "Select and pan — V")
            railTool(.draw, symbol: "pencil.tip", help: "Draw freehand — P (panel: click tool again)")

            railDivider

            railTool(.placeText, symbol: "textformat", help: "Place text — T")
            railTool(.placeSticky, symbol: "note.text", help: "Place sticky — N")
            shapeRailButton

            templatesRailButton

            Spacer(minLength: FlowDeskLayout.spaceM)

            railDivider

            VStack(spacing: FlowDeskLayout.canvasToolRailUndoStackSpacing) {
                chromeIconButton(
                    symbol: "arrow.uturn.backward",
                    help: "Undo",
                    disabled: !boardViewModel.canUndoBoard,
                    action: { NotificationCenter.default.post(name: .flowDeskBoardUndo, object: nil) }
                )
                chromeIconButton(
                    symbol: "arrow.uturn.forward",
                    help: "Redo",
                    disabled: !boardViewModel.canRedoBoard,
                    action: { NotificationCenter.default.post(name: .flowDeskBoardRedo, object: nil) }
                )
            }
        }
        .padding(.vertical, FlowDeskLayout.canvasToolRailPaddingV)
        .padding(.horizontal, FlowDeskLayout.canvasToolRailPaddingH)
        .flowDeskFloatingPanelChrome(shadowStyle: .toolPalette)
    }

    private var railDivider: some View {
        Divider()
            .opacity(0.16)
            .padding(.vertical, 2)
    }

    private func railTool(_ mode: CanvasToolMode, symbol: String, help: String) -> some View {
        ChromeRailIconButton(
            symbol: symbol,
            font: iconFont,
            selected: boardViewModel.canvasTool == mode,
            tokens: tokens,
            help: help
        ) {
            activateTool(mode)
        }
    }

    private func activateTool(_ mode: CanvasToolMode) {
        boardViewModel.applyCanvasToolSelection(mode, fromKeyboard: false)
    }

    private var shapeRailButton: some View {
        let selected = boardViewModel.canvasTool == .placeShape
        return ChromeRailIconButton(
            symbol: "square.on.circle",
            font: iconFont,
            selected: selected,
            tokens: tokens,
            help: "Shapes — R rectangle, S square; drag on canvas or click for default size"
        ) {
            activateTool(.placeShape)
        }
    }

    private var templatesRailButton: some View {
        let on = boardViewModel.canvasContextPanel == .templates
        return ChromeRailIconButton(
            symbol: "square.grid.2x2",
            font: iconFont,
            selected: on,
            tokens: tokens,
            help: "Templates — insert starter layouts on this board"
        ) {
            boardViewModel.stopAllInlineEditing()
            boardViewModel.canvasTool = .select
            boardViewModel.canvasContextPanel = on ? nil : .templates
        }
    }

    private func chromeIconButton(symbol: String, help: String, disabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 13, weight: .medium))
                .frame(width: FlowDeskLayout.canvasRailIconSize, height: 30)
                .foregroundStyle(disabled ? Color.primary.opacity(0.25) : Color.primary.opacity(0.72))
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .help(help)
    }

    // MARK: - Context panels

    @ViewBuilder
    private func contextPanel(kind: CanvasContextPanel) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            switch kind {
            case .templates:
                templatesPanel
            case .shapes:
                shapesPanel
            case .drawStroke:
                drawStrokePanel
            }
        }
        .padding(FlowDeskLayout.canvasContextPanelPadding)
        .flowDeskFloatingPanelChrome(shadowStyle: .toolPalette)
    }

    private var templatesPanel: some View {
        VStack(alignment: .leading, spacing: FlowDeskLayout.homeHeadlineToBodySpacing) {
            panelHeader("Templates", subtitle: "Add to this board")
            ScrollView {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(FlowDeskBoardTemplate.canvasInsertableTemplates, id: \.self) { template in
                        templateRow(template)
                    }
                }
            }
            .frame(maxHeight: 320)
        }
    }

    private func templateRow(_ template: FlowDeskBoardTemplate) -> some View {
        Button {
            if template == .whiteboard {
                boardViewModel.applyWhiteboardSessionPreset(selection: selection)
            } else {
                boardViewModel.insertTemplateLayout(template, selection: selection)
            }
        } label: {
            VStack(alignment: .leading, spacing: 3) {
                Text(template.canvasPanelTitle)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
                Text(template.canvasPanelSubtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(FlowDeskLayout.canvasContextTemplateRowPadding)
            .background {
                RoundedRectangle(cornerRadius: FlowDeskLayout.chromeCompactCornerRadius, style: .continuous)
                    .fill(Color.primary.opacity(colorScheme == .dark ? 0.08 : 0.04))
            }
        }
        .buttonStyle(.plain)
    }

    private var shapesPanel: some View {
        VStack(alignment: .leading, spacing: FlowDeskLayout.homeHeadlineToBodySpacing) {
            panelHeader("Shapes", subtitle: "Click the canvas to place")
            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: 52), spacing: 8)],
                spacing: 8
            ) {
                ForEach(FlowDeskShapeKind.allCases, id: \.self) { kind in
                    let picked = boardViewModel.placeShapeKind == kind
                    Button {
                        boardViewModel.placeShapeKind = kind
                    } label: {
                        Text(shortShapeLabel(kind))
                            .font(.caption.weight(picked ? .semibold : .regular))
                            .foregroundStyle(picked ? tokens.selectionStrokeColor : .primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, FlowDeskLayout.spaceS)
                            .background {
                                RoundedRectangle(cornerRadius: FlowDeskLayout.chromeInsetCornerRadius, style: .continuous)
                                    .fill(picked ? tokens.selectionStrokeColor.opacity(0.12) : Color.primary.opacity(0.04))
                            }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func shortShapeLabel(_ kind: FlowDeskShapeKind) -> String {
        switch kind {
        case .rectangle: return "Rect"
        case .roundedRectangle: return "Round"
        case .ellipse: return "Ellipse"
        case .line: return "Line"
        case .arrow: return "Arrow"
        }
    }

    private var drawStrokePanel: some View {
        VStack(alignment: .leading, spacing: FlowDeskLayout.spaceM) {
            panelHeader("Stroke", subtitle: "Drawing")
            HStack(spacing: FlowDeskLayout.spaceM) {
                Text("Weight")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
                HStack(spacing: FlowDeskLayout.floatingPanelToolbarInnerSpacing) {
                    ForEach([2.0, 3.5, 5.5], id: \.self) { w in
                        let on = abs(boardViewModel.drawingLineWidth - w) < 0.25
                        Button {
                            boardViewModel.drawingLineWidth = w
                        } label: {
                            Circle()
                                .fill(on ? tokens.selectionStrokeColor : Color.primary.opacity(0.35))
                                .frame(width: max(6, CGFloat(w)), height: max(6, CGFloat(w)))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            VStack(alignment: .leading, spacing: FlowDeskLayout.floatingPanelToolbarInnerSpacing) {
                Text("Color")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
                HStack(spacing: FlowDeskLayout.spaceS) {
                    ForEach(Array(CerebraStrokePreset.colors.enumerated()), id: \.offset) { _, rgba in
                        let on = boardViewModel.drawingStrokeColor == rgba
                        Button {
                            boardViewModel.drawingStrokeColor = rgba
                        } label: {
                            Circle()
                                .fill(rgba.swiftUIColor)
                                .frame(width: 22, height: 22)
                                .overlay {
                                    Circle()
                                        .strokeBorder(Color.primary.opacity(on ? 0.45 : 0), lineWidth: 2)
                                }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func panelHeader(_ title: String, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.subheadline.weight(.semibold))
            Text(subtitle)
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
    }

}

// MARK: - Stroke presets

private enum CerebraStrokePreset {
    static let colors: [CanvasRGBAColor] = [
        CanvasRGBAColor(red: 0.12, green: 0.12, blue: 0.14, opacity: 1),
        CanvasRGBAColor(red: 0.2, green: 0.45, blue: 0.85, opacity: 1),
        CanvasRGBAColor(red: 0.85, green: 0.25, blue: 0.28, opacity: 1),
        CanvasRGBAColor(red: 0.2, green: 0.65, blue: 0.42, opacity: 1)
    ]
}

// MARK: - Rail button

private struct ChromeRailIconButton: View {
    let symbol: String
    let font: Font
    let selected: Bool
    let tokens: FlowDeskAppearanceTokens
    let help: String
    let action: () -> Void

    @State private var hovered = false

    var body: some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(font)
                .frame(width: FlowDeskLayout.canvasRailIconSize, height: FlowDeskLayout.canvasRailIconSize)
                .foregroundStyle(selected ? tokens.selectionStrokeColor : Color.primary.opacity(0.88))
                .background {
                    RoundedRectangle(cornerRadius: FlowDeskLayout.chromeCompactCornerRadius, style: .continuous)
                        .fill(chipFill)
                }
                .overlay {
                    RoundedRectangle(cornerRadius: FlowDeskLayout.chromeCompactCornerRadius, style: .continuous)
                        .strokeBorder(strokeColor, lineWidth: selected ? 1 : (hovered ? 0.75 : 0))
                }
        }
        .buttonStyle(FlowDeskCanvasToolButtonStyle(isHovered: hovered))
        .onHover { hovered = $0 }
        .help(help)
    }

    private var chipFill: Color {
        if selected { return tokens.selectionStrokeColor.opacity(0.16) }
        if hovered { return tokens.selectionStrokeColor.opacity(0.1) }
        return Color.clear
    }

    private var strokeColor: Color {
        if selected { return tokens.selectionStrokeColor.opacity(0.45) }
        return Color.primary.opacity(0.08)
    }
}
