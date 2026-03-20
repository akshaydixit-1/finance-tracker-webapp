using Domain.Enums;

namespace Application.DTOs.Accounts;

public sealed record CreateAccountRequest(string Name, AccountType Type, decimal OpeningBalance, string? InstitutionName);
public sealed record UpdateAccountRequest(string Name, AccountType Type, string? InstitutionName);
public sealed record TransferFundsRequest(Guid SourceAccountId, Guid DestinationAccountId, decimal Amount, DateOnly TransferDate, string? Note);
public sealed record AccountResponse(Guid Id, string Name, AccountType Type, decimal OpeningBalance, decimal CurrentBalance, string? InstitutionName, DateTime CreatedAtUtc);
