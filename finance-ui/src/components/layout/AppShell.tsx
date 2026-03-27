import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BadgeIndianRupee,
  ChartColumnBig,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  Moon,
  PiggyBank,
  ReceiptText,
  Repeat,
  Settings,
  Sun,
  UsersRound,
  WalletCards,
  Workflow,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';

const navItems = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/transactions', label: 'Transactions', icon: ReceiptText },
  { to: '/app/budgets', label: 'Budgets', icon: FolderKanban },
  { to: '/app/goals', label: 'Goals', icon: PiggyBank },
  { to: '/app/reports', label: 'Reports', icon: ChartColumnBig },
  { to: '/app/insights', label: 'Insights', icon: Lightbulb },
  { to: '/app/rules', label: 'Rules', icon: Workflow },
  { to: '/app/shared-accounts', label: 'Shared', icon: UsersRound },
  { to: '/app/recurring', label: 'Recurring', icon: Repeat },
  { to: '/app/accounts', label: 'Accounts', icon: WalletCards },
];

const titleByPath: Record<string, string> = {
  '/app': 'Dashboard',
  '/app/transactions': 'Transactions',
  '/app/budgets': 'Budgets',
  '/app/goals': 'Goals',
  '/app/reports': 'Reports',
  '/app/insights': 'Insights',
  '/app/rules': 'Rules',
  '/app/shared-accounts': 'Shared Accounts',
  '/app/recurring': 'Recurring',
  '/app/accounts': 'Accounts',
  '/app/profile': 'Profile Settings',
};

function toTitleCase(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const pageTitle = useMemo(() => titleByPath[location.pathname] ?? 'Dashboard', [location.pathname]);

  const sidebarSurface = isDark ? 'border-slate-800 bg-[#18223f] text-slate-100' : 'border-slate-200 bg-white text-slate-900';
  const shellSurface = isDark ? 'bg-[#0d1426] text-slate-100' : 'bg-[#f3f5fb] text-slate-900';
  const headerSurface = isDark ? 'border-slate-700 bg-[#1a2747] text-slate-100' : 'border-slate-200 bg-white text-slate-900';
  const navActive = isDark ? 'bg-[#5b46f6] text-white' : 'bg-brand-500 text-white';
  const navIdle = isDark ? 'text-slate-300 hover:bg-[#25345e] hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';
  const logoButton = isDark
    ? 'bg-indigo-500/15 text-indigo-300'
    : 'bg-brand-50 text-brand-700 border border-brand-100';
  const logoText = isDark ? 'text-indigo-200' : 'text-brand-900';
  const userRole = 'Owner';

  const renderSidebar = (collapsed: boolean, mobile = false) => (
    <div className="flex h-full flex-col p-4">
      <div className="mb-5 flex items-center justify-between gap-2">
        <button className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ${logoButton}`} onClick={() => navigate('/app')}>
          <BadgeIndianRupee size={18} />
          {!collapsed ? <span className={`text-sm font-semibold ${logoText}`}>FinTrack</span> : null}
        </button>
        {mobile ? (
          <button className={`rounded-lg p-2 ${isDark ? 'text-slate-300 hover:bg-slate-700/60' : 'text-slate-600 hover:bg-slate-200'}`} onClick={() => setMobileSidebarOpen(false)} aria-label="Close sidebar">
            <X size={16} />
          </button>
        ) : null}
      </div>

      <nav className="space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app'}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? navActive : navIdle}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed ? <span>{item.label}</span> : null}
            </NavLink>
          );
        })}
      </nav>

      <div className={`mt-auto space-y-3 rounded-2xl border p-3 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
        <button className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-100'}`} onClick={toggleTheme}>
          {!collapsed ? <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span> : null}
          {isDark ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <button
          className={`flex w-full items-center ${collapsed ? 'justify-center' : 'justify-start gap-2'} rounded-lg px-3 py-2 text-sm font-medium ${isDark ? 'text-rose-300 hover:bg-rose-500/10' : 'text-rose-600 hover:bg-rose-50'}`}
          onClick={() => {
            logout();
            navigate('/');
          }}
        >
          <LogOut size={16} />
          {!collapsed ? <span>Sign out</span> : null}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen overflow-x-hidden ${shellSurface} ${isDark ? 'app-shell-dark' : ''}`}>
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className={`hidden border-r transition-all duration-300 md:flex md:flex-col ${desktopSidebarCollapsed ? 'w-24' : 'w-72'} ${sidebarSurface}`}>
          {renderSidebar(desktopSidebarCollapsed)}
        </aside>

        <div className={`fixed inset-0 z-30 bg-slate-950/50 transition md:hidden ${mobileSidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`} onClick={() => setMobileSidebarOpen(false)} />
        <aside className={`fixed left-0 top-0 z-40 h-screen w-72 border-r transition-transform duration-300 md:hidden ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${sidebarSurface}`}>
          {renderSidebar(false, true)}
        </aside>

        <main className="min-w-0 flex-1 p-3 sm:p-5 lg:p-6">
          <header className={`mb-6 rounded-2xl border px-3 py-3 sm:px-5 ${headerSurface}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <button className={`rounded-lg p-2 md:hidden ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} onClick={() => setMobileSidebarOpen(true)} aria-label="Open sidebar">
                  <Menu size={18} />
                </button>
                <button className={`hidden rounded-lg p-2 md:inline-flex ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} onClick={() => setDesktopSidebarCollapsed((prev) => !prev)} aria-label="Toggle sidebar">
                  {desktopSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
                <h1 className="truncate text-[15px] font-semibold sm:text-[21px]">{pageTitle}</h1>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden text-right md:block">
                  <div className="text-sm font-semibold">{toTitleCase(user?.displayName ?? 'User')}</div>
                  <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{userRole}</div>
                </div>
                <button className={`rounded-lg border p-2 ${isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-100'}`} onClick={() => navigate('/app/profile')} aria-label="Open profile settings">
                  <Settings size={16} />
                </button>
              </div>
            </div>
          </header>

          <Outlet />
        </main>
      </div>
    </div>
  );
}
