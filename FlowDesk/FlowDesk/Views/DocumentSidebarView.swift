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
                                    .foregroundStyle(.secondary)
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
                                    isSelected: selection?.id == document.id,
                                    isHovered: hoveredDocumentID == document.id
                                )
                            )
                            .onHover { inside in
                                hoveredDocumentID = inside ? document.id : nil
                            }
                        }
                        .onDelete(perform: onDelete)
                    } header: {
                        Text("Canvases")
                            .font(FlowDeskTypography.sidebarSectionHeader)
                            .foregroundStyle(.tertiary)
                            .textCase(nil)
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
                    .opacity(0.45)
                Button(action: onNewBoard) {
                    Label("New canvas", systemImage: "plus.circle.fill")
                        .font(.body.weight(.medium))
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
                .help("New smart canvas")
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
            return Color.primary.opacity(0.11)
        }
        if isHovered {
            return Color.primary.opacity(0.055)
        }
        return Color.clear
    }

    private var sidebarEmptyLibrary: some View {
        ContentUnavailableView {
            Label("Your canvases", systemImage: "rectangle.3.group")
        } description: {
            Text("Create a smart canvas to capture notes, sketches, and layout in one place.")
                .multilineTextAlignment(.center)
                .font(FlowDeskTypography.sectionCaption)
                .foregroundStyle(.secondary)
        } actions: {
            Button("New canvas", action: onNewBoard)
                .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, FlowDeskLayout.sidebarEmptyHorizontalPadding)
    }
}
