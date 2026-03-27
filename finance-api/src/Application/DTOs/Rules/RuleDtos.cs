using Domain.Enums;

namespace Application.DTOs.Rules;

public sealed record CreateRuleRequest(
    RuleField ConditionField,
    RuleOperator ConditionOperator,
    string ConditionValue,
    RuleActionType ActionType,
    string ActionValue,
    int Priority,
    bool IsActive);

public sealed record UpdateRuleRequest(
    RuleField ConditionField,
    RuleOperator ConditionOperator,
    string ConditionValue,
    RuleActionType ActionType,
    string ActionValue,
    int Priority,
    bool IsActive);

public sealed record RuleResponse(
    Guid Id,
    RuleField ConditionField,
    RuleOperator ConditionOperator,
    string ConditionValue,
    RuleActionType ActionType,
    string ActionValue,
    int Priority,
    bool IsActive,
    DateTime CreatedAtUtc);
