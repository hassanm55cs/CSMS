import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { MOCK_VISITS, type Visit } from '../data/mock-data';

interface VisitsCtxValue {
  visits: Visit[];
  updateVisit: (id: string, patch: Partial<Visit>) => void;
  /** Visits whose diagnosis is waiting for the customer to confirm */
  awaitingConfirmation: Visit[];
}

const VisitsCtx = createContext<VisitsCtxValue>({
  visits: [], updateVisit: () => {}, awaitingConfirmation: [],
});

/**
 * Shared visits state — lifted so the customer and the employee see the same data.
 * Replace the useState seed with GET /api/v1/visits when the backend is ready.
 */
export function VisitsProvider({ children }: { children: React.ReactNode }) {
  const [visits, setVisits] = useState<Visit[]>(MOCK_VISITS);

  const updateVisit = useCallback((id: string, patch: Partial<Visit>) => {
    setVisits(prev => prev.map(v => (v.id === id ? { ...v, ...patch } : v)));
  }, []);

  const awaitingConfirmation = useMemo(
    () => visits.filter(v => v.status === 'pending-customer-confirmation'),
    [visits],
  );

  return (
    <VisitsCtx.Provider value={{ visits, updateVisit, awaitingConfirmation }}>
      {children}
    </VisitsCtx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useVisits() {
  return useContext(VisitsCtx);
}
