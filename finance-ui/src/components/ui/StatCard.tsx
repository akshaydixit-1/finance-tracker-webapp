export function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  const tone = accent === 'success' ? 'bg-emerald-50 text-emerald-700' : accent === 'danger' ? 'bg-rose-50 text-rose-700' : accent === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-brand-50 text-brand-700';
  return (
    <div className="rounded-[26px] border border-white/70 bg-white/90 p-5 shadow-card">
      <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${tone}`}>{label}</div>
      <div className="mt-4 text-3xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}
