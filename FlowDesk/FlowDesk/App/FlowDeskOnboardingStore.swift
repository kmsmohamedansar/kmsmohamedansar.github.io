import Foundation
import Observation

/// App-wide first-use hints only. Not part of document or canvas persistence.
@Observable
final class FlowDeskOnboardingStore {
    private enum Key {
        static let home = "flowDesk.onboarding.homeTipsDismissed"
        static let canvas = "flowDesk.onboarding.canvasTipsDismissed"
    }

    private let defaults: UserDefaults

    private(set) var homeTipsDismissed: Bool
    private(set) var canvasTipsDismissed: Bool

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        homeTipsDismissed = defaults.bool(forKey: Key.home)
        canvasTipsDismissed = defaults.bool(forKey: Key.canvas)
    }

    func dismissHomeTips() {
        guard !homeTipsDismissed else { return }
        defaults.set(true, forKey: Key.home)
        homeTipsDismissed = true
    }

    func dismissCanvasTips() {
        guard !canvasTipsDismissed else { return }
        defaults.set(true, forKey: Key.canvas)
        canvasTipsDismissed = true
    }
}
