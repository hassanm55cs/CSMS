export function SidebarToggle({ open, onToggle, className = '' }: { open: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      className={`sliding-sidebar-mark ${className}`}
      onClick={event => { event.stopPropagation(); onToggle(); }}
      aria-label={open ? 'Collapse navigation sidebar' : 'Expand navigation sidebar'}
      aria-expanded={open}
      title={open ? 'Collapse sidebar' : 'Expand sidebar'}
    >
      <svg width="20" height="12" viewBox="0 0 220 80" fill="currentColor" aria-hidden="true">
        <rect x="18" y="30" width="184" height="34" rx="9" />
        <path d="M58 30 76 11h74l20 19z" opacity=".72" />
        <circle cx="58" cy="64" r="14" />
        <circle cx="168" cy="64" r="14" />
      </svg>
      <span className="sliding-sidebar-direction" aria-hidden="true">{open ? '←' : '→'}</span>
    </button>
  );
}
