namespace Application.DTOs.Insights;

public sealed record HealthScoreFactor(string Name, decimal Score, string Description);
public sealed record HealthScoreResponse(decimal Score, IReadOnlyCollection<HealthScoreFactor> Breakdown, IReadOnlyCollection<string> Suggestions);

public sealed record InsightItem(string Title, string Message, string Severity);
public sealed record InsightsResponse(
    IReadOnlyCollection<InsightItem> Highlights,
    IReadOnlyCollection<SavingsRateTrendPoint> SavingsRateTrend);

public sealed record SavingsRateTrendPoint(string Period, decimal SavingsRatePercent);
