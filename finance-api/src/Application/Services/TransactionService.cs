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

public sealed class TransactionService(
    IAppDbContext dbContext,
    ICurrentUserService currentUserService,
    IAccountAccessService accountAccessService) : ITransactionService
{
    public async Task<PagedResult<TransactionResponse>> GetAsync(TransactionQueryRequest request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        var readableAccountIds = await accountAccessService.GetReadableAccountIdsAsync(userId, cancellationToken);
        var query = dbContext.Transactions.Where(x => readableAccountIds.Contains(x.AccountId));

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
            .Select(x => new TransactionResponse(x.Id, x.AccountId, x.DestinationAccountId, x.CategoryId, x.Type, x.Amount, x.TransactionDate, x.Merchant, x.Note, x.PaymentMethod, x.Tags, x.RuleAlerts, x.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        return new PagedResult<TransactionResponse>(items, request.Page, request.PageSize, totalCount);
    }

    public async Task<TransactionResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await FindReadableAsync(id, cancellationToken);
        return Map(entity);
    }

    public async Task<TransactionResponse> CreateAsync(CreateTransactionRequest request, CancellationToken cancellationToken)
    {
        ValidateTransaction(request.Type, request.Amount, request.AccountId, request.DestinationAccountId, request.CategoryId);
        var userId = currentUserService.GetUserId();
        await accountAccessService.EnsureCanEditAccountAsync(userId, request.AccountId, cancellationToken);
        var account = await FindAccountAsync(request.AccountId, cancellationToken);
        Account? destination = null;
        if (request.DestinationAccountId.HasValue)
        {
            await accountAccessService.EnsureCanEditAccountAsync(userId, request.DestinationAccountId.Value, cancellationToken);
            destination = await FindAccountAsync(request.DestinationAccountId.Value, cancellationToken);
        }

        var ruleContext = await ApplyRulesAsync(request, cancellationToken);
        var entity = new Transaction
        {
            UserId = userId,
            AccountId = request.AccountId,
            DestinationAccountId = request.DestinationAccountId,
            CategoryId = ruleContext.CategoryId ?? request.CategoryId,
            Type = request.Type,
            Amount = request.Amount,
            TransactionDate = request.Date,
            Merchant = request.Merchant?.Trim(),
            Note = request.Note?.Trim(),
            PaymentMethod = request.PaymentMethod?.Trim(),
            Tags = ruleContext.Tags,
            RuleAlerts = ruleContext.Alerts,
            RecurringTransactionId = request.RecurringTransactionId
        };

        ApplyBalanceDelta(account, destination, entity, isReversal: false);
        await dbContext.AddAsync(entity, cancellationToken);
        await dbContext.AddAsync(new AccountActivity
        {
            AccountId = entity.AccountId,
            ActorUserId = userId,
            Action = "transaction_created",
            EntityType = nameof(Transaction),
            EntityId = entity.Id,
            Metadata = string.Join(" | ", entity.RuleAlerts)
        }, cancellationToken);
        dbContext.Update(account);
        if (destination is not null) dbContext.Update(destination);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task<TransactionResponse> UpdateAsync(Guid id, UpdateTransactionRequest request, CancellationToken cancellationToken)
    {
        ValidateTransaction(request.Type, request.Amount, request.AccountId, request.DestinationAccountId, request.CategoryId);
        var userId = currentUserService.GetUserId();
        var entity = await FindEditableAsync(id, cancellationToken);
        await accountAccessService.EnsureCanEditAccountAsync(userId, request.AccountId, cancellationToken);
        var oldAccount = await FindAccountAsync(entity.AccountId, cancellationToken);
        Account? oldDestination = entity.DestinationAccountId.HasValue ? await FindAccountAsync(entity.DestinationAccountId.Value, cancellationToken) : null;
        ApplyBalanceDelta(oldAccount, oldDestination, entity, isReversal: true);

        var ruleContext = await ApplyRulesAsync(new CreateTransactionRequest(request.AccountId, request.DestinationAccountId, request.CategoryId, request.Type, request.Amount, request.Date, request.Merchant, request.Note, request.PaymentMethod, request.Tags, entity.RecurringTransactionId), cancellationToken);
        entity.AccountId = request.AccountId;
        entity.DestinationAccountId = request.DestinationAccountId;
        entity.CategoryId = ruleContext.CategoryId ?? request.CategoryId;
        entity.Type = request.Type;
        entity.Amount = request.Amount;
        entity.TransactionDate = request.Date;
        entity.Merchant = request.Merchant?.Trim();
        entity.Note = request.Note?.Trim();
        entity.PaymentMethod = request.PaymentMethod?.Trim();
        entity.Tags = ruleContext.Tags;
        entity.RuleAlerts = ruleContext.Alerts;
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
        var entity = await FindEditableAsync(id, cancellationToken);
        var account = await FindAccountAsync(entity.AccountId, cancellationToken);
        Account? destination = entity.DestinationAccountId.HasValue ? await FindAccountAsync(entity.DestinationAccountId.Value, cancellationToken) : null;
        ApplyBalanceDelta(account, destination, entity, isReversal: true);
        dbContext.Update(account);
        if (destination is not null) dbContext.Update(destination);
        dbContext.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<(Guid? CategoryId, List<string> Tags, List<string> Alerts)> ApplyRulesAsync(CreateTransactionRequest request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        var rules = await dbContext.Rules
            .Where(x => x.UserId == userId && x.IsActive)
            .OrderBy(x => x.Priority)
            .ThenBy(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var categoryId = request.CategoryId;
        var tags = request.Tags?.Select(x => x.Trim()).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct(StringComparer.OrdinalIgnoreCase).ToList() ?? new List<string>();
        var alerts = new List<string>();

        foreach (var rule in rules)
        {
            string? categoryName = null;
            if (categoryId.HasValue)
            {
                categoryName = await dbContext.Categories
                    .Where(x => x.Id == categoryId.Value)
                    .Select(x => x.Name)
                    .FirstOrDefaultAsync(cancellationToken);
            }

            if (!EvaluateRule(rule, request, categoryId, categoryName)) continue;
            switch (rule.ActionType)
            {
                case RuleActionType.SetCategory:
                    var actionCategoryName = rule.ActionValue.Trim();
                    var category = await dbContext.Categories.FirstOrDefaultAsync(
                        x => x.UserId == userId && x.Name.ToLower() == actionCategoryName.ToLower(),
                        cancellationToken);
                    if (category is not null) categoryId = category.Id;
                    break;
                case RuleActionType.AddTag:
                    if (!tags.Contains(rule.ActionValue.Trim(), StringComparer.OrdinalIgnoreCase))
                    {
                        tags.Add(rule.ActionValue.Trim());
                    }
                    break;
                case RuleActionType.TriggerAlert:
                    alerts.Add(rule.ActionValue.Trim());
                    break;
            }
        }

        return (categoryId, tags, alerts);
    }

    private static bool EvaluateRule(Rule rule, CreateTransactionRequest request, Guid? effectiveCategoryId, string? effectiveCategoryName)
    {
        var left = rule.ConditionField switch
        {
            RuleField.Merchant => request.Merchant ?? string.Empty,
            RuleField.Note => request.Note ?? string.Empty,
            RuleField.Type => request.Type.ToString(),
            RuleField.Amount => request.Amount.ToString("0.00"),
            RuleField.Category => $"{effectiveCategoryName ?? string.Empty}|{effectiveCategoryId?.ToString() ?? string.Empty}",
            _ => string.Empty
        };

        var right = rule.ConditionValue.Trim();
        return rule.ConditionOperator switch
        {
            RuleOperator.Equals => left.Equals(right, StringComparison.OrdinalIgnoreCase) || left.Split('|').Any(x => x.Equals(right, StringComparison.OrdinalIgnoreCase)),
            RuleOperator.Contains => left.Contains(right, StringComparison.OrdinalIgnoreCase),
            RuleOperator.StartsWith => left.StartsWith(right, StringComparison.OrdinalIgnoreCase),
            RuleOperator.EndsWith => left.EndsWith(right, StringComparison.OrdinalIgnoreCase),
            RuleOperator.GreaterThan => decimal.TryParse(left, out var n1) && decimal.TryParse(right, out var n2) && n1 > n2,
            RuleOperator.LessThan => decimal.TryParse(left, out var n3) && decimal.TryParse(right, out var n4) && n3 < n4,
            _ => false
        };
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

    private async Task<Transaction> FindReadableAsync(Guid id, CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        var readableAccountIds = await accountAccessService.GetReadableAccountIdsAsync(userId, cancellationToken);
        return await dbContext.Transactions.FirstOrDefaultAsync(x => x.Id == id && readableAccountIds.Contains(x.AccountId), cancellationToken)
            ?? throw new AppException("Transaction not found.", StatusCodes.Status404NotFound);
    }

    private async Task<Transaction> FindEditableAsync(Guid id, CancellationToken cancellationToken)
    {
        var transaction = await FindReadableAsync(id, cancellationToken);
        var userId = currentUserService.GetUserId();
        await accountAccessService.EnsureCanEditAccountAsync(userId, transaction.AccountId, cancellationToken);
        return transaction;
    }

    private async Task<Account> FindAccountAsync(Guid id, CancellationToken cancellationToken)
    {
        return await dbContext.Accounts.FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new AppException("Account not found.", StatusCodes.Status404NotFound);
    }

    private static void ValidateTransaction(TransactionType type, decimal amount, Guid accountId, Guid? destinationAccountId, Guid? categoryId)
    {
        if (accountId == Guid.Empty) throw new AppException("Account is required.");
        if (amount <= 0) throw new AppException("Amount must be greater than zero.");
        if (type == TransactionType.Transfer && !destinationAccountId.HasValue) throw new AppException("Transfer requires destination account.");
        if (type != TransactionType.Transfer && !categoryId.HasValue) throw new AppException("Category is required.");
    }

    private static TransactionResponse Map(Transaction transaction)
        => new(transaction.Id, transaction.AccountId, transaction.DestinationAccountId, transaction.CategoryId, transaction.Type, transaction.Amount, transaction.TransactionDate, transaction.Merchant, transaction.Note, transaction.PaymentMethod, transaction.Tags, transaction.RuleAlerts, transaction.CreatedAtUtc);
}
