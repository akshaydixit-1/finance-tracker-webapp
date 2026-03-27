namespace Domain.Enums;

public enum TransactionType
{
    Income = 1,
    Expense = 2,
    Transfer = 3
}

public enum CategoryType
{
    Income = 1,
    Expense = 2
}

public enum AccountType
{
    Bank = 1,
    CreditCard = 2,
    CashWallet = 3,
    Savings = 4
}

public enum GoalStatus
{
    Active = 1,
    Completed = 2,
    Paused = 3
}

public enum RecurringFrequency
{
    Daily = 1,
    Weekly = 2,
    Monthly = 3,
    Yearly = 4
}

public enum AccountMemberRole
{
    Owner = 1,
    Editor = 2,
    Viewer = 3
}

public enum RuleField
{
    Merchant = 1,
    Amount = 2,
    Category = 3,
    Type = 4,
    Note = 5
}

public enum RuleOperator
{
    Equals = 1,
    Contains = 2,
    GreaterThan = 3,
    LessThan = 4,
    StartsWith = 5,
    EndsWith = 6
}

public enum RuleActionType
{
    SetCategory = 1,
    AddTag = 2,
    TriggerAlert = 3
}
