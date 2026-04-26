//
//  AddWorkoutView.swift
//  RepTrack
//

import SwiftUI

struct AddWorkoutView: View {
    @State private var selectedDate = Date()
    var onSave: (Date) -> Void
    var onCancel: () -> Void

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    DatePicker(
                        "Date",
                        selection: $selectedDate,
                        displayedComponents: .date
                    )
                } header: {
                    Text("Workout Date")
                }
            }
            .navigationTitle("New Workout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        onCancel()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        onSave(selectedDate)
                    }
                    .fontWeight(.semibold)
                }
            }
        }
    }
}

#Preview {
    AddWorkoutView(onSave: { _ in }, onCancel: { })
}
