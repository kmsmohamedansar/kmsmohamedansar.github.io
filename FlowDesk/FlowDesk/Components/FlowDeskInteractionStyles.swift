import SwiftUI

/// Subtle press feedback for plain home/dashboard buttons.
struct FlowDeskPlainCardButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .opacity(configuration.isPressed ? 0.88 : 1)
    }
}

/// Toolbar and compact controls: light press dim.
struct FlowDeskToolbarButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .opacity(configuration.isPressed ? 0.72 : 1)
    }
}

