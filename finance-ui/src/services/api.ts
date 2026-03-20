import { api } from '../lib/api';
import type { Account, AuthResponse, Budget, Category, DashboardResponse, Goal, RecurringItem, Transaction, User } from '../types/api';

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
  updateTransaction: async (id: string, payload: unknown) => (await api.put<Transaction>(`/transactions/${id}`, payload)).data,
  deleteTransaction: async (id: string) => (await api.delete(`/transactions/${id}`)).data,

  getAccounts: async () => (await api.get<Account[]>('/accounts')).data,
  createAccount: async (payload: unknown) => (await api.post<Account>('/accounts', payload)).data,
  updateAccount: async (id: string, payload: unknown) => (await api.put<Account>(`/accounts/${id}`, payload)).data,
  deleteAccount: async (id: string) => (await api.delete(`/accounts/${id}`)).data,

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

  getCategorySpend: async () => (await api.get<Array<{ category: string; totalAmount: number }>>('/reports/category-spend')).data,
  getIncomeExpense: async () => (await api.get<Array<{ period: string; income: number; expense: number }>>('/reports/income-vs-expense')).data,
};
