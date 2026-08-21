import SwiftUI

// MARK: - Shared chrome

/// First-run tips: same depth language as the floating palette (material + one shadow + one hairline).
struct FlowDeskOnboardingTipCard: View {
    let title: String
    let tips: [String]
    let onDismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: FlowDeskLayout.spaceM) {
            HStack(alignment: .firstTextBaseline, spacing: FlowDeskLayout.spaceS) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.primary)
                    Text("Quick tour")
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(.tertiary)
                        .textCase(.uppercase)
                        .tracking(0.4)
                }
                Spacer(minLength: 8)
                Button {
                    onDismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .symbolRenderingMode(.hierarchical)
                        .font(.title3)
                        .foregroundStyle(.tertiary)
                }
                .buttonStyle(.plain)
                .help("Dismiss tips")
            }

            VStack(alignment: .leading, spacing: FlowDeskLayout.spaceM) {
                ForEach(Array(tips.enumerated()), id: \.offset) { index, line in
                    HStack(alignment: .top, spacing: 10) {
                        Text("\(index + 1)")
                            .font(.caption2.weight(.bold))
                            .monospacedDigit()
                            .foregroundStyle(.quaternary)
                            .frame(width: 16, alignment: .trailing)
                            .padding(.top, 2)
                        Text(line)
                            .font(.caption.weight(.medium))
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                            .lineSpacing(2)
                    }
                }
            }

            Button("Done") {
                onDismiss()
            }
            .keyboardShortcut(.defaultAction)
            .buttonStyle(.borderedProminent)
            .controlSize(.regular)
        }
        .padding(FlowDeskLayout.floatingPanelContentPadding + FlowDeskLayout.spaceXS)
        .frame(maxWidth: 312, alignment: .leading)
        .flowDeskFloatingPanelChrome(
            shadowStyle: .toolPalette,
            lightTintOpacity: 0.12,
            darkTintOpacity: 0.08
        )
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Cerebra tips")
    }
}

// MARK: - Home

struct FlowDeskHomeOnboardingCallout: View {
    @Environment(FlowDeskOnboardingStore.self) private var onboarding

    var body: some View {
        FlowDeskOnboardingTipCard(
            title: "Welcome",
            tips: [
                "Two starter boards are in the sidebar—open Welcome to Cerebra to explore, or Scratch for an empty canvas.",
                "Need another board? Use New board in the sidebar footer or the + button above the list.",
                "Every board is one infinite surface: drag empty space to pan, pinch on a trackpad to zoom."
            ],
            onDismiss: { onboarding.dismissHomeTips() }
        )
        .transition(.asymmetric(
            insertion: .opacity.combined(with: .move(edge: .bottom).combined(with: .scale(scale: 0.98, anchor: .bottomTrailing))),
            removal: .opacity.combined(with: .scale(scale: 0.98, anchor: .bottomTrailing))
        ))
    }
}

// MARK: - Canvas

struct FlowDeskCanvasOnboardingCallout: View {
    @Environment(FlowDeskOnboardingStore.self) private var onboarding

    var body: some View {
        FlowDeskOnboardingTipCard(
            title: "The canvas",
            tips: [
                "The left rail has Select, Draw, Text, Sticky, Shape, and Templates. Single keys when not typing: V select, P draw, T text, N sticky, R/S rectangle or square shape. Shapes and draw can open a slim side panel—insert from the View menu too.",
                "Framing: ⌘⌥1 fit board, ⌘⌥2 center content, ⌘⌥3 zoom to selection. ⌘+ / ⌘− step zoom. G toggles the grid.",
                "With Select active, drag empty space to pan and pinch on a trackpad to zoom.",
                "Copy and paste (⌘C / ⌘V) apply to canvas items you copied in Cerebra—not plain text from other apps.",
                "Export the board as PNG or PDF from the Export button in the toolbar (share icon)."
            ],
            onDismiss: { onboarding.dismissCanvasTips() }
        )
        .transition(.asymmetric(
            insertion: .opacity.combined(with: .move(edge: .top).combined(with: .scale(scale: 0.97, anchor: .topTrailing))),
            removal: .opacity.combined(with: .scale(scale: 0.97, anchor: .topTrailing))
        ))
    }
}
