using Microsoft.EntityFrameworkCore;
using Application.Abstractions.Auth;
using Application.Abstractions.Persistence;
using Application.Abstractions.Services;
using Application.DTOs.Dashboard;
using Domain.Enums;

namespace Application.Services;

public sealed class DashboardService(
    IAppDbContext dbContext,
    ICurrentUserService currentUserService,
    IAccountAccessService accountAccessService,
    IForecastService forecastService,
    IInsightsService insightsService) : IDashboardService
{
    public async Task<DashboardResponse> GetAsync(CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        var readableAccountIds = await accountAccessService.GetReadableAccountIdsAsync(userId, cancellationToken);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var month = today.Month;
        var year = today.Year;

        var transactions = await dbContext.Transactions
            .Where(x => readableAccountIds.Contains(x.AccountId))
            .OrderByDescending(x => x.TransactionDate)
            .ThenByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var accounts = await dbContext.Accounts
            .Where(x => readableAccountIds.Contains(x.Id))
            .ToListAsync(cancellationToken);

        var categories = await dbContext.Categories
            .Where(x => x.UserId == userId)
            .ToListAsync(cancellationToken);

        var budgets = await dbContext.Budgets
            .Where(x => x.UserId == userId && x.Month == month && x.Year == year)
            .ToListAsync(cancellationToken);

        var recurringItems = await dbContext.RecurringTransactions
            .Where(x => x.UserId == userId && !x.IsPaused && x.NextRunDate >= today)
            .OrderBy(x => x.NextRunDate)
            .Take(5)
            .ToListAsync(cancellationToken);

        var goalsData = await dbContext.Goals
            .Where(x => x.UserId == userId || (x.LinkedAccountId.HasValue && readableAccountIds.Contains(x.LinkedAccountId.Value)))
            .OrderByDescending(x => x.TargetDate)
            .ToListAsync(cancellationToken);

        var monthTransactions = transactions
            .Where(x => x.TransactionDate.Month == month && x.TransactionDate.Year == year)
            .ToList();

        var income = monthTransactions
            .Where(x => x.Type == TransactionType.Income)
            .Sum(x => x.Amount);

        var expense = monthTransactions
            .Where(x => x.Type == TransactionType.Expense)
            .Sum(x => x.Amount);

        var balance = accounts.Sum(x => x.CurrentBalance);
        var goalsValue = goalsData.Sum(x => x.CurrentAmount);

        var recentTransactions = transactions
            .Take(5)
            .Select(x => new RecentTransactionItem(
                x.Id,
                string.IsNullOrWhiteSpace(x.Merchant) ? "Transaction" : x.Merchant,
                x.Amount,
                x.Type.ToString(),
                x.TransactionDate))
            .ToList();

        var categoryLookup = categories.ToDictionary(x => x.Id, x => x.Name);

        var categorySpend = monthTransactions
            .Where(x => x.Type == TransactionType.Expense && x.CategoryId.HasValue && categoryLookup.ContainsKey(x.CategoryId.Value))
            .GroupBy(x => categoryLookup[x.CategoryId!.Value])
            .Select(x => new CategorySpendChartItem(x.Key, x.Sum(v => v.Amount)))
            .OrderByDescending(x => x.Amount)
            .Take(6)
            .ToList();

        var incomeExpenseTrend = transactions
            .GroupBy(x => new { x.TransactionDate.Year, x.TransactionDate.Month })
            .OrderBy(x => x.Key.Year)
            .ThenBy(x => x.Key.Month)
            .TakeLast(6)
            .Select(x => new TrendChartItem(
                $"{x.Key.Year}-{x.Key.Month:00}",
                x.Where(v => v.Type == TransactionType.Income).Sum(v => v.Amount),
                x.Where(v => v.Type == TransactionType.Expense).Sum(v => v.Amount)))
            .ToList();

        var budgetProgress = budgets
            .Select(x =>
            {
                var actualSpend = monthTransactions
                    .Where(t => t.Type == TransactionType.Expense && t.CategoryId == x.CategoryId && (!x.AccountId.HasValue || t.AccountId == x.AccountId.Value))
                    .Sum(t => t.Amount);

                var categoryName = categoryLookup.TryGetValue(x.CategoryId, out var value) ? value : "Category";
                var usagePercent = x.Amount == 0 ? 0m : (actualSpend / x.Amount) * 100m;
                return new BudgetProgressItem(x.Id, categoryName, x.Amount, actualSpend, usagePercent);
            })
            .OrderByDescending(x => x.UsagePercent)
            .ToList();

        var upcomingRecurring = recurringItems
            .Select(x => new UpcomingRecurringItem(x.Id, x.Title, x.Amount, x.NextRunDate))
            .ToList();

        var goals = goalsData
            .Take(5)
            .Select(x => new GoalProgressItem(
                x.Id,
                x.Name,
                x.CurrentAmount,
                x.TargetAmount,
                x.TargetAmount == 0 ? 0 : (x.CurrentAmount / x.TargetAmount) * 100m))
            .ToList();

        var forecastMonth = await forecastService.GetMonthForecastAsync(cancellationToken);
        var forecastDaily = await forecastService.GetDailyForecastAsync(cancellationToken);
        var health = await insightsService.GetHealthScoreAsync(cancellationToken);

        return new DashboardResponse(
            new[]
            {
                new DashboardSummaryCard("Income", income, "success"),
                new DashboardSummaryCard("Expense", expense, "danger"),
                new DashboardSummaryCard("Net Balance", balance, "primary"),
                new DashboardSummaryCard("Savings", goalsValue, "warning")
            },
            health.Score,
            forecastMonth.ForecastedEndOfMonthBalance,
            forecastMonth.SafeToSpendAmount,
            forecastDaily.Select(x => new DashboardForecastPoint(x.Date, x.ProjectedBalance)).ToList(),
            forecastMonth.RiskWarnings,
            budgetProgress,
            categorySpend,
            incomeExpenseTrend,
            recentTransactions,
            upcomingRecurring,
            goals);
    }
}
