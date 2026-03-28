import SwiftData
import SwiftUI

@main
struct FlowDeskApp: App {
    private static func makeModelContainer() -> ModelContainer {
        let schema = Schema([FlowDocument.self])
        let configuration = ModelConfiguration(isStoredInMemoryOnly: false)
        do {
            return try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            fatalError("FlowDesk: failed to create ModelContainer — \(error.localizedDescription)")
        }
    }

    var body: some Scene {
        WindowGroup {
            MainWindowView()
        }
        .modelContainer(Self.makeModelContainer())
        .windowStyle(.automatic)
        .defaultSize(width: 1200, height: 780)
    }
}
