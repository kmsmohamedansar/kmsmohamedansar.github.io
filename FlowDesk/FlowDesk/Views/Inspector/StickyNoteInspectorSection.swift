import SwiftUI

struct StickyNoteInspectorSection: View {
    @Environment(\.flowDeskTokens) private var tokens

    let elementID: UUID
    @Bindable var canvasViewModel: CanvasBoardViewModel

    private var payload: StickyNotePayload? {
        guard let el = canvasViewModel.boardState.elements.first(where: { $0.id == elementID }),
              el.kind == .stickyNote
        else { return nil }
        return el.resolvedStickyNotePayload()
    }

    var body: some View {
        if let payload {
            Section {
                LabeledContent("Paper") {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 36), spacing: 8)], spacing: 8) {
                        ForEach(StickyNoteColorPreset.allCases, id: \.self) { preset in
                            let selected = StickyNoteColorPreset.nearest(to: payload.backgroundColor) == preset
                            Button {
                                canvasViewModel.updateStickyNotePayload(id: elementID) {
                                    $0.backgroundColor = preset.rgba
                                }
                            } label: {
                                Circle()
                                    .fill(preset.rgba.swiftUIColor)
                                    .frame(width: 32, height: 32)
                                    .overlay {
                                        Circle()
                                            .strokeBorder(tokens.selectionStrokeColor, lineWidth: selected ? 1.5 : 0)
                                    }
                                    .shadow(
                                        color: .black.opacity(FlowDeskTheme.canvasAuxiliaryLabelShadowOpacity * 0.65),
                                        radius: FlowDeskTheme.canvasAuxiliaryLabelShadowRadius,
                                        y: FlowDeskTheme.canvasAuxiliaryLabelShadowY
                                    )
                            }
                            .buttonStyle(.plain)
                            .help(preset.displayName)
                        }
                    }
                }

                LabeledContent("Text size") {
                    Stepper(
                        value: fontSizeBinding(fallback: payload.fontSize),
                        in: 11 ... 24,
                        step: 1
                    ) {
                        Text(
                            "\(Int(canvasViewModel.boardState.elements.first { $0.id == elementID }?.resolvedStickyNotePayload().fontSize ?? payload.fontSize)) pt"
                        )
                        .monospacedDigit()
                    }
                }

                Toggle("Bold", isOn: boldBinding(fallback: payload.isBold))
            } header: {
                FlowDeskInspectorSectionHeader("Sticky note")
            }
        }
    }

    private func fontSizeBinding(fallback: Double) -> Binding<Double> {
        Binding(
            get: {
                canvasViewModel.boardState.elements.first { $0.id == elementID }?.resolvedStickyNotePayload().fontSize
                    ?? fallback
            },
            set: { newValue in
                canvasViewModel.updateStickyNotePayload(id: elementID) { $0.fontSize = newValue }
            }
        )
    }

    private func boldBinding(fallback: Bool) -> Binding<Bool> {
        Binding(
            get: {
                canvasViewModel.boardState.elements.first { $0.id == elementID }?.resolvedStickyNotePayload().isBold
                    ?? fallback
            },
            set: { newValue in
                canvasViewModel.updateStickyNotePayload(id: elementID) { $0.isBold = newValue }
            }
        )
    }
}
