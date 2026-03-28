import AppKit
import Foundation
import SwiftUI

/// Plain-text block content and styling. Designed for Codable persistence and future rich-text migration.
struct TextBlockPayload: Codable, Equatable, Sendable {
    var text: String
    /// Font size in points (canvas space).
    var fontSize: Double
    var isBold: Bool
    var color: CanvasRGBAColor
    var alignment: TextBlockAlignment

    static let `default` = TextBlockPayload(
        text: "",
        fontSize: 15,
        isBold: false,
        color: .defaultText,
        alignment: .leading
    )
}

enum TextBlockAlignment: String, Codable, CaseIterable, Sendable {
    case leading
    case center
    case trailing
}

/// sRGB storage for stable JSON across appearances (separate from dynamic semantic colors).
struct CanvasRGBAColor: Codable, Equatable, Sendable {
    var red: Double
    var green: Double
    var blue: Double
    var opacity: Double

    static let defaultText = CanvasRGBAColor(red: 0.12, green: 0.12, blue: 0.14, opacity: 1)

    init(red: Double, green: Double, blue: Double, opacity: Double) {
        self.red = red
        self.green = green
        self.blue = blue
        self.opacity = opacity
    }

    var swiftUIColor: Color {
        Color(.sRGB, red: red, green: green, blue: blue, opacity: opacity)
    }

    init(nsColor: NSColor) {
        let c = nsColor.usingColorSpace(.deviceRGB) ?? nsColor
        var r: CGFloat = 0
        var g: CGFloat = 0
        var b: CGFloat = 0
        var a: CGFloat = 0
        c.getRed(&r, green: &g, blue: &b, alpha: &a)
        self.init(red: Double(r), green: Double(g), blue: Double(b), opacity: Double(a))
    }
}

extension TextBlockAlignment {
    var multilineTextAlignment: TextAlignment {
        switch self {
        case .leading: return .leading
        case .center: return .center
        case .trailing: return .trailing
        }
    }

    var frameAlignment: Alignment {
        switch self {
        case .leading: return .topLeading
        case .center: return .top
        case .trailing: return .topTrailing
        }
    }
}
