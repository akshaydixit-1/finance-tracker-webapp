using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Application.Abstractions.Auth;
using Application.Abstractions.Persistence;
using Application.Abstractions.Services;
using Application.Common.Exceptions;
using Application.DTOs.RecurringTransactions;
using Application.DTOs.Transactions;
using Domain.Entities;
using Domain.Enums;

namespace Application.Services;

public sealed class RecurringTransactionService(IAppDbContext dbContext, ICurrentUserService currentUserService, ITransactionService transactionService) : IRecurringTransactionService
{
    public async Task<IReadOnlyCollection<RecurringTransactionResponse>> GetAsync(CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        return await dbContext.RecurringTransactions.Where(x => x.UserId == userId)
            .OrderBy(x => x.NextRunDate)
            .Select(x => new RecurringTransactionResponse(x.Id, x.Title, x.Type, x.Amount, x.CategoryId, x.AccountId, x.Frequency, x.StartDate, x.EndDate, x.NextRunDate, x.AutoCreateTransaction, x.IsPaused))
            .ToListAsync(cancellationToken);
    }

    public async Task<RecurringTransactionResponse> CreateAsync(CreateRecurringTransactionRequest request, CancellationToken cancellationToken)
    {
        var entity = new RecurringTransaction
        {
            UserId = currentUserService.GetUserId(),
            Title = request.Title.Trim(),
            Type = request.Type,
            Amount = request.Amount,
            CategoryId = request.CategoryId,
            AccountId = request.AccountId,
            Frequency = request.Frequency,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            NextRunDate = request.StartDate,
            AutoCreateTransaction = request.AutoCreateTransaction
        };
        await dbContext.AddAsync(entity, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task<RecurringTransactionResponse> UpdateAsync(Guid id, UpdateRecurringTransactionRequest request, CancellationToken cancellationToken)
    {
        var entity = await FindOwnedAsync(id, cancellationToken);
        entity.Title = request.Title.Trim();
        entity.Amount = request.Amount;
        entity.CategoryId = request.CategoryId;
        entity.AccountId = request.AccountId;
        entity.Frequency = request.Frequency;
        entity.StartDate = request.StartDate;
        entity.EndDate = request.EndDate;
        entity.NextRunDate = request.NextRunDate;
        entity.AutoCreateTransaction = request.AutoCreateTransaction;
        entity.IsPaused = request.IsPaused;
        entity.UpdatedAtUtc = DateTime.UtcNow;
        dbContext.Update(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await FindOwnedAsync(id, cancellationToken);
        dbContext.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task ProcessDueItemsAsync(CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var items = await dbContext.RecurringTransactions.Where(x => !x.IsPaused && x.AutoCreateTransaction && x.NextRunDate <= today && (!x.EndDate.HasValue || x.EndDate >= today)).ToListAsync(cancellationToken);
        foreach (var item in items)
        {
            if (item.AccountId.HasValue)
            {
                await transactionService.CreateAsync(new CreateTransactionRequest(item.AccountId.Value, null, item.CategoryId, item.Type, item.Amount, item.NextRunDate, item.Title, $"Recurring: {item.Title}", null, Array.Empty<string>(), item.Id), cancellationToken);
            }
            item.NextRunDate = item.Frequency switch
            {
                RecurringFrequency.Daily => item.NextRunDate.AddDays(1),
                RecurringFrequency.Weekly => item.NextRunDate.AddDays(7),
                RecurringFrequency.Monthly => item.NextRunDate.AddMonths(1),
                RecurringFrequency.Yearly => item.NextRunDate.AddYears(1),
                _ => item.NextRunDate.AddMonths(1)
            };
            item.UpdatedAtUtc = DateTime.UtcNow;
            dbContext.Update(item);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task<RecurringTransaction> FindOwnedAsync(Guid id, CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        return await dbContext.RecurringTransactions.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, cancellationToken)
            ?? throw new AppException("Recurring transaction not found.", StatusCodes.Status404NotFound);
    }

    private static RecurringTransactionResponse Map(RecurringTransaction item) => new(item.Id, item.Title, item.Type, item.Amount, item.CategoryId, item.AccountId, item.Frequency, item.StartDate, item.EndDate, item.NextRunDate, item.AutoCreateTransaction, item.IsPaused);
}
