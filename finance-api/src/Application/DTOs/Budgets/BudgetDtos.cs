namespace Application.DTOs.Budgets;

public sealed record CreateBudgetRequest(Guid CategoryId, Guid? AccountId, int Month, int Year, decimal Amount, int AlertThresholdPercent);
public sealed record UpdateBudgetRequest(decimal Amount, int AlertThresholdPercent);
public sealed record BudgetResponse(Guid Id, Guid CategoryId, Guid? AccountId, string? AccountName, string CategoryName, decimal Amount, decimal ActualSpend, int Month, int Year, decimal UsagePercent, int AlertThresholdPercent);
