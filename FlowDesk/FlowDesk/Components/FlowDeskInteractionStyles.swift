import SwiftUI

/// Canvas floating palette tools: hover lift + press tuck (spring).
struct FlowDeskCanvasToolButtonStyle: ButtonStyle {
    var isHovered: Bool

    func makeBody(configuration: Configuration) -> some View {
        let scale = configuration.isPressed ? 0.98 : (isHovered ? 1.02 : 1.0)
        return configuration.label
            .scaleEffect(scale)
            // Single spring avoids competing animations (hover jitter).
            .animation(.spring(response: 0.24, dampingFraction: 0.82), value: scale)
    }
}

/// Subtle press feedback for plain home/dashboard buttons.
struct FlowDeskPlainCardButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .opacity(configuration.isPressed ? 0.88 : 1)
    }
}

/// Home creation / recent cards: press tuck + dim, stacks with hover scale from `cardContainer`.
struct FlowDeskHomeCardButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.988 : 1)
            .opacity(configuration.isPressed ? 0.9 : 1)
            .animation(.spring(response: 0.24, dampingFraction: 0.78), value: configuration.isPressed)
    }
}

/// Toolbar and compact controls: light press dim.
struct FlowDeskToolbarButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .opacity(configuration.isPressed ? 0.72 : 1)
    }
}

