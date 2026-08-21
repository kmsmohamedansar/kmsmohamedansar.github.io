//
//  WorkoutDetailView.swift
//  RepTrack
//  (Each exercise has a red "Delete exercise" button below the card.)
//

import SwiftUI
import SwiftData

struct WorkoutDetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Bindable var workout: Workout
    @State private var viewModel = WorkoutDetailViewModel()
    @State private var showingAddExercise = false
    @State private var showingDeleteConfirmation = false
    var onDeleteWorkout: (() -> Void)?

    var body: some View {
        List {
            Section {
                ForEach(workout.sortedExercises, id: \.id) { log in
                    VStack(alignment: .leading, spacing: 0) {
                        EditableExerciseCardView(
                            log: log,
                            progression: ProgressionHelper.progressionDisplay(current: log, previous: viewModel.previousLog(forExerciseName: log.name))
                        )
                        Button(role: .destructive) {
                            viewModel.deleteExercise(log)
                        } label: {
                            HStack {
                                Image(systemName: "trash.fill")
                                Text("Delete exercise")
                                    .fontWeight(.medium)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.red)
                        .padding(.top, 8)
                    }
                    .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                    .listRowBackground(Color.clear)
                }
            } header: {
                HStack {
                    Text("Exercises")
                    Spacer()
                    Button {
                        showingAddExercise = true
                    } label: {
                        Text("Add")
                            .fontWeight(.medium)
                    }
                }
            }
            Section {
                Button(role: .destructive) {
                    showingDeleteConfirmation = true
                } label: {
                    Label("Delete Workout", systemImage: "trash.fill")
                        .frame(maxWidth: .infinity)
                        .font(.body.weight(.medium))
                }
                .tint(.red)
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle(workout.date, format: .dateTime.day().month().year())
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Done") {
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                }
                .fontWeight(.semibold)
            }
        }
        .confirmationDialog("Delete Workout?", isPresented: $showingDeleteConfirmation, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                onDeleteWorkout?()
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("This workout and all its exercises will be removed. This cannot be undone.")
        }
        .onAppear {
            viewModel.setModelContext(modelContext)
            viewModel.setWorkout(workout)
        }
        .sheet(isPresented: $showingAddExercise) {
            AddExerciseView(workout: workout) { name, weight, reps, sets, notes in
                viewModel.addExercise(name: name, weight: weight, reps: reps, sets: sets, notes: notes)
                showingAddExercise = false
            } onCancel: {
                showingAddExercise = false
            }
        }
    }
}

#Preview {
    NavigationStack {
        WorkoutDetailView(workout: Workout(date: Date()), onDeleteWorkout: nil)
            .modelContainer(for: [Workout.self], inMemory: true)
    }
}
