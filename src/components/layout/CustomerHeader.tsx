import { useNavigate } from 'react-router-dom';
import { MOCK_USER } from '../../data/mock-data';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../routes/paths';
import { TopBarControls } from './TopBarControls';

export function CustomerHeader({ awaitingCount, onOpenDiagnosis }: { awaitingCount: number; onOpenDiagnosis: () => void }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 sm:px-6 border-b"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(ROUTES.customer.dashboard)}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
          <svg width="14" height="14" viewBox="0 0 220 80" fill="white"><rect x="18" y="30" width="184" height="34" rx="9" /><circle cx="58" cy="64" r="14" /><circle cx="168" cy="64" r="14" /></svg>
        </div>
        <span className="font-bold text-base tracking-tight" style={{ color: 'var(--text)' }}>CSMS</span>
      </div>
      <div className="flex items-center gap-2">
        {/* Diagnosis notification bell */}
        {awaitingCount > 0 && (
          <button onClick={onOpenDiagnosis}
            className="relative btn btn-ghost btn-sm" aria-label={`${awaitingCount} diagnosis report awaiting confirmation`}>
            🔔
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-xs font-bold text-white flex items-center justify-center"
              style={{ background: 'var(--sos)', fontSize: '10px' }}>{awaitingCount}</span>
          </button>
        )}
        <TopBarControls onLogout={logout} onProfile={() => navigate(ROUTES.customer.profile)} userName={MOCK_USER.name} />
      </div>
    </header>
  );
}
