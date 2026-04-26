//
//  ExerciseRowView.swift
//  RepTrack
//

import SwiftUI
import SwiftData

struct ExerciseRowView: View {
    let log: ExerciseLog
    let previous: ExerciseLog?

    init(log: ExerciseLog, progression previous: ExerciseLog?) {
        self.log = log
        self.previous = previous
    }

    private var progressionDisplay: ProgressionDisplay {
        let progression = ProgressionHelper.progression(current: log, previous: previous)
        return ProgressionHelper.displayText(for: progression)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(log.name)
                .font(.headline)
                .foregroundStyle(.primary)

            HStack(alignment: .center, spacing: 16) {
                detailChip("\(Int(log.weight)) lb", systemImage: "scalemass.fill")
                detailChip("\(log.reps) reps", systemImage: "repeat")
                detailChip("\(log.sets) sets", systemImage: "square.stack")
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)

            if !log.notes.isEmpty {
                Text(log.notes)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            progressionBadge
        }
        .padding(.vertical, 8)
    }

    private func detailChip(_ text: String, systemImage: String) -> some View {
        Label(text, systemImage: systemImage)
    }

    @ViewBuilder
    private var progressionBadge: some View {
        switch progressionDisplay {
        case .noPrevious:
            EmptyView()
        case .same:
            Label("Same as last session", systemImage: "minus.circle")
                .font(.caption)
                .foregroundStyle(.secondary)
        case .improved(let text):
            Label(text, systemImage: "arrow.up.circle.fill")
                .font(.caption)
                .foregroundStyle(.green)
        case .regressed(let text):
            Label(text, systemImage: "arrow.down.circle")
                .font(.caption)
                .foregroundStyle(.orange)
        }
    }
}

#Preview {
    List {
        ExerciseRowView(
            log: ExerciseLog(name: "Bench Press", weight: 135, reps: 10, sets: 3),
            progression: ExerciseLog(name: "Bench Press", weight: 130, reps: 10, sets: 3)
        )
    }
}
