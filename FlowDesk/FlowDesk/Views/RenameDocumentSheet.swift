import SwiftUI

struct RenameDocumentSheet: View {
    @Binding var title: String
    var onCancel: () -> Void
    var onSave: () -> Void

    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Rename Board")
                .font(.title3.weight(.semibold))

            TextField("Title", text: $title)
                .textFieldStyle(.roundedBorder)
                .focused($focused, equals: true)

            HStack {
                Spacer()
                Button("Cancel", role: .cancel, action: onCancel)
                    .keyboardShortcut(.cancelAction)
                Button("Save", action: onSave)
                    .keyboardShortcut(.defaultAction)
                    .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .padding(FlowDeskLayout.sheetStandardPadding)
        .frame(minWidth: 360)
        .onAppear { focused = true }
    }
}
