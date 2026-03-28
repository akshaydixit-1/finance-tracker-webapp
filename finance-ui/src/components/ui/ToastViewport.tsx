import { X } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';
import { useThemeStore } from '../../store/themeStore';

export function ToastViewport() {
  const { toasts, dismissToast } = useToastStore();
  const { isDark } = useThemeStore();

  return (
    <div className="pointer-events-none fixed inset-x-3 top-3 z-50 flex w-auto max-w-[calc(100%-1.5rem)] flex-col gap-2 sm:inset-x-auto sm:right-4 sm:top-4 sm:w-full sm:max-w-sm">
      {toasts.map((toast) => {
        const tone = toast.variant === 'error'
          ? (isDark ? 'border-rose-500/40 bg-rose-950/90 text-rose-100' : 'border-rose-200 bg-rose-50 text-rose-900')
          : toast.variant === 'success'
            ? (isDark ? 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-900')
            : (isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900');

        return (
          <div key={toast.id} className={`pointer-events-auto rounded-xl border px-3.5 py-3 shadow-card sm:px-4 ${tone}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold sm:text-[15px]">{toast.title}</div>
                {toast.message ? <div className="mt-1 text-xs opacity-85 sm:text-sm">{toast.message}</div> : null}
              </div>
              <button className={`rounded-full p-1 opacity-70 ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`} onClick={() => dismissToast(toast.id)}>
                <X size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
