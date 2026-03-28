import AppKit
import SwiftUI

/// Scrollable, zoomable workspace shell. Phase 1: viewport persisted via `CanvasBoardViewModel`.
struct CanvasWorkspaceView: View {
    let document: FlowDocument
    @Bindable var viewModel: CanvasBoardViewModel

    @State private var panDragTranslation: CGSize = .zero

    private let canvasSize: CGFloat = 4000

    var body: some View {
        GeometryReader { _ in
            let viewport = viewModel.boardState.viewport
            let scale = max(0.25, min(4, CGFloat(viewport.scale)))

            ZStack(alignment: .topLeading) {
                canvasBackground(showGrid: viewport.showGrid)
                    .frame(width: canvasSize, height: canvasSize)
                    .scaleEffect(scale, anchor: .topLeading)
                    .offset(
                        x: CGFloat(viewport.offsetX) + panDragTranslation.width,
                        y: CGFloat(viewport.offsetY) + panDragTranslation.height
                    )

                VStack(alignment: .leading, spacing: 6) {
                    Text(document.title)
                        .font(.headline)
                    Text("Canvas · Phase 1 scaffold — elements land here in later phases.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(20)
                .allowsHitTesting(false)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .clipped()
            .contentShape(Rectangle())
            .gesture(panGesture(viewport: viewport))
            .simultaneousGesture(zoomGesture(currentScale: viewport.scale))
            .navigationTitle(document.title)
            #if os(macOS)
            .navigationSubtitle("Last edited \(document.updatedAt.formatted(date: .abbreviated, time: .shortened))")
            #endif
        }
    }

    private func panGesture(viewport: ViewportState) -> some Gesture {
        DragGesture()
            .onChanged { value in
                panDragTranslation = value.translation
            }
            .onEnded { value in
                var next = viewport
                next.offsetX += Double(value.translation.width)
                next.offsetY += Double(value.translation.height)
                viewModel.setViewport(next)
                panDragTranslation = .zero
            }
    }

    private func zoomGesture(currentScale: Double) -> some Gesture {
        MagnifyGesture()
            .onEnded { value in
                var next = viewModel.boardState.viewport
                let factor = Double(value.magnification)
                next.scale = max(0.25, min(4, currentScale * factor))
                viewModel.setViewport(next)
            }
    }

    @ViewBuilder
    private func canvasBackground(showGrid: Bool) -> some View {
        ZStack {
            Color(nsColor: .windowBackgroundColor)
            if showGrid {
                CanvasGridOverlay(spacing: 24, lineWidth: 0.5)
            }
        }
    }
}
