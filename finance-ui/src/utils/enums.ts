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

export const accountMemberRoleMap = {
  Owner: 1,
  Editor: 2,
  Viewer: 3,
} as const;

export const ruleFieldMap = {
  Merchant: 1,
  Amount: 2,
  Category: 3,
  Type: 4,
  Note: 5,
} as const;

export const ruleOperatorMap = {
  Equals: 1,
  Contains: 2,
  GreaterThan: 3,
  LessThan: 4,
  StartsWith: 5,
  EndsWith: 6,
} as const;

export const ruleActionTypeMap = {
  SetCategory: 1,
  AddTag: 2,
  TriggerAlert: 3,
} as const;
