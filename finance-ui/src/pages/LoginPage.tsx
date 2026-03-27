import { BadgeIndianRupee } from 'lucide-react';
import { SignInPanel } from '../components/auth/SignInPanel';

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(32,86,216,0.18),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#e0e7ff_100%)] p-6">
      <div className="w-full max-w-md rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-card backdrop-blur">
        <div className="mb-6 flex items-center gap-3 text-brand-700"><BadgeIndianRupee size={30} /><span className="text-lg font-semibold">FinTrack</span></div>
        <SignInPanel />
      </div>
    </div>
  );
}
