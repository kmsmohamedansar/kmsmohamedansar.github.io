import AppKit
import Foundation

/// JSON on `NSPasteboard` for Cerebra canvas elements (cross-session within the app; v1 is not a public interchange format).
enum FlowDeskCanvasClipboard {
    static let pasteboardType = NSPasteboard.PasteboardType("com.flowdesk.board-elements-v1")

    struct Envelope: Codable, Equatable, Sendable {
        static let currentFormatVersion = 1
        var formatVersion: Int
        var elements: [CanvasElementRecord]
    }

    @discardableResult
    static func write(elements: [CanvasElementRecord]) -> Bool {
        guard !elements.isEmpty else { return false }
        let envelope = Envelope(formatVersion: Envelope.currentFormatVersion, elements: elements)
        guard let data = try? JSONEncoder.flowDesk.encode(envelope) else { return false }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setData(data, forType: pasteboardType)
        return true
    }

    static func readElements() -> [CanvasElementRecord]? {
        guard let data = NSPasteboard.general.data(forType: pasteboardType),
              let envelope = try? JSONDecoder.flowDesk.decode(Envelope.self, from: data),
              envelope.formatVersion == Envelope.currentFormatVersion,
              !envelope.elements.isEmpty
        else { return nil }
        return envelope.elements
    }

    static var canPaste: Bool {
        readElements() != nil
    }
}
