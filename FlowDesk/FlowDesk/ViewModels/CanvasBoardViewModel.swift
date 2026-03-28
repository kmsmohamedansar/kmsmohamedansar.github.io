import Foundation
import Observation
import SwiftData

/// In-memory canvas state for the selected document. Persists back to `FlowDocument.canvasPayload`
/// on meaningful changes (viewport, elements, text payloads).
@Observable
final class CanvasBoardViewModel {
    private weak var document: FlowDocument?
    private var modelContext: ModelContext?

    private(set) var boardState: CanvasBoardState = .empty()

    /// When set, the canvas shows an inline editor for this text block id.
    var editingTextElementID: UUID?
    /// When set, the canvas shows an inline editor for this sticky note id.
    var editingStickyNoteElementID: UUID?

    /// Tool mode: pan/select vs freehand ink. Reset when opening a document.
    var canvasTool: CanvasToolMode = .select

    /// Shape kind used when `canvasTool == .placeShape` and the user clicks the canvas.
    var placeShapeKind: FlowDeskShapeKind = .rectangle

    /// Active drawing style for new strokes (toolbar / inspector).
    var drawingStrokeColor: CanvasRGBAColor = CanvasRGBAColor(red: 0.12, green: 0.12, blue: 0.14, opacity: 1)
    var drawingLineWidth: Double = 3
    var drawingStrokeOpacity: Double = 1

    /// Updated by `CanvasBoardView` from the visible geometry + current pan/zoom (not persisted).
    var insertionViewportSnapshot: CanvasInsertionViewportSnapshot?
    /// Increments on each insert for a slight cascade offset (resets per document session).
    var insertionStaggerCounter: Int = 0

    /// Live alignment guides during move/resize (not persisted).
    var activeAlignmentGuides: [CanvasAlignmentGuide] = []

    /// Multi-select framed drag: leader view drives snap; followers mirror `groupMovePreviewTranslation`.
    var groupMoveLeaderID: UUID?
    var groupMovePreviewTranslation: CGSize = .zero
    /// Subset of `selectedElementIDs` that are framed (text, sticky, shape, chart).
    var groupMoveParticipantIDs: Set<UUID> = []

    /// Cascading offset steps for repeated paste from the internal clipboard (canvas points). Reset on copy and document attach/detach.
    var clipboardPasteGeneration: Int = 0

    /// Bumped when the FlowDesk pasteboard write succeeds so SwiftUI refreshes Paste affordances.
    var clipboardRevision: Int = 0

    /// Shared offset for duplicate, multi-duplicate, and clipboard paste (canvas space, points).
    static let boardCascadeOffset: Double = 28

    // MARK: - Undo / redo (snapshot-based; see CanvasBoardViewModel+Undo.swift)

    /// States to restore on Undo. Not persisted across app relaunch or document switches.
    var canvasUndoStack: [CanvasBoardState] = []
    var canvasRedoStack: [CanvasBoardState] = []
    var canvasUndoApplying = false
    /// Nesting depth for coalescing rapid mutations (e.g. live resize) into one undo step.
    var canvasUndoCoalescingDepth = 0
    /// Baseline board snapshot when the outermost coalescing session started; consumed after first recorded change.
    var canvasUndoCoalesceBaseline: CanvasBoardState?
    private(set) var canUndoBoard = false
    private(set) var canRedoBoard = false
    let canvasUndoStackLimit = 100

    func attach(document: FlowDocument, modelContext: ModelContext) {
        self.document = document
        self.modelContext = modelContext
        editingTextElementID = nil
        editingStickyNoteElementID = nil
        canvasTool = .select
        insertionViewportSnapshot = nil
        insertionStaggerCounter = 0
        clipboardPasteGeneration = 0
        activeAlignmentGuides = []
        resetGroupMoveState()
        placeShapeKind = .rectangle
        boardState = CanvasBoardCoding.decode(from: document.canvasPayload)
        // Initial tool is session UI state; derive from template when present so whiteboards open ready to draw.
        canvasTool = boardState.boardTemplate?.preferredInitialCanvasTool ?? .select
        resetCanvasUndoHistory()
    }

    func detach() {
        document = nil
        modelContext = nil
        editingTextElementID = nil
        editingStickyNoteElementID = nil
        canvasTool = .select
        insertionViewportSnapshot = nil
        insertionStaggerCounter = 0
        clipboardPasteGeneration = 0
        activeAlignmentGuides = []
        resetGroupMoveState()
        placeShapeKind = .rectangle
        boardState = .empty()
        resetCanvasUndoHistory()
    }

    func persist() {
        guard let document, let modelContext else { return }
        document.canvasPayload = CanvasBoardCoding.encode(boardState)
        document.markUpdated()
        try? modelContext.save()
    }

    // MARK: - Undo helpers (mutation entry points for `CanvasBoardViewModel+Undo`)

    func mutateBoardState(_ body: (inout CanvasBoardState) -> Void) {
        body(&boardState)
    }

    func replaceEntireBoardState(_ state: CanvasBoardState) {
        boardState = state
    }

    func refreshBoardUndoAvailability() {
        canUndoBoard = !canvasUndoStack.isEmpty
        canRedoBoard = !canvasRedoStack.isEmpty
    }
}
