using Domain.Enums;

namespace Application.DTOs.Transactions;

public sealed record TransactionQueryRequest(
    int Page = 1,
    int PageSize = 20,
    Guid? AccountId = null,
    Guid? CategoryId = null,
    TransactionType? Type = null,
    DateOnly? From = null,
    DateOnly? To = null,
    string? Search = null,
    decimal? MinAmount = null,
    decimal? MaxAmount = null);

public sealed record CreateTransactionRequest(
    Guid AccountId,
    Guid? DestinationAccountId,
    Guid? CategoryId,
    TransactionType Type,
    decimal Amount,
    DateOnly Date,
    string? Merchant,
    string? Note,
    string? PaymentMethod,
    IReadOnlyCollection<string>? Tags,
    Guid? RecurringTransactionId);

public sealed record UpdateTransactionRequest(
    Guid AccountId,
    Guid? DestinationAccountId,
    Guid? CategoryId,
    TransactionType Type,
    decimal Amount,
    DateOnly Date,
    string? Merchant,
    string? Note,
    string? PaymentMethod,
    IReadOnlyCollection<string>? Tags);

public sealed record TransactionResponse(
    Guid Id,
    Guid AccountId,
    Guid? DestinationAccountId,
    Guid? CategoryId,
    TransactionType Type,
    decimal Amount,
    DateOnly Date,
    string? Merchant,
    string? Note,
    string? PaymentMethod,
    IReadOnlyCollection<string> Tags,
    DateTime CreatedAtUtc);
