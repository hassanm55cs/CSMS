import { useCallback, useEffect, useState } from 'react';
import { adminApi, unwrapList } from '../../utils/adminApi';

type RequestItem = { emergencyRequestId: number; requestedAt: string; carLicencePlate: string; problemType?: string; status: string; customerName: string };
type Detail = RequestItem & { latitude: number; longitude: number; description?: string | null; driver?: { driverId: number; fullName: string } | null; truck?: { licencePlate: string; truckCompany?: string; truckModel?: string } | null; car?: { carCompany: string; model: string; color: string } | null };
type Truck = { licencePlate: string; truckCompany: string; truckModel: string; isAvailable: boolean; branchId: number };
type DriverOption = { driverId: number; fullName: string; branchId: number; isAvailable: boolean };

export default function AdminEmergenciesPage() {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [driverId, setDriverId] = useState('');
  const [truckPlate, setTruckPlate] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [res, truckRes, driverRes] = await Promise.all([
        adminApi<any>(`/Admin-Actions/emergency-requests?page=${page}&pageSize=20`),
        adminApi('/emergency-trucks'),
        adminApi('/Driver?page=1&pageSize=100'),
      ]);
      setItems(unwrapList<RequestItem>(res));
      setTrucks(unwrapList<Truck>(truckRes));
      setDrivers(unwrapList<DriverOption>(driverRes));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load emergency requests.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  const open = async (id: number) => {
    try {
      const result = await adminApi<any>(`/Admin-Actions/Get-Emergenct-Request-Details/${id}`);
      const value = result?.data ?? result?.Data ?? result;
      setDetail(value);
      setStatus(value.status ?? '');
      setDriverId(value.driver?.driverId ? String(value.driver.driverId) : '');
      setTruckPlate(value.truck?.licencePlate ?? '');
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load request details.');
    }
  };

  const refreshDetail = async () => {
    if (detail) await open(detail.emergencyRequestId);
    await load();
  };

  const assign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    setError('');
    setMessage('');
    try {
      await adminApi(`/emergency-requests/${detail.emergencyRequestId}/assignment`, {
        method: 'PUT',
        body: JSON.stringify({ driverId: Number(driverId), truckLicencePlate: truckPlate }),
      });
      setMessage('Request assigned.');
      await refreshDetail();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not assign request.');
    }
  };

  const updateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail || !status) return;
    setError('');
    setMessage('');
    try {
      await adminApi(`/emergency-requests/${detail.emergencyRequestId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      setMessage('Request status updated.');
      await refreshDetail();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update status.');
    }
  };

  const cancel = async () => {
    if (!detail || !window.confirm('Cancel this emergency request?')) return;
    setError('');
    setMessage('');
    try {
      await adminApi(`/emergency-requests/${detail.emergencyRequestId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Cancelled by admin' }),
      });
      setMessage('Request cancelled.');
      setDetail(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel request.');
    }
  };

  return (
    <div className="page-in p-4 sm:p-6">
      <div className="mb-5">
        <h1 className="font-bold text-xl" style={{ color: 'var(--text)' }}>Emergency Requests</h1>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>Review, assign, update, or cancel customer requests.</p>
      </div>
      {error && <div className="card mb-3 text-sm" role="alert" style={{ color: 'var(--sos)' }}>{error}</div>}
      {message && <div className="card mb-3 text-sm" role="status" style={{ color: 'var(--s-completed)' }}>{message}</div>}
      <div className="grid xl:grid-cols-2 gap-4">
        <div className="card overflow-x-auto" style={{ padding: 0 }}>
          {loading ? <p className="p-5">Loading requests…</p> : (
            <table>
              <thead><tr><th>Customer</th><th>Vehicle</th><th>Problem</th><th>Status</th><th>Requested</th></tr></thead>
              <tbody>
                {items.map(x => (
                  <tr key={x.emergencyRequestId} onClick={() => void open(x.emergencyRequestId)} className="cursor-pointer">
                    <td>{x.customerName}</td>
                    <td className="font-mono">{x.carLicencePlate}</td>
                    <td>{x.problemType || '—'}</td>
                    <td>{x.status}</td>
                    <td>{new Date(x.requestedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="p-3 flex justify-between">
            <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(x => x - 1)}>Previous</button>
            <span className="text-xs self-center">Page {page}</span>
            <button className="btn btn-secondary btn-sm" disabled={items.length < 20} onClick={() => setPage(x => x + 1)}>Next</button>
          </div>
        </div>
        {detail ? (
          <section className="card">
            <div className="flex justify-between">
              <div>
                <h2 className="font-bold">Request #{detail.emergencyRequestId}</h2>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>{detail.customerName} · {detail.status}</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetail(null)}>Close</button>
            </div>
            <dl className="grid grid-cols-2 gap-2 my-4 text-sm">
              <dt>Car</dt><dd>{detail.carLicencePlate} {detail.car ? `· ${detail.car.carCompany} ${detail.car.model}` : ''}</dd>
              <dt>Problem</dt><dd>{detail.problemType || '—'}</dd>
              <dt>Location</dt>
              <dd>
                <a className="underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${detail.latitude}&mlon=${detail.longitude}#map=15/${detail.latitude}/${detail.longitude}`}>
                  {detail.latitude}, {detail.longitude}
                </a>
              </dd>
              <dt>Details</dt><dd>{detail.description || '—'}</dd>
              <dt>Driver / truck</dt><dd>{detail.driver?.fullName ?? 'Unassigned'} / {detail.truck?.licencePlate ?? '—'}</dd>
            </dl>
            <form onSubmit={assign} className="border-t pt-4 grid sm:grid-cols-3 gap-2" style={{ borderColor: 'var(--border)' }}>
              <label className="text-xs">
                Driver
                <select className="inp mt-1" required value={driverId} onChange={e => setDriverId(e.target.value)}>
                  <option value="">Select driver</option>
                  {drivers
                    .filter(d => d.isAvailable || d.driverId === detail.driver?.driverId)
                    .map(d => (
                      <option key={d.driverId} value={d.driverId}>
                        {d.fullName} (Branch #{d.branchId})
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-xs">
                Available truck
                <select className="inp mt-1" required value={truckPlate} onChange={e => setTruckPlate(e.target.value)}>
                  <option value="">Select truck</option>
                  {trucks
                    .filter(t => t.isAvailable || t.licencePlate === detail.truck?.licencePlate)
                    .map(t => (
                      <option key={t.licencePlate} value={t.licencePlate}>
                        {t.licencePlate} · {t.truckCompany} {t.truckModel}
                      </option>
                    ))}
                </select>
              </label>
              <button className="btn btn-primary self-end">Assign</button>
            </form>
            <form onSubmit={updateStatus} className="mt-4 flex flex-wrap gap-2">
              <select className="inp flex-1" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="Requested">Requested</option>
                <option value="Assigned">Assigned</option>
                <option value="OnTheWay">On the way</option>
                <option value="Arrived">Arrived</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <button className="btn btn-secondary">Update Status</button>
              <button type="button" className="btn btn-ghost text-red-500" onClick={() => void cancel()}>Cancel Request</button>
            </form>
          </section>
        ) : (
          <div className="card text-sm" style={{ color: 'var(--text-3)' }}>
            Select a request to view details, assign an available driver &amp; tow truck, or update status.
          </div>
        )}
      </div>
    </div>
  );
}
