using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Application.Abstractions.Services;
using Application.DTOs.Dashboard;

namespace Api.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public sealed class DashboardController(IDashboardService dashboardService) : ControllerBase
{
    [HttpGet]
    public Task<DashboardResponse> Get(CancellationToken cancellationToken) => dashboardService.GetAsync(cancellationToken);
}
