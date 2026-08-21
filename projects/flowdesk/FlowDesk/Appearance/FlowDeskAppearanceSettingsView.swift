import SwiftUI

/// macOS Settings pane for appearance mode and style preset.
struct FlowDeskAppearanceSettingsView: View {
    @Bindable var store: FlowDeskAppearanceStore

    var body: some View {
        Form {
            Section {
                Picker("Appearance", selection: $store.mode) {
                    ForEach(FlowDeskAppearanceMode.allCases) { mode in
                        Text(mode.displayName).tag(mode)
                    }
                }
                .pickerStyle(.inline)

                Picker("Visual style", selection: $store.stylePreset) {
                    ForEach(FlowDeskStylePreset.allCases) { preset in
                        Text(preset.displayName).tag(preset)
                    }
                }
                .pickerStyle(.inline)
            } header: {
                Text("Cerebra")
            } footer: {
                Text("Appearance follows the system, or locks to light or dark. Visual style adjusts surfaces, borders, and canvas tone.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .formStyle(.grouped)
        .frame(minWidth: 400, minHeight: 220)
        .padding(FlowDeskLayout.spaceS)
    }
}
