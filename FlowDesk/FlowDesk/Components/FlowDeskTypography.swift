import SwiftUI

/// Text styles shared across Home, sidebar, inspector, and chrome.
enum FlowDeskTypography {
    // MARK: - Home / dashboard

    /// Small editorial label above the hero line (premium restraint).
    static let pageEyebrow = Font.system(size: 10.5, weight: .semibold, design: .default)
    static let pageSubtitle = Font.title2.weight(.light)
    /// Primary home headline — heavier than body copy for clear editorial hierarchy (Notion-like calm, not shouty).
    static let homeHeroTitle = Font.largeTitle.weight(.heavy)
    static let homeIntroBody = Font.body
    static let sectionTitle = Font.title2.weight(.semibold)
    static let sectionCaption = Font.subheadline
    /// Short supporting line under major home headings.
    static let homeSectionKicker = Font.subheadline.weight(.regular)

    // MARK: - Cards

    static let cardIconPointSize: CGFloat = 26
    static let heroCardIconPointSize: CGFloat = 34
    static let cardTitle = Font.headline
    static let heroCardTitle = Font.title2.weight(.semibold)
    /// Supporting copy under card titles—regular weight so titles read as the anchor.
    static let cardSubtitle = Font.subheadline.weight(.regular)
    static let continueTitle = Font.title3.weight(.semibold)
    static let continueMeta = Font.subheadline
    static let recentTitle = Font.body.weight(.medium)
    static let recentMeta = Font.caption

    // MARK: - Sidebar

    static let sidebarSectionHeader = Font.caption2.weight(.semibold)
    static let sidebarRowTitle = Font.body
    static let sidebarEmptyTitle = Font.title3.weight(.semibold)
    static let sidebarEmptyBody = Font.subheadline
}
