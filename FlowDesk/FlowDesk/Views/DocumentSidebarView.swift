import SwiftUI

struct DocumentSidebarView: View {
    let documents: [FlowDocument]
    @Binding var selection: FlowDocument?
    var onNewBoard: () -> Void
    var onDelete: (IndexSet) -> Void
    var onRenameRequest: (FlowDocument) -> Void

    var body: some View {
        List(selection: $selection) {
            Section {
                ForEach(documents, id: \.persistentModelID) { document in
                    Label(document.title, systemImage: "square.grid.3x3.fill")
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
                }
                .onDelete(perform: onDelete)
            } header: {
                Text("Boards")
            }
        }
        .listStyle(.sidebar)
        .safeAreaInset(edge: .bottom) {
            VStack(alignment: .leading, spacing: 8) {
                Divider()
                Button(action: onNewBoard) {
                    Label("New Board", systemImage: "plus.circle.fill")
                }
                .buttonStyle(.borderless)
                .padding(.horizontal, 12)
                .padding(.bottom, 8)
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
}
