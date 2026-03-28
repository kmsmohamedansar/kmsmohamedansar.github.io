import AppKit
import SwiftUI

/// Stroke color / width for the Draw tool (new strokes). Shown while drawing or always — v1: when Draw tool is active.
struct DrawingToolInspectorSection: View {
    @Bindable var canvasViewModel: CanvasBoardViewModel

    var body: some View {
        Section {
            LabeledContent("Color") {
                ColorPicker(
                    "",
                    selection: strokeColorBinding,
                    supportsOpacity: true
                )
                .labelsHidden()
            }

            LabeledContent("Width") {
                Stepper(value: $canvasViewModel.drawingLineWidth, in: 1 ... 24, step: 0.5) {
                    Text(String(format: "%.1f pt", canvasViewModel.drawingLineWidth))
                        .monospacedDigit()
                }
            }

            LabeledContent("Opacity") {
                Stepper(value: $canvasViewModel.drawingStrokeOpacity, in: 0.15 ... 1, step: 0.05) {
                    Text(String(format: "%.0f%%", canvasViewModel.drawingStrokeOpacity * 100))
                        .monospacedDigit()
                }
            }
        } header: {
            FlowDeskInspectorSectionHeader("Drawing")
        }
    }

    private var strokeColorBinding: Binding<Color> {
        Binding(
            get: { canvasViewModel.drawingStrokeColor.swiftUIColor },
            set: { newColor in
                canvasViewModel.drawingStrokeColor = Self.rgba(from: newColor)
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
