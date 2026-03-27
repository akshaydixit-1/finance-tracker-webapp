using Domain.Enums;

namespace Application.DTOs.Accounts;

public sealed record CreateAccountRequest(string Name, AccountType Type, decimal OpeningBalance, string? InstitutionName);
public sealed record UpdateAccountRequest(string Name, AccountType Type, string? InstitutionName);
public sealed record TransferFundsRequest(Guid SourceAccountId, Guid DestinationAccountId, decimal Amount, DateOnly TransferDate, string? Note);
public sealed record AccountResponse(Guid Id, string Name, AccountType Type, decimal OpeningBalance, decimal CurrentBalance, string? InstitutionName, DateTime CreatedAtUtc);
public sealed record InviteAccountMemberRequest(string Email, AccountMemberRole Role);
public sealed record UpdateAccountMemberRoleRequest(AccountMemberRole Role);
public sealed record AccountMemberResponse(Guid UserId, string Email, string DisplayName, AccountMemberRole Role);
public sealed record AccountActivityResponse(Guid Id, Guid ActorUserId, string Action, string EntityType, Guid EntityId, string? Metadata, DateTime CreatedAtUtc);
