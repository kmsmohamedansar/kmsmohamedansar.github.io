import SwiftUI

/// Workspace dashboard when no board is selected: continue, create, and recent work.
struct HomeView: View {
    @Environment(\.flowDeskTokens) private var tokens
    @Environment(FlowDeskOnboardingStore.self) private var onboarding

    /// Same ordering as `MainWindowView`’s `@Query` (newest first).
    var documents: [FlowDocument]
    var onOpenDocument: (FlowDocument) -> Void
    var onCreateFromTemplate: (FlowDeskBoardTemplate) -> Void

    private var continueDocument: FlowDocument? {
        documents.first
    }

    /// Recent list excludes the hero board to avoid duplication.
    private var otherRecentDocuments: [FlowDocument] {
        guard documents.count > 1 else { return [] }
        return Array(documents.dropFirst().prefix(12))
    }

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            ScrollView {
                VStack(alignment: .leading, spacing: FlowDeskLayout.homeMajorSectionSpacing) {
                    pageChrome

                    if let latest = continueDocument {
                        continueSection(latest: latest)
                    }

                    creationSection

                    recentSection
                }
                .padding(.horizontal, FlowDeskLayout.homePageHorizontalPadding)
                .padding(.vertical, FlowDeskLayout.homePageVerticalPadding)
                .frame(maxWidth: FlowDeskLayout.homePageMaxContentWidth)
                .frame(maxWidth: .infinity)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            if !onboarding.homeTipsDismissed {
                FlowDeskHomeOnboardingCallout()
                    .padding(FlowDeskLayout.spaceL)
            }
        }
        .animation(.easeOut(duration: 0.22), value: onboarding.homeTipsDismissed)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(tokens.workspaceBackground)
    }

    private var pageChrome: some View {
        VStack(alignment: .leading, spacing: FlowDeskLayout.spaceXS) {
            Text("FlowDesk")
                .font(FlowDeskTypography.pageEyebrow)
                .foregroundStyle(.tertiary)
                .tracking(0.6)
            Text("Smart canvas")
                .font(FlowDeskTypography.pageSubtitle)
                .foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private func continueSection(latest: FlowDocument) -> some View {
        VStack(alignment: .leading, spacing: FlowDeskLayout.homeSubsectionSpacing) {
            Text("Continue where you left off")
                .font(FlowDeskTypography.sectionTitle)
                .foregroundStyle(.primary)

            ContinueBoardHeroView(document: latest) {
                onOpenDocument(latest)
            }
        }
    }

    private var creationSection: some View {
        VStack(alignment: .leading, spacing: FlowDeskLayout.spaceL) {
            VStack(alignment: .leading, spacing: FlowDeskLayout.homeHeadlineToBodySpacing) {
                Text("Start thinking")
                    .font(FlowDeskTypography.homeHeroTitle)
                    .foregroundStyle(.primary)

                Text("One canvas for notes, sketches, and layout. Start with a guided setup, or open empty.")
                    .font(FlowDeskTypography.homeIntroBody)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: 560, alignment: .leading)
            }

            VStack(alignment: .leading, spacing: FlowDeskLayout.homeCreationGridSpacing) {
                CreationCardView(
                    systemImage: "rectangle.split.2x1.fill",
                    title: "Smart canvas",
                    subtitle: "Starter text, sticky, and scratch area on a grid—ready to think out loud.",
                    prominence: .hero
                ) {
                    onCreateFromTemplate(.smartCanvas)
                }

                CreationCardView(
                    systemImage: "rectangle.dashed",
                    title: "Blank board",
                    subtitle: "Empty canvas, no starter blocks."
                ) {
                    onCreateFromTemplate(.blankBoard)
                }
                .frame(maxWidth: FlowDeskLayout.homeBlankCreationMaxWidth, alignment: .leading)
            }
        }
    }

    @ViewBuilder
    private var recentSection: some View {
        if otherRecentDocuments.isEmpty {
            EmptyView()
        } else {
            VStack(alignment: .leading, spacing: FlowDeskLayout.homeSubsectionSpacing) {
                Text("Recent canvases")
                    .font(FlowDeskTypography.sectionTitle)
                    .foregroundStyle(.primary)

                Text("Jump back into something you were working on.")
                    .font(FlowDeskTypography.sectionCaption)
                    .foregroundStyle(.secondary)

                VStack(spacing: FlowDeskLayout.homeRecentRowSpacing) {
                    ForEach(otherRecentDocuments, id: \.persistentModelID) { doc in
                        RecentBoardRowView(document: doc) {
                            onOpenDocument(doc)
                        }
                    }
                }
            }
        }
    }
}
