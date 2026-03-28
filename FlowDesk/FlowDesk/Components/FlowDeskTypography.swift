import SwiftUI

/// Text styles shared across Home, sidebar, inspector, and chrome.
enum FlowDeskTypography {
    // MARK: - Home / dashboard

    static let pageEyebrow = Font.caption.weight(.semibold)
    static let pageSubtitle = Font.title2.weight(.medium)
    static let homeHeroTitle = Font.largeTitle.weight(.semibold)
    static let homeIntroBody = Font.body
    static let sectionTitle = Font.title3.weight(.semibold)
    static let sectionCaption = Font.subheadline

    // MARK: - Cards

    static let cardIconPointSize: CGFloat = 26
    static let heroCardIconPointSize: CGFloat = 34
    static let cardTitle = Font.headline
    static let heroCardTitle = Font.title2.weight(.semibold)
    static let cardSubtitle = Font.subheadline
    static let continueTitle = Font.title3.weight(.semibold)
    static let continueMeta = Font.subheadline
    static let recentTitle = Font.body.weight(.medium)
    static let recentMeta = Font.caption

    // MARK: - Sidebar

    static let sidebarSectionHeader = Font.caption.weight(.semibold)
    static let sidebarRowTitle = Font.body
}
