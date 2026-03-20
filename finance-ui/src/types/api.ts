export type User = {
  id: string;
  email: string;
  displayName: string;
};

export type AuthResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
};

export type SummaryCard = {
  label: string;
  value: number;
  accent: string;
};

export type Transaction = {
  id: string;
  accountId: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  type: 'Income' | 'Expense' | 'Transfer';
  amount: number;
  date: string;
  merchant?: string | null;
  note?: string | null;
  paymentMethod?: string | null;
  tags: string[];
  createdAtUtc: string;
};

export type Account = {
  id: string;
  name: string;
  type: string;
  openingBalance: number;
  currentBalance: number;
  institutionName?: string | null;
};

export type Category = {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  isArchived: boolean;
};

export type Budget = {
  id: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  actualSpend: number;
  month: number;
  year: number;
  usagePercent: number;
  alertThresholdPercent: number;
};

export type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string | null;
  linkedAccountId?: string | null;
  icon: string;
  color: string;
  status: string;
  progressPercent: number;
};

export type RecurringItem = {
  id: string;
  title: string;
  type: string;
  amount: number;
  categoryId?: string | null;
  accountId?: string | null;
  frequency: string;
  startDate: string;
  endDate?: string | null;
  nextRunDate: string;
  autoCreateTransaction: boolean;
  isPaused: boolean;
};

export type DashboardResponse = {
  summaryCards: SummaryCard[];
  budgetProgress: Array<{ id: string; category: string; budgetAmount: number; actualAmount: number; usagePercent: number }>;
  categorySpend: Array<{ category: string; amount: number }>;
  incomeVsExpense: Array<{ period: string; income: number; expense: number }>;
  recentTransactions: Array<{ id: string; merchant: string; amount: number; type: string; date: string }>;
  upcomingRecurring: Array<{ id: string; title: string; amount: number; nextRunDate: string }>;
  goals: Array<{ id: string; name: string; currentAmount: number; targetAmount: number; progressPercent: number }>;
};
