import SwiftUI

/// Bottom-trailing resize affordance (macOS window–like).
struct CanvasTextBlockResizeHandle: View {
    var body: some View {
        Image(systemName: "arrow.up.left.and.arrow.down.right")
            .font(.system(size: 9, weight: .semibold))
            .foregroundStyle(.secondary)
            .padding(6)
            .background(.thinMaterial, in: RoundedRectangle(cornerRadius: FlowDeskLayout.chromeInsetCornerRadius, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: FlowDeskLayout.chromeInsetCornerRadius, style: .continuous)
                    .strokeBorder(Color.primary.opacity(0.1), lineWidth: 0.75)
            }
            .shadow(
                color: Color.black.opacity(FlowDeskTheme.canvasAuxiliaryLabelShadowOpacity * 0.5),
                radius: FlowDeskTheme.canvasAuxiliaryLabelShadowRadius,
                x: 0,
                y: FlowDeskTheme.canvasAuxiliaryLabelShadowY
            )
    }
}
