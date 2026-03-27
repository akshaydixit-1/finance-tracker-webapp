using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using System.IO;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Persistence;

namespace Infrastructure.Persistence.Seed;

public static class DatabaseInitializer
{
    private sealed record ScenarioAccountSeed(string Name, int MonthsOfHistory, AccountType Type, string Institution);

    private static readonly (string Name, CategoryType Type, string Color, string Icon)[] DefaultCategories =
    {
        ("Food", CategoryType.Expense, "#F59E0B", "UtensilsCrossed"),
        ("Rent", CategoryType.Expense, "#DC2626", "House"),
        ("Utilities", CategoryType.Expense, "#0EA5E9", "Lightbulb"),
        ("Transport", CategoryType.Expense, "#2563EB", "CarFront"),
        ("Entertainment", CategoryType.Expense, "#8B5CF6", "Clapperboard"),
        ("Shopping", CategoryType.Expense, "#EC4899", "ShoppingBag"),
        ("Health", CategoryType.Expense, "#059669", "HeartPulse"),
        ("Education", CategoryType.Expense, "#7C3AED", "GraduationCap"),
        ("Travel", CategoryType.Expense, "#14B8A6", "Plane"),
        ("Subscriptions", CategoryType.Expense, "#F97316", "Repeat"),
        ("Miscellaneous", CategoryType.Expense, "#6B7280", "CircleHelp"),
        ("Salary", CategoryType.Income, "#059669", "BadgeIndianRupee"),
        ("Freelance", CategoryType.Income, "#2563EB", "BriefcaseBusiness"),
        ("Bonus", CategoryType.Income, "#F59E0B", "Sparkles"),
        ("Investment", CategoryType.Income, "#8B5CF6", "LineChart"),
        ("Gift", CategoryType.Income, "#EC4899", "Gift"),
        ("Refund", CategoryType.Income, "#0EA5E9", "Undo2"),
        ("Other", CategoryType.Income, "#6B7280", "CircleDollarSign")
    };

    private static readonly ScenarioAccountSeed[] ScenarioAccounts =
    {
        new("Scenario - 2 Months", 2, AccountType.Bank, "FinTrack Demo Bank"),
        new("Scenario - 6 Months", 6, AccountType.Savings, "FinTrack Demo Savings"),
        new("Scenario - 1 Year", 12, AccountType.Bank, "FinTrack Demo Bank"),
        new("Scenario - 3 Years", 36, AccountType.CreditCard, "FinTrack Demo Credit"),
        new("Scenario - 5 Years", 60, AccountType.Savings, "FinTrack Demo Longterm")
    };

    private const string ScenarioTag = "scenario-seed";

    public static async Task InitialiseAsync(AppDbContext dbContext, IHostEnvironment environment, IConfiguration configuration, CancellationToken cancellationToken = default)
    {
        var migrationsAssembly = dbContext.GetService<IMigrationsAssembly>();
        var hasDefinedMigrations = migrationsAssembly.Migrations.Any();

        if (hasDefinedMigrations)
        {
            await dbContext.Database.MigrateAsync(cancellationToken);
        }
        else if (environment.IsDevelopment())
        {
            // Developer convenience: create the schema automatically when no EF migrations exist yet.
            await dbContext.Database.EnsureCreatedAsync(cancellationToken);
        }
        else
        {
            throw new InvalidOperationException("No EF Core migrations were found. Add migrations before running outside Development.");
        }

        var users = await dbContext.UsersSet.ToListAsync(cancellationToken);
        if (users.Count == 0)
        {
            return;
        }

        foreach (var user in users)
        {
            var existing = await dbContext.CategoriesSet.CountAsync(x => x.UserId == user.Id, cancellationToken);
            if (existing > 0)
            {
                continue;
            }

            foreach (var item in DefaultCategories)
            {
                await dbContext.CategoriesSet.AddAsync(new Category
                {
                    UserId = user.Id,
                    Name = item.Name,
                    Type = item.Type,
                    Color = item.Color,
                    Icon = item.Icon
                }, cancellationToken);
            }
        }

        var accounts = await dbContext.AccountsSet.ToListAsync(cancellationToken);
        foreach (var account in accounts)
        {
            var exists = await dbContext.AccountMembersSet.AnyAsync(
                x => x.AccountId == account.Id && x.UserId == account.UserId,
                cancellationToken);
            if (exists) continue;

            await dbContext.AccountMembersSet.AddAsync(new AccountMember
            {
                AccountId = account.Id,
                UserId = account.UserId,
                Role = AccountMemberRole.Owner
            }, cancellationToken);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        if (configuration.GetValue<bool>("SeedScenarios:Enabled"))
        {
            var resetExisting = configuration.GetValue<bool>("SeedScenarios:ResetExisting");
            await SeedScenarioDataAsync(dbContext, configuration, resetExisting, cancellationToken);
        }
    }

    private static async Task SeedScenarioDataAsync(AppDbContext dbContext, IConfiguration configuration, bool resetExisting, CancellationToken cancellationToken)
    {
        var useJson = configuration.GetValue<bool>("SeedScenarios:UseJson");
        if (useJson)
        {
            var jsonPath = configuration.GetValue<string>("SeedScenarios:JsonFilePath") ?? Path.Combine("SeedData", "scenario_seed.json");
            var resolvedPath = Path.IsPathRooted(jsonPath) ? jsonPath : Path.Combine(Directory.GetCurrentDirectory(), jsonPath);
            await ScenarioJsonSeeder.SeedAsync(dbContext, resolvedPath, resetExisting, cancellationToken);
            return;
        }

        var scenarioNames = ScenarioAccounts.Select(x => x.Name).ToArray();
        var users = await dbContext.UsersSet.ToListAsync(cancellationToken);
        if (users.Count == 0)
        {
            return;
        }

        foreach (var user in users)
        {
            if (resetExisting)
            {
                await ResetExistingScenarioDataAsync(dbContext, user.Id, cancellationToken);
            }

            var existingScenarioAccounts = await dbContext.AccountsSet
                .Where(x => x.UserId == user.Id && scenarioNames.Contains(x.Name))
                .Select(x => x.Name)
                .ToListAsync(cancellationToken);
            if (existingScenarioAccounts.Count == ScenarioAccounts.Length)
            {
                continue;
            }

            var categories = await dbContext.CategoriesSet.Where(x => x.UserId == user.Id).ToListAsync(cancellationToken);
            if (categories.Count == 0)
            {
                continue;
            }

            var expenseCategories = categories.Where(x => x.Type == CategoryType.Expense).ToDictionary(x => x.Name, StringComparer.OrdinalIgnoreCase);
            var incomeCategories = categories.Where(x => x.Type == CategoryType.Income).ToDictionary(x => x.Name, StringComparer.OrdinalIgnoreCase);
            if (!expenseCategories.TryGetValue("Food", out var food)) continue;
            if (!expenseCategories.TryGetValue("Rent", out var rent)) continue;
            if (!expenseCategories.TryGetValue("Utilities", out var utilities)) continue;
            if (!expenseCategories.TryGetValue("Transport", out var transport)) continue;
            if (!expenseCategories.TryGetValue("Subscriptions", out var subscriptions)) continue;
            if (!expenseCategories.TryGetValue("Entertainment", out var entertainment)) continue;
            if (!incomeCategories.TryGetValue("Salary", out var salary)) continue;
            if (!incomeCategories.TryGetValue("Freelance", out var freelance)) continue;
            if (!incomeCategories.TryGetValue("Bonus", out var bonus)) continue;

            foreach (var scenario in ScenarioAccounts.Where(x => !existingScenarioAccounts.Contains(x.Name)))
            {
                var account = new Account
                {
                    UserId = user.Id,
                    Name = scenario.Name,
                    Type = scenario.Type,
                    OpeningBalance = 50000m + (scenario.MonthsOfHistory * 1500m),
                    CurrentBalance = 50000m + (scenario.MonthsOfHistory * 1500m),
                    InstitutionName = scenario.Institution
                };
                await dbContext.AccountsSet.AddAsync(account, cancellationToken);
                await dbContext.SaveChangesAsync(cancellationToken);

                await EnsureOwnerMembershipAsync(dbContext, account, cancellationToken);
                await SeedRulesAsync(dbContext, user.Id, cancellationToken);

                var seeded = await SeedTransactionsAsync(
                    dbContext,
                    user.Id,
                    account,
                    scenario.MonthsOfHistory,
                    salary.Id,
                    freelance.Id,
                    bonus.Id,
                    food.Id,
                    rent.Id,
                    utilities.Id,
                    transport.Id,
                    subscriptions.Id,
                    entertainment.Id,
                    cancellationToken);

                await SeedBudgetsAsync(dbContext, user.Id, account.Id, scenario.MonthsOfHistory, food.Id, utilities.Id, transport.Id, cancellationToken);
                await SeedGoalsAsync(dbContext, user.Id, account.Id, seeded, cancellationToken);
                await SeedRecurringAsync(dbContext, user.Id, account.Id, salary.Id, rent.Id, subscriptions.Id, utilities.Id, cancellationToken);
                await SeedActivityAsync(dbContext, account.Id, user.Id, cancellationToken);
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static async Task ResetExistingScenarioDataAsync(AppDbContext dbContext, Guid userId, CancellationToken cancellationToken)
    {
        var scenarioNames = ScenarioAccounts.Select(x => x.Name).ToArray();
        var scenarioAccounts = await dbContext.AccountsSet
            .Where(x => x.UserId == userId && scenarioNames.Contains(x.Name))
            .ToListAsync(cancellationToken);
        if (scenarioAccounts.Count == 0) return;

        var accountIds = scenarioAccounts.Select(x => x.Id).ToList();

        await dbContext.TransactionsSet
            .Where(x => x.UserId == userId && accountIds.Contains(x.AccountId))
            .ExecuteDeleteAsync(cancellationToken);
        await dbContext.BudgetsSet
            .Where(x => x.UserId == userId && x.AccountId.HasValue && accountIds.Contains(x.AccountId.Value))
            .ExecuteDeleteAsync(cancellationToken);
        await dbContext.GoalsSet
            .Where(x => x.UserId == userId && x.LinkedAccountId.HasValue && accountIds.Contains(x.LinkedAccountId.Value))
            .ExecuteDeleteAsync(cancellationToken);
        await dbContext.RecurringTransactionsSet
            .Where(x => x.UserId == userId && x.AccountId.HasValue && accountIds.Contains(x.AccountId.Value))
            .ExecuteDeleteAsync(cancellationToken);
        await dbContext.AccountActivitiesSet
            .Where(x => accountIds.Contains(x.AccountId) && x.Metadata != null && x.Metadata.Contains(ScenarioTag))
            .ExecuteDeleteAsync(cancellationToken);
        await dbContext.AccountMembersSet
            .Where(x => accountIds.Contains(x.AccountId))
            .ExecuteDeleteAsync(cancellationToken);
        await dbContext.AccountsSet
            .Where(x => accountIds.Contains(x.Id))
            .ExecuteDeleteAsync(cancellationToken);
    }

    private static async Task EnsureOwnerMembershipAsync(AppDbContext dbContext, Account account, CancellationToken cancellationToken)
    {
        var exists = await dbContext.AccountMembersSet.AnyAsync(
            x => x.AccountId == account.Id && x.UserId == account.UserId,
            cancellationToken);
        if (!exists)
        {
            await dbContext.AccountMembersSet.AddAsync(new AccountMember
            {
                AccountId = account.Id,
                UserId = account.UserId,
                Role = AccountMemberRole.Owner
            }, cancellationToken);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    private static async Task SeedRulesAsync(AppDbContext dbContext, Guid userId, CancellationToken cancellationToken)
    {
        var existing = await dbContext.RulesSet.AnyAsync(x => x.UserId == userId, cancellationToken);
        if (existing) return;

        var rules = new[]
        {
            new Rule
            {
                UserId = userId,
                ConditionField = RuleField.Merchant,
                ConditionOperator = RuleOperator.Equals,
                ConditionValue = "Uber",
                ActionType = RuleActionType.SetCategory,
                ActionValue = "Transport",
                ConditionJson = "{\"field\":\"merchant\",\"operator\":\"equals\",\"value\":\"Uber\"}",
                ActionJson = "{\"type\":\"set_category\",\"value\":\"Transport\"}",
                Priority = 1,
                IsActive = true
            },
            new Rule
            {
                UserId = userId,
                ConditionField = RuleField.Amount,
                ConditionOperator = RuleOperator.GreaterThan,
                ConditionValue = "5000",
                ActionType = RuleActionType.TriggerAlert,
                ActionValue = "High transaction amount detected",
                ConditionJson = "{\"field\":\"amount\",\"operator\":\"greater_than\",\"value\":\"5000\"}",
                ActionJson = "{\"type\":\"trigger_alert\",\"value\":\"High transaction amount detected\"}",
                Priority = 2,
                IsActive = true
            },
            new Rule
            {
                UserId = userId,
                ConditionField = RuleField.Category,
                ConditionOperator = RuleOperator.Equals,
                ConditionValue = "Food",
                ActionType = RuleActionType.AddTag,
                ActionValue = "monthly-food",
                ConditionJson = "{\"field\":\"category\",\"operator\":\"equals\",\"value\":\"Food\"}",
                ActionJson = "{\"type\":\"add_tag\",\"value\":\"monthly-food\"}",
                Priority = 3,
                IsActive = true
            }
        };

        await dbContext.RulesSet.AddRangeAsync(rules, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static async Task<decimal> SeedTransactionsAsync(
        AppDbContext dbContext,
        Guid userId,
        Account account,
        int monthsOfHistory,
        Guid salaryCategoryId,
        Guid freelanceCategoryId,
        Guid bonusCategoryId,
        Guid foodCategoryId,
        Guid rentCategoryId,
        Guid utilitiesCategoryId,
        Guid transportCategoryId,
        Guid subscriptionsCategoryId,
        Guid entertainmentCategoryId,
        CancellationToken cancellationToken)
    {
        var rand = new Random(HashCode.Combine(userId, account.Name, monthsOfHistory));
        var monthStart = new DateOnly(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1).AddMonths(-(monthsOfHistory - 1));
        decimal accountBalance = account.OpeningBalance;
        var monthlySavings = new List<decimal>();

        for (var i = 0; i < monthsOfHistory; i++)
        {
            var currentMonth = monthStart.AddMonths(i);
            var monthIncome = 0m;
            var monthExpense = 0m;

            decimal salaryAmount = 62000m + rand.Next(-6000, 6001);
            await AddTransactionAsync(dbContext, userId, account.Id, salaryCategoryId, TransactionType.Income, salaryAmount, AtDay(currentMonth, 1), "Employer Payroll", "UPI", new[] { "salary", ScenarioTag }, cancellationToken);
            monthIncome += salaryAmount;

            if (rand.NextDouble() < 0.55)
            {
                decimal freelanceAmount = 7000m + rand.Next(-3500, 8001);
                await AddTransactionAsync(dbContext, userId, account.Id, freelanceCategoryId, TransactionType.Income, freelanceAmount, AtDay(currentMonth, 16), "Freelance Client", "Bank", new[] { "freelance", ScenarioTag }, cancellationToken);
                monthIncome += freelanceAmount;
            }

            if (i % 6 == 5)
            {
                decimal bonusAmount = 18000m + rand.Next(-7000, 12001);
                await AddTransactionAsync(dbContext, userId, account.Id, bonusCategoryId, TransactionType.Income, bonusAmount, AtDay(currentMonth, 27), "Performance Bonus", "Bank", new[] { "bonus", ScenarioTag }, cancellationToken);
                monthIncome += bonusAmount;
            }

            decimal rentAmount = 18000m + rand.Next(-1000, 2201);
            await AddTransactionAsync(dbContext, userId, account.Id, rentCategoryId, TransactionType.Expense, rentAmount, AtDay(currentMonth, 3), "Home Rent", "Bank", new[] { "housing", ScenarioTag }, cancellationToken);
            monthExpense += rentAmount;

            decimal utilityAmount = 2400m + rand.Next(-600, 1201);
            await AddTransactionAsync(dbContext, userId, account.Id, utilitiesCategoryId, TransactionType.Expense, utilityAmount, AtDay(currentMonth, 10), "Utility Bill", "Card", new[] { "utilities", ScenarioTag }, cancellationToken);
            monthExpense += utilityAmount;

            decimal subscriptionAmount = 799m + rand.Next(-150, 450);
            await AddTransactionAsync(dbContext, userId, account.Id, subscriptionsCategoryId, TransactionType.Expense, subscriptionAmount, AtDay(currentMonth, 12), "Streaming Bundle", "Card", new[] { "subscription", ScenarioTag }, cancellationToken);
            monthExpense += subscriptionAmount;

            for (var t = 0; t < 5; t++)
            {
                decimal foodAmount = 900m + rand.Next(250, 2800);
                await AddTransactionAsync(dbContext, userId, account.Id, foodCategoryId, TransactionType.Expense, foodAmount, AtDay(currentMonth, 6 + (t * 5)), Pick(rand, "Swiggy", "Zomato", "Cafe", "Restaurant"), "Card", new[] { "food", ScenarioTag }, cancellationToken);
                monthExpense += foodAmount;

                decimal transportAmount = 250m + rand.Next(120, 1100);
                await AddTransactionAsync(dbContext, userId, account.Id, transportCategoryId, TransactionType.Expense, transportAmount, AtDay(currentMonth, 5 + (t * 5)), Pick(rand, "Uber", "Metro", "Fuel Station"), "UPI", new[] { "transport", ScenarioTag }, cancellationToken);
                monthExpense += transportAmount;
            }

            for (var e = 0; e < 3; e++)
            {
                decimal entertainmentAmount = 500m + rand.Next(100, 2800);
                await AddTransactionAsync(dbContext, userId, account.Id, entertainmentCategoryId, TransactionType.Expense, entertainmentAmount, AtDay(currentMonth, 8 + (e * 7)), Pick(rand, "Movies", "Concert", "Weekend Trip"), "Card", new[] { "entertainment", ScenarioTag }, cancellationToken);
                monthExpense += entertainmentAmount;
            }

            accountBalance += monthIncome - monthExpense;
            monthlySavings.Add(monthIncome - monthExpense);
        }

        account.CurrentBalance = decimal.Round(accountBalance, 2);
        dbContext.AccountsSet.Update(account);
        await dbContext.SaveChangesAsync(cancellationToken);

        var lastTwelve = monthlySavings.TakeLast(Math.Min(12, monthlySavings.Count)).ToList();
        var yearlyAvg = lastTwelve.Count == 0 ? 0 : lastTwelve.Average();
        return decimal.Round(yearlyAvg, 2);
    }

    private static async Task SeedBudgetsAsync(
        AppDbContext dbContext,
        Guid userId,
        Guid accountId,
        int monthsOfHistory,
        Guid foodCategoryId,
        Guid utilitiesCategoryId,
        Guid transportCategoryId,
        CancellationToken cancellationToken)
    {
        var monthStart = new DateOnly(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1).AddMonths(-(Math.Min(monthsOfHistory, 18) - 1));
        for (var i = 0; i < Math.Min(monthsOfHistory, 18); i++)
        {
            var month = monthStart.AddMonths(i);
            await AddBudgetIfMissingAsync(dbContext, userId, accountId, foodCategoryId, month, 11000m, 80, cancellationToken);
            await AddBudgetIfMissingAsync(dbContext, userId, accountId, utilitiesCategoryId, month, 3500m, 85, cancellationToken);
            await AddBudgetIfMissingAsync(dbContext, userId, accountId, transportCategoryId, month, 5000m, 75, cancellationToken);
        }
    }

    private static async Task AddBudgetIfMissingAsync(AppDbContext dbContext, Guid userId, Guid accountId, Guid categoryId, DateOnly month, decimal amount, int threshold, CancellationToken cancellationToken)
    {
        var exists = await dbContext.BudgetsSet.AnyAsync(
            x => x.UserId == userId && x.AccountId == accountId && x.CategoryId == categoryId && x.Month == month.Month && x.Year == month.Year,
            cancellationToken);
        if (exists) return;

        await dbContext.BudgetsSet.AddAsync(new Budget
        {
            UserId = userId,
            AccountId = accountId,
            CategoryId = categoryId,
            Month = month.Month,
            Year = month.Year,
            Amount = amount,
            AlertThresholdPercent = threshold
        }, cancellationToken);
    }

    private static async Task SeedGoalsAsync(AppDbContext dbContext, Guid userId, Guid accountId, decimal yearlySavingsAverage, CancellationToken cancellationToken)
    {
        var hasGoal = await dbContext.GoalsSet.AnyAsync(x => x.UserId == userId && x.LinkedAccountId == accountId, cancellationToken);
        if (hasGoal) return;

        var goals = new[]
        {
            new Goal
            {
                UserId = userId,
                LinkedAccountId = accountId,
                Name = "Emergency Buffer",
                TargetAmount = 300000m,
                CurrentAmount = Math.Max(20000m, yearlySavingsAverage * 3),
                TargetDate = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(14)),
                Icon = "ShieldCheck",
                Color = "#0ea5e9",
                Status = GoalStatus.Active
            },
            new Goal
            {
                UserId = userId,
                LinkedAccountId = accountId,
                Name = "Annual Vacation",
                TargetAmount = 120000m,
                CurrentAmount = Math.Max(10000m, yearlySavingsAverage),
                TargetDate = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(10)),
                Icon = "Plane",
                Color = "#a855f7",
                Status = GoalStatus.Active
            }
        };

        await dbContext.GoalsSet.AddRangeAsync(goals, cancellationToken);
    }

    private static async Task SeedRecurringAsync(
        AppDbContext dbContext,
        Guid userId,
        Guid accountId,
        Guid salaryCategoryId,
        Guid rentCategoryId,
        Guid subscriptionsCategoryId,
        Guid utilitiesCategoryId,
        CancellationToken cancellationToken)
    {
        var hasRecurring = await dbContext.RecurringTransactionsSet.AnyAsync(x => x.UserId == userId && x.AccountId == accountId, cancellationToken);
        if (hasRecurring) return;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var recurring = new[]
        {
            new RecurringTransaction
            {
                UserId = userId,
                AccountId = accountId,
                Title = "Monthly Salary",
                Type = TransactionType.Income,
                Amount = 62000m,
                CategoryId = salaryCategoryId,
                Frequency = RecurringFrequency.Monthly,
                StartDate = today.AddMonths(-6),
                EndDate = null,
                NextRunDate = NextMonthlyRunDate(today, 1),
                AutoCreateTransaction = true,
                IsPaused = false
            },
            new RecurringTransaction
            {
                UserId = userId,
                AccountId = accountId,
                Title = "House Rent",
                Type = TransactionType.Expense,
                Amount = 18500m,
                CategoryId = rentCategoryId,
                Frequency = RecurringFrequency.Monthly,
                StartDate = today.AddMonths(-6),
                EndDate = null,
                NextRunDate = NextMonthlyRunDate(today, 2),
                AutoCreateTransaction = true,
                IsPaused = false
            },
            new RecurringTransaction
            {
                UserId = userId,
                AccountId = accountId,
                Title = "Utilities Package",
                Type = TransactionType.Expense,
                Amount = 2600m,
                CategoryId = utilitiesCategoryId,
                Frequency = RecurringFrequency.Monthly,
                StartDate = today.AddMonths(-6),
                EndDate = null,
                NextRunDate = NextMonthlyRunDate(today, 9),
                AutoCreateTransaction = true,
                IsPaused = false
            },
            new RecurringTransaction
            {
                UserId = userId,
                AccountId = accountId,
                Title = "Streaming Subscription",
                Type = TransactionType.Expense,
                Amount = 899m,
                CategoryId = subscriptionsCategoryId,
                Frequency = RecurringFrequency.Monthly,
                StartDate = today.AddMonths(-6),
                EndDate = null,
                NextRunDate = NextMonthlyRunDate(today, 11),
                AutoCreateTransaction = true,
                IsPaused = false
            }
        };

        await dbContext.RecurringTransactionsSet.AddRangeAsync(recurring, cancellationToken);
    }

    private static async Task SeedActivityAsync(AppDbContext dbContext, Guid accountId, Guid userId, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var rows = new[]
        {
            new AccountActivity
            {
                AccountId = accountId,
                ActorUserId = userId,
                Action = "Created account",
                EntityType = "Account",
                EntityId = accountId,
                Metadata = ScenarioTag,
                CreatedAtUtc = now.AddMinutes(-20),
                UpdatedAtUtc = now.AddMinutes(-20)
            },
            new AccountActivity
            {
                AccountId = accountId,
                ActorUserId = userId,
                Action = "Imported historical transactions",
                EntityType = "Transaction",
                EntityId = accountId,
                Metadata = ScenarioTag,
                CreatedAtUtc = now.AddMinutes(-10),
                UpdatedAtUtc = now.AddMinutes(-10)
            },
            new AccountActivity
            {
                AccountId = accountId,
                ActorUserId = userId,
                Action = "Configured recurring payments",
                EntityType = "RecurringTransaction",
                EntityId = accountId,
                Metadata = ScenarioTag,
                CreatedAtUtc = now.AddMinutes(-5),
                UpdatedAtUtc = now.AddMinutes(-5)
            }
        };

        await dbContext.AccountActivitiesSet.AddRangeAsync(rows, cancellationToken);
    }

    private static async Task AddTransactionAsync(
        AppDbContext dbContext,
        Guid userId,
        Guid accountId,
        Guid categoryId,
        TransactionType type,
        decimal amount,
        DateOnly date,
        string merchant,
        string paymentMethod,
        string[] tags,
        CancellationToken cancellationToken)
    {
        await dbContext.TransactionsSet.AddAsync(new Transaction
        {
            UserId = userId,
            AccountId = accountId,
            CategoryId = categoryId,
            Type = type,
            Amount = decimal.Round(amount, 2),
            TransactionDate = date,
            Merchant = merchant,
            Note = $"{ScenarioTag} generated sample",
            PaymentMethod = paymentMethod,
            Tags = tags.ToList(),
            RuleAlerts = amount > 5000m && type == TransactionType.Expense
                ? new List<string> { "High transaction amount detected" }
                : new List<string>()
        }, cancellationToken);
    }

    private static DateOnly AtDay(DateOnly month, int day)
    {
        var days = DateTime.DaysInMonth(month.Year, month.Month);
        return new DateOnly(month.Year, month.Month, Math.Min(day, days));
    }

    private static DateOnly NextMonthlyRunDate(DateOnly today, int dayOfMonth)
    {
        var nextMonth = new DateOnly(today.Year, today.Month, 1).AddMonths(1);
        return AtDay(nextMonth, dayOfMonth);
    }

    private static string Pick(Random rand, params string[] values) => values[rand.Next(values.Length)];
}
