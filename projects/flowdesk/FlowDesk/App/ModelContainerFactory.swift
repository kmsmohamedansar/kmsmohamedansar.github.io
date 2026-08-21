import SwiftData

/// Central place for SwiftData schema and store configuration (migrations, cloud later).
enum ModelContainerFactory {
    static func makeDefault(inMemory: Bool = false) -> ModelContainer {
        let schema = Schema([FlowDocument.self])
        let configuration = ModelConfiguration(isStoredInMemoryOnly: inMemory)
        do {
            return try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            fatalError("Cerebra: ModelContainer failed — \(error.localizedDescription)")
        }
    }
}
