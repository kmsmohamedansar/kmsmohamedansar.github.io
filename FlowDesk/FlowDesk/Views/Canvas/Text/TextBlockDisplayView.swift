import SwiftUI

struct TextBlockDisplayView: View {
    let payload: TextBlockPayload

    var body: some View {
        let font = Font.system(size: CGFloat(payload.fontSize), weight: payload.isBold ? .semibold : .regular)

        Group {
            if payload.text.isEmpty {
                Text("Double-click to edit")
                    .font(font)
                    .foregroundStyle(.tertiary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: payload.alignment.frameAlignment)
            } else {
                Text(payload.text)
                    .font(font)
                    .foregroundStyle(payload.color.swiftUIColor)
                    .multilineTextAlignment(payload.alignment.multilineTextAlignment)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: payload.alignment.frameAlignment)
            }
        }
    }
}
