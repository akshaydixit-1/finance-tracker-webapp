using Domain.Enums;

namespace Application.DTOs.Reports;

public sealed record ReportFilterRequest(DateOnly? From, DateOnly? To, Guid? AccountId, Guid? CategoryId, TransactionType? Type);
public sealed record CategorySpendReportItem(string Category, decimal TotalAmount);
public sealed record IncomeExpenseTrendItem(string Period, decimal Income, decimal Expense);
public sealed record AccountBalanceTrendItem(string Account, decimal Balance);
