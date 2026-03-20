using Microsoft.EntityFrameworkCore;
using Application.Abstractions.Auth;
using Application.Abstractions.Persistence;
using Application.Abstractions.Services;
using Application.DTOs.Reports;
using Domain.Entities;
using Domain.Enums;

namespace Application.Services;

public sealed class ReportService(IAppDbContext dbContext, ICurrentUserService currentUserService) : IReportService
{
    public async Task<IReadOnlyCollection<CategorySpendReportItem>> GetCategorySpendAsync(ReportFilterRequest request, CancellationToken cancellationToken)
    {
        var transactions = await GetFilteredTransactionsAsync(request, cancellationToken);
        var categories = await GetCategoryLookupAsync(cancellationToken);

        return transactions
            .Where(x => x.Type == TransactionType.Expense && x.CategoryId.HasValue && categories.ContainsKey(x.CategoryId.Value))
            .GroupBy(x => categories[x.CategoryId!.Value])
            .Select(x => new CategorySpendReportItem(x.Key, x.Sum(v => v.Amount)))
            .OrderByDescending(x => x.TotalAmount)
            .ToList();
    }

    public async Task<IReadOnlyCollection<IncomeExpenseTrendItem>> GetIncomeVsExpenseAsync(ReportFilterRequest request, CancellationToken cancellationToken)
    {
        var transactions = await GetFilteredTransactionsAsync(request, cancellationToken);

        return transactions
            .GroupBy(x => new { x.TransactionDate.Year, x.TransactionDate.Month })
            .OrderBy(x => x.Key.Year)
            .ThenBy(x => x.Key.Month)
            .Select(x => new IncomeExpenseTrendItem(
                $"{x.Key.Year}-{x.Key.Month:00}",
                x.Where(v => v.Type == TransactionType.Income).Sum(v => v.Amount),
                x.Where(v => v.Type == TransactionType.Expense).Sum(v => v.Amount)))
            .ToList();
    }

    public async Task<IReadOnlyCollection<AccountBalanceTrendItem>> GetAccountBalanceTrendAsync(ReportFilterRequest request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        return await dbContext.Accounts.Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CurrentBalance)
            .Select(x => new AccountBalanceTrendItem(x.Name, x.CurrentBalance))
            .ToListAsync(cancellationToken);
    }

    public async Task<string> ExportTransactionsCsvAsync(ReportFilterRequest request, CancellationToken cancellationToken)
    {
        var transactions = await GetFilteredTransactionsAsync(request, cancellationToken);

        var lines = new List<string> { "date,type,amount,merchant,note" };
        lines.AddRange(transactions
            .OrderByDescending(x => x.TransactionDate)
            .Select(x => $"{x.TransactionDate:yyyy-MM-dd},{x.Type},{x.Amount},{Escape(x.Merchant)},{Escape(x.Note)}"));
        return string.Join(Environment.NewLine, lines);
    }

    private async Task<List<Transaction>> GetFilteredTransactionsAsync(ReportFilterRequest request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        var query = dbContext.Transactions.Where(x => x.UserId == userId);
        if (request.From.HasValue) query = query.Where(x => x.TransactionDate >= request.From.Value);
        if (request.To.HasValue) query = query.Where(x => x.TransactionDate <= request.To.Value);
        if (request.AccountId.HasValue) query = query.Where(x => x.AccountId == request.AccountId.Value);
        if (request.CategoryId.HasValue) query = query.Where(x => x.CategoryId == request.CategoryId.Value);
        if (request.Type.HasValue) query = query.Where(x => x.Type == request.Type.Value);

        return await query.ToListAsync(cancellationToken);
    }

    private async Task<Dictionary<Guid, string>> GetCategoryLookupAsync(CancellationToken cancellationToken)
    {
        var userId = currentUserService.GetUserId();
        return await dbContext.Categories
            .Where(x => x.UserId == userId)
            .ToDictionaryAsync(x => x.Id, x => x.Name, cancellationToken);
    }

    private static string Escape(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var escaped = value.Replace("\"", "\"\"");
        return $"\"{escaped}\"";
    }
}
