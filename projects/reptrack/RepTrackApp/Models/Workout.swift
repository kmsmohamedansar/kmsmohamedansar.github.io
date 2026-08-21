//
//  Workout.swift
//  RepTrack
//

import Foundation
import SwiftData

@Model
final class Workout {
    var id: UUID
    var date: Date
    var createdAt: Date
    @Relationship(deleteRule: .cascade, inverse: \ExerciseLog.workout)
    var exercises: [ExerciseLog] = []

    init(date: Date = Date(), exercises: [ExerciseLog] = []) {
        self.id = UUID()
        self.date = date
        self.createdAt = Date()
        self.exercises = exercises
    }

    var sortedExercises: [ExerciseLog] {
        exercises.sorted { $0.createdAt < $1.createdAt }
    }
}

extension Workout: Identifiable { }
