import AppKit
import CoreGraphics
import Foundation
#if canImport(Vision)
import Vision
#endif

/// Raw freehand input captured from mouse/trackpad in absolute canvas space.
struct FreehandStroke: Equatable, Sendable {
    var id: UUID
    var points: [CGPoint]
    var createdAt: Date

    init(id: UUID = UUID(), points: [CGPoint], createdAt: Date = Date()) {
        self.id = id
        self.points = points
        self.createdAt = createdAt
    }

    var bounds: CGRect {
        guard let first = points.first else { return .null }
        return points.dropFirst().reduce(CGRect(origin: first, size: .zero)) { partial, point in
            partial.union(CGRect(origin: point, size: .zero))
        }
    }
}

struct ShapeModel: Equatable, Sendable {
    var kind: FlowDeskShapeKind
    var frame: CGRect
    var confidence: Double
}

struct TextElement: Equatable, Sendable {
    var text: String
    var frame: CGRect
    var confidence: Double
}

struct HandwritingRecognitionResult: Equatable, Sendable {
    var text: String
    var confidence: Double
}

protocol HandwritingRecognizer {
    func recognize(stroke: FreehandStroke) -> HandwritingRecognitionResult?
}

struct VisionHandwritingRecognizer: HandwritingRecognizer {
    private let minimumConfidence: Float = 0.4

    func recognize(stroke: FreehandStroke) -> HandwritingRecognitionResult? {
        #if canImport(Vision)
        guard let image = renderStrokeImage(stroke) else { return nil }
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true
        request.minimumTextHeight = 0.04

        let handler = VNImageRequestHandler(cgImage: image, options: [:])
        do {
            try handler.perform([request])
            guard let observation = request.results?.first,
                  let top = observation.topCandidates(1).first
            else { return nil }
            let text = top.string.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !text.isEmpty, top.confidence >= minimumConfidence else { return nil }
            return HandwritingRecognitionResult(text: text, confidence: Double(top.confidence))
        } catch {
            return nil
        }
        #else
        return nil
        #endif
    }

    private func renderStrokeImage(_ stroke: FreehandStroke) -> CGImage? {
        let bounds = stroke.bounds.standardized
        guard bounds.width > 0, bounds.height > 0 else { return nil }
        let padding: CGFloat = 16
        let imageSize = CGSize(width: bounds.width + (padding * 2), height: bounds.height + (padding * 2))
        guard let context = CGContext(
            data: nil,
            width: Int(ceil(imageSize.width)),
            height: Int(ceil(imageSize.height)),
            bitsPerComponent: 8,
            bytesPerRow: 0,
            space: CGColorSpaceCreateDeviceGray(),
            bitmapInfo: CGImageAlphaInfo.none.rawValue
        ) else {
            return nil
        }

        context.setFillColor(NSColor.white.cgColor)
        context.fill(CGRect(origin: .zero, size: imageSize))
        context.setStrokeColor(NSColor.black.cgColor)
        context.setLineWidth(3.5)
        context.setLineCap(.round)
        context.setLineJoin(.round)

        var previous: CGPoint?
        for point in stroke.points {
            let p = CGPoint(x: (point.x - bounds.minX) + padding, y: (point.y - bounds.minY) + padding)
            if let prev = previous {
                context.move(to: prev)
                context.addLine(to: p)
                context.strokePath()
            }
            previous = p
        }
        return context.makeImage()
    }
}

struct RectangleRecognizer {
    private let minimumPointCount = 12
    private let minimumConfidence = 0.74

    func detectRectangle(in stroke: FreehandStroke) -> ShapeModel? {
        guard stroke.points.count >= minimumPointCount else { return nil }
        let bounds = stroke.bounds.standardized
        guard bounds.width >= 24, bounds.height >= 24 else { return nil }

        let diagonal = hypot(bounds.width, bounds.height)
        guard diagonal > 0 else { return nil }
        guard let first = stroke.points.first, let last = stroke.points.last else { return nil }
        let closureDistance = hypot(last.x - first.x, last.y - first.y)
        let closureScore = max(0, 1 - (closureDistance / max(18, diagonal * 0.2)))
        guard closureScore > 0.35 else { return nil }

        let corners = majorCornerCount(in: stroke.points)
        let cornerScore = min(1, Double(corners) / 4)

        let pathLength = polylineLength(points: stroke.points)
        let perimeter = 2 * (bounds.width + bounds.height)
        let perimeterRatio = pathLength / max(1, perimeter)
        let perimeterScore = max(0, 1 - abs(perimeterRatio - 1))

        let confidence = (closureScore * 0.34) + (cornerScore * 0.44) + (perimeterScore * 0.22)
        guard corners >= 4, confidence >= minimumConfidence else { return nil }

        return ShapeModel(kind: .rectangle, frame: bounds, confidence: confidence)
    }

    /// Rectangle corner detection:
    /// - Uniformly samples the stroke
    /// - Measures turn angle at each sample
    /// - Counts separated "strong turn" peaks as major corners
    private func majorCornerCount(in points: [CGPoint]) -> Int {
        let sampled = sample(points: points, step: 3)
        guard sampled.count >= 9 else { return 0 }

        var cornerIndices: [Int] = []
        for idx in 2..<(sampled.count - 2) {
            let p0 = sampled[idx - 2]
            let p1 = sampled[idx]
            let p2 = sampled[idx + 2]
            let v1 = CGVector(dx: p1.x - p0.x, dy: p1.y - p0.y)
            let v2 = CGVector(dx: p2.x - p1.x, dy: p2.y - p1.y)
            let angle = abs(turnAngleDegrees(v1: v1, v2: v2))
            if angle > 40 {
                if let last = cornerIndices.last, idx - last < 3 {
                    if angle > localCornerStrength(at: last, sampled: sampled) {
                        cornerIndices[cornerIndices.count - 1] = idx
                    }
                } else {
                    cornerIndices.append(idx)
                }
            }
        }
        return cornerIndices.count
    }

    private func localCornerStrength(at index: Int, sampled: [CGPoint]) -> CGFloat {
        guard index >= 2, index + 2 < sampled.count else { return 0 }
        let p0 = sampled[index - 2]
        let p1 = sampled[index]
        let p2 = sampled[index + 2]
        let v1 = CGVector(dx: p1.x - p0.x, dy: p1.y - p0.y)
        let v2 = CGVector(dx: p2.x - p1.x, dy: p2.y - p1.y)
        return abs(turnAngleDegrees(v1: v1, v2: v2))
    }

    private func turnAngleDegrees(v1: CGVector, v2: CGVector) -> CGFloat {
        let n1 = hypot(v1.dx, v1.dy)
        let n2 = hypot(v2.dx, v2.dy)
        guard n1 > 0.0001, n2 > 0.0001 else { return 0 }
        let dot = (v1.dx * v2.dx + v1.dy * v2.dy) / (n1 * n2)
        return acos(max(-1, min(1, dot))) * 180 / .pi
    }

    private func sample(points: [CGPoint], step: Int) -> [CGPoint] {
        guard step > 1, points.count > step else { return points }
        var sampled: [CGPoint] = []
        sampled.reserveCapacity((points.count / step) + 2)
        for idx in stride(from: 0, to: points.count, by: step) {
            sampled.append(points[idx])
        }
        if sampled.last != points.last, let last = points.last {
            sampled.append(last)
        }
        return sampled
    }

    private func polylineLength(points: [CGPoint]) -> CGFloat {
        guard points.count > 1 else { return 0 }
        var total: CGFloat = 0
        for idx in 1..<points.count {
            let a = points[idx - 1]
            let b = points[idx]
            total += hypot(b.x - a.x, b.y - a.y)
        }
        return total
    }
}

enum StrokeRecognitionOutcome: Equatable, Sendable {
    case freehand
    case rectangle(ShapeModel)
    case handwriting(text: TextElement, containerRectangleID: UUID)
}

protocol StrokeRecognizer {
    func recognize(stroke: FreehandStroke, existingElements: [CanvasElementRecord]) -> StrokeRecognitionOutcome
}

struct CanvasStrokeRecognizer: StrokeRecognizer {
    private let rectangleRecognizer: RectangleRecognizer
    private let handwritingRecognizer: HandwritingRecognizer

    init(
        rectangleRecognizer: RectangleRecognizer = RectangleRecognizer(),
        handwritingRecognizer: HandwritingRecognizer
    ) {
        self.rectangleRecognizer = rectangleRecognizer
        self.handwritingRecognizer = handwritingRecognizer
    }

    func recognize(stroke: FreehandStroke, existingElements: [CanvasElementRecord]) -> StrokeRecognitionOutcome {
        // Rectangle detection happens first so a box sketch never gets interpreted as text.
        if let rectangle = rectangleRecognizer.detectRectangle(in: stroke) {
            return .rectangle(rectangle)
        }

        // Handwriting detection runs only when the stroke sits inside an existing rectangle.
        guard let containingRectangle = topMostRectangle(containing: stroke.bounds, in: existingElements),
              let handwriting = handwritingRecognizer.recognize(stroke: stroke)
        else {
            return .freehand
        }

        let textFrame = textFrameForRecognizedHandwriting(
            strokeBounds: stroke.bounds,
            containerFrame: CGRect(
                x: containingRectangle.x,
                y: containingRectangle.y,
                width: containingRectangle.width,
                height: containingRectangle.height
            )
        )
        let textElement = TextElement(text: handwriting.text, frame: textFrame, confidence: handwriting.confidence)
        return .handwriting(text: textElement, containerRectangleID: containingRectangle.id)
    }

    private func topMostRectangle(containing bounds: CGRect, in elements: [CanvasElementRecord]) -> CanvasElementRecord? {
        elements
            .filter {
                guard $0.kind == .shape else { return false }
                let payload = $0.resolvedShapePayload()
                guard payload.kind == .rectangle || payload.kind == .roundedRectangle else { return false }
                let frame = CGRect(x: $0.x, y: $0.y, width: $0.width, height: $0.height).insetBy(dx: 6, dy: 6)
                return !frame.isNull && frame.contains(bounds)
            }
            .max(by: { $0.zIndex < $1.zIndex })
    }

    private func textFrameForRecognizedHandwriting(strokeBounds: CGRect, containerFrame: CGRect) -> CGRect {
        let inset: CGFloat = 16
        let inner = containerFrame.insetBy(dx: inset, dy: inset)
        guard !inner.isNull, !inner.isEmpty else { return strokeBounds }

        let expandedStroke = strokeBounds.insetBy(dx: -12, dy: -8)
        let bounded = expandedStroke.intersection(inner)
        if bounded.isNull || bounded.isEmpty {
            let fallbackHeight = min(64, inner.height)
            return CGRect(x: inner.minX, y: inner.minY, width: inner.width, height: fallbackHeight)
        }
        return bounded
    }
}

extension CanvasBoardViewModel {
    /// Commits a freehand stroke from **absolute** canvas coordinates (same space as element frames).
    func commitFreehandStroke(absoluteCanvasPoints: [CGPoint], selection: CanvasSelectionModel) {
        let decimated = StrokePathSmoothing.decimatedCanvasPoints(absoluteCanvasPoints, minDistance: 2)
        guard decimated.count >= 2 else { return }

        stopAllInlineEditing()
        let stroke = FreehandStroke(points: decimated)

        // Central recognition dispatch happens here on stroke end:
        // - rectangle conversion for box-like strokes
        // - handwriting conversion when drawn inside an existing rectangle
        // - fallback to persisted freehand stroke
        let outcome = strokeRecognizer.recognize(stroke: stroke, existingElements: boardState.elements)
        switch outcome {
        case .rectangle(let shape):
            insertRecognizedRectangle(shape, fallbackStroke: stroke, selection: selection)
        case .handwriting(let textElement, _):
            insertRecognizedText(textElement, selection: selection)
        case .freehand:
            insertPersistedFreehandStroke(stroke, selection: selection)
        }
    }

    func updateStrokePayload(id: UUID, _ body: (inout StrokePayload) -> Void) {
        updateElement(id: id) { element in
            guard element.kind == .stroke else { return }
            var payload = element.resolvedStrokePayload()
            body(&payload)
            payload.opacity = payload.opacity.clamped(to: 0...1)
            element.strokePayload = payload
        }
    }

    func setStrokeFrame(id: UUID, x: Double, y: Double, width: Double, height: Double) {
        updateElement(id: id) { element in
            guard element.kind == .stroke else { return }
            element.x = x
            element.y = y
            element.width = max(width, 1)
            element.height = max(height, 1)
        }
    }

    private func insertRecognizedRectangle(
        _ shape: ShapeModel,
        fallbackStroke: FreehandStroke,
        selection: CanvasSelectionModel
    ) {
        let frame = shape.frame.standardized
        guard frame.width >= CanvasShapeLayout.minWidth, frame.height >= CanvasShapeLayout.minHeight else {
            insertPersistedFreehandStroke(fallbackStroke, selection: selection)
            return
        }
        var payload = ShapePayload.default
        payload.kind = .rectangle
        let shapeID = UUID()
        let record = CanvasElementRecord(
            id: shapeID,
            kind: .shape,
            x: frame.minX,
            y: frame.minY,
            width: frame.width,
            height: frame.height,
            zIndex: nextZIndex(),
            shapePayload: payload
        )
        applyBoardMutation { state in
            state.elements.append(record)
        }
        selection.selectOnly(shapeID)
    }

    private func insertRecognizedText(_ textElement: TextElement, selection: CanvasSelectionModel) {
        let frame = textElement.frame.standardized
        let width = max(frame.width, CanvasTextBlockLayout.minWidth)
        let height = max(frame.height, CanvasTextBlockLayout.minHeight)
        var payload = TextBlockPayload.default
        payload.text = textElement.text
        let textID = UUID()
        let record = CanvasElementRecord(
            id: textID,
            kind: .textBlock,
            x: frame.minX,
            y: frame.minY,
            width: width,
            height: height,
            zIndex: nextZIndex(),
            textBlock: payload
        )
        applyBoardMutation { state in
            state.elements.append(record)
        }
        selection.selectOnly(textID)
        editingStickyNoteElementID = nil
        editingConnectorLabelElementID = nil
        editingTextElementID = textID
    }

    private func insertPersistedFreehandStroke(_ stroke: FreehandStroke, selection: CanvasSelectionModel) {
        guard !stroke.points.isEmpty else { return }
        let pad = max(6, CGFloat(drawingLineWidth) * 0.5 + 4)
        let xs = stroke.points.map(\.x)
        let ys = stroke.points.map(\.y)
        guard let minX = xs.min(), let maxX = xs.max(), let minY = ys.min(), let maxY = ys.max() else { return }

        let originX = Double(minX) - Double(pad)
        let originY = Double(minY) - Double(pad)
        let w = max(8, Double(maxX - minX) + Double(pad) * 2)
        let h = max(8, Double(maxY - minY) + Double(pad) * 2)

        let localPoints: [StrokePathPoint] = stroke.points.map { p in
            StrokePathPoint(x: Double(p.x) - originX, y: Double(p.y) - originY)
        }

        var payload = StrokePayload.default
        payload.points = localPoints
        payload.color = drawingStrokeColor
        payload.lineWidth = drawingLineWidth
        payload.opacity = drawingStrokeOpacity.clamped(to: 0...1)

        let id = UUID()
        let record = CanvasElementRecord(
            id: id,
            kind: .stroke,
            x: originX,
            y: originY,
            width: w,
            height: h,
            zIndex: nextZIndex(),
            strokePayload: payload
        )
        applyBoardMutation { state in
            state.elements.append(record)
        }
        selection.selectOnly(id)
    }
}

private extension Double {
    func clamped(to range: ClosedRange<Double>) -> Double {
        min(max(self, range.lowerBound), range.upperBound)
    }
}
