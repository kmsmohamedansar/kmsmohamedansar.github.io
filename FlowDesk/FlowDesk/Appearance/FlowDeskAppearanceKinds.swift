import SwiftUI

/// User-chosen light/dark behavior (persisted app-wide).
enum FlowDeskAppearanceMode: String, CaseIterable, Codable, Sendable, Identifiable {
    case system
    case light
    case dark

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .system: return "System"
        case .light: return "Light"
        case .dark: return "Dark"
        }
    }

    /// Passed to `preferredColorScheme`; `nil` follows the system.
    var preferredColorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }
}

/// Visual personality layered on top of light/dark (persisted app-wide).
enum FlowDeskStylePreset: String, CaseIterable, Codable, Sendable, Identifiable {
    case warmPaper
    case graphite
    case glass
    case solid

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .warmPaper: return "Warm Paper"
        case .graphite: return "Graphite"
        case .glass: return "Glass"
        case .solid: return "Solid"
        }
    }
}
