import SwiftUI

struct DocumentSidebarView: View {
    @Environment(\.flowDeskTokens) private var tokens

    let documents: [FlowDocument]
    @Binding var selection: FlowDocument?
    var onNewBoard: () -> Void
    var onDelete: (IndexSet) -> Void
    var onRenameRequest: (FlowDocument) -> Void

    @State private var hoveredDocumentID: UUID?

    var body: some View {
        Group {
            if documents.isEmpty {
                sidebarEmptyLibrary
            } else {
                List(selection: $selection) {
                    Section {
                        ForEach(documents, id: \.persistentModelID) { document in
                            Label {
                                Text(document.title)
                                    .font(FlowDeskTypography.sidebarRowTitle)
                                    .lineLimit(2)
                            } icon: {
                                Image(systemName: "rectangle.on.rectangle.angled")
                                    .symbolRenderingMode(.hierarchical)
                                    .font(.body.weight(.medium))
                                    .foregroundStyle(.tertiary)
                            }
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
                                EdgeInsets(
                                    top: FlowDeskLayout.sidebarRowVerticalInset,
                                    leading: FlowDeskLayout.sidebarRowLeadingInset,
                                    bottom: FlowDeskLayout.sidebarRowVerticalInset,
                                    trailing: FlowDeskLayout.sidebarRowTrailingInset
                                )
                            )
                            .listRowBackground(
                                sidebarRowBackground(
                                    isSelected: selection?.persistentModelID == document.persistentModelID,
                                    isHovered: hoveredDocumentID == document.id
                                )
                            )
                            .onHover { inside in
                                hoveredDocumentID = inside ? document.id : nil
                            }
                        }
                        .onDelete(perform: onDelete)
                    } header: {
                        Text("Boards")
                            .font(FlowDeskTypography.sidebarSectionHeader)
                            .foregroundStyle(.quaternary)
                            .textCase(.uppercase)
                            .tracking(0.35)
                            .padding(.bottom, FlowDeskLayout.spaceXS)
                    }
                }
                .listStyle(.sidebar)
                .scrollContentBackground(.hidden)
            }
        }
        .background(tokens.sidebarListTint)
        .safeAreaInset(edge: .bottom) {
            VStack(alignment: .leading, spacing: 0) {
                Divider()
                    .opacity(0.22)
                Button(action: onNewBoard) {
                    Label("New board", systemImage: "plus.circle.fill")
                        .font(.subheadline.weight(.medium))
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(FlowDeskPlainCardButtonStyle())
                .padding(.horizontal, FlowDeskLayout.sidebarFooterHorizontalPadding)
                .padding(.vertical, FlowDeskLayout.sidebarFooterVerticalPadding)
            }
            .flowDeskSidebarFooterBackground(tokens)
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

    private func sidebarRowBackground(isSelected: Bool, isHovered: Bool) -> some View {
        RoundedRectangle(cornerRadius: FlowDeskLayout.sidebarRowSelectionCornerRadius, style: .continuous)
            .fill(rowFill(isSelected: isSelected, isHovered: isHovered))
            .padding(.vertical, 2)
            .padding(.horizontal, 4)
    }

    private func rowFill(isSelected: Bool, isHovered: Bool) -> Color {
        if isSelected {
            return Color.primary.opacity(0.085)
        }
        if isHovered {
            return Color.primary.opacity(0.045)
        }
        return Color.clear
    }

    private var sidebarEmptyLibrary: some View {
        VStack(spacing: FlowDeskLayout.spaceL) {
            Spacer(minLength: 0)
            FlowDeskSheetsStackMark(size: 84)
            VStack(spacing: FlowDeskLayout.spaceS) {
                Text("No boards yet")
                    .font(FlowDeskTypography.sidebarEmptyTitle)
                    .foregroundStyle(.primary)
                Text("Create a board to begin. FlowDesk saves your work as you go—nothing to configure.")
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
