import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminApi, unwrapList } from '../../utils/adminApi';
import { TopBar } from './TopBar';
import { PageFallback } from '../ui/PageFallback';
import { SlidingSidebar } from './SlidingSidebar';

export type EmployeeVisit = {
  visitId: number;
  bookingReference: string;
  carLicencePlate: string;
  carCompany: string;
  carModel: string;
  branchId: number;
  branchName: string;
  serviceDate: string;
  status: string;
  employeeId: number | null;
  employeeName: string;
  serviceCount: number;
};

export type EmployeeOutletContext = {
  visits: EmployeeVisit[];
  historyVisits: EmployeeVisit[];
  loading: boolean;
  error: string;
  refreshVisits: () => Promise<void>;
};

export function EmployeeLayout() {
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [visits, setVisits] = useState<EmployeeVisit[]>([]);
  const [historyVisits, setHistoryVisits] = useState<EmployeeVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const employeeName = visits.find(visit => visit.employeeName?.trim())?.employeeName ?? '';
  const refreshInProgress = useRef(false);
  const hasLoadedVisits = useRef(false);

  const refreshVisits = useCallback(async () => {
    if (refreshInProgress.current) return;
    refreshInProgress.current = true;
    if (!hasLoadedVisits.current) setLoading(true);
    setError('');
    try {
      const loadAllPages = async (status?: string) => {
        const loadPage = (page: number) => {
          const query = new URLSearchParams({ page: String(page), pageSize: '100' });
          if (status) query.set('status', status);
          return adminApi<{ totalPages?: number; TotalPages?: number }>(`/visits/Get-Visits-Employee?${query.toString()}`);
        };

        const firstPage = await loadPage(1);
        const totalPages = Math.max(1, Number(firstPage.totalPages ?? firstPage.TotalPages ?? 1));
        const remainingPages = await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) => loadPage(index + 2)));
        return [firstPage, ...remainingPages].flatMap(page => unwrapList<EmployeeVisit>(page));
      };

      const [queue, history] = await Promise.all([loadAllPages(), loadAllPages('Completed')]);
      setVisits(queue.filter(visit => !['completed', 'cancelled'].includes(visit.status.toLowerCase())));
      setHistoryVisits(history);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your assigned visits.');
    } finally {
      hasLoadedVisits.current = true;
      refreshInProgress.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshVisits();
    const timer = window.setInterval(() => { void refreshVisits(); }, 30000);
    const onFocus = () => { void refreshVisits(); };
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [refreshVisits]);

  return (
    <div className="app-shell flex flex-col h-dvh overflow-hidden">
      <TopBar role="employee" onLogout={logout} onMenuClick={() => setMobileMenuOpen(value => !value)} menuOpen={mobileMenuOpen} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <SlidingSidebar role="employee" open={mobileMenuOpen} displayName={employeeName} onClose={() => setMobileMenuOpen(value => !value)} />
        <main className="flex-1 min-w-0 overflow-y-auto" role="main">
          <Suspense fallback={<PageFallback />}>
            <Outlet context={{ visits, historyVisits, loading, error, refreshVisits } satisfies EmployeeOutletContext} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
