import SwiftUI

/// Shared spacing, radii, and structural measures so surfaces feel like one product.
enum FlowDeskLayout {
    // MARK: - Spacing scale (4pt rhythm)

    static let spaceXS: CGFloat = 4
    static let spaceS: CGFloat = 8
    static let spaceM: CGFloat = 12
    static let spaceL: CGFloat = 16
    static let spaceXL: CGFloat = 24
    static let spaceXXL: CGFloat = 32

    // MARK: - Home / dashboard

    static let homePageMaxContentWidth: CGFloat = 960
    static let homePageHorizontalPadding: CGFloat = 32
    static let homePageVerticalPadding: CGFloat = 32
    static let homeMajorSectionSpacing: CGFloat = 32
    static let homeSubsectionSpacing: CGFloat = 12
    static let homeHeadlineToBodySpacing: CGFloat = 10
    static let homeCreationGridSpacing: CGFloat = 16
    /// Caps width of the secondary “Blank board” tile so the hero canvas card dominates.
    static let homeBlankCreationMaxWidth: CGFloat = 380
    static let homeRecentRowSpacing: CGFloat = 8

    // MARK: - Cards (same family as canvas framed elements)

    /// Primary corner radius for home cards, text blocks, charts, and sticky notes.
    static let cardCornerRadius: CGFloat = 14

    static let cardBorderLineWidth: CGFloat = 1
    static let cardBorderLineWidthHover: CGFloat = 1.25

    static let cardShadowYNormal: CGFloat = 2
    static let cardShadowYHover: CGFloat = 5

    static let homeCreationCardMinHeight: CGFloat = 144
    /// Primary “Smart canvas” tile on Home (secondary blank uses `homeCreationCardMinHeight`).
    static let homeCreationCardHeroMinHeight: CGFloat = 196
    static let homeCreationCardInnerSpacing: CGFloat = 12
    static let homeCreationCardTitleSubtitleSpacing: CGFloat = 4

    static let homeContinueMinHeight: CGFloat = 108
    static let homeCardPadding: CGFloat = 16

    static let homeRecentRowHorizontalPadding: CGFloat = 16
    static let homeRecentRowVerticalPadding: CGFloat = 12

    /// Interior padding for text blocks and chart bodies (aligned with home cards).
    static let canvasCardContentPadding = EdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16)

    static let chartTitleElementSpacing: CGFloat = 12

    // MARK: - Selection chrome (geometry only; colors from tokens)

    static let shapeSelectionCornerRadius: CGFloat = 12
    static let strokeSelectionCornerRadius: CGFloat = 8

    // MARK: - Sidebar

    static let sidebarRowVerticalInset: CGFloat = 6
    static let sidebarRowLeadingInset: CGFloat = 10
    static let sidebarRowTrailingInset: CGFloat = 10
    static let sidebarFooterHorizontalPadding: CGFloat = 14
    static let sidebarFooterVerticalPadding: CGFloat = 10
    static let sidebarEmptyHorizontalPadding: CGFloat = 12

    static let sidebarRowSelectionCornerRadius: CGFloat = 8

    // MARK: - Inspector

    static let inspectorHorizontalPadding: CGFloat = 8
    static let inspectorSectionHeaderBottomSpacing: CGFloat = 4

    // MARK: - Canvas

    static let gridLineWidth: CGFloat = 0.4
    /// Every Nth grid interval reads slightly stronger (spatial hierarchy).
    static let gridMajorLineStride: Int = 5

    // MARK: - Floating panels (palette, selection bar, tips)

    static let floatingPanelCornerRadius: CGFloat = 16
    static let floatingPanelContentPadding: CGFloat = 8

    /// Keep the selection toolbar clear of the left floating palette (view space).
    static let canvasSelectionToolbarLeadingGutter: CGFloat = 88

    // MARK: - Shared chrome

    /// Subtle pill/chip behind template labels (home, sidebar metadata).
    static let chipBackgroundOpacity: Double = 0.07
}
