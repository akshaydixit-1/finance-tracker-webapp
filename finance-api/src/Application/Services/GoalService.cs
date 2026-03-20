using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Application.Abstractions.Auth;
using Application.Abstractions.Persistence;
using Application.Abstractions.Services;
using Application.Common.Exceptions;
using Application.DTOs.Goals;
using Domain.Entities;
using Domain.Enums;

namespace Application.Services;

public sealed class GoalService(IAppDbContext dbContext, ICurrentUserService currentUserService) : IGoalService
{
    public async Task<IReadOnlyCollection<GoalResponse>> GetAsync(CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        return await dbContext.Goals.Where(x => x.UserId == userId)
            .OrderBy(x => x.TargetDate)
            .Select(x => new GoalResponse(x.Id, x.Name, x.TargetAmount, x.CurrentAmount, x.TargetDate, x.LinkedAccountId, x.Icon, x.Color, x.Status, x.TargetAmount == 0 ? 0 : (x.CurrentAmount / x.TargetAmount) * 100m))
            .ToListAsync(cancellationToken);
    }

    public async Task<GoalResponse> CreateAsync(CreateGoalRequest request, CancellationToken cancellationToken)
    {
        if (request.TargetAmount <= 0) throw new AppException("Goal target amount must be greater than zero.");

        var userId = currentUserService.GetUserId();
        var normalizedName = request.Name.Trim();
        var duplicateExists = await dbContext.Goals.AnyAsync(
            x => x.UserId == userId && x.Name.ToLower() == normalizedName.ToLower(),
            cancellationToken);

        if (duplicateExists)
        {
            throw new AppException("A goal with the same name already exists.");
        }

        var entity = new Goal
        {
            UserId = userId,
            Name = normalizedName,
            TargetAmount = request.TargetAmount,
            TargetDate = request.TargetDate,
            LinkedAccountId = request.LinkedAccountId,
            Icon = request.Icon,
            Color = request.Color
        };
        await dbContext.AddAsync(entity, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task<GoalResponse> UpdateAsync(Guid id, UpdateGoalRequest request, CancellationToken cancellationToken)
    {
        var entity = await FindOwnedAsync(id, cancellationToken);
        var normalizedName = request.Name.Trim();
        var duplicateExists = await dbContext.Goals.AnyAsync(
            x => x.UserId == entity.UserId && x.Id != id && x.Name.ToLower() == normalizedName.ToLower(),
            cancellationToken);

        if (duplicateExists)
        {
            throw new AppException("A goal with the same name already exists.");
        }

        entity.Name = normalizedName;
        entity.TargetAmount = request.TargetAmount;
        entity.TargetDate = request.TargetDate;
        entity.LinkedAccountId = request.LinkedAccountId;
        entity.Icon = request.Icon;
        entity.Color = request.Color;
        entity.Status = request.Status;
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
    public async Task<GoalResponse> ContributeAsync(Guid id, GoalContributionRequest request, CancellationToken cancellationToken)
    {
        if (request.Amount <= 0) throw new AppException("Contribution amount must be greater than zero.");
        var entity = await FindOwnedAsync(id, cancellationToken);
        entity.CurrentAmount += request.Amount;
        if (entity.CurrentAmount >= entity.TargetAmount) entity.Status = GoalStatus.Completed;
        await CreateGoalTransactionAsync(entity, request, TransactionType.Expense, $"Goal contribution: {entity.Name}", cancellationToken);
        dbContext.Update(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task<GoalResponse> WithdrawAsync(Guid id, GoalContributionRequest request, CancellationToken cancellationToken)
    {
        if (request.Amount <= 0) throw new AppException("Withdraw amount must be greater than zero.");
        var entity = await FindOwnedAsync(id, cancellationToken);
        if (entity.CurrentAmount < request.Amount) throw new AppException("Insufficient goal balance.");
        entity.CurrentAmount -= request.Amount;
        if (entity.Status == GoalStatus.Completed && entity.CurrentAmount < entity.TargetAmount) entity.Status = GoalStatus.Active;
        await CreateGoalTransactionAsync(entity, request, TransactionType.Income, $"Goal withdrawal: {entity.Name}", cancellationToken);
        dbContext.Update(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    private async Task CreateGoalTransactionAsync(Goal goal, GoalContributionRequest request, TransactionType type, string note, CancellationToken cancellationToken)
    {
        if (!request.SourceAccountId.HasValue) return;
        var account = await dbContext.Accounts.FirstOrDefaultAsync(x => x.Id == request.SourceAccountId.Value && x.UserId == goal.UserId, cancellationToken)
            ?? throw new AppException("Source account not found.");
        if (type == TransactionType.Expense && account.CurrentBalance < request.Amount)
        {
            throw new AppException("Contribution cannot exceed available account balance.");
        }
        account.CurrentBalance += type == TransactionType.Income ? request.Amount : -request.Amount;
        dbContext.Update(account);
        await dbContext.AddAsync(new Transaction
        {
            UserId = goal.UserId,
            AccountId = account.Id,
            Type = type,
            Amount = request.Amount,
            TransactionDate = request.Date,
            Merchant = goal.Name,
            Note = string.IsNullOrWhiteSpace(request.Note) ? note : request.Note,
            Tags = new List<string> { "goal" }
        }, cancellationToken);
    }

    private async Task<Goal> FindOwnedAsync(Guid id, CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        return await dbContext.Goals.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, cancellationToken)
            ?? throw new AppException("Goal not found.", StatusCodes.Status404NotFound);
    }

    private static GoalResponse Map(Goal goal)
    {
        var progress = goal.TargetAmount == 0 ? 0 : (goal.CurrentAmount / goal.TargetAmount) * 100m;
        return new GoalResponse(goal.Id, goal.Name, goal.TargetAmount, goal.CurrentAmount, goal.TargetDate, goal.LinkedAccountId, goal.Icon, goal.Color, goal.Status, progress);
    }
}

