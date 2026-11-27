import { useEffect, useRef, useState } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select an option…',
  disabled = false,
  className = '',
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find(opt => opt.value === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full min-h-[42px] px-3.5 py-2 rounded-[10px] border flex items-center justify-between gap-3 text-left text-sm transition-colors"
        style={{
          background: 'var(--surface)',
          borderColor: open ? 'var(--primary)' : 'var(--border-2)',
          boxShadow: open ? '0 0 0 3px var(--primary-ring)' : undefined,
          color: selected ? 'var(--text)' : 'var(--text-4)',
        }}
      >
        <span className="min-w-0 flex-1 truncate">
          {selected ? (
            <>
              <span className="font-medium" style={{ color: 'var(--text)' }}>{selected.label}</span>
              {selected.sublabel && (
                <span className="ml-1.5 text-xs" style={{ color: 'var(--text-3)' }}>
                  · {selected.sublabel}
                </span>
              )}
            </>
          ) : (
            placeholder
          )}
        </span>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0 transition-transform duration-150"
          style={{
            color: 'var(--text-3)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1.5 rounded-xl border p-1.5 max-h-64 overflow-y-auto"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border-2)',
            boxShadow: 'var(--sh-xl)',
          }}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-3)' }}>
              No options available
            </div>
          ) : (
            options.map(option => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="w-full px-3 py-2.5 rounded-lg flex items-center justify-between gap-2 text-left transition-colors"
                  style={{
                    background: isSelected ? 'var(--primary-light)' : 'transparent',
                    color: isSelected ? 'var(--primary)' : 'var(--text)',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--surface-2)';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{option.label}</span>
                    {option.sublabel && (
                      <span className="block text-xs truncate mt-0.5" style={{ color: 'var(--text-3)' }}>
                        {option.sublabel}
                      </span>
                    )}
                  </span>
                  {isSelected && (
                    <span className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--primary)' }}>
                      ✓
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
