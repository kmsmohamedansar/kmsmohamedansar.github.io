import AppKit
import SwiftUI

/// Compact contextual controls for a single selected element (canvas overlay, view coordinates).
struct CanvasSelectionToolbarView: View {
    let elementID: UUID
    let elementKind: CanvasElementKind
    @Bindable var boardViewModel: CanvasBoardViewModel
    @Bindable var selection: CanvasSelectionModel

    @Environment(\.flowDeskTokens) private var tokens
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(alignment: .leading, spacing: FlowDeskLayout.floatingPanelToolbarInnerSpacing) {
            quickActionsRow
            Group {
                switch elementKind {
                case .textBlock:
                    textBlockContent
                case .stickyNote:
                    stickyContent
                case .shape:
                    shapeContent
                default:
                    EmptyView()
                }
            }
        }
        .padding(.horizontal, FlowDeskLayout.floatingPanelToolbarPaddingH)
        .padding(.vertical, FlowDeskLayout.floatingPanelToolbarPaddingV)
        .flowDeskFloatingPanelChrome(
            shadowStyle: .contextualToolbar,
            lightTintOpacity: 0.11,
            darkTintOpacity: 0.07
        )
        .fixedSize()
    }

    private var quickActionsRow: some View {
        HStack(spacing: FlowDeskLayout.spaceS) {
            Button {
                boardViewModel.duplicateElement(id: elementID, selection: selection)
            } label: {
                Image(systemName: "plus.square.on.square")
                    .font(.caption.weight(.semibold))
            }
            .buttonStyle(.plain)
            .help("Duplicate (⌘D)")

            Button(role: .destructive) {
                boardViewModel.deleteElements(ids: [elementID], selection: selection)
            } label: {
                Image(systemName: "trash")
                    .font(.caption.weight(.semibold))
            }
            .buttonStyle(.plain)
            .help("Delete")

            Rectangle()
                .fill(Color.primary.opacity(0.12))
                .frame(width: 1, height: 16)
        }
    }

    // MARK: - Text block

    @ViewBuilder
    private var textBlockContent: some View {
        if let payload = currentTextPayload() {
            let fontSize = boardViewModel.boardState.elements.first(where: { $0.id == elementID })?
                .resolvedTextPayload().fontSize ?? payload.fontSize
            HStack(spacing: 6) {
                ColorPicker(
                    "",
                    selection: textColorBinding(fallback: payload.color),
                    supportsOpacity: true
                )
                .labelsHidden()
                .frame(width: 24, height: 22)
                .help("Text color")

                Stepper(value: textFontSizeBinding(fallback: payload.fontSize), in: 10 ... 72, step: 1) {
                    Text("\(Int(fontSize))")
                        .font(.caption2.weight(.semibold))
                        .monospacedDigit()
                        .frame(minWidth: 28, alignment: .trailing)
                }
                .controlSize(.mini)

                Toggle(isOn: textBoldBinding(fallback: payload.isBold)) {
                    Image(systemName: "bold")
                        .font(.caption.weight(.semibold))
                }
                .toggleStyle(.button)
                .controlSize(.mini)
            }
            .labelsHidden()
        }
    }

    private func currentTextPayload() -> TextBlockPayload? {
        guard let el = boardViewModel.boardState.elements.first(where: { $0.id == elementID }),
              el.kind == .textBlock
        else { return nil }
        return el.resolvedTextPayload()
    }

    private func textFontSizeBinding(fallback: Double) -> Binding<Double> {
        Binding(
            get: {
                boardViewModel.boardState.elements.first { $0.id == elementID }?.resolvedTextPayload().fontSize
                    ?? fallback
            },
            set: { newValue in
                boardViewModel.updateTextPayload(id: elementID) { $0.fontSize = newValue }
            }
        )
    }

    private func textBoldBinding(fallback: Bool) -> Binding<Bool> {
        Binding(
            get: {
                boardViewModel.boardState.elements.first { $0.id == elementID }?.resolvedTextPayload().isBold
                    ?? fallback
            },
            set: { newValue in
                boardViewModel.updateTextPayload(id: elementID) { $0.isBold = newValue }
            }
        )
    }

    private func textColorBinding(fallback: CanvasRGBAColor) -> Binding<Color> {
        Binding(
            get: {
                boardViewModel.boardState.elements.first { $0.id == elementID }?.resolvedTextPayload().color
                    .swiftUIColor ?? fallback.swiftUIColor
            },
            set: { newColor in
                let rgba = Self.rgba(from: newColor)
                boardViewModel.updateTextPayload(id: elementID) { $0.color = rgba }
            }
        )
    }

    // MARK: - Sticky

    @ViewBuilder
    private var stickyContent: some View {
        if let payload = currentStickyPayload() {
            HStack(spacing: 4) {
                ForEach(StickyNoteColorPreset.allCases, id: \.self) { preset in
                    let selected = StickyNoteColorPreset.nearest(to: payload.backgroundColor) == preset
                    Button {
                        boardViewModel.updateStickyNotePayload(id: elementID) {
                            $0.backgroundColor = preset.rgba
                        }
                    } label: {
                        Circle()
                            .fill(preset.rgba.swiftUIColor)
                            .frame(width: 18, height: 18)
                            .overlay {
                                Circle()
                                    .strokeBorder(tokens.selectionStrokeColor, lineWidth: selected ? 1.25 : 0)
                            }
                    }
                    .buttonStyle(.plain)
                    .help(preset.displayName)
                }
            }
        }
    }

    private func currentStickyPayload() -> StickyNotePayload? {
        guard let el = boardViewModel.boardState.elements.first(where: { $0.id == elementID }),
              el.kind == .stickyNote
        else { return nil }
        return el.resolvedStickyNotePayload()
    }

    // MARK: - Shape

    @ViewBuilder
    private var shapeContent: some View {
        if let payload = currentShapePayload() {
            HStack(spacing: 6) {
                if payload.supportsFill {
                    ColorPicker(
                        "",
                        selection: shapeFillColorBinding(fallback: payload.fillColor),
                        supportsOpacity: true
                    )
                    .labelsHidden()
                    .frame(width: 24, height: 22)
                    .help("Fill")
                }

                Toggle(isOn: shapeStrokeVisibleBinding(fallback: payload.lineWidth)) {
                    Image(systemName: "circle.dashed")
                        .font(.caption.weight(.medium))
                }
                .toggleStyle(.button)
                .controlSize(.mini)
                .help("Outline on/off")

                ColorPicker(
                    "",
                    selection: shapeStrokeColorBinding(fallback: payload.strokeColor),
                    supportsOpacity: true
                )
                .labelsHidden()
                .frame(width: 24, height: 22)
                .help("Stroke")
            }
        }
    }

    private func currentShapePayload() -> ShapePayload? {
        guard let el = boardViewModel.boardState.elements.first(where: { $0.id == elementID }),
              el.kind == .shape
        else { return nil }
        return el.resolvedShapePayload()
    }

    private func shapeStrokeColorBinding(fallback: CanvasRGBAColor) -> Binding<Color> {
        Binding(
            get: {
                boardViewModel.boardState.elements.first { $0.id == elementID }?.resolvedShapePayload().strokeColor
                    .swiftUIColor ?? fallback.swiftUIColor
            },
            set: { newColor in
                let rgba = Self.rgba(from: newColor)
                boardViewModel.updateShapePayload(id: elementID) { $0.strokeColor = rgba }
            }
        )
    }

    private func shapeFillColorBinding(fallback: CanvasRGBAColor) -> Binding<Color> {
        Binding(
            get: {
                boardViewModel.boardState.elements.first { $0.id == elementID }?.resolvedShapePayload().fillColor
                    .swiftUIColor ?? fallback.swiftUIColor
            },
            set: { newColor in
                let rgba = Self.rgba(from: newColor)
                boardViewModel.updateShapePayload(id: elementID) { $0.fillColor = rgba }
            }
        )
    }

    /// Outline visible when line width > 0; toggling restores a sensible width.
    private func shapeStrokeVisibleBinding(fallback: Double) -> Binding<Bool> {
        Binding(
            get: {
                (boardViewModel.boardState.elements.first { $0.id == elementID }?.resolvedShapePayload().lineWidth
                    ?? fallback) > 0.5
            },
            set: { visible in
                boardViewModel.updateShapePayload(id: elementID) { p in
                    if visible {
                        if p.lineWidth < 0.5 { p.lineWidth = 2 }
                    } else {
                        p.lineWidth = 0
                    }
                }
            }
        )
    }

    private static func rgba(from color: Color) -> CanvasRGBAColor {
        guard let cg = color.cgColor, let ns = NSColor(cgColor: cg) else {
            return .defaultText
        }
        return CanvasRGBAColor(nsColor: ns)
    }
}
