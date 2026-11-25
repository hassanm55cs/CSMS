import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useVisits } from '../../context/VisitsContext';
import type { Visit } from '../../data/mock-data';
import { CustomerHeader } from './CustomerHeader';
import { CustomerSidebar } from './CustomerSidebar';
import { BottomNav } from './BottomNav';
import { AIFab } from './AIFab';
import { PageFallback } from '../ui/PageFallback';
import { DiagnosisConfirmModal } from '../visits/DiagnosisConfirmModal';

export function CustomerLayout() {
  const { awaitingConfirmation } = useVisits();
  // The visit currently open in the diagnosis modal (null = closed)
  const [notifVisit, setNotifVisit] = useState<Visit | null>(null);

  const openDiagnosis = () => setNotifVisit(awaitingConfirmation[0] ?? null);
  const first = awaitingConfirmation[0];

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      <CustomerHeader awaitingCount={awaitingConfirmation.length} onOpenDiagnosis={openDiagnosis} />

      <div className="flex flex-1 overflow-hidden">
        <CustomerSidebar />
        <main className="flex-1 overflow-y-auto" role="main">
          {/* Diagnosis pending banner */}
          {first && (
            <div className="mx-4 mt-4 p-3 rounded-xl flex items-center gap-3 cursor-pointer"
              style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)' }}
              onClick={openDiagnosis}>
              <span className="text-xl">🔔</span>
              <div className="flex-1">
                <div className="font-semibold text-sm" style={{ color: '#7C3AED' }}>
                  Diagnosis ready for {first.car.brand} {first.car.model}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {first.diagnosis.length} issues found — tap to review and confirm
                </div>
              </div>
              <span className="text-sm font-semibold" style={{ color: '#7C3AED' }}>Review →</span>
            </div>
          )}
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <BottomNav />
      <AIFab />
      {notifVisit && <DiagnosisConfirmModal visit={notifVisit} onClose={() => setNotifVisit(null)} />}
    </div>
  );
}
