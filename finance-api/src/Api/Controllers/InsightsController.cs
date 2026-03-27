using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Application.Abstractions.Services;
using Application.DTOs.Insights;

namespace Api.Controllers;

[ApiController]
[Authorize]
[Route("api/insights")]
public sealed class InsightsController(IInsightsService insightsService) : ControllerBase
{
    [HttpGet("health-score")]
    public Task<HealthScoreResponse> HealthScore(CancellationToken cancellationToken)
        => insightsService.GetHealthScoreAsync(cancellationToken);

    [HttpGet]
    public Task<InsightsResponse> Insights(CancellationToken cancellationToken)
        => insightsService.GetInsightsAsync(cancellationToken);
}
