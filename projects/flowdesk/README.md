# FlowDesk (Cerebra)

A native macOS "smart canvas" app for solo thinking — sticky notes, shapes,
connectors, freehand strokes, text blocks, and charts on an infinite board.
Built with SwiftUI and SwiftData.

## Requirements

- Xcode 15+
- macOS 14+ (SwiftData)

## Structure

```
FlowDesk/
├── FlowDesk.xcodeproj/
└── FlowDesk/
    ├── App/            App entry point, root view, onboarding, model container
    ├── Appearance/      Theme tokens, appearance store and settings
    ├── Components/      Shared chrome, layout, and typography building blocks
    ├── Models/          SwiftData models — boards, shapes, sticky notes, connectors, charts, text
    ├── Selection/        Canvas selection state
    ├── Services/         Library seeding
    ├── Utilities/        Snapping, clipboard, connector geometry, JSON coding
    ├── ViewModels/        CanvasBoardViewModel and its feature extensions (shapes, strokes, undo, etc.)
    └── Views/            Canvas, home, inspector, and sidebar SwiftUI views
```

## How to open and run

Open `FlowDesk.xcodeproj` in Xcode and run (⌘R).
