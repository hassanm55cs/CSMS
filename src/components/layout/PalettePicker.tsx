import { useEffect, useRef, useState } from 'react';
import { PALETTES, useTheme } from '../../context/ThemeContext';

export function PalettePicker({ compact = false }: { compact?: boolean }) {
  const { palette, setPalette } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activePalette = PALETTES.find(p => p.id === palette) ?? PALETTES[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="btn btn-ghost btn-sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Color palette: ${activePalette.name}`}
        title={`Color palette: ${activePalette.name}`}
      >
        <span className="inline-flex items-center -space-x-1" aria-hidden="true">
          <span
            className="w-3.5 h-3.5 rounded-full border border-white/80"
            style={{ background: activePalette.swatches[0] }}
          />
          <span
            className="w-3.5 h-3.5 rounded-full border border-white/80"
            style={{ background: activePalette.swatches[1] }}
          />
        </span>
        {!compact && (
          <span className="hidden sm:inline text-xs font-medium" style={{ color: 'var(--text-2)' }}>
            Theme
          </span>
        )}
      </button>

      {open && (
        <div className="palette-popover" role="menu" aria-label="Choose color palette">
          <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-4)' }}>
            Color Palette
          </div>
          <div className="space-y-0.5">
            {PALETTES.map(option => {
              const selected = option.id === palette;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  className={`palette-option ${selected ? 'active' : ''}`}
                  onClick={() => {
                    setPalette(option.id);
                    setOpen(false);
                  }}
                >
                  <span className="flex items-center gap-1 flex-shrink-0" aria-hidden="true">
                    {option.swatches.map((hex, index) => (
                      <span
                        key={index}
                        className="w-3.5 h-3.5 rounded-full border"
                        style={{ background: hex, borderColor: 'var(--border-2)' }}
                      />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold" style={{ color: 'var(--text)' }}>
                      {option.name}
                    </span>
                    <span className="block text-[11px] truncate" style={{ color: 'var(--text-3)' }}>
                      {option.description}
                    </span>
                  </span>
                  {selected && (
                    <span className="text-xs font-bold" style={{ color: 'var(--primary)' }} aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
