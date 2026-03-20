import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line } from 'recharts';
import { Card } from '../components/ui/Card';
import { financeApi } from '../services/api';
import { formatCurrency } from '../utils/format';

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex h-80 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
      <div>
        <div className="text-base font-semibold text-slate-900">{title}</div>
        <div className="mt-2 text-sm text-slate-500">{message}</div>
      </div>
    </div>
  );
}

export function ReportsPage() {
  const { data: categorySpend, isError: categoryError } = useQuery({ queryKey: ['report-category-spend'], queryFn: financeApi.getCategorySpend });
  const { data: incomeExpense, isError: incomeExpenseError } = useQuery({ queryKey: ['report-income-expense'], queryFn: financeApi.getIncomeExpense });

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card title="Category breakdown" description="Compare how much you spent across categories for the selected period.">
        {categoryError ? (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">Unable to load category spend report.</div>
        ) : categorySpend && categorySpend.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categorySpend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="totalAmount" fill="#2056d8" radius={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title="No category data yet" message="Add expense transactions to see category spending charts." />
        )}
      </Card>
      <Card title="Income vs expense" description="View the trend between money coming in and going out over time.">
        {incomeExpenseError ? (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">Unable to load income vs expense report.</div>
        ) : incomeExpense && incomeExpense.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={incomeExpense}>
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
          <EmptyState title="No trend data yet" message="Once you record income and expense transactions, this report will populate." />
        )}
      </Card>
    </div>
  );
}
