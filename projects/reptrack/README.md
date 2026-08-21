# RepTrack

A minimal native iPhone app for tracking gym workouts and exercise progression. Built with SwiftUI, MVVM, and SwiftData.

## Requirements

- Xcode 15+
- iOS 17+ (SwiftData)
- No authentication or cloud sync (V1)

## Folder Structure

```
RepTrack/
├── RepTrackApp/
│   ├── RepTrackApp.swift          # App entry point, SwiftData container
│   ├── Models/
│   │   ├── Workout.swift          # Workout entity (date, exercises)
│   │   └── ExerciseLog.swift     # Exercise log (name, weight, reps, sets, notes)
│   ├── ViewModels/
│   │   ├── WorkoutsViewModel.swift      # Workout list CRUD, fetch
│   │   └── WorkoutDetailViewModel.swift # Exercise CRUD, previous-log lookup for progression
│   ├── Views/
│   │   ├── WorkoutListView.swift  # Main list of workouts + empty state
│   │   ├── WorkoutRowView.swift   # Row for one workout (date, exercise count)
│   │   ├── WorkoutDetailView.swift# Single workout: list of exercises + add
│   │   ├── ExerciseRowView.swift  # One exercise with progression badge
│   │   ├── AddWorkoutView.swift   # Sheet: pick date, create workout
│   │   └── AddExerciseView.swift  # Sheet: name, weight, reps, sets, notes
│   └── Utilities/
│       └── ProgressionHelper.swift # Compare current vs previous; "+5 lb", "same", etc.
└── README.md
```

### Purpose of each folder

- **RepTrackApp** – Root of the app target; contains the `@main` entry and all app code.
- **Models** – SwiftData `@Model` types. `Workout` has a date and one-to-many `exercises`; `ExerciseLog` holds name, weight, reps, sets, notes, and belongs to a `Workout`.
- **ViewModels** – `@Observable` view models: `WorkoutsViewModel` for the list and add/delete workout; `WorkoutDetailViewModel` for one workout’s exercises and for resolving the “previous” log by exercise name for progression.
- **Views** – SwiftUI screens and components. List → Detail → Add Exercise flow; progression shown in `ExerciseRowView` via `ProgressionHelper`.
- **Utilities** – Shared logic (e.g. progression comparison and display strings like “+5 lb from last session”, “same as last session”, “-2 reps from last session”).

## How to open and run

1. Open Xcode and create a new project: **File → New → Project**.
2. Choose **App** (iOS), then:
   - Product Name: **RepTrack**
   - Interface: **SwiftUI**
   - Language: **Swift**
   - Storage: **SwiftData** (or add it later)
   - Minimum deployment: **iOS 17.0**
3. Save the project in the same parent folder as this `RepTrack` folder (or move the `RepTrackApp` contents into the app target Xcode created).
4. In the Project Navigator, **delete** the default Swift file Xcode added (e.g. `ContentView.swift`) if you’re replacing it.
5. **Add existing files**: right‑click the app target group → **Add Files to "RepTrack"** → select the `RepTrackApp` folder and add all `.swift` files (and any assets) so they belong to the RepTrack target.
6. Ensure the app target’s **Minimum Deployments** is **iOS 17.0** (for SwiftData).
7. Build and run on a simulator or device (⌘R).

If you prefer a single-folder app target, you can move everything from `RepTrackApp` into the default app group and remove the `RepTrackApp` folder; the structure above is the logical layout.

## Data and flow

- **Persistence**: SwiftData; all data is stored locally on device.
- **Navigation**: `WorkoutListView` (list) → tap workout → `WorkoutDetailView` (exercises). “Add Workout” and “Add Exercise” are presented as sheets.
- **Progression**: For each exercise in the current workout, the app finds the latest previous log with the same exercise name (from any other workout). It compares weight, reps, and sets and shows “+5 lb from last session”, “same as last session”, “-2 reps from last session”, or an improvement/regression badge in `ExerciseRowView`.

## Exercise data (wger)

The app can show **hundreds of exercises with names and categories** from the [wger](https://wger.de) API.

1. **Fetch the list** (from this repo’s root):
   ```bash
   cd RepTrack && node scripts/fetch-exercises.js
   ```
   This writes `exercises.json` (English names, category, muscle, equipment) using the wger **exerciseinfo** API.

2. **Use it in the iOS app**
   - Copy `RepTrack/exercises.json` into your Xcode app’s **RepTrack** group (same folder as `RepTrackApp.swift`, etc.).
   - In Xcode: select `exercises.json` → **File Inspector** → under **Target Membership** check **RepTrack** so it’s included in the app bundle.
   - On launch, the app loads this file; the “Add Exercise” screen shows a searchable grid. If the file is missing, it falls back to a short built-in list.

## Design

- Minimal, Apple-like UI: system fonts, native controls, `Form` and `List`, standard toolbar and navigation.
- Uses `ContentUnavailableView` for the empty workout list and clear primary actions (e.g. “Add” in list and detail).
