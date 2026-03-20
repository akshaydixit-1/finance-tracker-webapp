using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Application.Abstractions.Auth;
using Application.Abstractions.Persistence;
using Application.Abstractions.Services;
using Application.Common.Exceptions;
using Application.Common.Models;
using Application.DTOs.Transactions;
using Domain.Entities;
using Domain.Enums;

namespace Application.Services;

public sealed class TransactionService(IAppDbContext dbContext, ICurrentUserService currentUserService) : ITransactionService
{
    public async Task<PagedResult<TransactionResponse>> GetAsync(TransactionQueryRequest request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        var query = dbContext.Transactions.Where(x => x.UserId == userId);

        if (request.AccountId.HasValue) query = query.Where(x => x.AccountId == request.AccountId.Value);
        if (request.CategoryId.HasValue) query = query.Where(x => x.CategoryId == request.CategoryId.Value);
        if (request.Type.HasValue) query = query.Where(x => x.Type == request.Type.Value);
        if (request.From.HasValue) query = query.Where(x => x.TransactionDate >= request.From.Value);
        if (request.To.HasValue) query = query.Where(x => x.TransactionDate <= request.To.Value);
        if (request.MinAmount.HasValue) query = query.Where(x => x.Amount >= request.MinAmount.Value);
        if (request.MaxAmount.HasValue) query = query.Where(x => x.Amount <= request.MaxAmount.Value);
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(x => (x.Merchant ?? string.Empty).ToLower().Contains(search) || (x.Note ?? string.Empty).ToLower().Contains(search));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(x => x.TransactionDate).ThenByDescending(x => x.CreatedAtUtc)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(x => new TransactionResponse(x.Id, x.AccountId, x.DestinationAccountId, x.CategoryId, x.Type, x.Amount, x.TransactionDate, x.Merchant, x.Note, x.PaymentMethod, x.Tags, x.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        return new PagedResult<TransactionResponse>(items, request.Page, request.PageSize, totalCount);
    }

    public async Task<TransactionResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await FindOwnedAsync(id, cancellationToken);
        return Map(entity);
    }

    public async Task<TransactionResponse> CreateAsync(CreateTransactionRequest request, CancellationToken cancellationToken)
    {
        ValidateTransaction(request.Type, request.Amount, request.AccountId, request.DestinationAccountId, request.CategoryId);
        var account = await FindAccountAsync(request.AccountId, cancellationToken);
        Account? destination = null;
        if (request.DestinationAccountId.HasValue)
        {
            destination = await FindAccountAsync(request.DestinationAccountId.Value, cancellationToken);
        }

        var entity = new Transaction
        {
            UserId = currentUserService.GetUserId(),
            AccountId = request.AccountId,
            DestinationAccountId = request.DestinationAccountId,
            CategoryId = request.CategoryId,
            Type = request.Type,
            Amount = request.Amount,
            TransactionDate = request.Date,
            Merchant = request.Merchant?.Trim(),
            Note = request.Note?.Trim(),
            PaymentMethod = request.PaymentMethod?.Trim(),
            Tags = request.Tags?.Select(x => x.Trim()).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct().ToList() ?? new List<string>(),
            RecurringTransactionId = request.RecurringTransactionId
        };

        ApplyBalanceDelta(account, destination, entity, isReversal: false);
        await dbContext.AddAsync(entity, cancellationToken);
        dbContext.Update(account);
        if (destination is not null) dbContext.Update(destination);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task<TransactionResponse> UpdateAsync(Guid id, UpdateTransactionRequest request, CancellationToken cancellationToken)
    {
        ValidateTransaction(request.Type, request.Amount, request.AccountId, request.DestinationAccountId, request.CategoryId);
        var entity = await FindOwnedAsync(id, cancellationToken);
        var oldAccount = await FindAccountAsync(entity.AccountId, cancellationToken);
        Account? oldDestination = entity.DestinationAccountId.HasValue ? await FindAccountAsync(entity.DestinationAccountId.Value, cancellationToken) : null;
        ApplyBalanceDelta(oldAccount, oldDestination, entity, isReversal: true);

        entity.AccountId = request.AccountId;
        entity.DestinationAccountId = request.DestinationAccountId;
        entity.CategoryId = request.CategoryId;
        entity.Type = request.Type;
        entity.Amount = request.Amount;
        entity.TransactionDate = request.Date;
        entity.Merchant = request.Merchant?.Trim();
        entity.Note = request.Note?.Trim();
        entity.PaymentMethod = request.PaymentMethod?.Trim();
        entity.Tags = request.Tags?.Select(x => x.Trim()).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct().ToList() ?? new List<string>();
        entity.UpdatedAtUtc = DateTime.UtcNow;

        var newAccount = await FindAccountAsync(entity.AccountId, cancellationToken);
        Account? newDestination = entity.DestinationAccountId.HasValue ? await FindAccountAsync(entity.DestinationAccountId.Value, cancellationToken) : null;
        ApplyBalanceDelta(newAccount, newDestination, entity, isReversal: false);

        dbContext.Update(oldAccount);
        if (oldDestination is not null) dbContext.Update(oldDestination);
        dbContext.Update(newAccount);
        if (newDestination is not null) dbContext.Update(newDestination);
        dbContext.Update(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await FindOwnedAsync(id, cancellationToken);
        var account = await FindAccountAsync(entity.AccountId, cancellationToken);
        Account? destination = entity.DestinationAccountId.HasValue ? await FindAccountAsync(entity.DestinationAccountId.Value, cancellationToken) : null;
        ApplyBalanceDelta(account, destination, entity, isReversal: true);
        dbContext.Update(account);
        if (destination is not null) dbContext.Update(destination);
        dbContext.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private void ApplyBalanceDelta(Account source, Account? destination, Transaction transaction, bool isReversal)
    {
        var multiplier = isReversal ? -1 : 1;
        switch (transaction.Type)
        {
            case TransactionType.Income:
                source.CurrentBalance += transaction.Amount * multiplier;
                break;
            case TransactionType.Expense:
                source.CurrentBalance -= transaction.Amount * multiplier;
                break;
            case TransactionType.Transfer:
                if (destination is null)
                {
                    throw new AppException("Transfer requires destination account.");
                }
                source.CurrentBalance -= transaction.Amount * multiplier;
                destination.CurrentBalance += transaction.Amount * multiplier;
                break;
        }
    }

    private async Task<Transaction> FindOwnedAsync(Guid id, CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        return await dbContext.Transactions.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, cancellationToken)
            ?? throw new AppException("Transaction not found.", StatusCodes.Status404NotFound);
    }

    private async Task<Account> FindAccountAsync(Guid id, CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        return await dbContext.Accounts.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, cancellationToken)
            ?? throw new AppException("Account not found.", StatusCodes.Status404NotFound);
    }

    private static void ValidateTransaction(TransactionType type, decimal amount, Guid accountId, Guid? destinationAccountId, Guid? categoryId)
    {
        if (accountId == Guid.Empty) throw new AppException("Account is required.");
        if (amount <= 0) throw new AppException("Amount must be greater than zero.");
        if (type == TransactionType.Transfer && !destinationAccountId.HasValue) throw new AppException("Transfer requires destination account.");
        if (type != TransactionType.Transfer && !categoryId.HasValue) throw new AppException("Category is required.");
    }

    private static TransactionResponse Map(Transaction transaction) => new(transaction.Id, transaction.AccountId, transaction.DestinationAccountId, transaction.CategoryId, transaction.Type, transaction.Amount, transaction.TransactionDate, transaction.Merchant, transaction.Note, transaction.PaymentMethod, transaction.Tags, transaction.CreatedAtUtc);
}
