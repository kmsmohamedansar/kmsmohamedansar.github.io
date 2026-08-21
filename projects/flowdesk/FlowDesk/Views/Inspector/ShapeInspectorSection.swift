import AppKit
import SwiftUI

struct ShapeInspectorSection: View {
    let elementID: UUID
    @Bindable var canvasViewModel: CanvasBoardViewModel

    private var shapePayload: ShapePayload? {
        guard let el = canvasViewModel.boardState.elements.first(where: { $0.id == elementID }),
              el.kind == .shape
        else { return nil }
        return el.resolvedShapePayload()
    }

    var body: some View {
        if let shapePayload {
            Section {
                Picker("Type", selection: kindBinding(fallback: shapePayload.kind)) {
                    ForEach(FlowDeskShapeKind.allCases, id: \.self) { kind in
                        Text(kind.inspectorTitle).tag(kind)
                    }
                }

                LabeledContent("Stroke") {
                    ColorPicker(
                        "",
                        selection: strokeColorBinding(fallback: shapePayload.strokeColor),
                        supportsOpacity: true
                    )
                    .labelsHidden()
                }

                if shapePayload.supportsFill {
                    LabeledContent("Fill") {
                        ColorPicker(
                            "",
                            selection: fillColorBinding(fallback: shapePayload.fillColor),
                            supportsOpacity: true
                        )
                        .labelsHidden()
                    }
                }

                LabeledContent("Line width") {
                    Stepper(
                        value: lineWidthBinding(fallback: shapePayload.lineWidth),
                        in: 1 ... 16,
                        step: 0.5
                    ) {
                        Text(String(format: "%.1f pt", shapePayload.lineWidth))
                            .monospacedDigit()
                    }
                }

                if shapePayload.kind == .roundedRectangle {
                    LabeledContent("Corner radius") {
                        Stepper(
                            value: cornerRadiusBinding(fallback: shapePayload.cornerRadius),
                            in: 0 ... 48,
                            step: 1
                        ) {
                            Text("\(Int(shapePayload.cornerRadius)) pt")
                                .monospacedDigit()
                        }
                    }
                }
            } header: {
                FlowDeskInspectorSectionHeader("Shape")
            }
        }
    }

    private func kindBinding(fallback: FlowDeskShapeKind) -> Binding<FlowDeskShapeKind> {
        Binding(
            get: {
                canvasViewModel.boardState.elements.first { $0.id == elementID }?.resolvedShapePayload().kind
                    ?? fallback
            },
            set: { newValue in
                canvasViewModel.updateShapePayload(id: elementID) { $0.kind = newValue }
            }
        )
    }

    private func strokeColorBinding(fallback: CanvasRGBAColor) -> Binding<Color> {
        Binding(
            get: {
                canvasViewModel.boardState.elements.first { $0.id == elementID }?.resolvedShapePayload().strokeColor
                    .swiftUIColor ?? fallback.swiftUIColor
            },
            set: { newColor in
                let rgba = Self.rgba(from: newColor)
                canvasViewModel.updateShapePayload(id: elementID) { $0.strokeColor = rgba }
            }
        )
    }

    private func fillColorBinding(fallback: CanvasRGBAColor) -> Binding<Color> {
        Binding(
            get: {
                canvasViewModel.boardState.elements.first { $0.id == elementID }?.resolvedShapePayload().fillColor
                    .swiftUIColor ?? fallback.swiftUIColor
            },
            set: { newColor in
                let rgba = Self.rgba(from: newColor)
                canvasViewModel.updateShapePayload(id: elementID) { $0.fillColor = rgba }
            }
        )
    }

    private func lineWidthBinding(fallback: Double) -> Binding<Double> {
        Binding(
            get: {
                canvasViewModel.boardState.elements.first { $0.id == elementID }?.resolvedShapePayload().lineWidth
                    ?? fallback
            },
            set: { newValue in
                canvasViewModel.updateShapePayload(id: elementID) { $0.lineWidth = newValue }
            }
        )
    }

    private func cornerRadiusBinding(fallback: Double) -> Binding<Double> {
        Binding(
            get: {
                canvasViewModel.boardState.elements.first { $0.id == elementID }?.resolvedShapePayload().cornerRadius
                    ?? fallback
            },
            set: { newValue in
                canvasViewModel.updateShapePayload(id: elementID) { $0.cornerRadius = newValue }
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
