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

public sealed class AccountService(IAppDbContext dbContext, ICurrentUserService currentUserService) : IAccountService
{
    public async Task<IReadOnlyCollection<AccountResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        return await dbContext.Accounts.Where(x => x.UserId == userId)
            .OrderBy(x => x.Name)
            .Select(x => new AccountResponse(x.Id, x.Name, x.Type, x.OpeningBalance, x.CurrentBalance, x.InstitutionName, x.CreatedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<AccountResponse> CreateAsync(CreateAccountRequest request, CancellationToken cancellationToken)
    {
        var entity = new Account
        {
            UserId = currentUserService.GetUserId(),
            Name = request.Name.Trim(),
            Type = request.Type,
            OpeningBalance = request.OpeningBalance,
            CurrentBalance = request.OpeningBalance,
            InstitutionName = request.InstitutionName?.Trim()
        };

        await dbContext.AddAsync(entity, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task<AccountResponse> UpdateAsync(Guid id, UpdateAccountRequest request, CancellationToken cancellationToken)
    {
        var account = await FindOwnedAsync(id, cancellationToken);
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
        var account = await FindOwnedAsync(id, cancellationToken);
        var hasTransactions = await dbContext.Transactions.AnyAsync(x => x.UserId == account.UserId && (x.AccountId == id || x.DestinationAccountId == id), cancellationToken);
        if (hasTransactions)
        {
            throw new AppException("Cannot delete account because transactions are linked to it.");
        }

        var hasGoals = await dbContext.Goals.AnyAsync(x => x.UserId == account.UserId && x.LinkedAccountId == id, cancellationToken);
        if (hasGoals)
        {
            throw new AppException("Cannot delete account because one or more goals are linked to it.");
        }

        var hasRecurring = await dbContext.RecurringTransactions.AnyAsync(x => x.UserId == account.UserId && x.AccountId == id, cancellationToken);
        if (hasRecurring)
        {
            throw new AppException("Cannot delete account because recurring items are linked to it.");
        }

        dbContext.Remove(account);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
    public async Task TransferAsync(TransferFundsRequest request, CancellationToken cancellationToken)
    {
        if (request.Amount <= 0)
        {
            throw new AppException("Transfer amount must be greater than zero.");
        }

        var source = await FindOwnedAsync(request.SourceAccountId, cancellationToken);
        var destination = await FindOwnedAsync(request.DestinationAccountId, cancellationToken);
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
            UserId = source.UserId,
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
            UserId = source.UserId,
            AccountId = destination.Id,
            DestinationAccountId = source.Id,
            Type = TransactionType.Transfer,
            Amount = request.Amount,
            TransactionDate = request.TransferDate,
            Note = request.Note,
            TransferGroupId = transferGroupId,
            Merchant = $"Transfer from {source.Name}"
        }, cancellationToken);
        dbContext.Update(source);
        dbContext.Update(destination);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<Account> FindOwnedAsync(Guid id, CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        return await dbContext.Accounts.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, cancellationToken)
            ?? throw new AppException("Account not found.", StatusCodes.Status404NotFound);
    }

    private static AccountResponse Map(Account account) => new(account.Id, account.Name, account.Type, account.OpeningBalance, account.CurrentBalance, account.InstitutionName, account.CreatedAtUtc);
}


