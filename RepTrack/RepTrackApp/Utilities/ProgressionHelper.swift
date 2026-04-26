//
//  ProgressionHelper.swift
//  RepTrack
//

import Foundation

struct ExerciseProgression {
    let weightDiff: Double?
    let repsDiff: Int?
    let setsDiff: Int?
    let hasPrevious: Bool
}

enum ProgressionDisplay {
    case improved(String)
    case same
    case regressed(String)
    case noPrevious
}

enum ProgressionHelper {

    /// Compare current exercise log with the previous entry for the same exercise name.
    static func progression(
        current: ExerciseLog,
        previous: ExerciseLog?
    ) -> ExerciseProgression {
        guard let previous else {
            return ExerciseProgression(weightDiff: nil, repsDiff: nil, setsDiff: nil, hasPrevious: false)
        }
        let weightDiff = current.weight - previous.weight
        let repsDiff = current.reps - previous.reps
        let setsDiff = current.sets - previous.sets
        return ExerciseProgression(
            weightDiff: weightDiff,
            repsDiff: repsDiff,
            setsDiff: setsDiff,
            hasPrevious: true
        )
    }

    /// Human-readable progression text for UI.
    static func displayText(for progression: ExerciseProgression) -> ProgressionDisplay {
        guard progression.hasPrevious else { return .noPrevious }

        var weightText: String?
        var repsText: String?
        var setsText: String?

        if let w = progression.weightDiff, w != 0 {
            let sign = w > 0 ? "+" : ""
            weightText = "\(sign)\(Int(w)) lb from last session"
        }
        if let r = progression.repsDiff, r != 0 {
            let sign = r > 0 ? "+" : ""
            repsText = "\(sign)\(r) reps from last session"
        }
        if let s = progression.setsDiff, s != 0 {
            let sign = s > 0 ? "+" : ""
            setsText = "\(sign)\(s) sets from last session"
        }

        let parts = [weightText, repsText, setsText].compactMap { $0 }
        if parts.isEmpty { return .same }

        let combined = parts.joined(separator: " · ")
        let isImprovement = (progression.weightDiff ?? 0) >= 0 &&
            (progression.repsDiff ?? 0) >= 0 &&
            (progression.setsDiff ?? 0) >= 0 &&
            (progression.weightDiff != 0 || progression.repsDiff != 0 || progression.setsDiff != 0)

        if isImprovement {
            return .improved(combined)
        } else {
            return .regressed(combined)
        }
    }

    /// Convenience: progression display for a current log and optional previous log.
    static func progressionDisplay(current: ExerciseLog, previous: ExerciseLog?) -> ProgressionDisplay {
        displayText(for: progression(current: current, previous: previous))
    }
}
