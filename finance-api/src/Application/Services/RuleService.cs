using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Application.Abstractions.Auth;
using Application.Abstractions.Persistence;
using Application.Abstractions.Services;
using Application.Common.Exceptions;
using Application.DTOs.Rules;
using Domain.Entities;

namespace Application.Services;

public sealed class RuleService(IAppDbContext dbContext, ICurrentUserService currentUserService) : IRuleService
{
    public async Task<IReadOnlyCollection<RuleResponse>> GetAsync(CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        return await dbContext.Rules
            .Where(x => x.UserId == userId)
            .OrderBy(x => x.Priority)
            .ThenBy(x => x.CreatedAtUtc)
            .Select(x => new RuleResponse(x.Id, x.ConditionField, x.ConditionOperator, x.ConditionValue, x.ActionType, x.ActionValue, x.Priority, x.IsActive, x.CreatedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<RuleResponse> CreateAsync(CreateRuleRequest request, CancellationToken cancellationToken)
    {
        Validate(request.ConditionValue, request.ActionValue, request.Priority);
        var entity = new Rule
        {
            UserId = currentUserService.GetUserId(),
            ConditionField = request.ConditionField,
            ConditionOperator = request.ConditionOperator,
            ConditionValue = request.ConditionValue.Trim(),
            ActionType = request.ActionType,
            ActionValue = request.ActionValue.Trim(),
            Priority = request.Priority,
            IsActive = request.IsActive
        };
        entity.ConditionJson = JsonSerializer.Serialize(new { field = entity.ConditionField.ToString(), @operator = entity.ConditionOperator.ToString(), value = entity.ConditionValue });
        entity.ActionJson = JsonSerializer.Serialize(new { type = entity.ActionType.ToString(), value = entity.ActionValue });

        await dbContext.AddAsync(entity, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task<RuleResponse> UpdateAsync(Guid id, UpdateRuleRequest request, CancellationToken cancellationToken)
    {
        Validate(request.ConditionValue, request.ActionValue, request.Priority);
        var entity = await FindOwnedAsync(id, cancellationToken);
        entity.ConditionField = request.ConditionField;
        entity.ConditionOperator = request.ConditionOperator;
        entity.ConditionValue = request.ConditionValue.Trim();
        entity.ActionType = request.ActionType;
        entity.ActionValue = request.ActionValue.Trim();
        entity.Priority = request.Priority;
        entity.IsActive = request.IsActive;
        entity.ConditionJson = JsonSerializer.Serialize(new { field = entity.ConditionField.ToString(), @operator = entity.ConditionOperator.ToString(), value = entity.ConditionValue });
        entity.ActionJson = JsonSerializer.Serialize(new { type = entity.ActionType.ToString(), value = entity.ActionValue });
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

    private async Task<Rule> FindOwnedAsync(Guid id, CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        return await dbContext.Rules.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, cancellationToken)
            ?? throw new AppException("Rule not found.", StatusCodes.Status404NotFound);
    }

    private static void Validate(string conditionValue, string actionValue, int priority)
    {
        if (string.IsNullOrWhiteSpace(conditionValue)) throw new AppException("Condition value is required.");
        if (string.IsNullOrWhiteSpace(actionValue)) throw new AppException("Action value is required.");
        if (priority < 0) throw new AppException("Priority must be zero or greater.");
    }

    private static RuleResponse Map(Rule x) => new(x.Id, x.ConditionField, x.ConditionOperator, x.ConditionValue, x.ActionType, x.ActionValue, x.Priority, x.IsActive, x.CreatedAtUtc);
}
