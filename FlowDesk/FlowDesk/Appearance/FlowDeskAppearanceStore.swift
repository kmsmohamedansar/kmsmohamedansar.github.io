import Observation
import SwiftUI

/// App-wide appearance preferences (UserDefaults-backed).
/// `EnvironmentKey.defaultValue` requires `Sendable`; store is main-actor–consumed in practice.
@Observable
final class FlowDeskAppearanceStore: @unchecked Sendable {
    private enum Key: String {
        case mode = "FlowDesk.appearance.mode"
        case preset = "FlowDesk.appearance.stylePreset"
    }

    private let defaults: UserDefaults

    var mode: FlowDeskAppearanceMode {
        didSet { persistMode() }
    }

    var stylePreset: FlowDeskStylePreset {
        didSet { persistPreset() }
    }

    var preferredColorScheme: ColorScheme? {
        mode.preferredColorScheme
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        if let raw = defaults.string(forKey: Key.mode.rawValue),
           let parsed = FlowDeskAppearanceMode(rawValue: raw) {
            self.mode = parsed
        } else {
            self.mode = .system
        }
        if let raw = defaults.string(forKey: Key.preset.rawValue),
           let parsed = FlowDeskStylePreset(rawValue: raw) {
            self.stylePreset = parsed
        } else {
            self.stylePreset = .warmPaper
        }
    }

    private func persistMode() {
        defaults.set(mode.rawValue, forKey: Key.mode.rawValue)
    }

    private func persistPreset() {
        defaults.set(stylePreset.rawValue, forKey: Key.preset.rawValue)
    }
}

// MARK: - Environment

private enum FlowDeskAppearanceStoreKey: EnvironmentKey {
    static let defaultValue = FlowDeskAppearanceStore()
}

private enum FlowDeskAppearanceTokensKey: EnvironmentKey {
    static let defaultValue = FlowDeskAppearanceTokens.fallback
}

extension EnvironmentValues {
    var flowDeskAppearanceStore: FlowDeskAppearanceStore {
        get { self[FlowDeskAppearanceStoreKey.self] }
        set { self[FlowDeskAppearanceStoreKey.self] = newValue }
    }

    /// Resolved palette for the current `colorScheme` + user style preset. Injected by `MainWindowView`.
    var flowDeskTokens: FlowDeskAppearanceTokens {
        get { self[FlowDeskAppearanceTokensKey.self] }
        set { self[FlowDeskAppearanceTokensKey.self] = newValue }
    }
}
