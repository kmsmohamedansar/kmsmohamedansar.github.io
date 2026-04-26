//
//  RepTrackApp.swift
//  RepTrack
//
//  RepTrack – Gym workout and exercise progression tracker
//

import SwiftUI
import SwiftData

@main
struct RepTrackApp: App {
    var sharedModelContainer: ModelContainer = {
        let schema = Schema([Workout.self])
        let modelConfiguration = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false
        )
        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            WorkoutListView()
        }
        .modelContainer(sharedModelContainer)
    }
}
