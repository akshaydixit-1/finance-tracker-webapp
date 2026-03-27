import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { ProtectedRoute } from '../../components/ui/ProtectedRoute';
import { AccountsPage } from '../../pages/AccountsPage';
import { BudgetsPage } from '../../pages/BudgetsPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { GoalsPage } from '../../pages/GoalsPage';
import { RecurringPage } from '../../pages/RecurringPage';
import { ReportsPage } from '../../pages/ReportsPage';
import { RulesPage } from '../../pages/RulesPage';
import { SharedAccountsPage } from '../../pages/SharedAccountsPage';
import { TransactionsPage } from '../../pages/TransactionsPage';
import { InsightsPage } from '../../pages/InsightsPage';
import { HomePage } from '../../pages/HomePage';
import { ProfilePage } from '../../pages/ProfilePage';

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <Navigate to='/' replace /> },
  { path: '/register', element: <Navigate to='/' replace /> },
  { path: '/forgot-password', element: <Navigate to='/' replace /> },
  {
    path: '/app',
    element: <ProtectedRoute><AppShell /></ProtectedRoute>,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'budgets', element: <BudgetsPage /> },
      { path: 'goals', element: <GoalsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'insights', element: <InsightsPage /> },
      { path: 'rules', element: <RulesPage /> },
      { path: 'shared-accounts', element: <SharedAccountsPage /> },
      { path: 'recurring', element: <RecurringPage /> },
      { path: 'accounts', element: <AccountsPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: '*', element: <Navigate to='/app' replace /> },
    ],
  },
  { path: '*', element: <Navigate to='/' replace /> },
]);
