import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export function StepSection({
  number,
  title,
  children,
  updated = false,
}: {
  number: number;
  title: string;
  children: ReactNode;
  updated?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const id = useId();
  return (
    <section className={`step-section ${updated ? 'content-updated' : ''}`}>
      <button
        className="step-section-heading"
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <span className="step-number">{number}</span>
        <h3>{title}</h3>
        <ChevronDown className={open ? 'expanded' : ''} aria-hidden="true" />
      </button>
      <div id={id} className="step-section-content" hidden={!open}>
        {children}
      </div>
    </section>
  );
}

export function SaveStatus({ failed = false, time }: { failed?: boolean; time?: string }) {
  return (
    <span className="save-status" data-status={failed ? 'error' : 'saved'} role="status">
      <i aria-hidden="true" />
      {failed ? '保存失败' : time ? '已保存' : '草稿'}
      {!failed && time ? ` ${time}` : ''}
    </span>
  );
}

export function StickyActions({ status, children }: { status?: ReactNode; children: ReactNode }) {
  return (
    <footer className="sticky-actions">
      {status && <div className="action-status">{status}</div>}
      <div className="action-buttons">{children}</div>
    </footer>
  );
}

export function EmptyState({
  children,
  action,
  title,
}: {
  children?: ReactNode;
  action?: ReactNode;
  title?: string;
}) {
  return (
    <div className="empty-state">
      {title && <h2>{title}</h2>}
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
