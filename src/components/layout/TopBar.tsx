import { useNavigate } from 'react-router-dom';
import type { Role } from '../../types';
import { MOCK_USER } from '../../data/mock-data';
import { ROUTES, homePathForRole } from '../../routes/paths';
import { useT } from '../../i18n/useT';
import { useTheme } from '../../context/ThemeContext';
import { Icon } from '../ui/Icon';
import { SidebarToggle } from './SidebarToggle';

export function TopBar({ role, onLogout, onMenuClick, menuOpen = false }: { role: Role; onLogout: () => void; onMenuClick?: () => void; menuOpen?: boolean }) {
  const navigate = useNavigate();
  const { dark, toggleDark, lang, toggleLang } = useTheme();
  const t = useT();
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 sm:px-6 border-b"
      style={{ background: 'color-mix(in srgb, var(--surface) 84%, transparent)', borderColor: 'var(--border)', backdropFilter: 'blur(18px) saturate(150%)' }}>
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(homePathForRole(role))}>
        {onMenuClick
          ? <SidebarToggle open={menuOpen} onToggle={onMenuClick} className="header-sidebar-toggle" />
          : <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}><svg width="16" height="16" viewBox="0 0 220 80" fill="white" aria-hidden="true"><rect x="18" y="30" width="184" height="34" rx="9" /><path d="M58 30 L76 11 L150 11 L170 30 Z" opacity="0.7" /><circle cx="58" cy="64" r="14" /><circle cx="168" cy="64" r="14" /></svg></div>}
        <span className="font-bold text-base tracking-tight" style={{ color: 'var(--text)' }}>{t.appName}</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={toggleLang} className="btn btn-ghost btn-sm font-mono text-xs" style={{ color: 'var(--text-3)' }}>
          {lang === 'en' ? 'العربية' : 'EN'}
        </button>
        <button onClick={toggleDark} className="btn btn-ghost btn-sm" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
          <Icon name={dark ? 'sun' : 'moon'} size={18} />
        </button>
        {role === 'customer' && (
          <button onClick={() => navigate(ROUTES.customer.profile)} className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ background: 'var(--primary)' }} aria-label="Profile">
            {MOCK_USER.name[0]}
          </button>
        )}
        <button onClick={onLogout} className="btn btn-ghost btn-sm" title="Sign out">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </header>
  );
}
