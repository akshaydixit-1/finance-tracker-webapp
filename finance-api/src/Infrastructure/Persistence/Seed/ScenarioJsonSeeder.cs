using System.Text.Json;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Infrastructure.Persistence;

namespace Infrastructure.Persistence.Seed;

internal static class ScenarioJsonSeeder
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public static async Task SeedAsync(AppDbContext dbContext, string jsonPath, bool resetExisting, CancellationToken cancellationToken)
    {
        if (!File.Exists(jsonPath))
        {
            return;
        }

        var raw = await File.ReadAllTextAsync(jsonPath, cancellationToken);
        var payload = JsonSerializer.Deserialize<ScenarioSeedPayload>(raw, JsonOptions);
        if (payload is null || payload.Accounts.Count == 0)
        {
            return;
        }

        var users = await dbContext.UsersSet.ToListAsync(cancellationToken);
        if (users.Count == 0)
        {
            return;
        }

        foreach (var user in users)
        {
            var categories = await dbContext.CategoriesSet.Where(x => x.UserId == user.Id).ToListAsync(cancellationToken);
            if (categories.Count == 0) continue;
            var categoryMap = categories.ToDictionary(x => x.Name, x => x, StringComparer.OrdinalIgnoreCase);

            if (resetExisting)
            {
                await ResetExistingScenarioDataAsync(dbContext, user.Id, payload.Accounts.Select(x => x.Name).ToArray(), cancellationToken);
            }

            if (payload.Rules.Count > 0)
            {
                var hasRules = await dbContext.RulesSet.AnyAsync(x => x.UserId == user.Id, cancellationToken);
                if (!hasRules)
                {
                    var rules = payload.Rules.Select((x, idx) => new Rule
                    {
                        UserId = user.Id,
                        ConditionField = ParseEnum<RuleField>(x.ConditionField, RuleField.Merchant),
                        ConditionOperator = ParseEnum<RuleOperator>(x.ConditionOperator, RuleOperator.Equals),
                        ConditionValue = x.ConditionValue,
                        ActionType = ParseEnum<RuleActionType>(x.ActionType, RuleActionType.SetCategory),
                        ActionValue = x.ActionValue,
                        ConditionJson = x.ConditionJson,
                        ActionJson = x.ActionJson,
                        Priority = x.Priority == 0 ? idx + 1 : x.Priority,
                        IsActive = x.IsActive
                    }).ToList();

                    await dbContext.RulesSet.AddRangeAsync(rules, cancellationToken);
                    await dbContext.SaveChangesAsync(cancellationToken);
                }
            }

            foreach (var accountSeed in payload.Accounts)
            {
                var exists = await dbContext.AccountsSet.AnyAsync(x => x.UserId == user.Id && x.Name == accountSeed.Name, cancellationToken);
                if (exists) continue;

                var account = new Account
                {
                    UserId = user.Id,
                    Name = accountSeed.Name,
                    Type = ParseEnum<AccountType>(accountSeed.Type, AccountType.Bank),
                    OpeningBalance = accountSeed.OpeningBalance,
                    CurrentBalance = accountSeed.OpeningBalance,
                    InstitutionName = accountSeed.InstitutionName
                };

                await dbContext.AccountsSet.AddAsync(account, cancellationToken);
                await dbContext.SaveChangesAsync(cancellationToken);

                await EnsureOwnerMembershipAsync(dbContext, account, cancellationToken);

                decimal balance = account.OpeningBalance;
                foreach (var tx in accountSeed.Transactions.OrderBy(x => x.Date))
                {
                    if (!categoryMap.TryGetValue(tx.Category, out var category)) continue;

                    var txType = ParseEnum<TransactionType>(tx.Type, TransactionType.Expense);
                    var amount = decimal.Round(tx.Amount, 2);
                    await dbContext.TransactionsSet.AddAsync(new Transaction
                    {
                        UserId = user.Id,
                        AccountId = account.Id,
                        CategoryId = category.Id,
                        Type = txType,
                        Amount = amount,
                        TransactionDate = DateOnly.Parse(tx.Date),
                        Merchant = tx.Merchant,
                        Note = tx.Note,
                        PaymentMethod = tx.PaymentMethod,
                        Tags = tx.Tags,
                        RuleAlerts = tx.RuleAlerts
                    }, cancellationToken);

                    balance += txType == TransactionType.Income ? amount : -amount;
                }

                foreach (var budget in accountSeed.Budgets)
                {
                    if (!categoryMap.TryGetValue(budget.Category, out var category)) continue;
                    var existsBudget = await dbContext.BudgetsSet.AnyAsync(
                        x => x.UserId == user.Id
                             && x.AccountId == account.Id
                             && x.CategoryId == category.Id
                             && x.Month == budget.Month
                             && x.Year == budget.Year,
                        cancellationToken);
                    if (existsBudget) continue;

                    await dbContext.BudgetsSet.AddAsync(new Budget
                    {
                        UserId = user.Id,
                        AccountId = account.Id,
                        CategoryId = category.Id,
                        Month = budget.Month,
                        Year = budget.Year,
                        Amount = budget.Amount,
                        AlertThresholdPercent = budget.AlertThresholdPercent
                    }, cancellationToken);
                }

                foreach (var goal in accountSeed.Goals)
                {
                    await dbContext.GoalsSet.AddAsync(new Goal
                    {
                        UserId = user.Id,
                        LinkedAccountId = account.Id,
                        Name = goal.Name,
                        TargetAmount = goal.TargetAmount,
                        CurrentAmount = goal.CurrentAmount,
                        TargetDate = string.IsNullOrWhiteSpace(goal.TargetDate) ? null : DateOnly.Parse(goal.TargetDate),
                        Icon = goal.Icon,
                        Color = goal.Color,
                        Status = ParseEnum<GoalStatus>(goal.Status, GoalStatus.Active)
                    }, cancellationToken);
                }

                foreach (var recurring in accountSeed.Recurring)
                {
                    Guid? recurringCategoryId = null;
                    if (!string.IsNullOrWhiteSpace(recurring.Category) && categoryMap.TryGetValue(recurring.Category, out var recurringCategory))
                    {
                        recurringCategoryId = recurringCategory.Id;
                    }

                    await dbContext.RecurringTransactionsSet.AddAsync(new RecurringTransaction
                    {
                        UserId = user.Id,
                        AccountId = account.Id,
                        Title = recurring.Title,
                        Type = ParseEnum<TransactionType>(recurring.Type, TransactionType.Expense),
                        Amount = recurring.Amount,
                        CategoryId = recurringCategoryId,
                        Frequency = ParseEnum<RecurringFrequency>(recurring.Frequency, RecurringFrequency.Monthly),
                        StartDate = DateOnly.Parse(recurring.StartDate),
                        EndDate = string.IsNullOrWhiteSpace(recurring.EndDate) ? null : DateOnly.Parse(recurring.EndDate),
                        NextRunDate = DateOnly.Parse(recurring.NextRunDate),
                        AutoCreateTransaction = recurring.AutoCreateTransaction,
                        IsPaused = recurring.IsPaused
                    }, cancellationToken);
                }

                foreach (var activity in accountSeed.Activities)
                {
                    await dbContext.AccountActivitiesSet.AddAsync(new AccountActivity
                    {
                        AccountId = account.Id,
                        ActorUserId = user.Id,
                        Action = activity.Action,
                        EntityType = activity.EntityType,
                        EntityId = account.Id,
                        Metadata = activity.Metadata,
                        CreatedAtUtc = string.IsNullOrWhiteSpace(activity.CreatedAtUtc) ? DateTime.UtcNow : DateTime.Parse(activity.CreatedAtUtc).ToUniversalTime(),
                        UpdatedAtUtc = string.IsNullOrWhiteSpace(activity.CreatedAtUtc) ? DateTime.UtcNow : DateTime.Parse(activity.CreatedAtUtc).ToUniversalTime()
                    }, cancellationToken);
                }

                account.CurrentBalance = decimal.Round(balance, 2);
                dbContext.AccountsSet.Update(account);
                await dbContext.SaveChangesAsync(cancellationToken);
            }
        }
    }

    private static async Task ResetExistingScenarioDataAsync(AppDbContext dbContext, Guid userId, string[] scenarioNames, CancellationToken cancellationToken)
    {
        var scenarioAccounts = await dbContext.AccountsSet
            .Where(x => x.UserId == userId && scenarioNames.Contains(x.Name))
            .ToListAsync(cancellationToken);
        if (scenarioAccounts.Count == 0) return;

        var accountIds = scenarioAccounts.Select(x => x.Id).ToList();

        await dbContext.TransactionsSet.Where(x => x.UserId == userId && accountIds.Contains(x.AccountId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.BudgetsSet.Where(x => x.UserId == userId && x.AccountId.HasValue && accountIds.Contains(x.AccountId.Value)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.GoalsSet.Where(x => x.UserId == userId && x.LinkedAccountId.HasValue && accountIds.Contains(x.LinkedAccountId.Value)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.RecurringTransactionsSet.Where(x => x.UserId == userId && x.AccountId.HasValue && accountIds.Contains(x.AccountId.Value)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.AccountActivitiesSet.Where(x => accountIds.Contains(x.AccountId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.AccountMembersSet.Where(x => accountIds.Contains(x.AccountId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.AccountsSet.Where(x => accountIds.Contains(x.Id)).ExecuteDeleteAsync(cancellationToken);
    }

    private static async Task EnsureOwnerMembershipAsync(AppDbContext dbContext, Account account, CancellationToken cancellationToken)
    {
        var exists = await dbContext.AccountMembersSet.AnyAsync(
            x => x.AccountId == account.Id && x.UserId == account.UserId,
            cancellationToken);
        if (exists) return;

        await dbContext.AccountMembersSet.AddAsync(new AccountMember
        {
            AccountId = account.Id,
            UserId = account.UserId,
            Role = AccountMemberRole.Owner
        }, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static T ParseEnum<T>(string value, T fallback) where T : struct, Enum
        => Enum.TryParse<T>(value, true, out var parsed) ? parsed : fallback;
}

internal sealed class ScenarioSeedPayload
{
    public string Version { get; set; } = "1";
    public List<ScenarioRuleSeed> Rules { get; set; } = [];
    public List<ScenarioAccountJsonSeed> Accounts { get; set; } = [];
}

internal sealed class ScenarioRuleSeed
{
    public string ConditionField { get; set; } = string.Empty;
    public string ConditionOperator { get; set; } = string.Empty;
    public string ConditionValue { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty;
    public string ActionValue { get; set; } = string.Empty;
    public string ConditionJson { get; set; } = "{}";
    public string ActionJson { get; set; } = "{}";
    public int Priority { get; set; }
    public bool IsActive { get; set; } = true;
}

internal sealed class ScenarioAccountJsonSeed
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "Bank";
    public string InstitutionName { get; set; } = string.Empty;
    public decimal OpeningBalance { get; set; }
    public List<ScenarioTransactionSeed> Transactions { get; set; } = [];
    public List<ScenarioBudgetSeed> Budgets { get; set; } = [];
    public List<ScenarioGoalSeed> Goals { get; set; } = [];
    public List<ScenarioRecurringSeed> Recurring { get; set; } = [];
    public List<ScenarioActivitySeed> Activities { get; set; } = [];
}

internal sealed class ScenarioTransactionSeed
{
    public string Date { get; set; } = string.Empty;
    public string Type { get; set; } = "Expense";
    public string Category { get; set; } = "Miscellaneous";
    public decimal Amount { get; set; }
    public string Merchant { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = "Card";
    public List<string> Tags { get; set; } = [];
    public List<string> RuleAlerts { get; set; } = [];
}

internal sealed class ScenarioBudgetSeed
{
    public int Month { get; set; }
    public int Year { get; set; }
    public string Category { get; set; } = "Food";
    public decimal Amount { get; set; }
    public int AlertThresholdPercent { get; set; } = 80;
}

internal sealed class ScenarioGoalSeed
{
    public string Name { get; set; } = string.Empty;
    public decimal TargetAmount { get; set; }
    public decimal CurrentAmount { get; set; }
    public string TargetDate { get; set; } = string.Empty;
    public string Icon { get; set; } = "PiggyBank";
    public string Color { get; set; } = "#059669";
    public string Status { get; set; } = "Active";
}

internal sealed class ScenarioRecurringSeed
{
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = "Expense";
    public decimal Amount { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Frequency { get; set; } = "Monthly";
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public string NextRunDate { get; set; } = string.Empty;
    public bool AutoCreateTransaction { get; set; } = true;
    public bool IsPaused { get; set; }
}

internal sealed class ScenarioActivitySeed
{
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string Metadata { get; set; } = string.Empty;
    public string CreatedAtUtc { get; set; } = string.Empty;
}
