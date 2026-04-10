import AppKit
import SwiftUI

struct DocumentSidebarView: View {
    @Environment(\.flowDeskTokens) private var tokens
    @Environment(\.colorScheme) private var colorScheme

    let documents: [FlowDocument]
    @Binding var selection: FlowDocument?
    var onNewBoard: () -> Void
    var onDelete: (IndexSet) -> Void
    var onRenameRequest: (FlowDocument) -> Void

    @State private var hoveredDocumentID: UUID?

    private var sectionHeaderForeground: Color {
        Color.primary.opacity(colorScheme == .dark ? 0.58 : 0.45)
    }

    var body: some View {
        Group {
            if documents.isEmpty {
                sidebarEmptyLibrary
            } else {
                sidebarDocumentsList
            }
        }
        .background {
            ZStack(alignment: .trailing) {
                tokens.sidebarListTint
                LinearGradient(
                    colors: [
                        Color.black.opacity(colorScheme == .dark ? 0.26 : 0.062),
                        Color.clear
                    ],
                    startPoint: .trailing,
                    endPoint: UnitPoint(x: 0.68, y: 0.5)
                )
                .frame(width: 26)
                .allowsHitTesting(false)
                Rectangle()
                    .fill(Color.primary.opacity(colorScheme == .dark ? 0.16 : 0.04))
                    .frame(width: 1)
                    .allowsHitTesting(false)
            }
        }
        .safeAreaInset(edge: .bottom) {
            sidebarFooter
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button(action: onNewBoard) {
                    Image(systemName: "plus")
                }
                .help("New board")
                .buttonStyle(FlowDeskToolbarButtonStyle())
            }
        }
    }

    private var sidebarDocumentsList: some View {
        List(selection: $selection) {
            Section {
                ForEach(documents, id: \.persistentModelID) { document in
                    sidebarRow(for: document)
                }
                .onDelete(perform: onDelete)
            } header: {
                boardsSectionHeader
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
    }

    @ViewBuilder
    private func sidebarRow(for document: FlowDocument) -> some View {
        let isSelected = selection?.persistentModelID == document.persistentModelID
        let isHovered = hoveredDocumentID == document.id

        Label {
            Text(document.title)
                .font(sidebarRowTitleFont(isSelected: isSelected))
                .foregroundStyle(isSelected ? Color.primary : Color.primary.opacity(0.92))
                .lineLimit(2)
        } icon: {
            Image(systemName: "rectangle.stack.fill")
                .symbolRenderingMode(.hierarchical)
                .font(.callout.weight(.medium))
                .foregroundStyle(
                    isSelected
                        ? tokens.selectionStrokeColor.opacity(0.92)
                        : Color.secondary.opacity(0.88)
                )
        }
        .labelStyle(.titleAndIcon)
        .contextMenu {
            Button("Rename…") {
                onRenameRequest(document)
            }
            Divider()
            Button("Delete", role: .destructive) {
                if let index = documents.firstIndex(where: { $0.id == document.id }) {
                    onDelete(IndexSet(integer: index))
                }
            }
        }
        .tag(Optional(document))
        .listRowInsets(
            EdgeInsets(top: 6, leading: 12, bottom: 6, trailing: 12)
        )
        .listRowBackground(
            sidebarRowBackground(isSelected: isSelected, isHovered: isHovered)
        )
        .listRowSeparator(.hidden)
        .contentShape(RoundedRectangle(cornerRadius: FlowDeskLayout.sidebarRowSelectionCornerRadius, style: .continuous))
        .onHover { inside in
            hoveredDocumentID = inside ? document.id : nil
            if inside {
                NSCursor.pointingHand.set()
            } else {
                NSCursor.arrow.set()
            }
        }
    }

    private func sidebarRowTitleFont(isSelected: Bool) -> Font {
        FlowDeskTypography.sidebarRowTitle.weight(isSelected ? .semibold : .regular)
    }

    private var boardsSectionHeader: some View {
        Text("Boards")
            .font(.system(size: 11, weight: .semibold, design: .default))
            .foregroundStyle(sectionHeaderForeground)
            .tracking(0.85)
            .textCase(.uppercase)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.leading, FlowDeskLayout.sidebarSectionHeaderLeadingPadding)
            .padding(.trailing, FlowDeskLayout.sidebarRowTrailingInset)
            .padding(.top, FlowDeskLayout.spaceS)
            .padding(.bottom, FlowDeskLayout.spaceS + 2)
            .accessibilityAddTraits(.isHeader)
    }

    private func sidebarRowBackground(isSelected: Bool, isHovered: Bool) -> some View {
        let corner = FlowDeskLayout.sidebarRowSelectionCornerRadius
        return RoundedRectangle(cornerRadius: corner, style: .continuous)
            .fill(rowFill(isSelected: isSelected, isHovered: isHovered))
            .overlay {
                RoundedRectangle(cornerRadius: corner, style: .continuous)
                    .strokeBorder(
                        isSelected ? tokens.selectionStrokeColor.opacity(colorScheme == .dark ? 0.5 : 0.44) : Color.clear,
                        lineWidth: isSelected ? 1 : 0
                    )
            }
            .padding(.vertical, 1)
            .padding(.horizontal, 6)
            .animation(.easeOut(duration: 0.14), value: isSelected)
            .animation(.easeOut(duration: 0.12), value: isHovered)
    }

    private func rowFill(isSelected: Bool, isHovered: Bool) -> Color {
        if isSelected {
            return tokens.selectionStrokeColor.opacity(colorScheme == .dark ? 0.3 : 0.16)
        }
        if isHovered {
            return tokens.selectionStrokeColor.opacity(colorScheme == .dark ? 0.15 : 0.09)
        }
        return Color.clear
    }

    private var sidebarFooter: some View {
        VStack(alignment: .leading, spacing: 0) {
            Rectangle()
                .fill(Color.primary.opacity(colorScheme == .dark ? 0.12 : 0.06))
                .frame(height: 1)
                .allowsHitTesting(false)
            Button(action: onNewBoard) {
                Label("New board", systemImage: "plus.circle.fill")
                    .font(.subheadline.weight(.medium))
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .buttonStyle(FlowDeskPlainCardButtonStyle())
            .padding(.horizontal, FlowDeskLayout.sidebarFooterHorizontalPadding)
            .padding(.vertical, FlowDeskLayout.sidebarFooterVerticalPadding + FlowDeskLayout.spaceXS / 2)
        }
        .flowDeskSidebarFooterBackground(tokens)
    }

    private var sidebarEmptyLibrary: some View {
        VStack(spacing: FlowDeskLayout.spaceL) {
            Spacer(minLength: 0)
            FlowDeskSheetsStackMark(size: 84)
            VStack(spacing: FlowDeskLayout.spaceS) {
                Text("No boards yet")
                    .font(FlowDeskTypography.sidebarEmptyTitle)
                    .foregroundStyle(.primary)
                Text("Create a board to begin. Cerebra saves your work as you go—nothing to configure.")
                    .font(FlowDeskTypography.sidebarEmptyBody)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .lineSpacing(3)
                    .padding(.horizontal, FlowDeskLayout.spaceM)
            }
            Button("Create board", action: onNewBoard)
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, FlowDeskLayout.sidebarEmptyHorizontalPadding)
    }
}
