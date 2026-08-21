import Foundation

/// High-level chart family for canvas blocks. Add cases (e.g. `pie`, `area`) without changing `CanvasElementKind`.
enum FlowDeskChartKind: String, Codable, CaseIterable, Hashable, Sendable {
    case bar
    case line

    var inspectorTitle: String {
        switch self {
        case .bar: "Bar"
        case .line: "Line"
        }
    }
}

struct ChartDataPoint: Codable, Equatable, Sendable {
    var label: String
    var value: Double
}

struct ChartPayload: Codable, Equatable, Sendable {
    var kind: FlowDeskChartKind
    var title: String
    /// When false, title area is hidden (chart still uses full card body).
    var showTitle: Bool
    var points: [ChartDataPoint]

    static let `default` = ChartPayload(
        kind: .bar,
        title: "",
        showTitle: true,
        points: []
    )

    /// Default series for newly inserted chart blocks.
    static let sampleStarterPoints: [ChartDataPoint] = [
        ChartDataPoint(label: "Q1", value: 12),
        ChartDataPoint(label: "Q2", value: 19),
        ChartDataPoint(label: "Q3", value: 15),
        ChartDataPoint(label: "Q4", value: 24),
    ]
}
