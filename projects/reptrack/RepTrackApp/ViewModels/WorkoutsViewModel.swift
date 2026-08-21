//
//  WorkoutsViewModel.swift
//  RepTrack
//

import Foundation
import SwiftData

@Observable
final class WorkoutsViewModel {
    private var modelContext: ModelContext?

    var workouts: [Workout] = []

    func setModelContext(_ context: ModelContext) {
        modelContext = context
    }

    func fetchWorkouts() {
        guard let modelContext else { return }
        let descriptor = FetchDescriptor<Workout>(
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )
        do {
            workouts = try modelContext.fetch(descriptor)
            mergeDuplicateSameDayWorkouts()
        } catch {
            workouts = []
        }
    }

    /// Merges duplicate workouts on the same calendar day into one (keeps first, moves exercises, deletes rest).
    private func mergeDuplicateSameDayWorkouts() {
        guard let modelContext else { return }
        let cal = Calendar.current
        var byDay: [Date: [Workout]] = [:]
        for w in workouts {
            let day = cal.startOfDay(for: w.date)
            byDay[day, default: []].append(w)
        }
        var didMerge = false
        for (_, group) in byDay where group.count > 1 {
            let keep = group[0]
            for duplicate in group.dropFirst() {
                for exercise in duplicate.exercises {
                    exercise.workout = keep
                }
                modelContext.delete(duplicate)
                didMerge = true
            }
        }
        if didMerge {
            try? modelContext.save()
            let descriptor = FetchDescriptor<Workout>(sortBy: [SortDescriptor(\.date, order: .reverse)])
            workouts = (try? modelContext.fetch(descriptor)) ?? workouts
        }
    }

    /// Returns an existing workout on the same calendar day as `date`, or nil.
    func workoutForDate(_ date: Date) -> Workout? {
        let cal = Calendar.current
        let day = cal.startOfDay(for: date)
        return workouts.first { cal.isDate($0.date, inSameDayAs: day) }
    }

    /// Returns the workout for the given day if one exists; otherwise creates a new one and returns it.
    func workoutForDateOrCreate(date: Date) -> Workout? {
        if let existing = workoutForDate(date) {
            return existing
        }
        return addWorkout(date: date)
    }

    @discardableResult
    func addWorkout(date: Date = Date()) -> Workout? {
        guard let modelContext else { return nil }
        let workout = Workout(date: date)
        modelContext.insert(workout)
        do {
            try modelContext.save()
            fetchWorkouts()
            return workout
        } catch {
            return nil
        }
    }

    func deleteWorkout(_ workout: Workout) {
        guard let modelContext else { return }
        modelContext.delete(workout)
        try? modelContext.save()
        fetchWorkouts()
    }
}
