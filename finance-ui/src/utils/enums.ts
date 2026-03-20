export const transactionTypeMap = {
  Income: 1,
  Expense: 2,
  Transfer: 3,
} as const;

export const categoryTypeMap = {
  Income: 1,
  Expense: 2,
} as const;

export const accountTypeMap = {
  Bank: 1,
  CreditCard: 2,
  CashWallet: 3,
  Savings: 4,
} as const;

export const recurringFrequencyMap = {
  Daily: 1,
  Weekly: 2,
  Monthly: 3,
  Yearly: 4,
} as const;
