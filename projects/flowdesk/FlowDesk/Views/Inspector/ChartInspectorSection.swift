import SwiftUI

struct ChartInspectorSection: View {
    let elementID: UUID
    @Bindable var canvasViewModel: CanvasBoardViewModel

    private var chartPayload: ChartPayload? {
        guard let el = canvasViewModel.boardState.elements.first(where: { $0.id == elementID }),
              el.kind == .chart
        else { return nil }
        return el.resolvedChartPayload()
    }

    var body: some View {
        Group {
            if let chartPayload {
                Section {
                    Picker("Type", selection: kindBinding(fallback: chartPayload.kind)) {
                        ForEach(FlowDeskChartKind.allCases, id: \.self) { kind in
                            Text(kind.inspectorTitle).tag(kind)
                        }
                    }

                    TextField("Title", text: titleBinding(fallback: chartPayload.title))
                        .textFieldStyle(.roundedBorder)

                    Toggle("Show title", isOn: showTitleBinding(fallback: chartPayload.showTitle))
                } header: {
                    FlowDeskInspectorSectionHeader("Chart")
                }

                Section {
                    ForEach(0 ..< chartPayload.points.count, id: \.self) { index in
                        HStack(alignment: .firstTextBaseline, spacing: 8) {
                            TextField(
                                "Label",
                                text: labelBinding(index: index, fallback: rowLabel(at: index) ?? "")
                            )
                            .textFieldStyle(.roundedBorder)
                            .frame(minWidth: 72)

                            TextField(
                                "Value",
                                value: valueBinding(index: index, fallback: rowValue(at: index) ?? 0),
                                format: .number
                            )
                            .textFieldStyle(.roundedBorder)
                            .frame(width: 72)
                            .multilineTextAlignment(.trailing)

                            Button {
                                removeRow(at: index)
                            } label: {
                                Image(systemName: "minus.circle.fill")
                                    .symbolRenderingMode(.hierarchical)
                                    .foregroundStyle(.secondary)
                            }
                            .buttonStyle(.borderless)
                            .help("Remove row")
                            .disabled(chartPayload.points.count <= 1)
                        }
                    }

                    Button {
                        addRow()
                    } label: {
                        Label("Add row", systemImage: "plus.circle")
                    }
                } header: {
                    FlowDeskInspectorSectionHeader("Data")
                }
            }
        }
    }

    private func rowLabel(at index: Int) -> String? {
        canvasViewModel.boardState.elements.first { $0.id == elementID }?.resolvedChartPayload().points[safe: index]?.label
    }

    private func rowValue(at index: Int) -> Double? {
        canvasViewModel.boardState.elements.first { $0.id == elementID }?.resolvedChartPayload().points[safe: index]?.value
    }

    private func kindBinding(fallback: FlowDeskChartKind) -> Binding<FlowDeskChartKind> {
        Binding(
            get: {
                canvasViewModel.boardState.elements.first { $0.id == elementID }?.resolvedChartPayload().kind
                    ?? fallback
            },
            set: { newValue in
                canvasViewModel.updateChartPayload(id: elementID) { $0.kind = newValue }
            }
        )
    }

    private func titleBinding(fallback: String) -> Binding<String> {
        Binding(
            get: {
                canvasViewModel.boardState.elements.first { $0.id == elementID }?.resolvedChartPayload().title
                    ?? fallback
            },
            set: { newValue in
                canvasViewModel.updateChartPayload(id: elementID) { $0.title = newValue }
            }
        )
    }

    private func showTitleBinding(fallback: Bool) -> Binding<Bool> {
        Binding(
            get: {
                canvasViewModel.boardState.elements.first { $0.id == elementID }?.resolvedChartPayload().showTitle
                    ?? fallback
            },
            set: { newValue in
                canvasViewModel.updateChartPayload(id: elementID) { $0.showTitle = newValue }
            }
        )
    }

    private func labelBinding(index: Int, fallback: String) -> Binding<String> {
        Binding(
            get: {
                canvasViewModel.boardState.elements.first { $0.id == elementID }?.resolvedChartPayload().points[safe: index]?.label
                    ?? fallback
            },
            set: { newValue in
                canvasViewModel.updateChartPayload(id: elementID) { payload in
                    guard payload.points.indices.contains(index) else { return }
                    payload.points[index].label = newValue
                }
            }
        )
    }

    private func valueBinding(index: Int, fallback: Double) -> Binding<Double> {
        Binding(
            get: {
                canvasViewModel.boardState.elements.first { $0.id == elementID }?.resolvedChartPayload().points[safe: index]?.value
                    ?? fallback
            },
            set: { newValue in
                canvasViewModel.updateChartPayload(id: elementID) { payload in
                    guard payload.points.indices.contains(index) else { return }
                    payload.points[index].value = newValue
                }
            }
        )
    }

    private func addRow() {
        canvasViewModel.updateChartPayload(id: elementID) { payload in
            let n = payload.points.count + 1
            payload.points.append(ChartDataPoint(label: "Item \(n)", value: 0))
        }
    }

    private func removeRow(at index: Int) {
        canvasViewModel.updateChartPayload(id: elementID) { payload in
            guard payload.points.indices.contains(index), payload.points.count > 1 else { return }
            payload.points.remove(at: index)
        }
    }
}

private extension Array {
    subscript(safe index: Int) -> Element? {
        guard indices.contains(index) else { return nil }
        return self[index]
    }
}
