import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line } from 'recharts';
import { Card } from '../components/ui/Card';
import { TabPanel, Tabs } from '../components/ui/Tabs';
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
  const [activeTab, setActiveTab] = useState('category-trends');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const params = useMemo(() => {
    const query = new URLSearchParams();
    if (from) query.set('from', from);
    if (to) query.set('to', to);
    if (accountId) query.set('accountId', accountId);
    if (categoryId) query.set('categoryId', categoryId);
    return query.toString();
  }, [accountId, categoryId, from, to]);

  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: financeApi.getAccounts });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: financeApi.getCategories });
  const { data: categorySpend, isError: categoryError } = useQuery({ queryKey: ['report-category-spend', params], queryFn: () => financeApi.getCategorySpend(params) });
  const { data: trends, isError: trendsError } = useQuery({ queryKey: ['report-trends', params], queryFn: () => financeApi.getReportTrends(params) });
  const { data: netWorth, isError: netWorthError } = useQuery({ queryKey: ['report-net-worth', params], queryFn: () => financeApi.getNetWorth(params) });

  return (
    <div className="space-y-6">
      <Tabs
        items={[
          { id: 'category-trends', label: 'Category Trends' },
          { id: 'savings-trend', label: 'Savings Trend' },
          { id: 'income-expense', label: 'Income vs Expense' },
          { id: 'net-worth', label: 'Net Worth' },
          { id: 'category-breakdown', label: 'Category Breakdown' },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />
      <Card title="Filters" description="Filter reports by date range, account, and category.">
        <div className="grid gap-3 md:grid-cols-4">
          <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="date" placeholder="From date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="date" placeholder="To date" value={to} onChange={(e) => setTo(e.target.value)} />
          <select className="w-full rounded-2xl border border-slate-200 px-4 py-3" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">All accounts</option>
            {accounts?.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
          <select className="w-full rounded-2xl border border-slate-200 px-4 py-3" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {categories?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </div>
      </Card>

      <TabPanel active={activeTab} id="category-trends">
        <Card title="Category trends over time" description="How category spend changes month-to-month.">
          {trendsError ? (
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">Unable to load category trends.</div>
          ) : trends && trends.categoryTrends.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends.categoryTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Line type="monotone" dataKey="amount" stroke="#2056d8" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No category trend data yet" message="Add categorized expenses to unlock trend reporting." />
          )}
        </Card>
      </TabPanel>

      <TabPanel active={activeTab} id="savings-trend">
        <Card title="Savings rate trend" description="Percentage of income saved each month.">
          {trendsError ? (
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">Unable to load savings trend.</div>
          ) : trends && trends.savingsRate.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends.savingsRate}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Line type="monotone" dataKey="savingsRatePercent" stroke="#0f766e" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No savings trend data yet" message="Add income and expense transactions to compute savings rates." />
          )}
        </Card>
      </TabPanel>

      <TabPanel active={activeTab} id="income-expense">
        <Card title="Income vs expense over months" description="Monthly comparison between inflows and outflows.">
          {trendsError ? (
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">Unable to load income vs expense report.</div>
          ) : trends && trends.incomeExpense.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.incomeExpense}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="income" fill="#16a34a" radius={8} />
                  <Bar dataKey="expense" fill="#dc2626" radius={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No trend data yet" message="Once you record income and expense transactions, this report will populate." />
          )}
        </Card>
      </TabPanel>

      <TabPanel active={activeTab} id="net-worth">
        <Card title="Net worth tracking" description="Track net worth progression based on account opening balances and transaction deltas.">
          {netWorthError ? (
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">Unable to load net worth trend.</div>
          ) : netWorth && netWorth.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={netWorth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Line type="monotone" dataKey="netWorth" stroke="#7c3aed" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No net worth data yet" message="Create accounts and transactions to start net worth tracking." />
          )}
        </Card>
      </TabPanel>

      <TabPanel active={activeTab} id="category-breakdown">
        <Card title="Category breakdown" description="Current period spending by category.">
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
      </TabPanel>
    </div>
  );
}
