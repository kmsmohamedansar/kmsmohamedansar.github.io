import Charts
import SwiftUI

/// Swift Charts rendering inside the chart block card (bar / line v1).
struct ChartBlockChartView: View {
    @Environment(\.flowDeskTokens) private var tokens

    let payload: ChartPayload

    private var chartAccent: Color {
        tokens.selectionStrokeColor.opacity(0.72)
    }

    var body: some View {
        Group {
            if payload.points.isEmpty {
                emptyState
            } else {
                chartContent
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
    }

    private var emptyState: some View {
        VStack(spacing: FlowDeskLayout.spaceM) {
            ZStack {
                Circle()
                    .fill(Color.primary.opacity(0.05))
                    .frame(width: 48, height: 48)
                Image(systemName: "chart.xyaxis.line")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundStyle(.tertiary)
            }
            VStack(spacing: FlowDeskLayout.spaceXS) {
                Text("No data in this chart")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
                Text("Add rows in the inspector")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
        }
        .multilineTextAlignment(.center)
        .padding(.vertical, FlowDeskLayout.homeCreationCardInnerSpacing)
        .padding(.horizontal, FlowDeskLayout.spaceM)
        .frame(maxWidth: .infinity)
    }

    private var chartContent: some View {
        Chart {
            ForEach(Array(payload.points.enumerated()), id: \.offset) { _, point in
                switch payload.kind {
                case .bar:
                    BarMark(
                        x: .value("Label", point.label),
                        y: .value("Value", point.value)
                    )
                    .foregroundStyle(chartAccent)
                    .cornerRadius(FlowDeskLayout.chartBarMarkCornerRadius)
                case .line:
                    LineMark(
                        x: .value("Label", point.label),
                        y: .value("Value", point.value)
                    )
                    .foregroundStyle(chartAccent)
                    .interpolationMethod(.catmullRom)
                    PointMark(
                        x: .value("Label", point.label),
                        y: .value("Value", point.value)
                    )
                    .foregroundStyle(chartAccent)
                }
            }
        }
        .chartXAxis {
            AxisMarks { value in
                AxisValueLabel {
                    if let s = value.as(String.self) {
                        Text(s)
                            .font(.caption2)
                    }
                }
            }
        }
        .chartYAxis {
            AxisMarks(position: .leading) { value in
                AxisGridLine()
                AxisValueLabel {
                    if let n = value.as(Double.self) {
                        Text(n, format: .number.precision(.fractionLength(0...1)))
                            .font(.caption2)
                    }
                }
            }
        }
    }
}
