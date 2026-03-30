import CoreGraphics
import Foundation

/// Ephemeral UI: alignment line in canvas coordinates (not persisted).
struct CanvasAlignmentGuide: Identifiable, Equatable, Sendable {
    var id: String {
        "\(isVertical ? "v" : "h")-\(Int((position * 100).rounded()))"
    }

    /// `true` = vertical line at `position` (x constant).
    var isVertical: Bool
    /// Canvas-space coordinate: x if vertical, y if horizontal.
    var position: CGFloat
}

/// Snapping and guide generation for framed canvas elements.
enum CanvasSnapEngine {
    /// Match `CanvasBoardView.canvasSize` and move/resize feel.
    static let defaultCanvasLogicalSize: CGFloat = 4000
    /// Distance in **canvas points** within which a snap engages (~1–2 screen pixels at 1× zoom on typical views).
    static let defaultThreshold: CGFloat = 7

    static func participatesInSnapping(_ kind: CanvasElementKind) -> Bool {
        switch kind {
        case .textBlock, .stickyNote, .shape, .chart: return true
        case .stroke, .connector: return false
        @unknown default: return false
        }
    }

    private static func framesForSnapping(excludingIds: Set<UUID>, elements: [CanvasElementRecord]) -> [CGRect] {
        elements.compactMap { el in
            guard !excludingIds.contains(el.id), participatesInSnapping(el.kind) else { return nil }
            return CGRect(x: CGFloat(el.x), y: CGFloat(el.y), width: CGFloat(el.width), height: CGFloat(el.height))
        }
    }

    private static func xTargets(others: [CGRect], canvasSize: CGFloat) -> [CGFloat] {
        var t: [CGFloat] = [0, canvasSize * 0.5, canvasSize]
        for r in others {
            t.append(r.minX)
            t.append(r.midX)
            t.append(r.maxX)
        }
        return t
    }

    private static func yTargets(others: [CGRect], canvasSize: CGFloat) -> [CGFloat] {
        var t: [CGFloat] = [0, canvasSize * 0.5, canvasSize]
        for r in others {
            t.append(r.minY)
            t.append(r.midY)
            t.append(r.maxY)
        }
        return t
    }

    /// Snap translation of a framed rect (move). Returns snapped rect and up to one vertical + one horizontal guide.
    /// Pass all element IDs that move together so they are excluded from snap targets (e.g. multi-select).
    static func snapMove(
        proposed: CGRect,
        excludingElementIds: Set<UUID>,
        elements: [CanvasElementRecord],
        canvasSize: CGFloat = defaultCanvasLogicalSize,
        threshold: CGFloat = defaultThreshold
    ) -> (rect: CGRect, guides: [CanvasAlignmentGuide]) {
        let others = framesForSnapping(excludingIds: excludingElementIds, elements: elements)
        let xT = xTargets(others: others, canvasSize: canvasSize)
        let yT = yTargets(others: others, canvasSize: canvasSize)

        var r = proposed
        var guides: [CanvasAlignmentGuide] = []

        if let (nx, gx) = snapOriginX(rect: proposed, targets: xT, threshold: threshold) {
            r.origin.x = nx
            guides.append(CanvasAlignmentGuide(isVertical: true, position: gx))
        }

        if let (ny, gy) = snapOriginY(rect: r, targets: yT, threshold: threshold) {
            r.origin.y = ny
            guides.append(CanvasAlignmentGuide(isVertical: false, position: gy))
        }

        r.origin.x = max(0, min(r.origin.x, canvasSize - r.width))
        r.origin.y = max(0, min(r.origin.y, canvasSize - r.height))
        return (r, guides)
    }

    /// Bottom-right resize: snap `maxX` / `maxY` to nearby targets.
    static func snapResizeBottomRight(
        proposed: CGRect,
        resizingElementId: UUID,
        elements: [CanvasElementRecord],
        minWidth: CGFloat,
        minHeight: CGFloat,
        canvasSize: CGFloat = defaultCanvasLogicalSize,
        threshold: CGFloat = defaultThreshold
    ) -> (rect: CGRect, guides: [CanvasAlignmentGuide]) {
        let others = framesForSnapping(excludingIds: Set([resizingElementId]), elements: elements)
        var r = proposed
        var guides: [CanvasAlignmentGuide] = []

        let xSnapTargets = xTargets(others: others, canvasSize: canvasSize)
        var bestXErr = threshold
        var bestW = r.width
        var guideX: CGFloat?
        for T in xSnapTargets {
            let err = abs(r.maxX - T)
            if err < bestXErr {
                let nw = T - r.minX
                if nw >= minWidth {
                    bestXErr = err
                    bestW = nw
                    guideX = T
                }
            }
        }
        if let gx = guideX {
            r.size.width = bestW
            guides.append(CanvasAlignmentGuide(isVertical: true, position: gx))
        }

        let ySnapTargets = yTargets(others: others, canvasSize: canvasSize)
        var bestYErr = threshold
        var bestH = r.height
        var guideY: CGFloat?
        for T in ySnapTargets {
            let err = abs(r.maxY - T)
            if err < bestYErr {
                let nh = T - r.minY
                if nh >= minHeight {
                    bestYErr = err
                    bestH = nh
                    guideY = T
                }
            }
        }
        if let gy = guideY {
            r.size.height = bestH
            guides.append(CanvasAlignmentGuide(isVertical: false, position: gy))
        }

        r.size.width = max(minWidth, min(r.width, canvasSize - r.minX))
        r.size.height = max(minHeight, min(r.height, canvasSize - r.minY))
        return (r, guides)
    }

    /// While dragging out a new framed element, snap origin then bottom-right (same targets as move + resize).
    static func snapPlacementDraft(
        proposed: CGRect,
        elements: [CanvasElementRecord],
        minWidth: CGFloat,
        minHeight: CGFloat,
        canvasSize: CGFloat = defaultCanvasLogicalSize,
        threshold: CGFloat = defaultThreshold
    ) -> (rect: CGRect, guides: [CanvasAlignmentGuide]) {
        let r0 = proposed.standardized
        let phantomId = UUID()
        let (moved, gMove) = snapMove(
            proposed: r0,
            excludingElementIds: [],
            elements: elements,
            canvasSize: canvasSize,
            threshold: threshold
        )
        let (resized, gResize) = snapResizeBottomRight(
            proposed: moved,
            resizingElementId: phantomId,
            elements: elements,
            minWidth: minWidth,
            minHeight: minHeight,
            canvasSize: canvasSize,
            threshold: threshold
        )
        var guides = gMove
        for g in gResize where !guides.contains(g) {
            guides.append(g)
        }
        return (resized, guides)
    }

    /// When the moving rect sits in a horizontal slot, nudge to equal left/right margins and emit slot guides.
    static func refineEqualHorizontalMargins(
        rect: CGRect,
        movingElementId: UUID,
        excludingElementIds: Set<UUID>,
        elements: [CanvasElementRecord],
        canvasSize: CGFloat = defaultCanvasLogicalSize,
        threshold: CGFloat = defaultThreshold
    ) -> (rect: CGRect, guides: [CanvasAlignmentGuide]) {
        let others = framesForSnapping(excludingIds: excludingElementIds.union([movingElementId]), elements: elements)
        var leftWall: CGFloat = -.greatestFiniteMagnitude
        var rightWall: CGFloat = .greatestFiniteMagnitude
        for r in others where r.maxX <= rect.minX + 0.5 {
            leftWall = max(leftWall, r.maxX)
        }
        for r in others where r.minX >= rect.maxX - 0.5 {
            rightWall = min(rightWall, r.minX)
        }
        guard leftWall > -1_000_000, rightWall < 1_000_000, rightWall - leftWall > rect.width + 0.5 else {
            return (rect, [])
        }
        let leftGap = rect.minX - leftWall
        let rightGap = rightWall - rect.maxX
        guard abs(leftGap - rightGap) < threshold * 2.5 else { return (rect, []) }
        let slot = rightWall - leftWall
        let idealMinX = leftWall + (slot - rect.width) / 2
        var out = rect
        out.origin.x = max(0, min(idealMinX, canvasSize - rect.width))
        let guides: [CanvasAlignmentGuide] = [
            CanvasAlignmentGuide(isVertical: true, position: leftWall),
            CanvasAlignmentGuide(isVertical: true, position: rightWall),
            CanvasAlignmentGuide(isVertical: true, position: (leftWall + rightWall) / 2),
        ]
        return (out, guides)
    }

    /// Equal top/bottom margins within a vertical slot.
    static func refineEqualVerticalMargins(
        rect: CGRect,
        movingElementId: UUID,
        excludingElementIds: Set<UUID>,
        elements: [CanvasElementRecord],
        canvasSize: CGFloat = defaultCanvasLogicalSize,
        threshold: CGFloat = defaultThreshold
    ) -> (rect: CGRect, guides: [CanvasAlignmentGuide]) {
        let others = framesForSnapping(excludingIds: excludingElementIds.union([movingElementId]), elements: elements)
        var topWall: CGFloat = -.greatestFiniteMagnitude
        var bottomWall: CGFloat = .greatestFiniteMagnitude
        for r in others where r.maxY <= rect.minY + 0.5 {
            topWall = max(topWall, r.maxY)
        }
        for r in others where r.minY >= rect.maxY - 0.5 {
            bottomWall = min(bottomWall, r.minY)
        }
        guard topWall > -1_000_000, bottomWall < 1_000_000, bottomWall - topWall > rect.height + 0.5 else {
            return (rect, [])
        }
        let topGap = rect.minY - topWall
        let bottomGap = bottomWall - rect.maxY
        guard abs(topGap - bottomGap) < threshold * 2.5 else { return (rect, []) }
        let slot = bottomWall - topWall
        let idealMinY = topWall + (slot - rect.height) / 2
        var out = rect
        out.origin.y = max(0, min(idealMinY, canvasSize - rect.height))
        let guides: [CanvasAlignmentGuide] = [
            CanvasAlignmentGuide(isVertical: false, position: topWall),
            CanvasAlignmentGuide(isVertical: false, position: bottomWall),
            CanvasAlignmentGuide(isVertical: false, position: (topWall + bottomWall) / 2),
        ]
        return (out, guides)
    }

    // MARK: - Per-axis move snap (pick smallest alignment error under threshold)

    private static func snapOriginX(rect: CGRect, targets: [CGFloat], threshold: CGFloat) -> (CGFloat, CGFloat)? {
        var best: (x: CGFloat, guide: CGFloat, err: CGFloat)?
        for T in targets {
            let candidates: [(CGFloat, CGFloat)] = [
                (T, abs(rect.minX - T)),
                (T - rect.width * 0.5, abs(rect.midX - T)),
                (T - rect.width, abs(rect.maxX - T)),
            ]
            for (newX, err) in candidates {
                guard err < threshold else { continue }
                if best == nil || err < best!.err - 0.001 || (abs(err - best!.err) < 0.001 && newX < best!.x) {
                    best = (newX, T, err)
                }
            }
        }
        guard let b = best else { return nil }
        return (b.x, b.guide)
    }

    private static func snapOriginY(rect: CGRect, targets: [CGFloat], threshold: CGFloat) -> (CGFloat, CGFloat)? {
        var best: (y: CGFloat, guide: CGFloat, err: CGFloat)?
        for T in targets {
            let candidates: [(CGFloat, CGFloat)] = [
                (T, abs(rect.minY - T)),
                (T - rect.height * 0.5, abs(rect.midY - T)),
                (T - rect.height, abs(rect.maxY - T)),
            ]
            for (newY, err) in candidates {
                guard err < threshold else { continue }
                if best == nil || err < best!.err - 0.001 || (abs(err - best!.err) < 0.001 && newY < best!.y) {
                    best = (newY, T, err)
                }
            }
        }
        guard let b = best else { return nil }
        return (b.y, b.guide)
    }
}
