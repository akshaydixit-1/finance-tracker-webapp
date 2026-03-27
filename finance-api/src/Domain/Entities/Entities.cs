using Domain.Common;
using Domain.Enums;

namespace Domain.Entities;

public sealed class ApplicationUser : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<PasswordResetToken> PasswordResetTokens { get; set; } = new List<PasswordResetToken>();
}

public sealed class RefreshToken : BaseEntity
{
    public Guid UserId { get; set; }
    public ApplicationUser User { get; set; } = null!;
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public bool IsActive => RevokedAtUtc is null && ExpiresAtUtc > DateTime.UtcNow;
}

public sealed class PasswordResetToken : BaseEntity
{
    public Guid UserId { get; set; }
    public ApplicationUser User { get; set; } = null!;
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? UsedAtUtc { get; set; }
}

public sealed class Account : BaseEntity
{
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public AccountType Type { get; set; }
    public decimal OpeningBalance { get; set; }
    public decimal CurrentBalance { get; set; }
    public string? InstitutionName { get; set; }
    public ICollection<AccountMember> Members { get; set; } = new List<AccountMember>();
}

public sealed class Category : BaseEntity
{
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public CategoryType Type { get; set; }
    public string Color { get; set; } = "#2563EB";
    public string Icon { get; set; } = "CircleDollarSign";
    public bool IsArchived { get; set; }
}

public sealed class Transaction : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid AccountId { get; set; }
    public Guid? DestinationAccountId { get; set; }
    public Guid? CategoryId { get; set; }
    public Guid? RecurringTransactionId { get; set; }
    public Guid? TransferGroupId { get; set; }
    public TransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public DateOnly TransactionDate { get; set; }
    public string? Merchant { get; set; }
    public string? Note { get; set; }
    public string? PaymentMethod { get; set; }
    public List<string> Tags { get; set; } = new();
    public List<string> RuleAlerts { get; set; } = new();
}

public sealed class Budget : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid CategoryId { get; set; }
    public Guid? AccountId { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    public decimal Amount { get; set; }
    public int AlertThresholdPercent { get; set; } = 80;
}

public sealed class Goal : BaseEntity
{
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal TargetAmount { get; set; }
    public decimal CurrentAmount { get; set; }
    public DateOnly? TargetDate { get; set; }
    public Guid? LinkedAccountId { get; set; }
    public string Icon { get; set; } = "PiggyBank";
    public string Color { get; set; } = "#059669";
    public GoalStatus Status { get; set; } = GoalStatus.Active;
}

public sealed class RecurringTransaction : BaseEntity
{
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public TransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public Guid? CategoryId { get; set; }
    public Guid? AccountId { get; set; }
    public RecurringFrequency Frequency { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public DateOnly NextRunDate { get; set; }
    public bool AutoCreateTransaction { get; set; } = true;
    public bool IsPaused { get; set; }
}

public sealed class Rule : BaseEntity
{
    public Guid UserId { get; set; }
    public string ConditionJson { get; set; } = "{}";
    public string ActionJson { get; set; } = "{}";
    public RuleField ConditionField { get; set; }
    public RuleOperator ConditionOperator { get; set; }
    public string ConditionValue { get; set; } = string.Empty;
    public RuleActionType ActionType { get; set; }
    public string ActionValue { get; set; } = string.Empty;
    public int Priority { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class AccountMember : BaseEntity
{
    public Guid AccountId { get; set; }
    public Account Account { get; set; } = null!;
    public Guid UserId { get; set; }
    public ApplicationUser User { get; set; } = null!;
    public AccountMemberRole Role { get; set; } = AccountMemberRole.Viewer;
}

public sealed class AccountActivity : BaseEntity
{
    public Guid AccountId { get; set; }
    public Guid ActorUserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public string? Metadata { get; set; }
}
