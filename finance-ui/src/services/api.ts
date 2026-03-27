import { api } from '../lib/api';
import type {
  Account,
  AccountActivity,
  AccountMember,
  AuthResponse,
  Budget,
  Category,
  DashboardResponse,
  ForecastDaily,
  ForecastMonth,
  Goal,
  HealthScoreResponse,
  InsightsResponse,
  RecurringItem,
  Rule,
  Transaction,
  User,
} from '../types/api';

export const authApi = {
  register: async (payload: { email: string; password: string; displayName: string }) => (await api.post<AuthResponse>('/auth/register', payload)).data,
  login: async (payload: { email: string; password: string }) => (await api.post<AuthResponse>('/auth/login', payload)).data,
  forgotPassword: async (payload: { email: string }) => (await api.post('/auth/forgot-password', payload)).data,
  me: async () => (await api.get<User>('/auth/me')).data,
};

export const dashboardApi = {
  get: async () => (await api.get<DashboardResponse>('/dashboard')).data,
};

export const financeApi = {
  getTransactions: async () => (await api.get<{ items: Transaction[] }>('/transactions')).data.items,
  createTransaction: async (payload: unknown) => (await api.post<Transaction>('/transactions', payload)).data,
  importTransactions: async (payload: { items: unknown[] }) => (await api.post<Transaction[]>('/transactions/import', payload)).data,
  updateTransaction: async (id: string, payload: unknown) => (await api.put<Transaction>(`/transactions/${id}`, payload)).data,
  deleteTransaction: async (id: string) => (await api.delete(`/transactions/${id}`)).data,

  getAccounts: async () => (await api.get<Account[]>('/accounts')).data,
  createAccount: async (payload: unknown) => (await api.post<Account>('/accounts', payload)).data,
  updateAccount: async (id: string, payload: unknown) => (await api.put<Account>(`/accounts/${id}`, payload)).data,
  deleteAccount: async (id: string) => (await api.delete(`/accounts/${id}`)).data,
  getAccountMembers: async (accountId: string) => (await api.get<AccountMember[]>(`/accounts/${accountId}/members`)).data,
  inviteAccountMember: async (accountId: string, payload: { email: string; role: number }) => (await api.post(`/accounts/${accountId}/invite`, payload)).data,
  updateAccountMemberRole: async (accountId: string, userId: string, payload: { role: number }) => (await api.put(`/accounts/${accountId}/members/${userId}`, payload)).data,
  getAccountActivity: async (accountId: string) => (await api.get<AccountActivity[]>(`/accounts/${accountId}/activity`)).data,

  getCategories: async () => (await api.get<Category[]>('/categories')).data,
  createCategory: async (payload: unknown) => (await api.post<Category>('/categories', payload)).data,
  updateCategory: async (id: string, payload: unknown) => (await api.put<Category>(`/categories/${id}`, payload)).data,
  deleteCategory: async (id: string) => (await api.delete(`/categories/${id}`)).data,

  getBudgets: async (month: number, year: number) => (await api.get<Budget[]>(`/budgets?month=${month}&year=${year}`)).data,
  createBudget: async (payload: unknown) => (await api.post<Budget>('/budgets', payload)).data,
  updateBudget: async (id: string, payload: unknown) => (await api.put<Budget>(`/budgets/${id}`, payload)).data,
  deleteBudget: async (id: string) => (await api.delete(`/budgets/${id}`)).data,

  getGoals: async () => (await api.get<Goal[]>('/goals')).data,
  createGoal: async (payload: unknown) => (await api.post<Goal>('/goals', payload)).data,
  updateGoal: async (id: string, payload: unknown) => (await api.put<Goal>(`/goals/${id}`, payload)).data,
  deleteGoal: async (id: string) => (await api.delete(`/goals/${id}`)).data,
  contributeGoal: async (id: string, payload: unknown) => (await api.post<Goal>(`/goals/${id}/contribute`, payload)).data,

  getRecurring: async () => (await api.get<RecurringItem[]>('/recurring')).data,
  createRecurring: async (payload: unknown) => (await api.post<RecurringItem>('/recurring', payload)).data,
  updateRecurring: async (id: string, payload: unknown) => (await api.put<RecurringItem>(`/recurring/${id}`, payload)).data,
  deleteRecurring: async (id: string) => (await api.delete(`/recurring/${id}`)).data,

  getCategorySpend: async (params?: string) => (await api.get<Array<{ category: string; totalAmount: number }>>(`/reports/category-spend${params ? `?${params}` : ''}`)).data,
  getIncomeExpense: async (params?: string) => (await api.get<Array<{ period: string; income: number; expense: number }>>(`/reports/income-vs-expense${params ? `?${params}` : ''}`)).data,
  getReportTrends: async (params?: string) => (await api.get<{ categoryTrends: Array<{ period: string; category: string; amount: number }>; incomeExpense: Array<{ period: string; income: number; expense: number }>; savingsRate: Array<{ period: string; savingsRatePercent: number }> }>(`/reports/trends${params ? `?${params}` : ''}`)).data,
  getNetWorth: async (params?: string) => (await api.get<Array<{ period: string; netWorth: number }>>(`/reports/net-worth${params ? `?${params}` : ''}`)).data,
};

export const forecastApi = {
  getMonth: async () => (await api.get<ForecastMonth>('/forecast/month')).data,
  getDaily: async () => (await api.get<ForecastDaily[]>('/forecast/daily')).data,
};

export const insightsApi = {
  getHealthScore: async () => (await api.get<HealthScoreResponse>('/insights/health-score')).data,
  getInsights: async () => (await api.get<InsightsResponse>('/insights')).data,
};

export const rulesApi = {
  getRules: async () => (await api.get<Rule[]>('/rules')).data,
  createRule: async (payload: unknown) => (await api.post<Rule>('/rules', payload)).data,
  updateRule: async (id: string, payload: unknown) => (await api.put<Rule>(`/rules/${id}`, payload)).data,
  deleteRule: async (id: string) => (await api.delete(`/rules/${id}`)).data,
};
