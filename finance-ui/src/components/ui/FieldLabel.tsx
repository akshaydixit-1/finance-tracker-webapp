import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

export function FieldLabel({ htmlFor, children, hint }: { htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700">
      <span>{children}</span>
      {hint ? (
        <span
          className="inline-flex cursor-help items-center justify-center rounded-full text-slate-400 hover:text-slate-600"
          title={hint}
          aria-label={hint}
        >
          <Info size={12} />
        </span>
      ) : null}
    </label>
  );
}
