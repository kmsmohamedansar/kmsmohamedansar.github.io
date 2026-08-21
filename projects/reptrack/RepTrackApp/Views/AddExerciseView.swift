//
//  AddExerciseView.swift
//  RepTrack
//

import SwiftUI
import SwiftData

struct AddExerciseView: View {
    let workout: Workout
    @State private var name = ""
    @State private var weight = ""
    @State private var reps = ""
    @State private var sets = ""
    @State private var notes = ""

    var onSave: (String, Double, Int, Int, String) -> Void
    var onCancel: () -> Void

    private var canSave: Bool {
        let w = Double(weight) ?? 0
        let r = Int(reps) ?? 0
        let s = Int(sets) ?? 0
        return !name.trimmingCharacters(in: .whitespaces).isEmpty && w >= 0 && r > 0 && s > 0
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Exercise name", text: $name)
                        .textInputAutocapitalization(.words)
                    TextField("Weight (lb)", text: $weight)
                        .keyboardType(.decimalPad)
                    TextField("Reps", text: $reps)
                        .keyboardType(.numberPad)
                    TextField("Sets", text: $sets)
                        .keyboardType(.numberPad)
                } header: {
                    Text("Details")
                }

                Section {
                    TextField("Notes (optional)", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                } header: {
                    Text("Notes")
                }
            }
            .navigationTitle("Add Exercise")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        onCancel()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        save()
                    }
                    .fontWeight(.semibold)
                    .disabled(!canSave)
                }
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") {
                        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                    }
                    .fontWeight(.semibold)
                }
            }
        }
    }

    private func save() {
        let w = Double(weight) ?? 0
        let r = Int(reps) ?? 0
        let s = Int(sets) ?? 0
        onSave(
            name.trimmingCharacters(in: .whitespaces),
            w,
            r,
            s,
            notes.trimmingCharacters(in: .whitespaces)
        )
    }
}

#Preview {
    AddExerciseView(
        workout: Workout(date: Date()),
        onSave: { _, _, _, _, _ in },
        onCancel: { }
    )
}
