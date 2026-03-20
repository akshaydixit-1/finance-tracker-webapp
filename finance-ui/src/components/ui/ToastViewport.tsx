import { X } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';

export function ToastViewport() {
  const { toasts, dismissToast } = useToastStore();

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => {
        const tone = toast.variant === 'error'
          ? 'border-rose-200 bg-rose-50 text-rose-900'
          : toast.variant === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border-slate-200 bg-white text-slate-900';

        return (
          <div key={toast.id} className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-card ${tone}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{toast.title}</div>
                {toast.message ? <div className="mt-1 text-sm opacity-80">{toast.message}</div> : null}
              </div>
              <button className="rounded-full p-1 opacity-70 hover:bg-black/5" onClick={() => dismissToast(toast.id)}>
                <X size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
