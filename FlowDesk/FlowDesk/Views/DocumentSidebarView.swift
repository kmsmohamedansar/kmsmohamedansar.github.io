import SwiftUI

struct DocumentSidebarView: View {
    let documents: [FlowDocument]
    @Binding var selection: FlowDocument?
    var onNewBoard: () -> Void
    var onDelete: (IndexSet) -> Void
    var onRenameRequest: (FlowDocument) -> Void

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
                                    .font(.body)
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
                            .listRowInsets(EdgeInsets(top: 7, leading: 12, bottom: 7, trailing: 10))
                        }
                        .onDelete(perform: onDelete)
                    } header: {
                        Text("Boards")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.tertiary)
                            .textCase(nil)
                            .padding(.bottom, 2)
                    }
                }
                .listStyle(.sidebar)
            }
        }
        .safeAreaInset(edge: .bottom) {
            VStack(alignment: .leading, spacing: 0) {
                Divider()
                    .opacity(0.5)
                Button(action: onNewBoard) {
                    Label("New Board", systemImage: "plus.circle.fill")
                        .font(.body.weight(.medium))
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(.borderless)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
            }
            .background(.bar)
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button(action: onNewBoard) {
                    Image(systemName: "plus")
                }
                .help("New board")
            }
        }
    }

    private var sidebarEmptyLibrary: some View {
        ContentUnavailableView {
            Label("Your boards", systemImage: "rectangle.3.group")
        } description: {
            Text("Create a board to sketch, write, and arrange ideas on an infinite canvas.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        } actions: {
            Button("New Board", action: onNewBoard)
                .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, 8)
    }
}
