import type { KeyboardEvent } from 'react';

export function ViewTabs<T extends string>({
  className,
  label,
  value,
  items,
  onChange,
}: {
  className: string;
  label: string;
  value: T;
  items: { value: T; label: string; panelId: string }[];
  onChange: (value: T) => void;
}) {
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % items.length
        : event.key === 'ArrowLeft'
          ? (index + items.length - 1) % items.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? items.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    onChange(items[next].value);
    document.getElementById(`${items[next].panelId}-tab`)?.focus();
  }
  return (
    <div className={className} role="tablist" aria-label={label}>
      {items.map((item, index) => (
        <button
          key={item.value}
          id={`${item.panelId}-tab`}
          type="button"
          role="tab"
          className={value === item.value ? 'active' : ''}
          aria-selected={value === item.value}
          aria-controls={item.panelId}
          tabIndex={value === item.value ? 0 : -1}
          onKeyDown={(event) => move(event, index)}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
