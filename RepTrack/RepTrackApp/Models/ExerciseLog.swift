//
//  ExerciseLog.swift
//  RepTrack
//

import Foundation
import SwiftData

@Model
final class ExerciseLog {
    var id: UUID
    var name: String
    var weight: Double
    var reps: Int
    var sets: Int
    var notes: String
    var createdAt: Date
    var workout: Workout?

    init(
        name: String,
        weight: Double,
        reps: Int,
        sets: Int,
        notes: String = "",
        workout: Workout? = nil
    ) {
        self.id = UUID()
        self.name = name
        self.weight = weight
        self.reps = reps
        self.sets = sets
        self.notes = notes
        self.createdAt = Date()
        self.workout = workout
    }
}
