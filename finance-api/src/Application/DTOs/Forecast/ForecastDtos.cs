namespace Application.DTOs.Forecast;

public sealed record ForecastMonthResponse(
    decimal CurrentBalance,
    decimal ForecastedEndOfMonthBalance,
    decimal UpcomingKnownExpenses,
    decimal UpcomingKnownIncome,
    decimal SafeToSpendAmount,
    IReadOnlyCollection<string> RiskWarnings);

public sealed record ForecastDailyPoint(DateOnly Date, decimal ProjectedBalance, decimal KnownExpense, decimal KnownIncome);
