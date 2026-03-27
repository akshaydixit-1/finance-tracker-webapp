using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Application.Abstractions.Services;
using Application.Common.Models;
using Application.DTOs.Transactions;

namespace Api.Controllers;

[ApiController]
[Authorize]
[Route("api/transactions")]
public sealed class TransactionsController(ITransactionService transactionService) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<TransactionResponse>> Get([FromQuery] TransactionQueryRequest request, CancellationToken cancellationToken) => transactionService.GetAsync(request, cancellationToken);

    [HttpGet("{id:guid}")]
    public Task<TransactionResponse> GetById(Guid id, CancellationToken cancellationToken) => transactionService.GetByIdAsync(id, cancellationToken);

    [HttpPost]
    public Task<TransactionResponse> Create([FromBody] CreateTransactionRequest request, CancellationToken cancellationToken) => transactionService.CreateAsync(request, cancellationToken);

    [HttpPost("import")]
    public async Task<IReadOnlyCollection<TransactionResponse>> Import([FromBody] ImportTransactionsRequest request, CancellationToken cancellationToken)
    {
        var result = new List<TransactionResponse>();
        foreach (var item in request.Items)
        {
            result.Add(await transactionService.CreateAsync(item, cancellationToken));
        }

        return result;
    }

    [HttpPut("{id:guid}")]
    public Task<TransactionResponse> Update(Guid id, [FromBody] UpdateTransactionRequest request, CancellationToken cancellationToken) => transactionService.UpdateAsync(id, request, cancellationToken);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await transactionService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
