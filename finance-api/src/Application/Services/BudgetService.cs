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

public sealed class BudgetService(IAppDbContext dbContext, ICurrentUserService currentUserService) : IBudgetService
{
    public async Task<IReadOnlyCollection<BudgetResponse>> GetAsync(int month, int year, CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        var categories = dbContext.Categories.Where(x => x.UserId == userId);
        var spendQuery = dbContext.Transactions.Where(x => x.UserId == userId && x.Type == TransactionType.Expense && x.TransactionDate.Month == month && x.TransactionDate.Year == year)
            .GroupBy(x => x.CategoryId)
            .Select(x => new { CategoryId = x.Key, Total = x.Sum(v => v.Amount) });

        return await dbContext.Budgets.Where(x => x.UserId == userId && x.Month == month && x.Year == year)
            .Join(categories, b => b.CategoryId, c => c.Id, (b, c) => new { Budget = b, Category = c })
            .GroupJoin(spendQuery, x => x.Budget.CategoryId, y => y.CategoryId, (x, spend) => new { x.Budget, x.Category, Spend = spend.FirstOrDefault() })
            .Select(x => new BudgetResponse(x.Budget.Id, x.Budget.CategoryId, x.Category.Name, x.Budget.Amount, x.Spend != null ? x.Spend.Total : 0m, x.Budget.Month, x.Budget.Year, x.Budget.Amount == 0 ? 0 : ((x.Spend != null ? x.Spend.Total : 0m) / x.Budget.Amount) * 100m, x.Budget.AlertThresholdPercent))
            .ToListAsync(cancellationToken);
    }

    public async Task<BudgetResponse> CreateAsync(CreateBudgetRequest request, CancellationToken cancellationToken)
    {
        if (request.Amount <= 0) throw new AppException("Budget amount must be greater than zero.");
        var userId = currentUserService.GetUserId();
        var exists = await dbContext.Budgets.AnyAsync(x => x.UserId == userId && x.CategoryId == request.CategoryId && x.Month == request.Month && x.Year == request.Year, cancellationToken);
        if (exists) throw new AppException("Only one budget per category per month is allowed.");

        var entity = new Budget
        {
            UserId = userId,
            CategoryId = request.CategoryId,
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
        var entity = await dbContext.Budgets.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, cancellationToken)
            ?? throw new AppException("Budget not found.", StatusCodes.Status404NotFound);
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
        var entity = await dbContext.Budgets.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, cancellationToken)
            ?? throw new AppException("Budget not found.", StatusCodes.Status404NotFound);
        dbContext.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
