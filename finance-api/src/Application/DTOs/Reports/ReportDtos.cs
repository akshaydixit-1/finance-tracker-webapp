using Domain.Enums;

namespace Application.DTOs.Reports;

public sealed record ReportFilterRequest(DateOnly? From, DateOnly? To, Guid? AccountId, Guid? CategoryId, TransactionType? Type);
public sealed record CategorySpendReportItem(string Category, decimal TotalAmount);
public sealed record IncomeExpenseTrendItem(string Period, decimal Income, decimal Expense);
public sealed record AccountBalanceTrendItem(string Account, decimal Balance);
public sealed record CategoryTrendItem(string Period, string Category, decimal Amount);
public sealed record SavingsRateTrendReportItem(string Period, decimal SavingsRatePercent);
public sealed record NetWorthPoint(string Period, decimal NetWorth);
