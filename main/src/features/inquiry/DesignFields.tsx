import { Textarea } from '@/components/ui/textarea';
import type { ReactNode } from 'react';
export function TextField({
  label,
  value,
  onChange,
  rows = 3,
  hint,
  short = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
  short?: boolean;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {short ? (
        <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} maxLength={150} />
      ) : (
        <Textarea
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          maxLength={6000}
        />
      )}
      {hint && <small>{hint}</small>}
      {value.length >= (short ? 135 : 5400) && (
        <small className="design-field-count">还可输入 {(short ? 150 : 6000) - value.length} 字</small>
      )}
    </label>
  );
}
export function DesignSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="market-panel design-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
