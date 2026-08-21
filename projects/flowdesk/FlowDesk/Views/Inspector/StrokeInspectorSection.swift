import AppKit
import SwiftUI

struct StrokeInspectorSection: View {
    let elementID: UUID
    @Bindable var canvasViewModel: CanvasBoardViewModel

    private var strokePayload: StrokePayload? {
        guard let el = canvasViewModel.boardState.elements.first(where: { $0.id == elementID }),
              el.kind == .stroke
        else { return nil }
        return el.resolvedStrokePayload()
    }

    var body: some View {
        if let strokePayload {
            Section {
                LabeledContent("Color") {
                    ColorPicker(
                        "",
                        selection: colorBinding(fallback: strokePayload.color),
                        supportsOpacity: true
                    )
                    .labelsHidden()
                }

                LabeledContent("Width") {
                    Stepper(
                        value: lineWidthBinding(fallback: strokePayload.lineWidth),
                        in: 1 ... 24,
                        step: 0.5
                    ) {
                        Text(String(format: "%.1f pt", strokePayload.lineWidth))
                            .monospacedDigit()
                    }
                }

                LabeledContent("Opacity") {
                    Stepper(
                        value: opacityBinding(fallback: strokePayload.opacity),
                        in: 0.15 ... 1,
                        step: 0.05
                    ) {
                        Text(String(format: "%.0f%%", strokePayload.opacity * 100))
                            .monospacedDigit()
                    }
                }
            } header: {
                FlowDeskInspectorSectionHeader("Stroke")
            }
        }
    }

    private func colorBinding(fallback: CanvasRGBAColor) -> Binding<Color> {
        Binding(
            get: {
                canvasViewModel.boardState.elements.first { $0.id == elementID }?.resolvedStrokePayload().color
                    .swiftUIColor ?? fallback.swiftUIColor
            },
            set: { newColor in
                let rgba = Self.rgba(from: newColor)
                canvasViewModel.updateStrokePayload(id: elementID) { $0.color = rgba }
            }
        )
    }

    private func lineWidthBinding(fallback: Double) -> Binding<Double> {
        Binding(
            get: {
                canvasViewModel.boardState.elements.first { $0.id == elementID }?.resolvedStrokePayload().lineWidth
                    ?? fallback
            },
            set: { newValue in
                canvasViewModel.updateStrokePayload(id: elementID) { $0.lineWidth = newValue }
            }
        )
    }

    private func opacityBinding(fallback: Double) -> Binding<Double> {
        Binding(
            get: {
                canvasViewModel.boardState.elements.first { $0.id == elementID }?.resolvedStrokePayload().opacity
                    ?? fallback
            },
            set: { newValue in
                canvasViewModel.updateStrokePayload(id: elementID) {
                    $0.opacity = min(max(newValue, 0.05), 1)
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
