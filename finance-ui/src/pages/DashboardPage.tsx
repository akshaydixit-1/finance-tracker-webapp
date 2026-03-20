import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { dashboardApi } from '../services/api';
import { formatCurrency } from '../utils/format';

const chartColors = ['#2056d8', '#0f766e', '#ea580c', '#9333ea', '#dc2626', '#16a34a'];

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex h-72 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
      <div>
        <div className="text-base font-semibold text-slate-900">{title}</div>
        <div className="mt-2 text-sm text-slate-500">{message}</div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.get });

  if (isLoading) {
    return <div className="rounded-[28px] bg-white p-6 shadow-card">Loading dashboard...</div>;
  }

  if (isError || !data) {
    return <div className="rounded-[28px] bg-white p-6 text-rose-600 shadow-card">Unable to load dashboard right now.</div>;
  }

  const hasTransactions = data.recentTransactions.length > 0;
  const hasCategorySpend = data.categorySpend.length > 0;
  const hasTrend = data.incomeVsExpense.length > 0;
  const hasBudgets = data.budgetProgress.length > 0;

  return (
    <div className="space-y-6">
      <div className="card-grid">
        {data.summaryCards.map((item) => <StatCard key={item.label} label={item.label} value={formatCurrency(item.value)} accent={item.accent} />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card title="Spending by category" description="See where your money is going this month by expense category.">
          {hasCategorySpend ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.categorySpend} dataKey="amount" nameKey="category" innerRadius={70} outerRadius={110}>
                    {data.categorySpend.map((entry, index) => <Cell key={entry.category} fill={chartColors[index % chartColors.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No spending data yet" message="Add your first expense transaction to see category breakdown for this month." />
          )}
        </Card>
        <Card title="Recent transactions" description="Review your latest income and expense entries in one place.">
          {hasTransactions ? (
            <div className="space-y-3">
              {data.recentTransactions.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <div>
                    <div className="font-medium text-slate-900">{item.merchant}</div>
                    <div className="text-sm text-slate-500">{item.date} · {item.type}</div>
                  </div>
                  <div className="font-semibold">{formatCurrency(item.amount)}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No transactions yet" message="Create your first account and add a transaction to start populating the dashboard." />
          )}
        </Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Income vs expense trend" description="Compare earnings and spending over time to understand cash flow.">
          {hasTrend ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.incomeVsExpense}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Line type="monotone" dataKey="income" stroke="#16a34a" strokeWidth={3} />
                  <Line type="monotone" dataKey="expense" stroke="#dc2626" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No trend data yet" message="Once you record income and expenses, monthly trends will appear here." />
          )}
        </Card>
        <Card title="Budget progress" description="Track actual spending against the monthly budgets you have set.">
          {hasBudgets ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.budgetProgress} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="category" width={90} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="actualAmount" fill="#2056d8" radius={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No budgets yet" message="Set monthly budgets by category to track progress and overspending." />
          )}
        </Card>
      </div>
    </div>
  );
}
