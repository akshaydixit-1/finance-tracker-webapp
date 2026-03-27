using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Application.Abstractions.Auth;
using Application.Abstractions.Persistence;
using Application.Abstractions.Services;
using Application.Common.Exceptions;
using Application.DTOs.Accounts;
using Domain.Entities;
using Domain.Enums;

namespace Application.Services;

public sealed class AccountService(
    IAppDbContext dbContext,
    ICurrentUserService currentUserService,
    IAccountAccessService accountAccessService) : IAccountService
{
    public async Task<IReadOnlyCollection<AccountResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        var accountIds = await accountAccessService.GetReadableAccountIdsAsync(userId, cancellationToken);
        return await dbContext.Accounts.Where(x => accountIds.Contains(x.Id))
            .OrderBy(x => x.Name)
            .Select(x => new AccountResponse(x.Id, x.Name, x.Type, x.OpeningBalance, x.CurrentBalance, x.InstitutionName, x.CreatedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<AccountResponse> CreateAsync(CreateAccountRequest request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        var entity = new Account
        {
            UserId = userId,
            Name = request.Name.Trim(),
            Type = request.Type,
            OpeningBalance = request.OpeningBalance,
            CurrentBalance = request.OpeningBalance,
            InstitutionName = request.InstitutionName?.Trim()
        };

        await dbContext.AddAsync(entity, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        await dbContext.AddAsync(new AccountMember
        {
            AccountId = entity.Id,
            UserId = userId,
            Role = AccountMemberRole.Owner
        }, cancellationToken);
        await dbContext.AddAsync(new AccountActivity
        {
            AccountId = entity.Id,
            ActorUserId = userId,
            Action = "account_created",
            EntityType = nameof(Account),
            EntityId = entity.Id,
            Metadata = entity.Name
        }, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task<AccountResponse> UpdateAsync(Guid id, UpdateAccountRequest request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        await accountAccessService.EnsureCanManageMembersAsync(userId, id, cancellationToken);
        var account = await FindReadableAsync(id, cancellationToken);
        account.Name = request.Name.Trim();
        account.Type = request.Type;
        account.InstitutionName = request.InstitutionName?.Trim();
        account.UpdatedAtUtc = DateTime.UtcNow;
        dbContext.Update(account);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Map(account);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        await accountAccessService.EnsureCanManageMembersAsync(userId, id, cancellationToken);
        var account = await FindReadableAsync(id, cancellationToken);
        var hasTransactions = await dbContext.Transactions.AnyAsync(x => x.AccountId == id || x.DestinationAccountId == id, cancellationToken);
        if (hasTransactions)
        {
            throw new AppException("Cannot delete account because transactions are linked to it.");
        }

        var hasGoals = await dbContext.Goals.AnyAsync(x => x.LinkedAccountId == id, cancellationToken);
        if (hasGoals)
        {
            throw new AppException("Cannot delete account because one or more goals are linked to it.");
        }

        var hasRecurring = await dbContext.RecurringTransactions.AnyAsync(x => x.AccountId == id, cancellationToken);
        if (hasRecurring)
        {
            throw new AppException("Cannot delete account because recurring items are linked to it.");
        }

        var members = await dbContext.AccountMembers.Where(x => x.AccountId == id).ToListAsync(cancellationToken);
        foreach (var member in members) dbContext.Remove(member);
        dbContext.Remove(account);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task TransferAsync(TransferFundsRequest request, CancellationToken cancellationToken)
    {
        if (request.Amount <= 0)
        {
            throw new AppException("Transfer amount must be greater than zero.");
        }

        var userId = currentUserService.GetUserId();
        await accountAccessService.EnsureCanEditAccountAsync(userId, request.SourceAccountId, cancellationToken);
        await accountAccessService.EnsureCanEditAccountAsync(userId, request.DestinationAccountId, cancellationToken);
        var source = await FindReadableAsync(request.SourceAccountId, cancellationToken);
        var destination = await FindReadableAsync(request.DestinationAccountId, cancellationToken);
        if (source.Id == destination.Id)
        {
            throw new AppException("Transfer requires different accounts.");
        }

        if (source.CurrentBalance < request.Amount)
        {
            throw new AppException("Insufficient balance for transfer.");
        }

        source.CurrentBalance -= request.Amount;
        destination.CurrentBalance += request.Amount;
        var transferGroupId = Guid.NewGuid();
        await dbContext.AddAsync(new Transaction
        {
            UserId = userId,
            AccountId = source.Id,
            DestinationAccountId = destination.Id,
            Type = TransactionType.Transfer,
            Amount = request.Amount,
            TransactionDate = request.TransferDate,
            Note = request.Note,
            TransferGroupId = transferGroupId,
            Merchant = $"Transfer to {destination.Name}"
        }, cancellationToken);
        await dbContext.AddAsync(new Transaction
        {
            UserId = userId,
            AccountId = destination.Id,
            DestinationAccountId = source.Id,
            Type = TransactionType.Transfer,
            Amount = request.Amount,
            TransactionDate = request.TransferDate,
            Note = request.Note,
            TransferGroupId = transferGroupId,
            Merchant = $"Transfer from {source.Name}"
        }, cancellationToken);
        await AddActivityAsync(source.Id, userId, "transfer_created", nameof(Transaction), transferGroupId, request.Note, cancellationToken);
        dbContext.Update(source);
        dbContext.Update(destination);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<AccountMemberResponse>> GetMembersAsync(Guid accountId, CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        await accountAccessService.EnsureCanReadAccountAsync(userId, accountId, cancellationToken);
        return await dbContext.AccountMembers
            .Where(x => x.AccountId == accountId)
            .Join(dbContext.Users, m => m.UserId, u => u.Id, (m, u) => new AccountMemberResponse(u.Id, u.Email, u.DisplayName, m.Role))
            .OrderBy(x => x.DisplayName)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<AccountActivityResponse>> GetActivityAsync(Guid accountId, CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        await accountAccessService.EnsureCanReadAccountAsync(userId, accountId, cancellationToken);
        return await dbContext.AccountActivities
            .Where(x => x.AccountId == accountId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(50)
            .Select(x => new AccountActivityResponse(x.Id, x.ActorUserId, x.Action, x.EntityType, x.EntityId, x.Metadata, x.CreatedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task InviteMemberAsync(Guid accountId, InviteAccountMemberRequest request, CancellationToken cancellationToken)
    {
        var ownerUserId = currentUserService.GetUserId();
        await accountAccessService.EnsureCanManageMembersAsync(ownerUserId, accountId, cancellationToken);
        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Email.ToLower() == request.Email.Trim().ToLower(), cancellationToken)
            ?? throw new AppException("User with this email was not found.", StatusCodes.Status404NotFound);

        if (request.Role == AccountMemberRole.Owner)
        {
            throw new AppException("Invited users cannot be assigned Owner role.");
        }

        var existing = await dbContext.AccountMembers.FirstOrDefaultAsync(x => x.AccountId == accountId && x.UserId == user.Id, cancellationToken);
        if (existing is not null)
        {
            existing.Role = request.Role;
            existing.UpdatedAtUtc = DateTime.UtcNow;
            dbContext.Update(existing);
        }
        else
        {
            await dbContext.AddAsync(new AccountMember
            {
                AccountId = accountId,
                UserId = user.Id,
                Role = request.Role
            }, cancellationToken);
        }

        await AddActivityAsync(accountId, ownerUserId, "member_invited", nameof(AccountMember), user.Id, $"{user.Email}:{request.Role}", cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateMemberRoleAsync(Guid accountId, Guid memberUserId, UpdateAccountMemberRoleRequest request, CancellationToken cancellationToken)
    {
        var ownerUserId = currentUserService.GetUserId();
        await accountAccessService.EnsureCanManageMembersAsync(ownerUserId, accountId, cancellationToken);
        if (request.Role == AccountMemberRole.Owner)
        {
            throw new AppException("Owner role cannot be assigned via member update.");
        }

        var member = await dbContext.AccountMembers.FirstOrDefaultAsync(x => x.AccountId == accountId && x.UserId == memberUserId, cancellationToken)
            ?? throw new AppException("Member not found.", StatusCodes.Status404NotFound);

        if (member.Role == AccountMemberRole.Owner)
        {
            throw new AppException("Owner role cannot be changed.");
        }

        member.Role = request.Role;
        member.UpdatedAtUtc = DateTime.UtcNow;
        dbContext.Update(member);
        await AddActivityAsync(accountId, ownerUserId, "member_role_updated", nameof(AccountMember), memberUserId, request.Role.ToString(), cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<Account> FindReadableAsync(Guid id, CancellationToken cancellationToken)
    {
        var account = await dbContext.Accounts.FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new AppException("Account not found.", StatusCodes.Status404NotFound);
        return account;
    }

    private async Task AddActivityAsync(Guid accountId, Guid actorUserId, string action, string entityType, Guid entityId, string? metadata, CancellationToken cancellationToken)
    {
        await dbContext.AddAsync(new AccountActivity
        {
            AccountId = accountId,
            ActorUserId = actorUserId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Metadata = metadata
        }, cancellationToken);
    }

    private static AccountResponse Map(Account account) => new(account.Id, account.Name, account.Type, account.OpeningBalance, account.CurrentBalance, account.InstitutionName, account.CreatedAtUtc);
}
