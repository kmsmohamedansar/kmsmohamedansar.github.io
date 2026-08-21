//
//  EditableExerciseCardView.swift
//  RepTrack
//

import SwiftUI
import SwiftData

struct EditableExerciseCardView: View {
    @Environment(\.modelContext) private var modelContext
    @Bindable var log: ExerciseLog
    let progression: ProgressionDisplay

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(log.name)
                .font(.headline)
                .foregroundStyle(.primary)

            Text("Weight, reps & sets — tap to edit")
                .font(.caption)
                .foregroundStyle(.secondary)

            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Weight (lb)")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    TextField("0", value: $log.weight, format: .number)
                        .keyboardType(.decimalPad)
                        .textFieldStyle(.roundedBorder)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text("Reps")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    TextField("0", value: $log.reps, format: .number)
                        .keyboardType(.numberPad)
                        .textFieldStyle(.roundedBorder)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text("Sets")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    TextField("0", value: $log.sets, format: .number)
                        .keyboardType(.numberPad)
                        .textFieldStyle(.roundedBorder)
                }
            }

            progressionBadge
        }
        .padding(12)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .onChange(of: log.weight) { _, _ in saveIfNeeded() }
        .onChange(of: log.reps) { _, _ in saveIfNeeded() }
        .onChange(of: log.sets) { _, _ in saveIfNeeded() }
    }

    private func saveIfNeeded() {
        try? modelContext.save()
    }

    @ViewBuilder
    private var progressionBadge: some View {
        switch progression {
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
