using Domain.Enums;

namespace Application.DTOs.Goals;

public sealed record CreateGoalRequest(string Name, decimal TargetAmount, DateOnly? TargetDate, Guid? LinkedAccountId, string Icon, string Color);
public sealed record UpdateGoalRequest(string Name, decimal TargetAmount, DateOnly? TargetDate, Guid? LinkedAccountId, string Icon, string Color, GoalStatus Status);
public sealed record GoalContributionRequest(decimal Amount, Guid? SourceAccountId, string? Note, DateOnly Date);
public sealed record GoalResponse(Guid Id, string Name, decimal TargetAmount, decimal CurrentAmount, DateOnly? TargetDate, Guid? LinkedAccountId, string Icon, string Color, GoalStatus Status, decimal ProgressPercent);
