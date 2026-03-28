import { Info } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export function FieldLabel({ htmlFor, children, hint }: { htmlFor?: string; children: ReactNode; hint?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!tooltipRef.current) return;
      if (tooltipRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <label htmlFor={htmlFor} className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700">
      <span>{children}</span>
      {hint ? (
        <span ref={tooltipRef} className="relative inline-flex">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600"
            aria-label={`Info: ${hint}`}
            aria-expanded={isOpen}
            aria-controls={tooltipId}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsOpen((current) => !current);
            }}
          >
            <Info size={12} />
          </button>
          {isOpen ? (
            <span
              id={tooltipId}
              role="tooltip"
              className="absolute left-1/2 top-full z-20 mt-2 w-56 -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-normal leading-relaxed text-slate-700 shadow-lg"
            >
              {hint}
            </span>
          ) : null}
        </span>
      ) : null}
    </label>
  );
}
