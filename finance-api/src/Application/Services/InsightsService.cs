using Microsoft.EntityFrameworkCore;
using Application.Abstractions.Auth;
using Application.Abstractions.Persistence;
using Application.Abstractions.Services;
using Application.DTOs.Insights;
using Domain.Enums;

namespace Application.Services;

public sealed class InsightsService(
    IAppDbContext dbContext,
    ICurrentUserService currentUserService,
    IAccountAccessService accountAccessService) : IInsightsService
{
    public async Task<HealthScoreResponse> GetHealthScoreAsync(CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        var accountIds = await accountAccessService.GetReadableAccountIdsAsync(userId, cancellationToken);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var thisMonth = new DateOnly(today.Year, today.Month, 1);
        var sixMonthStart = thisMonth.AddMonths(-5);

        var transactions = await dbContext.Transactions
            .Where(x => accountIds.Contains(x.AccountId) && x.TransactionDate >= sixMonthStart)
            .ToListAsync(cancellationToken);

        var incomeThisMonth = transactions.Where(x => x.TransactionDate.Year == today.Year && x.TransactionDate.Month == today.Month && x.Type == TransactionType.Income).Sum(x => x.Amount);
        var expenseThisMonth = transactions.Where(x => x.TransactionDate.Year == today.Year && x.TransactionDate.Month == today.Month && x.Type == TransactionType.Expense).Sum(x => x.Amount);
        var savingsRate = incomeThisMonth <= 0 ? 0m : Math.Clamp((incomeThisMonth - expenseThisMonth) / incomeThisMonth, 0m, 1m);
        var savingsRateScore = savingsRate * 100m;

        var expenseSeries = transactions
            .Where(x => x.Type == TransactionType.Expense)
            .GroupBy(x => new { x.TransactionDate.Year, x.TransactionDate.Month })
            .OrderBy(x => x.Key.Year).ThenBy(x => x.Key.Month)
            .Select(x => x.Sum(v => v.Amount))
            .ToList();
        var expenseStabilityScore = CalculateStabilityScore(expenseSeries);

        var budgets = await dbContext.Budgets
            .Where(x => x.UserId == userId && x.Month == today.Month && x.Year == today.Year)
            .ToListAsync(cancellationToken);
        var budgetAdherenceScore = 100m;
        if (budgets.Count > 0)
        {
            var overshoot = budgets.Sum(x =>
            {
                var spend = transactions.Where(t => t.Type == TransactionType.Expense && t.TransactionDate.Year == x.Year && t.TransactionDate.Month == x.Month && t.CategoryId == x.CategoryId).Sum(t => t.Amount);
                return Math.Max(0m, spend - x.Amount);
            });
            var totalBudget = budgets.Sum(x => x.Amount);
            budgetAdherenceScore = totalBudget <= 0 ? 100m : Math.Clamp(100m - ((overshoot / totalBudget) * 100m), 0m, 100m);
        }

        var balance = await dbContext.Accounts.Where(x => accountIds.Contains(x.Id)).SumAsync(x => x.CurrentBalance, cancellationToken);
        var monthlyExpenseAverage = expenseSeries.Count == 0 ? 0m : expenseSeries.Average();
        var cashBufferMonths = monthlyExpenseAverage <= 0 ? 6m : balance / monthlyExpenseAverage;
        var cashBufferScore = Math.Clamp((cashBufferMonths / 6m) * 100m, 0m, 100m);

        var weightedScore = (savingsRateScore * 0.30m) + (expenseStabilityScore * 0.20m) + (budgetAdherenceScore * 0.25m) + (cashBufferScore * 0.25m);
        var score = Math.Clamp(decimal.Round(weightedScore, 2), 0m, 100m);

        var breakdown = new[]
        {
            new HealthScoreFactor("Savings rate", decimal.Round(savingsRateScore, 2), "Higher is better. Tracks how much of income is retained."),
            new HealthScoreFactor("Expense stability", decimal.Round(expenseStabilityScore, 2), "Measures consistency of monthly expenses."),
            new HealthScoreFactor("Budget adherence", decimal.Round(budgetAdherenceScore, 2), "Penalizes spending above planned budgets."),
            new HealthScoreFactor("Cash buffer", decimal.Round(cashBufferScore, 2), "Based on how many months of expenses your balances can cover.")
        };

        var suggestions = new List<string>();
        if (savingsRateScore < 50m) suggestions.Add("Increase savings rate by reducing discretionary expenses or increasing income.");
        if (expenseStabilityScore < 50m) suggestions.Add("Stabilize month-to-month spending by capping variable categories.");
        if (budgetAdherenceScore < 60m) suggestions.Add("Review over-budget categories and tighten monthly budget limits.");
        if (cashBufferScore < 60m) suggestions.Add("Build an emergency buffer to cover at least three months of expenses.");
        if (suggestions.Count == 0) suggestions.Add("Your financial profile is healthy. Continue tracking trends and maintain savings discipline.");

        return new HealthScoreResponse(score, breakdown, suggestions);
    }

    public async Task<InsightsResponse> GetInsightsAsync(CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        var accountIds = await accountAccessService.GetReadableAccountIdsAsync(userId, cancellationToken);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var thisMonthStart = new DateOnly(today.Year, today.Month, 1);
        var lastMonthStart = thisMonthStart.AddMonths(-1);
        var sixMonthStart = thisMonthStart.AddMonths(-5);

        var transactions = await dbContext.Transactions
            .Where(x => accountIds.Contains(x.AccountId) && x.TransactionDate >= sixMonthStart)
            .ToListAsync(cancellationToken);

        var categories = await dbContext.Categories
            .Where(x => x.UserId == userId)
            .ToDictionaryAsync(x => x.Id, x => x.Name, cancellationToken);

        var thisMonth = transactions.Where(x => x.TransactionDate >= thisMonthStart).ToList();
        var lastMonth = transactions.Where(x => x.TransactionDate >= lastMonthStart && x.TransactionDate < thisMonthStart).ToList();

        var highlights = new List<InsightItem>();
        var foodCategoryIds = categories.Where(x => x.Value.Contains("food", StringComparison.OrdinalIgnoreCase)).Select(x => x.Key).ToHashSet();
        if (foodCategoryIds.Count > 0)
        {
            var foodThis = thisMonth.Where(x => x.Type == TransactionType.Expense && x.CategoryId.HasValue && foodCategoryIds.Contains(x.CategoryId.Value)).Sum(x => x.Amount);
            var foodLast = lastMonth.Where(x => x.Type == TransactionType.Expense && x.CategoryId.HasValue && foodCategoryIds.Contains(x.CategoryId.Value)).Sum(x => x.Amount);
            if (foodLast > 0)
            {
                var delta = ((foodThis - foodLast) / foodLast) * 100m;
                if (Math.Abs(delta) >= 5m)
                {
                    highlights.Add(new InsightItem(
                        "Food spending trend",
                        $"Your food spending {(delta >= 0 ? "increased" : "decreased")} by {Math.Abs(decimal.Round(delta, 1))}% this month.",
                        delta > 0 ? "warning" : "positive"));
                }
            }
        }

        var savingsThis = thisMonth.Where(x => x.Type == TransactionType.Income).Sum(x => x.Amount) - thisMonth.Where(x => x.Type == TransactionType.Expense).Sum(x => x.Amount);
        var savingsLast = lastMonth.Where(x => x.Type == TransactionType.Income).Sum(x => x.Amount) - lastMonth.Where(x => x.Type == TransactionType.Expense).Sum(x => x.Amount);
        if (savingsThis > savingsLast)
        {
            highlights.Add(new InsightItem("Savings progress", "You saved more than last month.", "positive"));
        }
        else if (savingsThis < savingsLast)
        {
            highlights.Add(new InsightItem("Savings progress", "Savings dropped compared to last month.", "warning"));
        }

        if (highlights.Count == 0)
        {
            highlights.Add(new InsightItem("Insight", "Add more categorized transactions to unlock richer insights.", "info"));
        }

        var savingsRateTrend = transactions
            .GroupBy(x => new { x.TransactionDate.Year, x.TransactionDate.Month })
            .OrderBy(x => x.Key.Year)
            .ThenBy(x => x.Key.Month)
            .Select(x =>
            {
                var income = x.Where(v => v.Type == TransactionType.Income).Sum(v => v.Amount);
                var expense = x.Where(v => v.Type == TransactionType.Expense).Sum(v => v.Amount);
                var rate = income <= 0 ? 0m : Math.Clamp(((income - expense) / income) * 100m, 0m, 100m);
                return new SavingsRateTrendPoint($"{x.Key.Year}-{x.Key.Month:00}", decimal.Round(rate, 2));
            })
            .ToList();

        return new InsightsResponse(highlights, savingsRateTrend);
    }

    private static decimal CalculateStabilityScore(IReadOnlyCollection<decimal> values)
    {
        if (values.Count < 2) return 60m;
        var mean = values.Average();
        if (mean <= 0) return 60m;
        var variance = values.Select(v => (v - mean) * (v - mean)).Average();
        var standardDeviation = (decimal)Math.Sqrt((double)variance);
        var cv = standardDeviation / mean;
        return Math.Clamp((1m - Math.Min(cv, 1m)) * 100m, 0m, 100m);
    }
}
