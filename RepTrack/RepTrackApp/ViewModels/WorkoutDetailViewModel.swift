//
//  WorkoutDetailViewModel.swift
//  RepTrack
//

import Foundation
import SwiftData

@Observable
final class WorkoutDetailViewModel {
    private var modelContext: ModelContext?
    var workout: Workout?

    /// All exercise logs for the same exercise name, across workouts, newest first (for comparison).
    var previousLogsByName: [String: [ExerciseLog]] = [:]

    func setModelContext(_ context: ModelContext) {
        modelContext = context
    }

    func setWorkout(_ workout: Workout) {
        self.workout = workout
        loadPreviousLogsForComparison()
    }

    func loadPreviousLogsForComparison() {
        guard let modelContext, let workout else { return }
        let descriptor = FetchDescriptor<ExerciseLog>(
            sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
        )
        guard let allLogs = try? modelContext.fetch(descriptor) else { return }

        var byName: [String: [ExerciseLog]] = [:]
        for log in allLogs {
            guard log.workout?.id != workout.id else { continue }
            byName[log.name, default: []].append(log)
        }
        previousLogsByName = byName
    }

    func addExercise(
        name: String,
        weight: Double,
        reps: Int,
        sets: Int,
        notes: String
    ) {
        guard let modelContext, let workout else { return }
        let log = ExerciseLog(
            name: name,
            weight: weight,
            reps: reps,
            sets: sets,
            notes: notes,
            workout: workout
        )
        modelContext.insert(log)
        workout.exercises.append(log)
        try? modelContext.save()
        loadPreviousLogsForComparison()
    }

    func previousLog(forExerciseName name: String) -> ExerciseLog? {
        previousLogsByName[name]?.first
    }

    func deleteExercise(_ log: ExerciseLog) {
        guard let modelContext else { return }
        modelContext.delete(log)
        try? modelContext.save()
        loadPreviousLogsForComparison()
    }
}
