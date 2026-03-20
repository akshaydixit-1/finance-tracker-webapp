export function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: string }) {
  return <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">{children}</label>;
}
