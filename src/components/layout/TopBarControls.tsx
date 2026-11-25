import { useTheme } from '../../context/ThemeContext';

export function TopBarControls({ onLogout, onProfile, userName }: { onLogout: () => void; onProfile: () => void; userName: string }) {
  const { dark, toggleDark, lang, toggleLang } = useTheme();
  return (
    <>
      <button onClick={toggleLang} className="btn btn-ghost btn-sm font-mono text-xs" style={{ color: 'var(--text-3)' }}>
        {lang === 'en' ? 'العربية' : 'EN'}
      </button>
      <button onClick={toggleDark} className="btn btn-ghost btn-sm text-lg" aria-label="Toggle theme">
        {dark ? '☀️' : '🌙'}
      </button>
      <button onClick={onProfile} className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ background: 'var(--primary)' }} aria-label="Profile">
        {userName[0]}
      </button>
      <button onClick={onLogout} className="btn btn-ghost btn-sm" title="Sign out">
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    </>
  );
}
