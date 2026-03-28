import SwiftData
import SwiftUI

@main
struct FlowDeskApp: App {
    private let modelContainer = ModelContainerFactory.makeDefault()
    @State private var appearanceStore = FlowDeskAppearanceStore()

    var body: some Scene {
        // Native window chrome: minimize / zoom / full screen (no custom window styles).
        WindowGroup {
            FlowDeskRootView(appearanceStore: appearanceStore)
        }
        .modelContainer(modelContainer)
        .windowStyle(.automatic)
        .defaultSize(width: 1200, height: 780)
        .commands {
            CommandGroup(replacing: .undoRedo) {
                Button("Undo") {
                    NotificationCenter.default.post(name: .flowDeskBoardUndo, object: nil)
                }
                .keyboardShortcut("z", modifiers: [.command])

                Button("Redo") {
                    NotificationCenter.default.post(name: .flowDeskBoardRedo, object: nil)
                }
                .keyboardShortcut("z", modifiers: [.command, .shift])
            }
        }

        #if os(macOS)
        Settings {
            FlowDeskAppearanceSettingsView(store: appearanceStore)
        }
        #endif
    }
}
