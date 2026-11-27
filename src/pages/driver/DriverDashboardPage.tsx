import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import { RouteMap } from '../../components/maps/RouteMap';
import { adminApi, unwrapList } from '../../utils/adminApi';

type DriverProfile = {
  driverId: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  branchId: number;
  branchName?: string | null;
  branchLatitude?: number | null;
  branchLongitude?: number | null;
  isAvailable: boolean;
  latitude?: number | null;
  longitude?: number | null;
};

type TruckOption = {
  licencePlate: string;
  truckCompany: string;
  truckModel: string;
};

type DriverEmergency = {
  emergencyRequestId: number;
  requestedAt: string;
  status: string;
  problemType: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  assignedToMe: boolean;
  customer: { fullName: string; phone?: string | null };
  car: { licencePlate: string; carCompany: string; model: string; color: string };
  truck?: TruckOption | null;
  branch?: { branchId: number; branchName: string; latitude?: number | null; longitude?: number | null } | null;
};

const ACTIVE_STATUSES = ['assigned', 'confirmed', 'ontheway', 'arrived', 'tobranch'];

function statusKey(status?: string) {
  return (status ?? '').replace(/[^a-z]/gi, '').toLowerCase();
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function DriverDashboardPage() {
  const [tab, setTab] = useState<'dispatch' | 'history' | 'password'>('dispatch');
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [openRequests, setOpenRequests] = useState<DriverEmergency[]>([]);
  const [myRequests, setMyRequests] = useState<DriverEmergency[]>([]);
  const [trucks, setTrucks] = useState<TruckOption[]>([]);
  const [selectedTruck, setSelectedTruck] = useState('');
  const [gps, setGps] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsError, setGpsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Change password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const lastSentLocationRef = useRef<number>(0);

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [me, openRes, assignedRes, trucksRes] = await Promise.all([
        adminApi<DriverProfile>('/Driver/me'),
        adminApi('/api/v1/driver/emergency-requests?assigned=false&page=1&pageSize=50'),
        adminApi('/api/v1/driver/emergency-requests/assigned?page=1&pageSize=50'),
        adminApi('/api/v1/driver/emergency-requests/trucks').catch(() => []),
      ]);
      setProfile(me);
      setOpenRequests(unwrapList<DriverEmergency>(openRes));
      setMyRequests(unwrapList<DriverEmergency>(assignedRes));
      const availableTrucks = unwrapList<TruckOption>(trucksRes);
      setTrucks(availableTrucks);
      if (availableTrucks.length > 0) {
        setSelectedTruck(current => current || availableTrucks[0].licencePlate);
      }
      if (me.latitude != null && me.longitude != null) {
        setGps(current => current ?? { latitude: me.latitude!, longitude: me.longitude! });
      }
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load driver dispatch data.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Listen to SignalR updates + 15s fallback poll
  useEffect(() => {
    const onSync = () => { void loadAll(true); };
    window.addEventListener('csms:driver-emergency-sync', onSync);
    const timer = window.setInterval(() => { void loadAll(true); }, 15000);
    return () => {
      window.removeEventListener('csms:driver-emergency-sync', onSync);
      window.clearInterval(timer);
    };
  }, [loadAll]);

  const activeJob = useMemo(
    () => myRequests.find(r => ACTIVE_STATUSES.includes(statusKey(r.status))) ?? null,
    [myRequests],
  );

  const historyJobs = useMemo(
    () => myRequests.filter(r => !ACTIVE_STATUSES.includes(statusKey(r.status))),
    [myRequests],
  );

  const pushLocation = useCallback(async (latitude: number, longitude: number, isAvailable?: boolean, showFeedback = false) => {
    if (showFeedback) {
      setBusyAction('gps');
      setError('');
      setMessage('');
    }
    try {
      const updated = await adminApi<{ latitude: number; longitude: number; isAvailable: boolean }>('/Driver/me/location', {
        method: 'PUT',
        body: JSON.stringify({
          latitude,
          longitude,
          ...(isAvailable !== undefined ? { isAvailable } : {}),
        }),
      });
      setGps({ latitude: updated.latitude, longitude: updated.longitude });
      setProfile(current => (current ? { ...current, isAvailable: updated.isAvailable, latitude: updated.latitude, longitude: updated.longitude } : current));
      if (showFeedback) {
        setMessage(`Live GPS sent (${updated.latitude.toFixed(4)}, ${updated.longitude.toFixed(4)}).`);
      }
    } catch (cause) {
      if (isAvailable !== undefined || showFeedback) {
        setError(cause instanceof Error ? cause.message : 'Could not update GPS location.');
      }
    } finally {
      if (showFeedback) setBusyAction('');
    }
  }, []);

  // Watch browser GPS so map & customer tracking stay live
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('Browser GPS is unavailable.');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setGpsError('');
        setGps({ latitude: coords.latitude, longitude: coords.longitude });
        const now = Date.now();
        if (now - lastSentLocationRef.current >= 10000) {
          lastSentLocationRef.current = now;
          void pushLocation(coords.latitude, coords.longitude);
        }
      },
      () => {
        setGpsError('Allow location access to enable live navigation and GPS tracking.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [pushLocation]);

  const acceptRequest = async (requestId: number) => {
    setBusyAction(`accept-${requestId}`);
    setError('');
    setMessage('');
    try {
      await adminApi(`/api/v1/driver/emergency-requests/${requestId}/accept`, {
        method: 'POST',
        body: JSON.stringify(selectedTruck ? { truckLicencePlate: selectedTruck } : {}),
      });
      setMessage(`Accepted emergency request #${requestId}.`);
      await loadAll(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not accept this request.');
    } finally {
      setBusyAction('');
    }
  };

  const advanceStatus = async (requestId: number, nextStatus: 'OnTheWay' | 'Arrived' | 'Completed') => {
    setBusyAction(`status-${nextStatus}`);
    setError('');
    setMessage('');
    try {
      await adminApi(`/api/v1/driver/emergency-requests/${requestId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: nextStatus,
          ...(gps ? { latitude: gps.latitude, longitude: gps.longitude } : {}),
        }),
      });
      setMessage(`Request #${requestId} marked as ${nextStatus}.`);
      await loadAll(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update job status.');
    } finally {
      setBusyAction('');
    }
  };

  const cancelActiveJob = async (requestId: number) => {
    const reason = window.prompt('Reason for cancelling this job (optional):');
    if (reason === null) return;
    setBusyAction('cancel');
    setError('');
    setMessage('');
    try {
      await adminApi(`/emergency-requests/${requestId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() || 'Cancelled by driver' }),
      });
      setMessage(`Request #${requestId} cancelled.`);
      await loadAll(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not cancel this job.');
    } finally {
      setBusyAction('');
    }
  };

  const toggleAvailability = async () => {
    if (!profile) return;
    const targetLat = gps?.latitude ?? profile.branchLatitude ?? 30.0444;
    const targetLng = gps?.longitude ?? profile.branchLongitude ?? 31.2357;
    setBusyAction('availability');
    setError('');
    await pushLocation(targetLat, targetLng, !profile.isAvailable);
    setBusyAction('');
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setChangingPw(true);
    try {
      await adminApi('/Driver/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      setMessage('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not change password.');
    } finally {
      setChangingPw(false);
    }
  };

  const driverOrigin = gps
    ? { latitude: gps.latitude, longitude: gps.longitude, label: 'Your Location' }
    : profile?.branchLatitude != null && profile?.branchLongitude != null
      ? { latitude: profile.branchLatitude, longitude: profile.branchLongitude, label: profile.branchName || 'Your Branch' }
      : null;

  const branchPoint = profile?.branchLatitude != null && profile?.branchLongitude != null
    ? { latitude: profile.branchLatitude, longitude: profile.branchLongitude, label: profile.branchName || 'Branch' }
    : null;

  const nextAction = (() => {
    if (!activeJob) return null;
    const key = statusKey(activeJob.status);
    if (key === 'assigned' || key === 'confirmed') return { status: 'OnTheWay' as const, label: 'Start Driving (On The Way)' };
    if (key === 'ontheway') return { status: 'Arrived' as const, label: 'Mark Arrived at Customer' };
    if (key === 'arrived') return { status: 'Completed' as const, label: 'Complete Job' };
    return null;
  })();

  return (
    <div className="page-in p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
          <Icon name="driver" size={23} />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-xl" style={{ color: 'var(--text)' }}>
            {profile?.fullName ? `Driver Dispatch · ${profile.fullName}` : 'Driver Dispatch'}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
            {profile?.branchName ? `Branch: ${profile.branchName}` : profile ? `Branch #${profile.branchId}` : 'Loading profile…'}
            {gps ? ` · GPS ${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}` : ''}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {profile && (
            <button
              type="button"
              className={`btn btn-sm ${profile.isAvailable ? 'btn-primary' : 'btn-secondary'}`}
              disabled={busyAction === 'availability' || Boolean(activeJob)}
              onClick={() => void toggleAvailability()}
              title={activeJob ? 'Finish your active job before changing availability' : 'Toggle availability'}
            >
              {activeJob ? 'On Active Job' : profile.isAvailable ? 'Available' : 'Offline'}
            </button>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void loadAll(true)}>
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 border-b pb-2" style={{ borderColor: 'var(--border)' }}>
        {[
          { id: 'dispatch', label: `Dispatch (${openRequests.length})` },
          { id: 'history', label: `History (${historyJobs.length})` },
          { id: 'password', label: 'Change Password' },
        ].map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id as typeof tab)}
            className={`btn btn-sm ${tab === item.id ? 'btn-primary' : 'btn-ghost'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {gpsError && <div className="card mb-4 text-xs" style={{ color: 'var(--text-3)' }}>{gpsError}</div>}
      {error && <div className="card mb-4 text-sm" role="alert" style={{ color: 'var(--sos)' }}>{error}</div>}
      {message && <div className="card mb-4 text-sm" role="status" style={{ color: 'var(--s-completed)' }}>{message}</div>}

      {loading ? (
        <div className="card text-sm" style={{ color: 'var(--text-3)' }}>Loading dispatch workspace…</div>
      ) : tab === 'password' ? (
        <form onSubmit={handleChangePassword} className="card max-w-md space-y-3">
          <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>Change Password</h2>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            Update the default password provided by your administrator.
          </p>
          <label className="block text-xs" style={{ color: 'var(--text-3)' }}>
            Current Password
            <input className="inp mt-1" type="password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
          </label>
          <label className="block text-xs" style={{ color: 'var(--text-3)' }}>
            New Password
            <input className="inp mt-1" type="password" required minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </label>
          <label className="block text-xs" style={{ color: 'var(--text-3)' }}>
            Confirm New Password
            <input className="inp mt-1" type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </label>
          <button type="submit" className="btn btn-primary w-full" disabled={changingPw}>
            {changingPw ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      ) : tab === 'history' ? (
        historyJobs.length === 0 ? (
          <div className="card text-sm" style={{ color: 'var(--text-3)' }}>No completed or cancelled emergency jobs yet.</div>
        ) : (
          <div className="space-y-3">
            {historyJobs.map(job => (
              <div key={job.emergencyRequestId} className="card flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                    #{job.emergencyRequestId} · {job.customer.fullName} ({job.car.carCompany} {job.car.model} · {job.car.licencePlate})
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                    {job.problemType} · {new Date(job.requestedAt).toLocaleString()}
                  </div>
                </div>
                <span className={`badge ${statusKey(job.status) === 'completed' ? 'badge-completed' : 'badge-cancelled'}`}>
                  {job.status}
                </span>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-6">
          {/* Active Job Panel */}
          {activeJob && (
            <section className="card" style={{ borderColor: 'color-mix(in srgb, var(--primary) 40%, var(--border))' }}>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <span className="badge badge-upcoming mb-2">Active Job · {activeJob.status}</span>
                  <h2 className="font-bold text-lg" style={{ color: 'var(--text)' }}>
                    Request #{activeJob.emergencyRequestId} — {activeJob.customer.fullName}
                  </h2>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
                    {activeJob.car.carCompany} {activeJob.car.model} ({activeJob.car.color}) · <span className="font-mono">{activeJob.car.licencePlate}</span>
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                    Problem: <strong>{activeJob.problemType}</strong>
                    {activeJob.description ? ` — ${activeJob.description}` : ''}
                    {activeJob.truck ? ` · Truck: ${activeJob.truck.licencePlate}` : ''}
                  </p>
                </div>
                {activeJob.customer.phone && (
                  <a href={`tel:${activeJob.customer.phone}`} className="btn btn-primary btn-sm">
                    Call {activeJob.customer.phone}
                  </a>
                )}
              </div>

              <div className="mb-4">
                <RouteMap
                  height={320}
                  origin={driverOrigin}
                  destination={{
                    latitude: activeJob.latitude,
                    longitude: activeJob.longitude,
                    label: `${activeJob.customer.fullName} (${activeJob.car.licencePlate})`,
                  }}
                  branch={branchPoint}
                  showTurnByTurn
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {nextAction && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busyAction !== ''}
                    onClick={() => void advanceStatus(activeJob.emergencyRequestId, nextAction.status)}
                  >
                    {busyAction === `status-${nextAction.status}` ? 'Updating…' : nextAction.label}
                  </button>
                )}
                {(gps || driverOrigin) && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={busyAction !== ''}
                    onClick={() => {
                      const target = gps ?? driverOrigin!;
                      void pushLocation(target.latitude, target.longitude, undefined, true);
                    }}
                  >
                    {busyAction === 'gps' ? 'Sending GPS…' : 'Send Live GPS Now'}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-red-500 ml-auto"
                  disabled={busyAction !== ''}
                  onClick={() => void cancelActiveJob(activeJob.emergencyRequestId)}
                >
                  Cancel Job
                </button>
              </div>
            </section>
          )}

          {/* Open Nearest-Branch Requests Queue */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="font-bold text-base" style={{ color: 'var(--text)' }}>
                  Nearby Emergency Requests ({profile?.branchName ?? 'Your Branch'})
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {activeJob
                    ? 'You can only handle one emergency at a time. Complete your active job to accept another.'
                    : 'Choose a customer request below to accept and start navigation.'}
                </p>
              </div>
              {trucks.length > 1 && !activeJob && (
                <label className="text-xs flex items-center gap-2" style={{ color: 'var(--text-3)' }}>
                  Truck:
                  <select className="inp py-1 text-xs" value={selectedTruck} onChange={e => setSelectedTruck(e.target.value)}>
                    {trucks.map(t => (
                      <option key={t.licencePlate} value={t.licencePlate}>
                        {t.licencePlate} ({t.truckCompany} {t.truckModel})
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {openRequests.length === 0 ? (
              <div className="card text-center py-10 text-sm" style={{ color: 'var(--text-3)' }}>
                No pending emergency requests for your branch right now. New requests will appear here automatically.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {openRequests.map(req => {
                  const distanceKm = driverOrigin
                    ? haversineKm(driverOrigin.latitude, driverOrigin.longitude, req.latitude, req.longitude)
                    : null;
                  return (
                    <article key={req.emergencyRequestId} className="card flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                            #{req.emergencyRequestId} · {req.customer.fullName}
                          </span>
                          {distanceKm !== null && (
                            <span className="badge badge-upcoming font-mono">{distanceKm.toFixed(1)} km</span>
                          )}
                        </div>
                        <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                          {req.car.carCompany} {req.car.model} ({req.car.color}) · <span className="font-mono">{req.car.licencePlate}</span>
                        </div>
                        <div className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
                          <strong>{req.problemType}</strong>
                          {req.description ? ` — ${req.description}` : ''}
                        </div>
                        <div className="text-xs mt-1 font-mono" style={{ color: 'var(--text-4)' }}>
                          {req.latitude.toFixed(5)}, {req.longitude.toFixed(5)} · {new Date(req.requestedAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm w-full"
                        disabled={Boolean(activeJob) || busyAction !== ''}
                        onClick={() => void acceptRequest(req.emergencyRequestId)}
                      >
                        {busyAction === `accept-${req.emergencyRequestId}`
                          ? 'Accepting…'
                          : activeJob
                            ? 'Finish Active Job First'
                            : 'Accept Customer'}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
