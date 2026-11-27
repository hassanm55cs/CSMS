import { useCallback, useEffect, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import { authorizedFetch } from '../../utils/adminApi';

type DriverApplication = {
  driverId: number;
  fullname: string;
  email: string;
  phoneNumber: string;
  salary: number;
  branchId: number;
};

const apiBase = () => ((import.meta.env.VITE_API_URL as string | undefined) || 'https://localhost:7260').replace(/\/$/, '');

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<DriverApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadApplications = useCallback(async () => {
    const token = localStorage.getItem('csms.token');
    if (!token) {
      setError('Sign in again to review driver applications.');
      setLoading(false);
      return;
    }
    try {
      const response = await authorizedFetch(`${apiBase()}/Get-unverified-drivers?page=1&pageSize=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? result?.Message ?? 'Could not load driver applications.');
      setDrivers(result?.data ?? result?.Data ?? []);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load driver applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadApplications(); }, [loadApplications]);

  const changeField = (driverId: number, field: 'email' | 'phoneNumber' | 'salary', value: string) => {
    setDrivers(current => current.map(driver => driver.driverId === driverId
      ? { ...driver, [field]: field === 'salary' ? Number(value) : value }
      : driver));
  };

  const saveDetails = async (driver: DriverApplication, token: string) => {
    const response = await authorizedFetch(`${apiBase()}/Driver/${driver.driverId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: driver.email, phoneNumber: driver.phoneNumber, salary: driver.salary }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      const errors = result?.errors ?? result?.Errors;
      throw new Error(Array.isArray(errors) ? errors.join(' ') : result?.message ?? result?.Message ?? 'Could not save driver details.');
    }
  };

  const confirmDriver = async (driver: DriverApplication) => {
    if (driver.salary <= 0) {
      setError('Set a positive salary before confirming this driver.');
      return;
    }
    const token = localStorage.getItem('csms.token');
    if (!token) { setError('Sign in again to confirm this driver.'); return; }
    setBusyId(driver.driverId);
    setError('');
    setMessage('');
    try {
      await saveDetails(driver, token);
      const response = await authorizedFetch(`${apiBase()}/Confirm-Driver/${driver.driverId}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? result?.Message ?? 'Could not confirm this driver.');
      setDrivers(current => current.filter(item => item.driverId !== driver.driverId));
      setMessage(`${driver.fullname} is confirmed.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not confirm this driver.');
    } finally {
      setBusyId(null);
    }
  };

  const rejectDriver = async (driver: DriverApplication) => {
    const reason = window.prompt(`Reason for rejecting ${driver.fullname}:`);
    if (reason === null) return;
    const token = localStorage.getItem('csms.token');
    if (!token) { setError('Sign in again to reject this driver.'); return; }
    setBusyId(driver.driverId); setError(''); setMessage('');
    try {
      const response = await authorizedFetch(`${apiBase()}/Admin-Actions/Reject-Driver/${driver.driverId}?reason=${encodeURIComponent(reason)}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? result?.Message ?? 'Could not reject this driver.');
      setDrivers(current => current.filter(item => item.driverId !== driver.driverId));
      setMessage(`${driver.fullname} was rejected.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not reject this driver.'); }
    finally { setBusyId(null); }
  };

  return (
    <div className="page-in p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
          <Icon name="driver" size={23} />
        </div>
        <div>
          <h1 className="font-bold text-xl" style={{ color: 'var(--text)' }}>Driver Approvals</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Review applications, set salary, and confirm drivers.</p>
        </div>
        <span className="badge badge-upcoming ml-auto">{drivers.length} pending</span>
      </div>

      {error && <div className="card mb-4 text-sm" role="alert" style={{ color: 'var(--sos)' }}>{error}</div>}
      {message && <div className="card mb-4 text-sm" role="status" style={{ color: 'var(--s-completed)' }}>{message}</div>}
      {loading ? (
        <div className="card text-sm" style={{ color: 'var(--text-3)' }}>Loading driver applications…</div>
      ) : drivers.length === 0 ? (
        <div className="card text-center py-12">
          <div className="flex justify-center mb-3" style={{ color: 'var(--text-4)' }}><Icon name="check" size={30} /></div>
          <h2 className="font-semibold" style={{ color: 'var(--text)' }}>No pending drivers</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>New driver applications will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {drivers.map(driver => (
            <section key={driver.driverId} className="card">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-semibold" style={{ color: 'var(--text)' }}>{driver.fullname}</h2>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Application #{driver.driverId} · Branch {driver.branchId}</p>
                </div>
                <span className="badge badge-upcoming">Awaiting approval</span>
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-[1fr_1fr_180px_auto] gap-3 items-end">
                <label className="text-xs" style={{ color: 'var(--text-3)' }}>Email
                  <input className="inp mt-1" type="email" value={driver.email}
                    onChange={event => changeField(driver.driverId, 'email', event.target.value)} />
                </label>
                <label className="text-xs" style={{ color: 'var(--text-3)' }}>Phone
                  <input className="inp mt-1" type="tel" value={driver.phoneNumber}
                    onChange={event => changeField(driver.driverId, 'phoneNumber', event.target.value)} />
                </label>
                <label className="text-xs" style={{ color: 'var(--text-3)' }}>Salary
                  <input className="inp mt-1" type="number" min="0.01" step="0.01" value={driver.salary}
                    onChange={event => changeField(driver.driverId, 'salary', event.target.value)} />
                </label>
                <div className="flex gap-2"><button className="btn btn-primary btn-sm" disabled={busyId === driver.driverId || driver.salary <= 0}
                  onClick={() => void confirmDriver(driver)}>
                  {busyId === driver.driverId ? 'Working…' : 'Save & Confirm'}
                </button><button className="btn btn-secondary btn-sm" disabled={busyId === driver.driverId} onClick={() => void rejectDriver(driver)}>Reject</button></div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
