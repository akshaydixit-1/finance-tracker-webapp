import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { ProtectedRoute } from '../../components/ui/ProtectedRoute';
import { AccountsPage } from '../../pages/AccountsPage';
import { BudgetsPage } from '../../pages/BudgetsPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { ForgotPasswordPage } from '../../pages/ForgotPasswordPage';
import { GoalsPage } from '../../pages/GoalsPage';
import { LoginPage } from '../../pages/LoginPage';
import { RecurringPage } from '../../pages/RecurringPage';
import { RegisterPage } from '../../pages/RegisterPage';
import { ReportsPage } from '../../pages/ReportsPage';
import { TransactionsPage } from '../../pages/TransactionsPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  {
    path: '/',
    element: <ProtectedRoute><AppShell /></ProtectedRoute>,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'budgets', element: <BudgetsPage /> },
      { path: 'goals', element: <GoalsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'recurring', element: <RecurringPage /> },
      { path: 'accounts', element: <AccountsPage /> },
      { path: '*', element: <Navigate to='/' replace /> },
    ],
  },
]);
