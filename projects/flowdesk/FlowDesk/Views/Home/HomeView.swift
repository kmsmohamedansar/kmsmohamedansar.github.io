import SwiftUI

/// Workspace dashboard when no board is selected: continue, create, and recent work.
struct HomeView: View {
    @Environment(\.flowDeskTokens) private var tokens
    @Environment(\.colorScheme) private var colorScheme
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
        .overlay(alignment: .bottomTrailing) {
            if !onboarding.homeTipsDismissed {
                FlowDeskHomeOnboardingCallout()
                    .padding(FlowDeskLayout.spaceL)
            }
        }
        .animation(.spring(response: 0.38, dampingFraction: 0.88), value: onboarding.homeTipsDismissed)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background {
            ZStack {
                tokens.workspaceBackground
                FlowDeskTheme.homeAtmosphereWash(colorScheme: colorScheme)
                    .allowsHitTesting(false)
            }
        }
        .navigationTitle("Cerebra")
    }

    private var pageChrome: some View {
        VStack(alignment: .leading, spacing: FlowDeskLayout.homeHeadlineToBodySpacing) {
            FlowDeskWordmark()
            Text("A calm canvas for solo thinking")
                .font(FlowDeskTypography.pageSubtitle)
                .tracking(0.35)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private func continueSection(latest: FlowDocument) -> some View {
        VStack(alignment: .leading, spacing: FlowDeskLayout.homeSubsectionSpacing) {
            VStack(alignment: .leading, spacing: FlowDeskLayout.spaceXS) {
                Text("Continue")
                    .font(FlowDeskTypography.sectionTitle)
                    .foregroundStyle(.primary)
                Text("Your most recently opened board")
                    .font(FlowDeskTypography.homeSectionKicker)
                    .foregroundStyle(.tertiary)
            }

            ContinueBoardHeroView(document: latest, onOpen: {
                onOpenDocument(latest)
            })
        }
    }

    private var creationSection: some View {
        VStack(alignment: .leading, spacing: FlowDeskLayout.spaceXL) {
            VStack(alignment: .leading, spacing: FlowDeskLayout.homeHeadlineToBodySpacing) {
                Text("New board")
                    .font(FlowDeskTypography.homeHeroTitle)
                    .foregroundStyle(.primary)

                Text("Each board is one infinite surface for thinking alone. Pick a starter below; your work saves automatically.")
                    .font(FlowDeskTypography.homeIntroBody)
                    .foregroundStyle(.tertiary)
                    .lineSpacing(3)
                    .frame(maxWidth: 560, alignment: .leading)
            }

            VStack(alignment: .leading, spacing: FlowDeskLayout.homeCreationCardsVerticalSpacing) {
                CreationCardView(
                    systemImage: "square.grid.3x3.fill",
                    title: "Smart canvas",
                    subtitle: "Starter text and sticky on the grid—edit, remove, or build around them.",
                    action: {
                        onCreateFromTemplate(.smartCanvas)
                    },
                    prominence: .hero
                )

                CreationCardView(
                    systemImage: "rectangle.portrait",
                    title: "Blank board",
                    subtitle: "Nothing pre-placed—an empty canvas for your own layout.",
                    action: {
                        onCreateFromTemplate(.blankBoard)
                    }
                )
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
                VStack(alignment: .leading, spacing: FlowDeskLayout.spaceXS) {
                    Text("Recent")
                        .font(FlowDeskTypography.sectionTitle)
                        .foregroundStyle(.primary)

                    Text("Boards you opened recently")
                        .font(FlowDeskTypography.homeSectionKicker)
                        .foregroundStyle(.tertiary)
                }

                VStack(spacing: FlowDeskLayout.spaceM) {
                    ForEach(otherRecentDocuments, id: \.persistentModelID) { doc in
                        RecentBoardRowView(document: doc, onOpen: {
                            onOpenDocument(doc)
                        })
                    }
                }
            }
        }
    }
}
