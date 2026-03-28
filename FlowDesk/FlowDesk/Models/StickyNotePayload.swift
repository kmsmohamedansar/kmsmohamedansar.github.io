import Foundation

/// Lightweight sticky note content and styling (plain text; rich text can layer on later).
struct StickyNotePayload: Codable, Equatable, Sendable {
    var text: String
    var backgroundColor: CanvasRGBAColor
    var fontSize: Double
    var isBold: Bool
    var textColor: CanvasRGBAColor

    static let `default` = StickyNotePayload(
        text: "",
        backgroundColor: StickyNoteColorPreset.lemon.rgba,
        fontSize: 14,
        isBold: false,
        textColor: .defaultText
    )
}

/// Curated paper tones for a Freeform-like feel (sRGB, opaque).
enum StickyNoteColorPreset: String, CaseIterable, Codable, Hashable, Sendable {
    case lemon
    case blush
    case mint
    case sky
    case lavender

    var rgba: CanvasRGBAColor {
        switch self {
        case .lemon:
            return CanvasRGBAColor(red: 0.99, green: 0.94, blue: 0.55, opacity: 1)
        case .blush:
            return CanvasRGBAColor(red: 1, green: 0.82, blue: 0.86, opacity: 1)
        case .mint:
            return CanvasRGBAColor(red: 0.78, green: 0.94, blue: 0.82, opacity: 1)
        case .sky:
            return CanvasRGBAColor(red: 0.74, green: 0.88, blue: 0.99, opacity: 1)
        case .lavender:
            return CanvasRGBAColor(red: 0.86, green: 0.82, blue: 0.98, opacity: 1)
        }
    }

    var displayName: String {
        switch self {
        case .lemon: return "Lemon"
        case .blush: return "Blush"
        case .mint: return "Mint"
        case .sky: return "Sky"
        case .lavender: return "Lavender"
        }
    }

    /// Finds the closest preset to a stored color (for inspector highlighting).
    static func nearest(to color: CanvasRGBAColor) -> StickyNoteColorPreset {
        var best: StickyNoteColorPreset = .lemon
        var bestDist = Double.greatestFiniteMagnitude
        for preset in Self.allCases {
            let c = preset.rgba
            let d =
                pow(c.red - color.red, 2) + pow(c.green - color.green, 2) + pow(c.blue - color.blue, 2)
            if d < bestDist {
                bestDist = d
                best = preset
            }
        }
        return best
    }
}
