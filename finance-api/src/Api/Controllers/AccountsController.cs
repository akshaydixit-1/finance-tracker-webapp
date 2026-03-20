using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Application.Abstractions.Services;
using Application.DTOs.Accounts;

namespace Api.Controllers;

[ApiController]
[Authorize]
[Route("api/accounts")]
public sealed class AccountsController(IAccountService accountService) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyCollection<AccountResponse>> Get(CancellationToken cancellationToken) => accountService.GetAllAsync(cancellationToken);

    [HttpPost]
    public Task<AccountResponse> Create([FromBody] CreateAccountRequest request, CancellationToken cancellationToken) => accountService.CreateAsync(request, cancellationToken);

    [HttpPut("{id:guid}")]
    public Task<AccountResponse> Update(Guid id, [FromBody] UpdateAccountRequest request, CancellationToken cancellationToken) => accountService.UpdateAsync(id, request, cancellationToken);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await accountService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
    [HttpPost("transfer")]
    public async Task<IActionResult> Transfer([FromBody] TransferFundsRequest request, CancellationToken cancellationToken)
    {
        await accountService.TransferAsync(request, cancellationToken);
        return Ok(new { message = "Transfer completed successfully." });
    }
}

