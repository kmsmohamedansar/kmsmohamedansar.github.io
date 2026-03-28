import SwiftUI

/// Workspace dashboard when no board is selected: continue, create, and recent work.
struct HomeView: View {
    @Environment(\.flowDeskTokens) private var tokens

    /// Same ordering as `MainWindowView`’s `@Query` (newest first).
    var documents: [FlowDocument]
    var onOpenDocument: (FlowDocument) -> Void
    var onCreateFromTemplate: (FlowDeskBoardTemplate) -> Void

    private let creationColumns = [
        GridItem(.adaptive(minimum: 240, maximum: 320), spacing: FlowDeskLayout.homeCreationGridSpacing, alignment: .top)
    ]

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
        .background(tokens.workspaceBackground)
    }

    private var pageChrome: some View {
        VStack(alignment: .leading, spacing: FlowDeskLayout.spaceXS) {
            Text("Home")
                .font(FlowDeskTypography.pageEyebrow)
                .foregroundStyle(.tertiary)
                .tracking(0.6)
            Text("Your workspace")
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
                Text("What do you want to create?")
                    .font(FlowDeskTypography.homeHeroTitle)
                    .foregroundStyle(.primary)

                Text("Pick a starting point. You can always add text, shapes, drawings, and charts on the canvas.")
                    .font(FlowDeskTypography.homeIntroBody)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: 520, alignment: .leading)
            }

            LazyVGrid(columns: creationColumns, spacing: FlowDeskLayout.homeCreationGridSpacing) {
                CreationCardView(
                    systemImage: "doc.text.fill",
                    title: "Document",
                    subtitle: "Clean page, no grid—ideal for writing and layout."
                ) {
                    onCreateFromTemplate(.document)
                }

                CreationCardView(
                    systemImage: "square.grid.3x3.fill",
                    title: "Whiteboard",
                    subtitle: "Open canvas with grid for sketches and diagrams."
                ) {
                    onCreateFromTemplate(.whiteboard)
                }

                CreationCardView(
                    systemImage: "pencil.and.scribble",
                    title: "Smart Canvas",
                    subtitle: "Hybrid space with a starter text block and drawing tools."
                ) {
                    onCreateFromTemplate(.smartCanvas)
                }

                CreationCardView(
                    systemImage: "arrow.triangle.branch",
                    title: "Flow Diagram",
                    subtitle: "Grid on for flows, maps, and structured thinking."
                ) {
                    onCreateFromTemplate(.flowDiagram)
                }

                CreationCardView(
                    systemImage: "rectangle.dashed",
                    title: "Blank Board",
                    subtitle: "Minimal board—same as a quick new board from the sidebar."
                ) {
                    onCreateFromTemplate(.blankBoard)
                }
            }
        }
    }

    @ViewBuilder
    private var recentSection: some View {
        if otherRecentDocuments.isEmpty {
            EmptyView()
        } else {
            VStack(alignment: .leading, spacing: FlowDeskLayout.homeSubsectionSpacing) {
                Text("Recent boards")
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
