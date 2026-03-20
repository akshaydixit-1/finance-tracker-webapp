import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BadgeIndianRupee, ChartColumnBig, LayoutDashboard, PiggyBank, ReceiptText, Repeat, WalletCards, FolderKanban, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ReceiptText },
  { to: '/budgets', label: 'Budgets', icon: FolderKanban },
  { to: '/goals', label: 'Goals', icon: PiggyBank },
  { to: '/reports', label: 'Reports', icon: ChartColumnBig },
  { to: '/recurring', label: 'Recurring', icon: Repeat },
  { to: '/accounts', label: 'Accounts', icon: WalletCards },
];

export function AppShell() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(32,86,216,0.09),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef4ff_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-6 lg:px-6">
        <aside className="hidden w-72 rounded-[28px] bg-slate-950 p-6 text-white shadow-card lg:flex lg:flex-col">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-2xl bg-brand-500/20 p-3 text-brand-100"><BadgeIndianRupee /></div>
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Finance OS</div>
              <div className="text-lg font-semibold">Personal Finance Tracker</div>
            </div>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${isActive ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}>
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
          <button className="mt-auto flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/5" onClick={() => { logout(); navigate('/login'); }}>
            <LogOut size={18} /> Sign out
          </button>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="mb-6 rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-card backdrop-blur">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm text-slate-500">Welcome back</div>
                <h1 className="text-2xl font-semibold">{user?.displayName ?? 'Finance Dashboard'}</h1>
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">{user?.email}</div>
            </div>
          </header>

          <nav className="mb-6 lg:hidden">
            <div className="flex gap-3 overflow-x-auto rounded-[24px] border border-white/60 bg-white/80 p-3 shadow-card backdrop-blur">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `flex min-w-max items-center gap-2 rounded-2xl px-4 py-3 text-sm transition ${isActive ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700'}`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </nav>

          <Outlet />
        </div>
      </div>
    </div>
  );
}
