using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Application.Abstractions.Services;
using Application.DTOs.Reports;

namespace Api.Controllers;

[ApiController]
[Authorize]
[Route("api/reports")]
public sealed class ReportsController(IReportService reportService) : ControllerBase
{
    [HttpGet("category-spend")]
    public Task<IReadOnlyCollection<CategorySpendReportItem>> CategorySpend([FromQuery] ReportFilterRequest request, CancellationToken cancellationToken) => reportService.GetCategorySpendAsync(request, cancellationToken);

    [HttpGet("income-vs-expense")]
    public Task<IReadOnlyCollection<IncomeExpenseTrendItem>> IncomeVsExpense([FromQuery] ReportFilterRequest request, CancellationToken cancellationToken) => reportService.GetIncomeVsExpenseAsync(request, cancellationToken);

    [HttpGet("account-balance-trend")]
    public Task<IReadOnlyCollection<AccountBalanceTrendItem>> AccountBalanceTrend([FromQuery] ReportFilterRequest request, CancellationToken cancellationToken) => reportService.GetAccountBalanceTrendAsync(request, cancellationToken);

    [HttpGet("trends")]
    public async Task<IActionResult> Trends([FromQuery] ReportFilterRequest request, CancellationToken cancellationToken)
    {
        var categoryTrends = await reportService.GetCategoryTrendsAsync(request, cancellationToken);
        var incomeExpense = await reportService.GetIncomeVsExpenseAsync(request, cancellationToken);
        var savingsRate = await reportService.GetSavingsRateTrendAsync(request, cancellationToken);
        return Ok(new
        {
            categoryTrends,
            incomeExpense,
            savingsRate
        });
    }

    [HttpGet("net-worth")]
    public Task<IReadOnlyCollection<NetWorthPoint>> NetWorth([FromQuery] ReportFilterRequest request, CancellationToken cancellationToken)
        => reportService.GetNetWorthTrendAsync(request, cancellationToken);

    [HttpGet("export")]
    public async Task<FileContentResult> Export([FromQuery] ReportFilterRequest request, CancellationToken cancellationToken)
    {
        var csv = await reportService.ExportTransactionsCsvAsync(request, cancellationToken);
        return File(Encoding.UTF8.GetBytes(csv), "text/csv", "transactions-export.csv");
    }
}
