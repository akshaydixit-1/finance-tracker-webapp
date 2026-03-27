using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Application.Abstractions.Auth;
using Application.Abstractions.Persistence;
using Application.Abstractions.Services;
using Application.Common.Exceptions;
using Application.DTOs.Budgets;
using Domain.Entities;
using Domain.Enums;

namespace Application.Services;

public sealed class BudgetService(
    IAppDbContext dbContext,
    ICurrentUserService currentUserService,
    IAccountAccessService accountAccessService) : IBudgetService
{
    public async Task<IReadOnlyCollection<BudgetResponse>> GetAsync(int month, int year, CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        var readableAccountIds = await accountAccessService.GetReadableAccountIdsAsync(userId, cancellationToken);
        var budgets = await dbContext.Budgets
            .Where(x => x.Month == month && x.Year == year)
            .Where(x => (x.AccountId.HasValue && readableAccountIds.Contains(x.AccountId.Value)) || (!x.AccountId.HasValue && x.UserId == userId))
            .ToListAsync(cancellationToken);

        var categories = await dbContext.Categories
            .Where(x => budgets.Select(b => b.CategoryId).Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, x => x.Name, cancellationToken);

        var accounts = await dbContext.Accounts
            .Where(x => readableAccountIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, x => x.Name, cancellationToken);

        var expenses = await dbContext.Transactions
            .Where(x =>
                x.Type == TransactionType.Expense &&
                x.TransactionDate.Month == month &&
                x.TransactionDate.Year == year &&
                readableAccountIds.Contains(x.AccountId))
            .ToListAsync(cancellationToken);

        return budgets.Select(budget =>
        {
            var actualSpend = expenses
                .Where(t => t.CategoryId == budget.CategoryId && (!budget.AccountId.HasValue || t.AccountId == budget.AccountId.Value))
                .Sum(t => t.Amount);

            var categoryName = categories.TryGetValue(budget.CategoryId, out var category) ? category : "Category";
            var accountName = budget.AccountId.HasValue && accounts.TryGetValue(budget.AccountId.Value, out var account) ? account : null;
            var usagePercent = budget.Amount == 0 ? 0 : (actualSpend / budget.Amount) * 100m;

            return new BudgetResponse(
                budget.Id,
                budget.CategoryId,
                budget.AccountId,
                accountName,
                categoryName,
                budget.Amount,
                actualSpend,
                budget.Month,
                budget.Year,
                usagePercent,
                budget.AlertThresholdPercent);
        }).ToList();
    }

    public async Task<BudgetResponse> CreateAsync(CreateBudgetRequest request, CancellationToken cancellationToken)
    {
        if (request.Amount <= 0) throw new AppException("Budget amount must be greater than zero.");
        var categoryExists = await dbContext.Categories.AnyAsync(x => x.Id == request.CategoryId, cancellationToken);
        if (!categoryExists) throw new AppException("Category not found.");
        if (request.AccountId.HasValue)
        {
            await accountAccessService.EnsureCanEditAccountAsync(currentUserService.GetUserId(), request.AccountId.Value, cancellationToken);
        }

        var userId = currentUserService.GetUserId();
        var exists = request.AccountId.HasValue
            ? await dbContext.Budgets.AnyAsync(
                x => x.AccountId == request.AccountId &&
                     x.CategoryId == request.CategoryId &&
                     x.Month == request.Month &&
                     x.Year == request.Year,
                cancellationToken)
            : await dbContext.Budgets.AnyAsync(
                x => x.UserId == userId &&
                     !x.AccountId.HasValue &&
                     x.CategoryId == request.CategoryId &&
                     x.Month == request.Month &&
                     x.Year == request.Year,
                cancellationToken);
        if (exists) throw new AppException("Only one budget per category/account/month is allowed.");

        var entity = new Budget
        {
            UserId = userId,
            CategoryId = request.CategoryId,
            AccountId = request.AccountId,
            Month = request.Month,
            Year = request.Year,
            Amount = request.Amount,
            AlertThresholdPercent = request.AlertThresholdPercent
        };

        await dbContext.AddAsync(entity, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await GetAsync(request.Month, request.Year, cancellationToken)).First(x => x.Id == entity.Id);
    }

    public async Task<BudgetResponse> UpdateAsync(Guid id, UpdateBudgetRequest request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        var entity = await dbContext.Budgets.FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new AppException("Budget not found.", StatusCodes.Status404NotFound);
        if (entity.AccountId.HasValue)
        {
            await accountAccessService.EnsureCanEditAccountAsync(userId, entity.AccountId.Value, cancellationToken);
        }
        else if (entity.UserId != userId)
        {
            throw new AppException("Budget not found.", StatusCodes.Status404NotFound);
        }

        entity.Amount = request.Amount;
        entity.AlertThresholdPercent = request.AlertThresholdPercent;
        entity.UpdatedAtUtc = DateTime.UtcNow;
        dbContext.Update(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await GetAsync(entity.Month, entity.Year, cancellationToken)).First(x => x.Id == entity.Id);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        var entity = await dbContext.Budgets.FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new AppException("Budget not found.", StatusCodes.Status404NotFound);
        if (entity.AccountId.HasValue)
        {
            await accountAccessService.EnsureCanEditAccountAsync(userId, entity.AccountId.Value, cancellationToken);
        }
        else if (entity.UserId != userId)
        {
            throw new AppException("Budget not found.", StatusCodes.Status404NotFound);
        }
        dbContext.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
