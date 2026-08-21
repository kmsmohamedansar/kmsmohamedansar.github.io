//
//  WorkoutListView.swift
//  RepTrack
//

import SwiftUI
import SwiftData

struct WorkoutListView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var viewModel = WorkoutsViewModel()
    @State private var showingAddWorkout = false
    @State private var selectedWorkout: Workout?
    @State private var workoutToDelete: Workout?

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.workouts.isEmpty {
                    emptyState
                } else {
                    workoutList
                }
            }
            .navigationTitle("Workouts")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showingAddWorkout = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                    }
                }
            }
            .onAppear {
                viewModel.setModelContext(modelContext)
                viewModel.fetchWorkouts()
            }
            .sheet(isPresented: $showingAddWorkout) {
                AddWorkoutView(onSave: { date in
                    if let workout = viewModel.workoutForDateOrCreate(date: date) {
                        selectedWorkout = workout
                    }
                    showingAddWorkout = false
                }, onCancel: {
                    showingAddWorkout = false
                })
            }
            .navigationDestination(item: $selectedWorkout) { workout in
                WorkoutDetailView(workout: workout) {
                    viewModel.deleteWorkout(workout)
                    selectedWorkout = nil
                }
            }
        }
    }

    private var emptyState: some View {
        ContentUnavailableView(
            "No Workouts Yet",
            systemImage: "dumbbell.fill",
            description: Text("Tap + to log your first workout.")
        )
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var workoutList: some View {
        let sameDayWorkoutDates: Set<Date> = {
            let cal = Calendar.current
            var dayCounts: [Date: Int] = [:]
            for w in viewModel.workouts {
                let day = cal.startOfDay(for: w.date)
                dayCounts[day, default: 0] += 1
            }
            return Set(dayCounts.filter { $0.value > 1 }.keys)
        }()
        return List {
            ForEach(viewModel.workouts, id: \.id) { workout in
                HStack(spacing: 12) {
                    Button {
                        selectedWorkout = workout
                    } label: {
                        WorkoutRowView(
                            workout: workout,
                            showTime: sameDayWorkoutDates.contains(Calendar.current.startOfDay(for: workout.date))
                        )
                    }
                    .buttonStyle(.plain)
                    Spacer(minLength: 0)
                    Button(role: .destructive) {
                        workoutToDelete = workout
                    } label: {
                        Label("Delete", systemImage: "trash.fill")
                            .font(.subheadline.weight(.medium))
                    }
                    .buttonStyle(.bordered)
                    .tint(.red)
                }
                .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16))
            }
        }
        .listStyle(.plain)
        .confirmationDialog("Delete this workout?", isPresented: Binding(
            get: { workoutToDelete != nil },
            set: { if !$0 { workoutToDelete = nil } }
        ), titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                if let w = workoutToDelete {
                    viewModel.deleteWorkout(w)
                    workoutToDelete = nil
                }
            }
            Button("Cancel", role: .cancel) {
                workoutToDelete = nil
            }
        } message: {
            Text("All exercises in this workout will be removed.")
        }
    }
}

struct WorkoutRowView: View {
    let workout: Workout
    var showTime: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(workout.date, style: .date)
                    .font(.headline)
                    .foregroundStyle(.primary)
                if showTime {
                    Text(workout.date, style: .time)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            Text("\(workout.exercises.count) exercise\(workout.exercises.count == 1 ? "" : "s")")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    WorkoutListView()
        .modelContainer(for: [Workout.self], inMemory: true)
}
