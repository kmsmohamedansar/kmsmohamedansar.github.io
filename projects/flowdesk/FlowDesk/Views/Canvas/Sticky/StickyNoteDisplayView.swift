import SwiftUI

struct StickyNoteDisplayView: View {
    let payload: StickyNotePayload

    var body: some View {
        let font = Font.system(size: CGFloat(payload.fontSize), weight: payload.isBold ? .semibold : .regular)

        Group {
            if payload.text.isEmpty {
                Text("Double-click to add a note")
                    .font(font)
                    .foregroundStyle(.secondary.opacity(0.75))
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            } else {
                Text(payload.text)
                    .font(font)
                    .foregroundStyle(payload.textColor.swiftUIColor)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
        }
    }
}
