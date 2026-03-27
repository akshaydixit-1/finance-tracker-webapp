import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../components/ui/Card';
import { TabPanel, Tabs } from '../components/ui/Tabs';
import { insightsApi } from '../services/api';

function scoreTone(score: number) {
  if (score >= 80) return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  if (score >= 60) return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-rose-200 bg-rose-50 text-rose-900';
}

function factorTone(name: string, score: number) {
  const key = name.toLowerCase();
  if (key.includes('savings')) return score >= 60 ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50';
  if (key.includes('stability')) return score >= 60 ? 'border-sky-200 bg-sky-50' : 'border-amber-200 bg-amber-50';
  if (key.includes('budget')) return score >= 60 ? 'border-violet-200 bg-violet-50' : 'border-rose-200 bg-rose-50';
  if (key.includes('buffer')) return score >= 60 ? 'border-teal-200 bg-teal-50' : 'border-amber-200 bg-amber-50';
  return scoreTone(score);
}

export function InsightsPage() {
  const [activeTab, setActiveTab] = useState('health');
  const { data: health } = useQuery({ queryKey: ['insights-health'], queryFn: insightsApi.getHealthScore });
  const { data: insights } = useQuery({ queryKey: ['insights'], queryFn: insightsApi.getInsights });

  return (
    <div className="space-y-6">
      <Tabs
        items={[
          { id: 'health', label: 'Health Score' },
          { id: 'highlights', label: 'Highlights' },
          { id: 'trend', label: 'Savings Trend' },
          { id: 'suggestions', label: 'Suggestions' },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

      <TabPanel active={activeTab} id="health">
        <Card title="Financial health score" description="0-100 weighted score across savings, stability, budget adherence, and cash buffer.">
        <div className="grid items-stretch gap-4 md:grid-cols-[240px_1fr]">
          <div className={`flex h-full min-h-[250px] items-center justify-center rounded-3xl border ${scoreTone(Math.round(health?.score ?? 0))}`}>
            <div className="text-center">
              <div className="text-xs uppercase tracking-[0.2em] text-current/70">Score</div>
              <div className="text-6xl font-bold">{Math.round(health?.score ?? 0)}</div>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {health?.breakdown.map((item) => (
              <div key={item.name} className={`rounded-2xl border p-4 ${factorTone(item.name, Math.round(item.score))}`}>
                <div className="text-sm text-current/80">{item.name}</div>
                <div className="mt-1 text-2xl font-semibold">{Math.round(item.score)}</div>
                <div className="mt-2 text-sm text-current/85">{item.description}</div>
              </div>
            ))}
          </div>
        </div>
        </Card>
      </TabPanel>

      <TabPanel active={activeTab} id="highlights">
        <Card title="Key insights" description="Automated findings from month-over-month behavior.">
          <div className="space-y-3">
            {insights?.highlights.map((item) => (
              <div key={`${item.title}-${item.message}`} className={`rounded-2xl border px-4 py-3 ${item.severity === 'warning' ? 'border-amber-200 bg-amber-50' : item.severity === 'positive' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="font-medium text-slate-900">{item.title}</div>
                <div className="mt-1 text-sm text-slate-700">{item.message}</div>
              </div>
            ))}
          </div>
        </Card>
      </TabPanel>

      <TabPanel active={activeTab} id="trend">
        <Card title="Savings rate trend" description="Compare savings efficiency month over month.">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={insights?.savingsRateTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Line type="monotone" dataKey="savingsRatePercent" stroke="#0f766e" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </TabPanel>

      <TabPanel active={activeTab} id="suggestions">
        <Card title="Suggestions" description="Practical steps generated from score factors.">
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            {health?.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
          </ul>
        </Card>
      </TabPanel>
    </div>
  );
}
