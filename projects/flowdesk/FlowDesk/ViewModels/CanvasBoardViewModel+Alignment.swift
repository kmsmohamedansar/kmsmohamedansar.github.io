import CoreGraphics
import Foundation

enum CanvasAlignKind {
    case left
    case centerX
    case right
    case top
    case centerY
    case bottom
}

enum CanvasDistributeAxis {
    case horizontal
    case vertical
}

extension CanvasBoardViewModel {
    private func framedAlignableRecords(selection: CanvasSelectionModel) -> [CanvasElementRecord] {
        boardState.elements.filter {
            selection.selectedElementIDs.contains($0.id) && CanvasSnapEngine.participatesInSnapping($0.kind)
        }
    }

    func alignSelectedElements(selection: CanvasSelectionModel, kind: CanvasAlignKind) {
        let framed = framedAlignableRecords(selection: selection)
        guard framed.count >= 2 else { return }
        stopAllInlineEditing()
        let ids = Set(framed.map(\.id))
        let canvasMax = Double(CanvasSnapEngine.defaultCanvasLogicalSize)
        applyBoardMutation { state in
            switch kind {
            case .left:
                let minX = framed.map(\.x).min() ?? 0
                for i in state.elements.indices where ids.contains(state.elements[i].id) {
                    state.elements[i].x = minX
                    state.elements[i].x = max(0, min(state.elements[i].x, canvasMax - state.elements[i].width))
                }
            case .right:
                let maxR = framed.map { $0.x + $0.width }.max() ?? 0
                for i in state.elements.indices where ids.contains(state.elements[i].id) {
                    let el = state.elements[i]
                    state.elements[i].x = maxR - el.width
                    state.elements[i].x = max(0, min(state.elements[i].x, canvasMax - el.width))
                }
            case .centerX:
                var u = CGRect(x: framed[0].x, y: framed[0].y, width: framed[0].width, height: framed[0].height)
                for el in framed.dropFirst() {
                    u = u.union(CGRect(x: el.x, y: el.y, width: el.width, height: el.height))
                }
                let mid = u.midX
                for i in state.elements.indices where ids.contains(state.elements[i].id) {
                    let el = state.elements[i]
                    state.elements[i].x = Double(mid) - el.width * 0.5
                    state.elements[i].x = max(0, min(state.elements[i].x, canvasMax - el.width))
                }
            case .top:
                let minY = framed.map(\.y).min() ?? 0
                for i in state.elements.indices where ids.contains(state.elements[i].id) {
                    state.elements[i].y = minY
                    state.elements[i].y = max(0, min(state.elements[i].y, canvasMax - state.elements[i].height))
                }
            case .bottom:
                let maxB = framed.map { $0.y + $0.height }.max() ?? 0
                for i in state.elements.indices where ids.contains(state.elements[i].id) {
                    let el = state.elements[i]
                    state.elements[i].y = maxB - el.height
                    state.elements[i].y = max(0, min(state.elements[i].y, canvasMax - el.height))
                }
            case .centerY:
                var u = CGRect(x: framed[0].x, y: framed[0].y, width: framed[0].width, height: framed[0].height)
                for el in framed.dropFirst() {
                    u = u.union(CGRect(x: el.x, y: el.y, width: el.width, height: el.height))
                }
                let mid = u.midY
                for i in state.elements.indices where ids.contains(state.elements[i].id) {
                    let el = state.elements[i]
                    state.elements[i].y = Double(mid) - el.height * 0.5
                    state.elements[i].y = max(0, min(state.elements[i].y, canvasMax - el.height))
                }
            }
        }
    }

    func distributeSelectedElements(selection: CanvasSelectionModel, axis: CanvasDistributeAxis) {
        let framed = framedAlignableRecords(selection: selection)
        guard framed.count >= 3 else { return }
        stopAllInlineEditing()
        let canvasMax = Double(CanvasSnapEngine.defaultCanvasLogicalSize)
        switch axis {
        case .horizontal:
            let sorted = framed.sorted { $0.x < $1.x }
            let left = sorted[0].x
            let right = sorted[sorted.count - 1].x + sorted[sorted.count - 1].width
            let sumW = sorted.reduce(0) { $0 + $1.width }
            let span = right - left
            let gap = (span - sumW) / Double(sorted.count - 1)
            guard gap >= 0 else { return }
            applyBoardMutation { state in
                var x = left
                for el in sorted {
                    guard let i = state.elements.firstIndex(where: { $0.id == el.id }) else { continue }
                    state.elements[i].x = max(0, min(x, canvasMax - state.elements[i].width))
                    x += state.elements[i].width + gap
                }
            }
        case .vertical:
            let sorted = framed.sorted { $0.y < $1.y }
            let top = sorted[0].y
            let bottom = sorted[sorted.count - 1].y + sorted[sorted.count - 1].height
            let sumH = sorted.reduce(0) { $0 + $1.height }
            let span = bottom - top
            let gap = (span - sumH) / Double(sorted.count - 1)
            guard gap >= 0 else { return }
            applyBoardMutation { state in
                var y = top
                for el in sorted {
                    guard let i = state.elements.firstIndex(where: { $0.id == el.id }) else { continue }
                    state.elements[i].y = max(0, min(y, canvasMax - state.elements[i].height))
                    y += state.elements[i].height + gap
                }
            }
        }
    }
}
