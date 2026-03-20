using Domain.Enums;

namespace Application.DTOs.RecurringTransactions;

public sealed record CreateRecurringTransactionRequest(string Title, TransactionType Type, decimal Amount, Guid? CategoryId, Guid? AccountId, RecurringFrequency Frequency, DateOnly StartDate, DateOnly? EndDate, bool AutoCreateTransaction);
public sealed record UpdateRecurringTransactionRequest(string Title, decimal Amount, Guid? CategoryId, Guid? AccountId, RecurringFrequency Frequency, DateOnly StartDate, DateOnly? EndDate, DateOnly NextRunDate, bool AutoCreateTransaction, bool IsPaused);
public sealed record RecurringTransactionResponse(Guid Id, string Title, TransactionType Type, decimal Amount, Guid? CategoryId, Guid? AccountId, RecurringFrequency Frequency, DateOnly StartDate, DateOnly? EndDate, DateOnly NextRunDate, bool AutoCreateTransaction, bool IsPaused);
