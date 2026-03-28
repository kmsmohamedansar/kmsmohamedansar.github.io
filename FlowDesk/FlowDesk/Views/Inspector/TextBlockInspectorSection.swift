import AppKit
import SwiftUI

struct TextBlockInspectorSection: View {
    let elementID: UUID
    @Bindable var canvasViewModel: CanvasBoardViewModel

    private var textPayload: TextBlockPayload? {
        guard let el = canvasViewModel.boardState.elements.first(where: { $0.id == elementID }),
              el.kind == .textBlock
        else { return nil }
        return el.resolvedTextPayload()
    }

    var body: some View {
        if let textPayload {
            Section {
                LabeledContent("Size") {
                    Stepper(
                        value: fontSizeBinding(fallback: textPayload.fontSize),
                        in: 10 ... 72,
                        step: 1
                    ) {
                        Text("\(Int(textPayload.fontSize)) pt")
                            .monospacedDigit()
                    }
                }

                Toggle("Bold", isOn: boldBinding(fallback: textPayload.isBold))

                LabeledContent("Color") {
                    ColorPicker(
                        "",
                        selection: colorBinding(fallback: textPayload.color),
                        supportsOpacity: true
                    )
                    .labelsHidden()
                }

                Picker("Align", selection: alignmentBinding(fallback: textPayload.alignment)) {
                    Text("Leading").tag(TextBlockAlignment.leading)
                    Text("Center").tag(TextBlockAlignment.center)
                    Text("Trailing").tag(TextBlockAlignment.trailing)
                }
                .pickerStyle(.segmented)
            } header: {
                FlowDeskInspectorSectionHeader("Text")
            }
        }
    }

    private func fontSizeBinding(fallback: Double) -> Binding<Double> {
        Binding(
            get: {
                canvasViewModel.boardState.elements.first { $0.id == elementID }?.resolvedTextPayload().fontSize
                    ?? fallback
            },
            set: { newValue in
                canvasViewModel.updateTextPayload(id: elementID) { $0.fontSize = newValue }
            }
        )
    }

    private func boldBinding(fallback: Bool) -> Binding<Bool> {
        Binding(
            get: {
                canvasViewModel.boardState.elements.first { $0.id == elementID }?.resolvedTextPayload().isBold
                    ?? fallback
            },
            set: { newValue in
                canvasViewModel.updateTextPayload(id: elementID) { $0.isBold = newValue }
            }
        )
    }

    private func colorBinding(fallback: CanvasRGBAColor) -> Binding<Color> {
        Binding(
            get: {
                canvasViewModel.boardState.elements.first { $0.id == elementID }?.resolvedTextPayload().color
                    .swiftUIColor ?? fallback.swiftUIColor
            },
            set: { newColor in
                let rgba = Self.rgba(from: newColor)
                canvasViewModel.updateTextPayload(id: elementID) { $0.color = rgba }
            }
        )
    }

    private func alignmentBinding(fallback: TextBlockAlignment) -> Binding<TextBlockAlignment> {
        Binding(
            get: {
                canvasViewModel.boardState.elements.first { $0.id == elementID }?.resolvedTextPayload().alignment
                    ?? fallback
            },
            set: { newValue in
                canvasViewModel.updateTextPayload(id: elementID) { $0.alignment = newValue }
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
