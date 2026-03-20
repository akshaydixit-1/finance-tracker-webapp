namespace Application.DTOs.Dashboard;

public sealed record DashboardSummaryCard(string Label, decimal Value, string Accent);
public sealed record BudgetProgressItem(Guid Id, string Category, decimal BudgetAmount, decimal ActualAmount, decimal UsagePercent);
public sealed record UpcomingRecurringItem(Guid Id, string Title, decimal Amount, DateOnly NextRunDate);
public sealed record DashboardResponse(
    IReadOnlyCollection<DashboardSummaryCard> SummaryCards,
    IReadOnlyCollection<BudgetProgressItem> BudgetProgress,
    IReadOnlyCollection<CategorySpendChartItem> CategorySpend,
    IReadOnlyCollection<TrendChartItem> IncomeVsExpense,
    IReadOnlyCollection<RecentTransactionItem> RecentTransactions,
    IReadOnlyCollection<UpcomingRecurringItem> UpcomingRecurring,
    IReadOnlyCollection<GoalProgressItem> Goals);
public sealed record CategorySpendChartItem(string Category, decimal Amount);
public sealed record TrendChartItem(string Period, decimal Income, decimal Expense);
public sealed record RecentTransactionItem(Guid Id, string Merchant, decimal Amount, string Type, DateOnly Date);
public sealed record GoalProgressItem(Guid Id, string Name, decimal CurrentAmount, decimal TargetAmount, decimal ProgressPercent);
