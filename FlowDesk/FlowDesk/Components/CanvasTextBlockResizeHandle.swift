import SwiftUI

/// Bottom-trailing resize affordance (macOS window–like).
struct CanvasTextBlockResizeHandle: View {
    var body: some View {
        Image(systemName: "arrow.up.left.and.arrow.down.right")
            .font(.system(size: 9, weight: .semibold))
            .foregroundStyle(.secondary)
            .padding(6)
            .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 6, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .strokeBorder(Color.primary.opacity(0.1), lineWidth: 0.75)
            }
            .shadow(color: Color.black.opacity(0.06), radius: 2, x: 0, y: 1)
    }
}
