using Microsoft.EntityFrameworkCore;
using Application.Abstractions.Auth;
using Application.Abstractions.Persistence;
using Application.Abstractions.Services;
using Application.DTOs.Forecast;
using Domain.Entities;
using Domain.Enums;

namespace Application.Services;

public sealed class ForecastService(
    IAppDbContext dbContext,
    ICurrentUserService currentUserService,
    IAccountAccessService accountAccessService) : IForecastService
{
    public async Task<ForecastMonthResponse> GetMonthForecastAsync(CancellationToken cancellationToken)
    {
        var daily = await GetForecastInternalAsync(cancellationToken);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var end = EndOfMonth(today);
        var current = daily.FirstOrDefault(x => x.Date == today)?.ProjectedBalance ?? 0m;
        var projectedEnd = daily.LastOrDefault()?.ProjectedBalance ?? current;
        var knownExpense = daily.Where(x => x.Date >= today && x.Date <= end).Sum(x => x.KnownExpense);
        var knownIncome = daily.Where(x => x.Date >= today && x.Date <= end).Sum(x => x.KnownIncome);
        var daysLeft = Math.Max(1, end.Day - today.Day + 1);
        var safeToSpend = Math.Max(0m, projectedEnd / daysLeft);

        var warnings = new List<string>();
        if (daily.Any(x => x.ProjectedBalance < 0))
        {
            warnings.Add("Negative balance likely before month end.");
        }
        if (projectedEnd < 0)
        {
            warnings.Add("Projected end-of-month balance is negative.");
        }
        if (knownExpense > knownIncome && (knownExpense - knownIncome) > Math.Max(current, 0m))
        {
            warnings.Add("Known recurring expenses may exceed available balance.");
        }

        return new ForecastMonthResponse(current, projectedEnd, knownExpense, knownIncome, safeToSpend, warnings);
    }

    public async Task<IReadOnlyCollection<ForecastDailyPoint>> GetDailyForecastAsync(CancellationToken cancellationToken)
        => await GetForecastInternalAsync(cancellationToken);

    private async Task<List<ForecastDailyPoint>> GetForecastInternalAsync(CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var startHistory = today.AddMonths(-6);
        var end = EndOfMonth(today);
        var accountIds = await accountAccessService.GetReadableAccountIdsAsync(userId, cancellationToken);

        var accounts = await dbContext.Accounts.Where(x => accountIds.Contains(x.Id)).ToListAsync(cancellationToken);
        var currentBalance = accounts.Sum(x => x.CurrentBalance);

        var historyTransactions = await dbContext.Transactions
            .Where(x => accountIds.Contains(x.AccountId) && x.TransactionDate >= startHistory && x.TransactionDate <= today)
            .ToListAsync(cancellationToken);

        var recurring = await dbContext.RecurringTransactions
            .Where(x => x.UserId == userId && !x.IsPaused && x.NextRunDate <= end && (x.EndDate == null || x.EndDate >= today))
            .ToListAsync(cancellationToken);

        var historicalDays = Math.Max(30, (today.DayNumber - startHistory.DayNumber) + 1);
        var hasSparseData = historyTransactions.Count < 15;

        var avgDailyIncome = historyTransactions.Where(x => x.Type == TransactionType.Income).Sum(x => x.Amount) / historicalDays;
        var avgDailyExpense = historyTransactions.Where(x => x.Type == TransactionType.Expense).Sum(x => x.Amount) / historicalDays;

        if (hasSparseData)
        {
            avgDailyIncome = Math.Max(avgDailyIncome, recurring.Where(x => x.Type == TransactionType.Income).DefaultIfEmpty().Average(x => x?.Amount ?? 0m) / 30m);
            avgDailyExpense = Math.Max(avgDailyExpense, recurring.Where(x => x.Type == TransactionType.Expense).DefaultIfEmpty().Average(x => x?.Amount ?? 0m) / 30m);
        }

        var recurringByDate = BuildRecurringSchedule(recurring, today, end);
        var result = new List<ForecastDailyPoint>();
        var runningBalance = currentBalance;
        for (var date = today; date <= end; date = date.AddDays(1))
        {
            var knownIncome = recurringByDate.TryGetValue(date, out var value) ? value.Income : 0m;
            var knownExpense = recurringByDate.TryGetValue(date, out value) ? value.Expense : 0m;
            runningBalance += avgDailyIncome - avgDailyExpense + knownIncome - knownExpense;
            result.Add(new ForecastDailyPoint(date, runningBalance, knownExpense, knownIncome));
        }

        return result;
    }

    private static Dictionary<DateOnly, (decimal Income, decimal Expense)> BuildRecurringSchedule(
        IEnumerable<RecurringTransaction> recurring,
        DateOnly from,
        DateOnly to)
    {
        var schedule = new Dictionary<DateOnly, (decimal Income, decimal Expense)>();
        foreach (var item in recurring)
        {
            var runDate = item.NextRunDate < from ? from : item.NextRunDate;
            while (runDate <= to && (!item.EndDate.HasValue || runDate <= item.EndDate.Value))
            {
                var entry = schedule.TryGetValue(runDate, out var existing) ? existing : (Income: 0m, Expense: 0m);
                if (item.Type == TransactionType.Income)
                {
                    schedule[runDate] = (entry.Income + item.Amount, entry.Expense);
                }
                else if (item.Type == TransactionType.Expense)
                {
                    schedule[runDate] = (entry.Income, entry.Expense + item.Amount);
                }

                runDate = item.Frequency switch
                {
                    RecurringFrequency.Daily => runDate.AddDays(1),
                    RecurringFrequency.Weekly => runDate.AddDays(7),
                    RecurringFrequency.Monthly => runDate.AddMonths(1),
                    RecurringFrequency.Yearly => runDate.AddYears(1),
                    _ => runDate.AddMonths(1)
                };
            }
        }

        return schedule;
    }

    private static DateOnly EndOfMonth(DateOnly date)
    {
        var last = DateTime.DaysInMonth(date.Year, date.Month);
        return new DateOnly(date.Year, date.Month, last);
    }
}
