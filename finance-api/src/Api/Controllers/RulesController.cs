using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Application.Abstractions.Services;
using Application.DTOs.Rules;

namespace Api.Controllers;

[ApiController]
[Authorize]
[Route("api/rules")]
public sealed class RulesController(IRuleService ruleService) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyCollection<RuleResponse>> Get(CancellationToken cancellationToken)
        => ruleService.GetAsync(cancellationToken);

    [HttpPost]
    public Task<RuleResponse> Create([FromBody] CreateRuleRequest request, CancellationToken cancellationToken)
        => ruleService.CreateAsync(request, cancellationToken);

    [HttpPut("{id:guid}")]
    public Task<RuleResponse> Update(Guid id, [FromBody] UpdateRuleRequest request, CancellationToken cancellationToken)
        => ruleService.UpdateAsync(id, request, cancellationToken);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await ruleService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
