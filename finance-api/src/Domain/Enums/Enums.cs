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
