import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { dashboardApi, financeApi } from '../services/api';
import { useThemeStore } from '../store/themeStore';
import { formatCurrency } from '../utils/format';

type KpiPeriodKey = 'last_month' | 'last_year' | 'lifetime';

const kpiPeriodOptions: Array<{ value: KpiPeriodKey; label: string; points: number }> = [
  { value: 'last_month', label: 'Last Month', points: 1 },
  { value: 'last_year', label: 'Last Year', points: 12 },
  { value: 'lifetime', label: 'Lifetime', points: Number.MAX_SAFE_INTEGER },
];

const pieColors = ['#22d3ee', '#a855f7', '#f59e0b', '#34d399', '#f43f5e', '#6366f1'];
const goalColors = ['#d946ef', '#22d3ee', '#34d399', '#f59e0b', '#8b5cf6'];

function getHealthGrade(score: number) {
  if (score >= 85) return { grade: 'A', label: 'Low Risk', text: 'Low risk of financial distress', color: '#22c55e' };
  if (score >= 70) return { grade: 'B', label: 'Low Risk', text: 'Low risk of financial distress', color: '#84cc16' };
  if (score >= 60) return { grade: 'C', label: 'Moderate Risk', text: 'Moderate risk of financial distress', color: '#eab308' };
  if (score >= 50) return { grade: 'D', label: 'Moderate Risk', text: 'Moderate risk of financial distress', color: '#f97316' };
  return { grade: 'F', label: 'High Risk', text: 'High risk of financial distress', color: '#ef4444' };
}

function pct(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function DashboardPage() {
  const { isDark } = useThemeStore();
  const [kpiPeriod, setKpiPeriod] = useState<KpiPeriodKey>('last_month');
  const now = new Date();
  const categoryParams = (() => {
    if (kpiPeriod === 'lifetime') return '';
    const from = new Date(now);
    if (kpiPeriod === 'last_month') from.setMonth(from.getMonth() - 1);
    if (kpiPeriod === 'last_year') from.setFullYear(from.getFullYear() - 1);
    const query = new URLSearchParams();
    query.set('from', from.toISOString().slice(0, 10));
    query.set('to', now.toISOString().slice(0, 10));
    return query.toString();
  })();
  const { data, isLoading, isError } = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.get });
  const { data: filteredCategorySpend } = useQuery({
    queryKey: ['dashboard-category-filtered', kpiPeriod, categoryParams],
    queryFn: () => financeApi.getCategorySpend(categoryParams),
  });

  if (isLoading) {
    return <div className={`rounded-2xl border p-6 ${isDark ? 'border-slate-700 bg-[#1a2747] text-slate-100' : 'border-slate-200 bg-white text-slate-900'}`}>Loading dashboard...</div>;
  }

  if (isError || !data) {
    return <div className={`rounded-2xl border p-6 text-rose-500 ${isDark ? 'border-slate-700 bg-[#1a2747]' : 'border-slate-200 bg-white'}`}>Unable to load dashboard right now.</div>;
  }

  const surface = isDark ? 'border-slate-700 bg-[#1a2747] text-slate-100' : 'border-slate-200 bg-white text-slate-900';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const gridLine = isDark ? '#334155' : '#e2e8f0';

  const selected = kpiPeriodOptions.find((x) => x.value === kpiPeriod)!;
  const trend = data.incomeVsExpense;
  const currentSlice = trend.slice(-selected.points);
  const previousSlice = trend.slice(-selected.points * 2, -selected.points);

  const currentIncome = currentSlice.reduce((sum, row) => sum + row.income, 0);
  const currentExpense = currentSlice.reduce((sum, row) => sum + row.expense, 0);
  const currentSavings = currentIncome - currentExpense;
  const previousIncome = previousSlice.reduce((sum, row) => sum + row.income, 0);
  const previousExpense = previousSlice.reduce((sum, row) => sum + row.expense, 0);
  const previousSavings = previousIncome - previousExpense;
  const balanceNow = data.summaryCards.find((x) => x.label.toLowerCase() === 'balance')?.value ?? data.projectedEndOfMonthBalance;
  const prevBalance = balanceNow - currentSavings;

  const kpis = [
    {
      label: 'Income',
      value: currentIncome,
      deltaValue: currentIncome - previousIncome,
      deltaPct: pct(currentIncome, previousIncome),
      accent: '#22d3ee',
    },
    {
      label: 'Expenses',
      value: currentExpense,
      deltaValue: currentExpense - previousExpense,
      deltaPct: pct(currentExpense, previousExpense),
      accent: '#a855f7',
    },
    {
      label: 'Balance',
      value: balanceNow,
      deltaValue: balanceNow - prevBalance,
      deltaPct: pct(balanceNow, prevBalance),
      accent: '#f59e0b',
    },
    {
      label: 'Savings',
      value: currentSavings,
      deltaValue: currentSavings - previousSavings,
      deltaPct: pct(currentSavings, previousSavings),
      accent: '#34d399',
    },
  ];

  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  const revenueChartData = (currentSlice.length ? currentSlice : trend).map((row) => ({
    period: row.period,
    expenses: row.expense,
    revenue: row.income - row.expense,
    income: row.income,
  }));
  const toDateSafe = (value: string, index: number) => {
    const native = new Date(value);
    if (!Number.isNaN(native.getTime())) return native;
    const ym = value.match(/(\d{4})[-/](\d{1,2})/);
    if (ym) return new Date(Number(ym[1]), Number(ym[2]) - 1, 1);
    return new Date(currentYear, index % 12, 1);
  };

  const monthlyChartData = revenueChartData.map((row, index) => {
    const dt = toDateSafe(row.period, index);
    const monthLabel = dt.toLocaleString('en-US', { month: 'short' });
    return {
      label: monthLabel,
      expenses: row.expenses || 0,
      income: row.income || 0,
      revenueA: row.income || 0,
      revenueB: row.expenses || 0,
    };
  });

  const yearlyAgg = revenueChartData.reduce<Record<string, { income: number; expenses: number }>>((acc, row, index) => {
    const dt = toDateSafe(row.period, index);
    const key = String(dt.getFullYear());
    if (!acc[key]) acc[key] = { income: 0, expenses: 0 };
    acc[key].income += row.income || 0;
    acc[key].expenses += row.expenses || 0;
    return acc;
  }, {});

  const yearlyChartData = Object.entries(yearlyAgg)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, val]) => ({
      label: year,
      expenses: val.expenses,
      income: val.income,
      revenueA: val.income,
      revenueB: val.expenses,
    }));

  const expenseChartData = kpiPeriod === 'last_year' ? yearlyChartData : monthlyChartData;
  const revenueChartDataView = kpiPeriod === 'last_year' ? yearlyChartData : monthlyChartData;

  const savingsTrendData = trend.map((row) => ({
    period: row.period,
    savingsRate: row.income > 0 ? ((row.income - row.expense) / row.income) * 100 : 0,
  }));

  const score = Math.round(data.financialHealthScore);
  const health = getHealthGrade(score);
  const riskPercent = Math.max(0, 100 - score);
  const filteredTransactions = data.recentTransactions
    .filter((row) => {
      if (kpiPeriod === 'lifetime') return true;
      const dt = new Date(row.date);
      if (Number.isNaN(dt.getTime())) return true;
      const monthsBack = kpiPeriod === 'last_month' ? 1 : 12;
      const threshold = new Date(now);
      threshold.setMonth(threshold.getMonth() - monthsBack);
      return dt >= threshold;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const categorySource = (filteredCategorySpend && filteredCategorySpend.length > 0)
    ? filteredCategorySpend.map((x) => ({ category: x.category, amount: x.totalAmount }))
    : data.categorySpend;
  const categoryTotal = categorySource.reduce((sum, item) => sum + item.amount, 0);
  const categoryItems = categorySource.slice(0, 4).map((item, index) => ({
    ...item,
    percent: categoryTotal > 0 ? Math.round((item.amount / categoryTotal) * 100) : 0,
    color: pieColors[index % pieColors.length],
  }));
  const categoryTrendPercent = previousExpense ? pct(currentExpense, previousExpense) : 0;
  const filteredGoals = (() => {
    if (kpiPeriod === 'last_month') {
      return [...data.goals]
        .filter((goal) => goal.progressPercent < 100)
        .sort((a, b) => b.progressPercent - a.progressPercent);
    }
    if (kpiPeriod === 'last_year') {
      return [...data.goals]
        .sort((a, b) => (b.targetAmount - b.currentAmount) - (a.targetAmount - a.currentAmount));
    }
    return [...data.goals];
  })();
  const goalChartData = filteredGoals.slice(0, 5).map((goal, index) => {
    const completed = Math.max(0, goal.currentAmount);
    const left = Math.max(0, goal.targetAmount - goal.currentAmount);
    return {
      id: goal.id,
      name: goal.name,
      completed,
      left,
      color: goalColors[index % goalColors.length],
    };
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Dashboard</h2>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className={`text-sm font-semibold uppercase tracking-[0.15em] ${muted}`}>Summary Metrics</h3>
        <select
          value={kpiPeriod}
          onChange={(e) => setKpiPeriod(e.target.value as KpiPeriodKey)}
          className={`rounded-lg border px-3 py-2 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-700'}`}
        >
          {kpiPeriodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        {kpis.map((item) => {
          const up = item.deltaValue >= 0;
          return (
            <article key={item.label} className={`rounded-2xl border p-4 ${surface}`}>
              <div className="mb-2 flex items-center justify-between">
                <div className={`text-sm ${muted}`}>{item.label}</div>
                <div className={`rounded-md px-2 py-1 text-xs`} style={{ backgroundColor: `${item.accent}20`, color: item.accent }}>{selected.label}</div>
              </div>
              <div className="text-3xl font-bold">{formatCurrency(item.value)}</div>
              <div className={`mt-3 flex items-center gap-2 text-sm font-semibold ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
                {up ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>{up ? '+' : ''}{item.deltaPct.toFixed(1)}%</span>
                <span>{up ? '+' : ''}{formatCurrency(item.deltaValue)}</span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className={`rounded-2xl border p-4 ${surface}`}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Expenses</h3>
            <span className={`text-xs ${muted}`}>{selected.label}</span>
          </div>
          <div className={`mb-2 flex items-center gap-5 text-xs ${muted}`}>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-400" />{previousYear}</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-fuchsia-500" />{currentYear}</div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseChartData} barGap={8} barCategoryGap="38%">
                <CartesianGrid strokeDasharray="3 3" stroke={gridLine} />
                <XAxis dataKey="label" stroke={isDark ? '#94a3b8' : '#64748b'} />
                <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{
                    borderRadius: 10,
                    border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                    background: isDark ? '#0f172a' : '#ffffff',
                    color: isDark ? '#e2e8f0' : '#0f172a',
                  }}
                />
                <Bar dataKey="income" name={String(previousYear)} fill="#34d399" radius={[6, 6, 0, 0]} maxBarSize={10} />
                <Bar dataKey="expenses" name={String(currentYear)} fill="#d946ef" radius={[6, 6, 0, 0]} maxBarSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={`rounded-2xl border p-4 ${surface}`}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Revenue</h3>
            <span className={`text-xs ${muted}`}>{selected.label}</span>
          </div>
          <div className={`mb-2 flex items-center gap-5 text-xs ${muted}`}>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" />{previousYear}</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-fuchsia-500" />{currentYear}</div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartDataView}>
                <defs>
                  <linearGradient id="revA" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="revB" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#d946ef" stopOpacity={0.40} />
                    <stop offset="95%" stopColor="#d946ef" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridLine} />
                <XAxis dataKey="label" stroke={isDark ? '#94a3b8' : '#64748b'} />
                <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Area type="monotone" dataKey="revenueA" name={String(previousYear)} stroke="#34d399" fill="url(#revA)" strokeWidth={2.2} />
                <Area type="monotone" dataKey="revenueB" name={String(currentYear)} stroke="#d946ef" fill="url(#revB)" strokeWidth={2.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className={`min-w-0 flex-1 rounded-2xl border p-4 ${surface}`}>
          <div className="mb-3">
            <h3 className="text-lg font-semibold">Financial Health</h3>
            <p className={`text-sm ${muted}`}>{health.text}</p>
          </div>
          <div className="relative mx-auto h-56 w-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart data={[{ value: score }]} innerRadius="75%" outerRadius="100%" startAngle={220} endAngle={-40} barSize={14}>
                <RadialBar dataKey="value" fill={health.color} cornerRadius={12} background />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold">{riskPercent}%</div>
              <div className={`mt-1 text-center text-sm ${muted}`}>{score >= 70 ? 'Financially Stable' : 'Financially Vulnerable'}</div>
              <div className="mt-1 text-xs text-slate-400">Grade {health.grade}</div>
            </div>
          </div>
        </article>

        <article className={`min-w-0 flex-1 rounded-2xl border p-4 ${surface}`}>
          <div className="mb-3">
            <h3 className="text-lg font-semibold">Projected Balance</h3>
            <p className={`text-sm ${muted}`}>Safe to spend: {formatCurrency(data.safeToSpendAmount)}</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.forecastDaily}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridLine} />
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line type="monotone" dataKey="projectedBalance" stroke="#22d3ee" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className={`mt-2 rounded-lg border px-3 py-2 text-sm ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
            End of month: <span className="font-semibold">{formatCurrency(data.projectedEndOfMonthBalance)}</span>
          </div>
        </article>

      </section>

      <section>
        <article className={`rounded-2xl border p-4 ${surface}`}>
          <div className="mb-3">
            <h3 className="text-lg font-semibold">Savings Rate Trend (V2)</h3>
            <p className={`text-sm ${muted}`}>Advanced insight from income vs expense over time.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={savingsTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridLine} />
                <XAxis dataKey="period" stroke={isDark ? '#94a3b8' : '#64748b'} />
                <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} tickFormatter={(v) => `${Number(v).toFixed(0)}%`} />
                <Tooltip formatter={(value: number) => `${Number(value).toFixed(1)}%`} />
                <Line type="monotone" dataKey="savingsRate" stroke="#34d399" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="space-y-4">
        <article className={`rounded-2xl border p-4 ${surface}`}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Transaction History</h3>
            <span className={`text-xs ${muted}`}>{selected.label}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] table-fixed text-sm">
              <thead className={`${muted} sr-only`}>
                <tr className="text-left">
                  <th className="pb-2 font-medium">Merchant</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.slice(0, 8).map((row) => {
                  const hasTime = /T\d{2}:\d{2}/.test(row.date) || /\d{2}:\d{2}/.test(row.date);
                  const parsed = new Date(row.date);
                  const validDate = !Number.isNaN(parsed.getTime());
                  const dateLabel = validDate ? parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : row.date;
                  const timeLabel = validDate && hasTime ? parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
                  return (
                  <tr key={row.id} className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${row.type === 'Income' ? 'text-emerald-400' : 'text-fuchsia-500'}`}>{row.type === 'Income' ? '↗' : '↘'}</span>
                        <div>
                          <div className="font-semibold">{row.merchant}</div>
                          <div className={`text-xs ${muted}`}>{row.type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <div className={`font-semibold ${row.type === 'Income' ? 'text-emerald-400' : 'text-rose-400'}`}>{row.type === 'Income' ? '+' : '-'}{formatCurrency(Math.abs(row.amount))}</div>
                      <div className={`text-xs ${muted}`}>{row.type === 'Income' ? 'bank account' : 'cash'}</div>
                    </td>
                    <td className="py-2.5">
                      <div className="font-semibold">{dateLabel}</div>
                      {timeLabel ? <div className={`text-xs ${muted}`}>{timeLabel}</div> : null}
                    </td>
                    <td className="py-2.5 text-right">
                      <span className={`inline-flex min-w-[84px] justify-center rounded-md px-2 py-1 text-xs font-semibold ${row.type === 'Income' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-fuchsia-500/15 text-fuchsia-500'}`}>
                        {row.type === 'Income' ? 'Success' : 'Recorded'}
                      </span>
                    </td>
                  </tr>
                  );
                })}
                {!filteredTransactions.length ? (
                  <tr><td colSpan={4} className={`py-4 text-center ${muted}`}>No transactions yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
        <div className="grid gap-4 md:grid-cols-2">
          <article className={`rounded-2xl border p-4 ${surface}`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Categories</h3>
              <span className={`text-xs ${muted}`}>{selected.label}</span>
            </div>
            <div className="relative h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryItems} dataKey="amount" nameKey="category" innerRadius={60} outerRadius={94} stroke="none" cornerRadius={4}>
                    {categoryItems.map((entry) => <Cell key={entry.category} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-bold">{formatCurrency(categoryTotal)}</div>
                <div className={`text-sm font-semibold ${categoryTrendPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {categoryTrendPercent >= 0 ? '+' : ''}{categoryTrendPercent.toFixed(0)}%
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {categoryItems.map((item) => (
                <div key={item.category} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                  <span className="font-semibold">{item.category} - {item.percent}%</span>
                </div>
              ))}
            </div>
          </article>

          <article className={`rounded-2xl border p-4 ${surface}`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Goals</h3>
              <span className={`text-xs ${muted}`}>{selected.label}</span>
            </div>
            {goalChartData.length ? (
              <div className="space-y-3">
                {goalChartData.map((goal) => {
                  const total = goal.completed + goal.left;
                  const progress = total > 0 ? (goal.completed / total) * 100 : 0;
                  return (
                    <div key={goal.id} className="grid grid-cols-[80px_1fr] items-start gap-2">
                      <div className="pt-0.5 text-sm font-semibold leading-3">{goal.name}</div>
                      <div className="min-w-0 pt-0.5 pr-1">
                        <div className={`h-3 w-full overflow-hidden rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, progress)}%`, backgroundColor: goal.color }} />
                        </div>
                        <div className={`mt-1.5 text-right text-xs ${muted}`}>
                          {formatCurrency(goal.completed)}/{formatCurrency(goal.left)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`rounded-lg border border-dashed p-3 text-sm ${muted}`}>No goals available.</div>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
