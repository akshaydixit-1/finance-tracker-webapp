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
  ruleAlerts?: string[];
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
  accountId?: string | null;
  accountName?: string | null;
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
  financialHealthScore: number;
  projectedEndOfMonthBalance: number;
  safeToSpendAmount: number;
  forecastDaily: Array<{ date: string; projectedBalance: number }>;
  forecastWarnings: string[];
  budgetProgress: Array<{ id: string; category: string; budgetAmount: number; actualAmount: number; usagePercent: number }>;
  categorySpend: Array<{ category: string; amount: number }>;
  incomeVsExpense: Array<{ period: string; income: number; expense: number }>;
  recentTransactions: Array<{ id: string; merchant: string; amount: number; type: string; date: string }>;
  upcomingRecurring: Array<{ id: string; title: string; amount: number; nextRunDate: string }>;
  goals: Array<{ id: string; name: string; currentAmount: number; targetAmount: number; progressPercent: number }>;
};

export type ForecastMonth = {
  currentBalance: number;
  forecastedEndOfMonthBalance: number;
  upcomingKnownExpenses: number;
  upcomingKnownIncome: number;
  safeToSpendAmount: number;
  riskWarnings: string[];
};

export type ForecastDaily = {
  date: string;
  projectedBalance: number;
  knownExpense: number;
  knownIncome: number;
};

export type HealthScoreFactor = {
  name: string;
  score: number;
  description: string;
};

export type HealthScoreResponse = {
  score: number;
  breakdown: HealthScoreFactor[];
  suggestions: string[];
};

export type InsightItem = {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'positive';
};

export type InsightsResponse = {
  highlights: InsightItem[];
  savingsRateTrend: Array<{ period: string; savingsRatePercent: number }>;
};

export type Rule = {
  id: string;
  conditionField: string;
  conditionOperator: string;
  conditionValue: string;
  actionType: string;
  actionValue: string;
  priority: number;
  isActive: boolean;
  createdAtUtc: string;
};

export type AccountMember = {
  userId: string;
  email: string;
  displayName: string;
  role: 'Owner' | 'Editor' | 'Viewer';
};

export type AccountActivity = {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: string | null;
  createdAtUtc: string;
};
