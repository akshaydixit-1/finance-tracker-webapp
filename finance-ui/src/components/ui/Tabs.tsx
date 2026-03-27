import type { ReactNode } from 'react';

type TabItem = {
  id: string;
  label: string;
};

export function Tabs({ items, value, onChange }: { items: TabItem[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="mb-5 overflow-x-auto">
      <div className="inline-flex min-w-max items-center gap-1 rounded-full border border-slate-200 bg-slate-100/95 p-1.5 shadow-sm">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition ${value === item.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white/70 hover:text-slate-800'}`}
        >
          {item.label}
        </button>
      ))}
      </div>
    </div>
  );
}

export function TabPanel({ active, id, children }: { active: string; id: string; children: ReactNode }) {
  if (active !== id) return null;
  return <div>{children}</div>;
}
