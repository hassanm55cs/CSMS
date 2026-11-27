import { useCallback, useEffect, useState } from 'react';
import { Field } from '../../components/ui/Field';
import { RouteMap } from '../../components/maps/RouteMap';
import { SOS_PROBLEM_TYPES } from '../../data/mock-data';
import { adminApi, unwrapList } from '../../utils/adminApi';

type Coordinates = { latitude: number; longitude: number };
type CustomerCar = { licencesPlate?: string; licencePlate?: string; carCompany?: string; model?: string };

type EmergencyDetail = {
  emergencyRequestId: number;
  requestedAt: string;
  carLicencePlate: string;
  problemType: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  status: string;
  driver?: { driverId: number; fullName: string; phoneNumber?: string | null } | null;
  truck?: { licencePlate: string; truckCompany: string; truckModel: string } | null;
  branch?: { branchId: number; branchName: string; latitude?: number | null; longitude?: number | null } | null;
  driverLocation?: { latitude: number; longitude: number } | null;
  etaMinutes?: number | null;
};

const API_PROBLEM_TYPES: Record<string, string> = {
  breakdown: 'EngineFailure',
  'flat-tire': 'FlatTire',
  accident: 'Accident',
  fuel: 'OutOfFuel',
  'locked-out': 'LockedOut',
  towing: 'Other',
};

const ACTIVE_STATUSES = ['requested', 'assigned', 'confirmed', 'ontheway', 'arrived', 'tobranch'];

function normalizeStatus(status?: string): string {
  return (status ?? 'requested').replace(/[^a-z]/gi, '').toLowerCase();
}

export default function SOSPage() {
  const [step, setStep] = useState<'pick' | 'location' | 'tracking'>('pick');
  const [problem, setProblem] = useState<typeof SOS_PROBLEM_TYPES[0] | null>(null);
  const [cars, setCars] = useState<CustomerCar[]>([]);
  const [carPlate, setCarPlate] = useState('');
  const [description, setDescription] = useState('');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationState, setLocationState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [locationError, setLocationError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [activeRequest, setActiveRequest] = useState<EmergencyDetail | null>(null);

  const loadCarsAndActiveRequest = useCallback(async () => {
    try {
      const [carsResult, requestsResult] = await Promise.all([
        adminApi('/cars?page=1&pageSize=50').catch(() => []),
        adminApi('/emergency-requests?page=1&pageSize=10').catch(() => []),
      ]);
      const carList = unwrapList<CustomerCar>(carsResult);
      setCars(carList);
      if (carList.length > 0) {
        const firstPlate = carList[0].licencesPlate ?? carList[0].licencePlate ?? '';
        setCarPlate(current => current || firstPlate);
      }

      const requests = unwrapList<EmergencyDetail>(requestsResult);
      const ongoing = requests.find(r => ACTIVE_STATUSES.includes(normalizeStatus(r.status)));
      if (ongoing) {
        setActiveRequest(ongoing);
        setCoordinates({ latitude: ongoing.latitude, longitude: ongoing.longitude });
        setStep('tracking');
      }
    } catch {
      // Ignore initial load errors; user can still submit manually
    }
  }, []);

  useEffect(() => {
    void loadCarsAndActiveRequest();
  }, [loadCarsAndActiveRequest]);

  // Listen to real-time SignalR updates + fallback polling while tracking
  useEffect(() => {
    if (step !== 'tracking' || !activeRequest) return;

    const onUpdated = (event: Event) => {
      const payload = (event as CustomEvent<EmergencyDetail>).detail;
      if (!payload || payload.emergencyRequestId !== activeRequest.emergencyRequestId) return;
      setActiveRequest(payload);
    };

    const refresh = async () => {
      try {
        const latest = await adminApi<EmergencyDetail>(`/emergency-requests/${activeRequest.emergencyRequestId}`);
        if (latest?.emergencyRequestId) setActiveRequest(latest);
      } catch {
        // Keep current view on transient failure
      }
    };

    window.addEventListener('csms:emergency-updated', onUpdated);
    const timer = window.setInterval(() => {
      if (ACTIVE_STATUSES.includes(normalizeStatus(activeRequest.status))) {
        void refresh();
      }
    }, 10000);

    return () => {
      window.removeEventListener('csms:emergency-updated', onUpdated);
      window.clearInterval(timer);
    };
  }, [step, activeRequest?.emergencyRequestId, activeRequest?.status]);

  const getLocation = () => {
    setLocationError('');
    setLocationState('loading');
    if (!navigator.geolocation) {
      setLocationState('error');
      setLocationError('Location is not supported by this browser. Tap on the map to set your location.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinates({ latitude: coords.latitude, longitude: coords.longitude });
        setLocationState('ready');
      },
      error => {
        setLocationState('error');
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Allow access or tap on the map to pick your location.'
            : error.code === error.TIMEOUT
              ? 'Location lookup timed out. Try again or tap on the map.'
              : 'Could not get GPS location. Tap on the map to set your pin.',
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  };

  const sendHelpRequest = async () => {
    setRequestError('');
    if (!coordinates) {
      setRequestError('Get your current location or tap on the map before sending the request.');
      return;
    }
    if (!carPlate.trim()) {
      setRequestError('Select or enter the car license plate that needs assistance.');
      return;
    }
    setSending(true);
    try {
      const created = await adminApi<EmergencyDetail>('/emergency-requests', {
        method: 'POST',
        body: JSON.stringify({
          carLicencePlate: carPlate.trim(),
          problemType: API_PROBLEM_TYPES[problem?.id ?? ''] ?? 'Other',
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          description: description.trim() || problem?.label || 'Tow truck requested',
        }),
      });
      window.dispatchEvent(new Event('csms:emergency-requests-changed'));
      setActiveRequest(created);
      setStep('tracking');
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Could not send the help request.');
    } finally {
      setSending(false);
    }
  };

  const cancelRequest = async () => {
    if (!activeRequest) return;
    if (!window.confirm('Cancel this emergency request?')) return;
    setCancelling(true);
    setRequestError('');
    try {
      const updated = await adminApi<EmergencyDetail>(`/emergency-requests/${activeRequest.emergencyRequestId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Cancelled by customer' }),
      });
      setActiveRequest(updated);
      window.dispatchEvent(new Event('csms:emergency-requests-changed'));
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Could not cancel this request.');
    } finally {
      setCancelling(false);
    }
  };

  const statusSteps = [
    { id: 'requested', label: 'Help Requested', detail: 'Sent to nearest branch drivers…' },
    { id: 'assigned', label: 'Driver Accepted', detail: 'A tow truck driver has accepted your request' },
    { id: 'ontheway', label: 'On the Way', detail: 'Tow truck is heading to your location' },
    { id: 'arrived', label: 'Arrived', detail: 'Driver has reached your location' },
    { id: 'completed', label: 'Completed', detail: 'Emergency assistance finished' },
  ];

  if (step === 'tracking' && activeRequest) {
    const statusKey = normalizeStatus(activeRequest.status);
    const isCancelled = statusKey === 'cancelled';
    const isCompleted = statusKey === 'completed';
    const currentIdx = statusSteps.findIndex(s => s.id === (statusKey === 'confirmed' ? 'assigned' : statusKey));

    return (
      <div className="page-in p-4 sm:p-6 pb-6 max-w-2xl mx-auto">
        <div className="text-center mb-5">
          <h1 className="font-bold text-xl" style={{ color: 'var(--text)' }}>
            {isCancelled ? 'Request Cancelled' : isCompleted ? 'Assistance Completed' : 'Live Emergency Tracking'}
          </h1>
          <p className="text-sm mt-1 font-mono" style={{ color: 'var(--text-3)' }}>
            Request #{activeRequest.emergencyRequestId} · {activeRequest.carLicencePlate}
            {activeRequest.branch?.branchName ? ` · Nearest branch: ${activeRequest.branch.branchName}` : ''}
          </p>
        </div>

        <div className="mb-5">
          <RouteMap
            height={280}
            destination={{
              latitude: activeRequest.latitude,
              longitude: activeRequest.longitude,
              label: `Your Car (${activeRequest.carLicencePlate})`,
            }}
            origin={
              activeRequest.driverLocation
                ? {
                    latitude: activeRequest.driverLocation.latitude,
                    longitude: activeRequest.driverLocation.longitude,
                    label: activeRequest.driver?.fullName ? `Driver: ${activeRequest.driver.fullName}` : 'Tow Truck',
                  }
                : null
            }
            branch={
              activeRequest.branch?.latitude != null && activeRequest.branch?.longitude != null
                ? {
                    latitude: activeRequest.branch.latitude,
                    longitude: activeRequest.branch.longitude,
                    label: activeRequest.branch.branchName,
                  }
                : null
            }
          />
        </div>

        {activeRequest.driver && (
          <div className="card mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs" style={{ color: 'var(--text-3)' }}>Assigned Tow Driver</div>
              <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{activeRequest.driver.fullName}</div>
              {activeRequest.truck && (
                <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-3)' }}>
                  Truck: {activeRequest.truck.truckCompany} {activeRequest.truck.truckModel} ({activeRequest.truck.licencePlate})
                </div>
              )}
              {activeRequest.etaMinutes != null && !isCompleted && !isCancelled && (
                <div className="text-xs mt-0.5" style={{ color: 'var(--primary)' }}>
                  Estimated arrival: {activeRequest.etaMinutes === 0 ? 'Arrived' : `~${activeRequest.etaMinutes} min`}
                </div>
              )}
            </div>
            {activeRequest.driver.phoneNumber && (
              <a href={`tel:${activeRequest.driver.phoneNumber}`} className="btn btn-primary btn-sm">
                Call {activeRequest.driver.phoneNumber}
              </a>
            )}
          </div>
        )}

        <div className="card mb-4">
          <div className="space-y-4">
            {statusSteps.map((s, i) => {
              const done = !isCancelled && currentIdx >= i;
              const active = !isCancelled && currentIdx === i;
              return (
                <div key={s.id} className="flex items-center gap-4">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: done ? (active && !isCompleted ? 'var(--sos)' : 'var(--s-completed-bg)') : 'var(--surface-2)',
                      color: done ? (active && !isCompleted ? '#fff' : 'var(--s-completed)') : 'var(--text-4)',
                      border: `2px solid ${done ? (active && !isCompleted ? 'var(--sos)' : 'var(--s-completed)') : 'var(--border)'}`,
                    }}
                  >
                    {done && (!active || isCompleted) ? '✓' : i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm" style={{ color: done ? 'var(--text)' : 'var(--text-4)' }}>{s.label}</div>
                    {active && <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{s.detail}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {requestError && <p className="text-sm mb-3" style={{ color: 'var(--sos)' }} role="alert">{requestError}</p>}

        <div className="flex gap-3">
          {!isCompleted && !isCancelled ? (
            <button
              type="button"
              className="btn btn-sos btn-lg w-full"
              disabled={cancelling}
              onClick={() => void cancelRequest()}
            >
              {cancelling ? 'Cancelling…' : 'Cancel Request'}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-lg w-full"
              onClick={() => {
                setActiveRequest(null);
                setStep('pick');
              }}
            >
              New Emergency Request
            </button>
          )}
        </div>
      </div>
    );
  }

  if (step === 'location') {
    return (
      <div className="page-in p-4 sm:p-6 pb-6 max-w-xl mx-auto">
        <button onClick={() => setStep('pick')} className="btn btn-ghost btn-sm mb-4">← Back</button>
        <h1 className="font-bold text-xl mb-2" style={{ color: 'var(--text)' }}>Confirm Your Location</h1>
        <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>
          Problem: <strong style={{ color: 'var(--text)' }}>{problem?.label}</strong> — your request will be sent directly to drivers at the nearest branch.
        </p>

        <div className="mb-4">
          <RouteMap
            height={240}
            destination={coordinates ? { ...coordinates, label: 'Your Location' } : null}
            onPickLocation={(latitude, longitude) => {
              setCoordinates({ latitude, longitude });
              setLocationState('ready');
              setLocationError('');
            }}
          />
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-4)' }}>
            Tip: You can also click anywhere on the map to adjust your pin.
          </p>
        </div>

        <div className="space-y-3">
          {cars.length > 0 ? (
            <Field label="Select your car">
              <select className="inp" value={carPlate} onChange={e => setCarPlate(e.target.value)}>
                <option value="">Choose a car</option>
                {cars.map(car => {
                  const plate = car.licencesPlate ?? car.licencePlate ?? '';
                  return (
                    <option key={plate} value={plate}>
                      {car.carCompany} {car.model} · {plate}
                    </option>
                  );
                })}
              </select>
            </Field>
          ) : (
            <Field label="Registered car license plate">
              <input
                className="inp"
                value={carPlate}
                onChange={e => setCarPlate(e.target.value)}
                placeholder="Enter the plate on your account"
                maxLength={6}
              />
            </Field>
          )}

          <Field label="Additional notes (optional)">
            <input
              className="inp"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Landmark, lane, or extra details for the tow driver"
            />
          </Field>
        </div>

        <div className="flex items-center justify-between gap-3 mt-3 mb-4">
          <p className="text-xs" style={{ color: locationError ? 'var(--sos)' : 'var(--text-3)' }} role="status">
            {locationError || (coordinates ? `Selected: ${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}` : 'Allow GPS or tap on the map.')}
          </p>
          <button
            type="button"
            onClick={getLocation}
            disabled={locationState === 'loading'}
            className="btn btn-secondary btn-sm flex-shrink-0"
          >
            {locationState === 'loading' ? 'Locating…' : coordinates ? 'Use My GPS' : 'Get GPS'}
          </button>
        </div>

        {requestError && <p className="text-sm mb-3" style={{ color: 'var(--sos)' }} role="alert">{requestError}</p>}

        <button
          onClick={() => void sendHelpRequest()}
          disabled={sending || locationState === 'loading'}
          className="btn btn-sos btn-xl w-full sos-pulse"
          style={{ fontSize: '18px', fontWeight: 800 }}
        >
          {sending ? 'Sending request…' : 'REQUEST TOW TRUCK'}
        </button>
      </div>
    );
  }

  return (
    <div className="page-in p-4 sm:p-6 pb-6 max-w-xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="font-bold text-2xl" style={{ color: 'var(--text)' }}>Emergency Assistance</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>What&apos;s the problem? Tap to select and share your location.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {SOS_PROBLEM_TYPES.map(p => (
          <button
            key={p.id}
            onClick={() => {
              setProblem(p);
              setStep('location');
              if (!coordinates) getLocation();
            }}
            className="card card-hover text-left flex flex-col gap-2 transition-all active:scale-95"
            style={{ minHeight: 96, cursor: 'pointer', borderWidth: '2px' }}
            aria-label={p.label}
          >
            <span className="text-3xl">{p.icon}</span>
            <div>
              <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>{p.label}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{p.desc}</div>
            </div>
          </button>
        ))}
      </div>
      <div className="card text-center" style={{ background: 'var(--sos-light)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--sos)' }}>24/7 Emergency Hotline</p>
        <a href="tel:+201001234567" className="text-xl font-bold font-mono block mt-1" style={{ color: 'var(--sos)' }}>+20 100 123 4567</a>
      </div>
    </div>
  );
}
