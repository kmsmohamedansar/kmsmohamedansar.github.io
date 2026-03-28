import SwiftUI

/// Hosts the main window with appearance preferences applied (color scheme + environment).
struct FlowDeskRootView: View {
    let appearanceStore: FlowDeskAppearanceStore

    var body: some View {
        @Bindable var appearanceStore = appearanceStore
        MainWindowView()
            .environment(appearanceStore)
            .preferredColorScheme(appearanceStore.preferredColorScheme)
    }
}
