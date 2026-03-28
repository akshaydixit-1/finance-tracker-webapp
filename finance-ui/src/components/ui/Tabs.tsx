import type { ReactNode } from 'react';
import { useThemeStore } from '../../store/themeStore';

type TabItem = {
  id: string;
  label: string;
};

export function Tabs({ items, value, onChange }: { items: TabItem[]; value: string; onChange: (id: string) => void }) {
  const { isDark } = useThemeStore();
  const containerClass = isDark
    ? 'border-slate-700 bg-slate-900/95'
    : 'border-slate-200 bg-slate-100/95';
  const activeClass = isDark
    ? 'bg-slate-700 text-slate-100 shadow-sm'
    : 'bg-white text-slate-900 shadow-sm';
  const inactiveClass = isDark
    ? 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
    : 'text-slate-600 hover:bg-white/70 hover:text-slate-800';

  return (
    <div className="mb-5 overflow-x-auto">
      <div className={`inline-flex min-w-max items-center gap-1 rounded-full border p-1.5 shadow-sm ${containerClass}`}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition ${value === item.id ? activeClass : inactiveClass}`}
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
