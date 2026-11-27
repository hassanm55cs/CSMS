import { useTheme } from '../../context/ThemeContext';
import { Icon } from '../ui/Icon';
import { PalettePicker } from './PalettePicker';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function TopBarControls({ onLogout, onProfile, userName }: { onLogout: () => void; onProfile: () => void; userName: string }) {
  const { dark, toggleDark, lang, toggleLang } = useTheme();
  const initials = getInitials(userName);

  return (
    <>
      <PalettePicker />
      <button onClick={toggleLang} className="btn btn-ghost btn-sm font-mono text-xs" style={{ color: 'var(--text-3)' }}>
        {lang === 'en' ? 'العربية' : 'EN'}
      </button>
      <button onClick={toggleDark} className="btn btn-ghost btn-sm" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}>
        <Icon name={dark ? 'sun' : 'moon'} size={18} />
      </button>
      <button
        onClick={onProfile}
        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white"
        style={{ background: 'var(--primary)' }}
        aria-label={userName ? `Profile (${userName})` : 'Profile'}
        title={userName || 'Profile'}
      >
        {initials || <Icon name="user" size={15} />}
      </button>
      <button onClick={onLogout} className="btn btn-ghost btn-sm" title="Sign out">
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    </>
  );
}
