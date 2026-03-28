import { useEffect, useState } from 'react';
import { BadgeIndianRupee, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { SignInPanel } from '../components/auth/SignInPanel';
import { SignUpPanel } from '../components/auth/SignUpPanel';
import { ForgotPasswordPanel } from '../components/auth/ForgotPasswordPanel';

function PhoneMock({ right, variant }: { right?: boolean; variant: 'overview' | 'insights' }) {
  return (
    <div className={`relative h-[340px] w-[170px] overflow-hidden rounded-[26px] border-[3px] border-slate-900 bg-white p-2.5 shadow-2xl sm:h-[350px] sm:w-[172px] lg:h-[380px] lg:w-[188px] ${right ? 'mt-1.5 sm:mt-2.5' : ''}`}>
      <div className="mx-auto h-4 w-14 rounded-full bg-slate-900" />
      {variant === 'overview' ? (
        <div className="mt-2.5 grid h-[calc(100%-1.55rem)] grid-rows-4 gap-1.5">
          <div className="rounded-xl bg-slate-100 p-1.5">
            <div className="text-xs text-slate-500">Total balance</div>
            <div className="mt-1 text-sm font-semibold text-slate-900 sm:text-base">$ 10,000</div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-xl bg-slate-50 p-1.5 text-[9px] sm:text-[10px]"><div className="text-slate-500">Expenses</div><div className="font-semibold text-slate-900">$ 5,476</div></div>
            <div className="rounded-xl bg-slate-50 p-1.5 text-[9px] sm:text-[10px]"><div className="text-slate-500">Income</div><div className="font-semibold text-slate-900">$ 9,800</div></div>
          </div>
          <div className="flex min-h-0 flex-col rounded-xl bg-slate-100 p-1.5">
            <div className="mb-1 text-[9px] text-slate-500 sm:text-[10px]">Weekly trend</div>
            <div className="mt-0.5 flex min-h-0 flex-1 items-end gap-0.5 overflow-hidden sm:gap-1">
              {[28, 42, 56, 68, 74, 52, 61].map((h, i) => <span key={i} className="h-full max-w-[10px] flex-1 self-end rounded-sm bg-indigo-400/90" style={{ height: `${h}%` }} />)}
            </div>
          </div>
          <div className="rounded-xl bg-slate-100 p-1.5">
            <div className="mb-1 text-[9px] text-slate-500 sm:text-[10px]">Expenses by category</div>
            <div className="flex items-center gap-1.5">
              <div className="h-10 w-10 shrink-0 rounded-full border-[6px] border-indigo-500 border-b-indigo-400 border-l-indigo-300 border-r-indigo-700 sm:h-12 sm:w-12" />
              <div className="text-[9px] text-slate-600 sm:text-[10px]">
                <div>Food 34%</div>
                <div>Transport 24%</div>
                <div>Others 42%</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-2.5 grid h-[calc(100%-1.55rem)] grid-rows-4 gap-1.5">
          <div className="rounded-xl bg-indigo-50 p-1.5">
            <div className="text-[9px] text-indigo-600 sm:text-[10px]">Health score</div>
            <div className="mt-1 text-xl font-black text-indigo-700">82</div>
          </div>
          <div className="rounded-xl bg-slate-100 p-1.5">
            <div className="text-[9px] text-slate-500 sm:text-[10px]">Projected month-end</div>
            <div className="mt-1 text-sm font-semibold text-slate-900 sm:text-base">$ 12,460</div>
            <div className="text-[9px] text-emerald-600 sm:text-[10px]">Safe to spend: $420/day</div>
          </div>
          <div className="rounded-xl bg-slate-100 p-1.5">
            <div className="mb-1 text-[9px] text-slate-500 sm:text-[10px]">Cash flow forecast</div>
            <div className="h-12 rounded-lg bg-white p-1.5 sm:h-14">
              <svg viewBox="0 0 100 30" className="h-full w-full">
                <polyline points="0,25 18,18 34,19 50,12 66,14 82,9 100,6" fill="none" stroke="#6366f1" strokeWidth="2" />
              </svg>
            </div>
          </div>
          <div className="rounded-xl bg-slate-100 p-1.5">
            <div className="mb-1 text-[9px] text-slate-500 sm:text-[10px]">Rule alerts</div>
            <div className="space-y-1 text-[8px] leading-tight sm:text-[9px]">
              <div className="rounded-lg bg-amber-50 px-1 py-1 text-amber-800">Amt &gt; 5000 alert</div>
              <div className="rounded-lg bg-emerald-50 px-1 py-1 text-emerald-800">Uber tagged: Transport</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function HomePage() {
  const [authView, setAuthView] = useState<'signin' | 'signup' | 'forgot' | null>(null);
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const persistedToken = typeof window !== 'undefined' ? localStorage.getItem('pft_access_token') : null;
  const token = accessToken ?? persistedToken;
  const closeModal = () => setAuthView(null);

  useEffect(() => {
    if (token) {
      navigate('/app', { replace: true });
    }
  }, [navigate, token]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#1f1d3b] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(106,102,173,0.25),transparent_38%),radial-gradient(circle_at_80%_70%,rgba(102,120,222,0.22),transparent_42%)]" />
      <div className="pointer-events-none absolute inset-0 hidden items-center justify-center text-[11vw] font-black uppercase leading-none tracking-tight text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.13)] sm:flex">
        <div className="text-center">BUDGET<br />WATCH</div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-5 sm:px-8 sm:py-6 lg:px-10">
        <header className="flex items-center justify-between gap-3">
          <button className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 sm:px-4" onClick={() => navigate(token ? '/app' : '/')}>
            <BadgeIndianRupee size={18} />
            <span className="font-semibold tracking-wide">FinTrack</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-4">
            <button className="rounded-lg border border-white/25 px-2 py-1 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:border-white/35 hover:text-white/80 sm:px-3" onClick={() => setAuthView('signin')}>
              Login
            </button>
            <button className="rounded-lg border border-slate-300/35 px-2 py-1 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:border-slate-200/55 hover:text-white/80 sm:px-3" onClick={() => setAuthView('signup')}>
              Register
            </button>
            <div className="ml-4 hidden text-xs uppercase tracking-[0.3em] text-white/70 lg:block">Personal Finance Tracker</div>
          </div>
        </header>

        <main className="grid flex-1 items-center gap-8 pt-8 sm:gap-10 sm:pt-10 lg:grid-cols-[1.05fr_1fr]">
          <section className="flex flex-col justify-center gap-4 sm:gap-5 lg:gap-6">
            <h1 className="max-w-xl text-[1.5rem] font-black leading-tight sm:text-[2.05rem] lg:text-[2.8rem]">
              Turn Daily Spending Into Clear Financial Decisions.
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
              Track money, forecast cash flow, monitor financial health, and collaborate with your family from one focused dashboard.
            </p>
            <button className="w-fit rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-xl transition hover:scale-[1.02]" onClick={() => setAuthView('signin')}>
              Get Started
            </button>
          </section>

          <section className="flex justify-center gap-2 sm:gap-3 lg:gap-4">
            <PhoneMock variant="overview" />
            <div className="hidden sm:block">
              <PhoneMock variant="insights" right />
            </div>
          </section>
        </main>
      </div>

      {authView ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8">
          <div className="w-full max-w-md rounded-[32px] bg-white p-7 text-slate-900 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5">
                <BadgeIndianRupee size={16} className="text-slate-700" />
                <span className="text-sm font-semibold tracking-wide text-slate-800">FinTrack</span>
              </div>
              <button className="rounded-full p-1 text-slate-500 hover:bg-slate-100" onClick={closeModal}><X size={20} /></button>
            </div>
            {authView === 'signin' ? (
              <SignInPanel
                onSuccess={closeModal}
                onOpenForgotPassword={() => setAuthView('forgot')}
                onOpenSignUp={() => setAuthView('signup')}
              />
            ) : null}
            {authView === 'signup' ? (
              <SignUpPanel
                onSuccess={closeModal}
                onOpenSignIn={() => setAuthView('signin')}
              />
            ) : null}
            {authView === 'forgot' ? (
              <ForgotPasswordPanel onOpenSignIn={() => setAuthView('signin')} />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
