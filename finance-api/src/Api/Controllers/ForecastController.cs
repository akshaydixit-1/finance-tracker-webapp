using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Application.Abstractions.Services;
using Application.DTOs.Forecast;

namespace Api.Controllers;

[ApiController]
[Authorize]
[Route("api/forecast")]
public sealed class ForecastController(IForecastService forecastService) : ControllerBase
{
    [HttpGet("month")]
    public Task<ForecastMonthResponse> Month(CancellationToken cancellationToken)
        => forecastService.GetMonthForecastAsync(cancellationToken);

    [HttpGet("daily")]
    public Task<IReadOnlyCollection<ForecastDailyPoint>> Daily(CancellationToken cancellationToken)
        => forecastService.GetDailyForecastAsync(cancellationToken);
}
