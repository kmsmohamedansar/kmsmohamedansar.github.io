import SwiftUI

// MARK: - Shared chrome

/// Compact dismissible tips; matches floating palette material + radius family.
struct FlowDeskOnboardingTipCard: View {
    let title: String
    let tips: [String]
    let onDismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: FlowDeskLayout.spaceM) {
            HStack(alignment: .firstTextBaseline, spacing: FlowDeskLayout.spaceS) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
                Spacer(minLength: 8)
                Button {
                    onDismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .symbolRenderingMode(.hierarchical)
                        .font(.body)
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .help("Dismiss tips")
            }

            VStack(alignment: .leading, spacing: FlowDeskLayout.spaceS) {
                ForEach(Array(tips.enumerated()), id: \.offset) { _, line in
                    HStack(alignment: .top, spacing: 8) {
                        Circle()
                            .fill(Color.accentColor.opacity(0.5))
                            .frame(width: 5, height: 5)
                            .padding(.top, 5)
                        Text(line)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }

            Button("Got it") {
                onDismiss()
            }
            .keyboardShortcut(.defaultAction)
            .buttonStyle(.borderedProminent)
            .controlSize(.small)
        }
        .padding(FlowDeskLayout.spaceM)
        .frame(maxWidth: 300, alignment: .leading)
        .background {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(.ultraThinMaterial)
                .shadow(color: Color.black.opacity(0.1), radius: 12, x: 0, y: 4)
        }
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .strokeBorder(Color.primary.opacity(0.08), lineWidth: 1)
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("First-time tips")
    }
}

// MARK: - Home

struct FlowDeskHomeOnboardingCallout: View {
    @Environment(FlowDeskOnboardingStore.self) private var onboarding

    var body: some View {
        FlowDeskOnboardingTipCard(
            title: "Getting started",
            tips: [
                "Pick Smart canvas or Blank board below to start a new board.",
                "Your boards stay in the sidebar—open or continue anytime.",
                "One infinite canvas for notes, sketches, and layout."
            ],
            onDismiss: { onboarding.dismissHomeTips() }
        )
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }
}

// MARK: - Canvas

struct FlowDeskCanvasOnboardingCallout: View {
    @Environment(FlowDeskOnboardingStore.self) private var onboarding

    var body: some View {
        FlowDeskOnboardingTipCard(
            title: "Canvas basics",
            tips: [
                "Choose a tool on the left to place elements or draw freehand.",
                "Select an item to edit it from the floating toolbar; finer controls are in the inspector.",
                "Drag empty space to pan (with Select active)."
            ],
            onDismiss: { onboarding.dismissCanvasTips() }
        )
        .transition(.opacity.combined(with: .scale(scale: 0.97, anchor: .topTrailing)))
    }
}
