import { useState, useEffect } from 'react';
import { Field } from '../../components/ui/Field';
import { SOS_PROBLEM_TYPES, type SosStatus } from '../../data/mock-data';
import { authorizedFetch } from '../../utils/adminApi';

type Coordinates = { latitude: number; longitude: number };
const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) || 'https://localhost:7260').replace(/\/$/, '');
const API_PROBLEM_TYPES: Record<string, string> = {
  breakdown: 'EngineFailure', 'flat-tire': 'FlatTire', accident: 'Accident',
  fuel: 'OutOfFuel', 'locked-out': 'LockedOut', towing: 'Other',
};

export default function SOSPage() {
  const [step, setStep] = useState<'pick' | 'location' | 'tracking'>('pick');
  const [problem, setProblem] = useState<typeof SOS_PROBLEM_TYPES[0] | null>(null);
  const [carPlate, setCarPlate] = useState('');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationState, setLocationState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [locationError, setLocationError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [sending, setSending] = useState(false);
  const [backendRequestId, setBackendRequestId] = useState<number | null>(null);
  const [sosStatus, setSosStatus] = useState<SosStatus>('requested');
  const [reqId] = useState(() => 'SOS-' + Math.floor(1000 + Math.random() * 8999));

  useEffect(() => {
    if (step !== 'tracking' || backendRequestId !== null) return;
    const schedule: [SosStatus, number][] = [['assigned', 3000], ['on-the-way', 6000], ['arrived', 14000]];
    const timers = schedule.map(([s, delay]) => setTimeout(() => setSosStatus(s), delay));
    return () => timers.forEach(clearTimeout);
  }, [step, backendRequestId]);

  const getLocation = () => {
    setLocationError('');
    setLocationState('loading');
    if (!navigator.geolocation) {
      setLocationState('error');
      setLocationError('Location is not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinates({ latitude: coords.latitude, longitude: coords.longitude });
        setLocationState('ready');
      },
      error => {
        setLocationState('error');
        setLocationError(error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. Allow location access in your browser, then try again.'
          : error.code === error.TIMEOUT
            ? 'Location lookup timed out. Please try again.'
            : 'Could not get your location. Check that location services are enabled and try again.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  };

  const sendHelpRequest = async () => {
    setRequestError('');
    if (!coordinates) { setRequestError('Get your current location before sending the request.'); return; }
    if (!carPlate) { setRequestError('Select the car that needs assistance.'); return; }
    const token = localStorage.getItem('csms.token');
    if (!API_URL) { setRequestError('The service API is not configured. Set VITE_API_URL and try again.'); return; }
    if (!token) { setRequestError('Please sign in with a connected customer account before requesting help.'); return; }
    setSending(true);
    try {
      const response = await authorizedFetch(`${API_URL}/emergency-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          carLicencePlate: carPlate,
          problemType: API_PROBLEM_TYPES[problem?.id ?? ''] ?? 'Other',
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          description: problem?.label,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message ?? data?.Message ?? `Request failed (${response.status}).`);
      window.dispatchEvent(new Event('csms:emergency-requests-changed'));
      setBackendRequestId(data?.emergencyRequestId ?? data?.EmergencyRequestId ?? null);
      setStep('tracking');
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Could not send the help request. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const statusSteps: { id: SosStatus; label: string; icon: string }[] = [
    { id: 'requested',  label: 'Help Requested', icon: '' },
    { id: 'assigned',   label: 'Driver Assigned', icon: '‍' },
    { id: 'on-the-way', label: 'On the Way',      icon: '' },
    { id: 'arrived',    label: 'Arrived',          icon: '' },
  ];
  const statusOrder: SosStatus[] = ['requested', 'assigned', 'on-the-way', 'arrived'];
  const currentIdx = statusOrder.indexOf(sosStatus);

  if (step === 'tracking') return (
    <div className="page-in p-4 sm:p-6 pb-6 max-w-xl mx-auto">
      <div className="text-center mb-6">
        <div className="text-5xl mb-2"></div>
        <h1 className="font-bold text-xl" style={{ color: 'var(--text)' }}>Help is on the way</h1>
        <p className="text-sm mt-1 font-mono" style={{ color: 'var(--text-3)' }}>Request ID: {backendRequestId ?? reqId}</p>
      </div>
      {/* Map placeholder */}
      <div className="rounded-2xl overflow-hidden h-48 mb-5 relative" style={{ background: 'var(--surface-2)' }}>
        <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&h=400&fit=crop&auto=format"
          alt="Map view" className="w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="card text-center" style={{ padding: '8px 16px' }}>
            <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}> Your location confirmed</div>
            <div className="text-xs" style={{ color: 'var(--text-3)' }}>
              {coordinates ? `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}` : 'Location unavailable'}
            </div>
          </div>
        </div>
        {sosStatus === 'on-the-way' || sosStatus === 'arrived' ? (
          <div className="absolute bottom-3 right-3 text-3xl animate-bounce"></div>
        ) : null}
      </div>
      {/* Status tracker */}
      <div className="card mb-4">
        <div className="space-y-4">
          {statusSteps.map((s, i) => {
            const done = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <div key={s.id} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 transition-all"
                  style={{
                    background: done ? (active ? 'var(--sos)' : 'var(--s-completed-bg)') : 'var(--surface-2)',
                    border: `2px solid ${done ? (active ? 'var(--sos)' : 'var(--s-completed)') : 'var(--border)'}`,
                  }}>
                  {s.icon}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm" style={{ color: done ? 'var(--text)' : 'var(--text-4)' }}>{s.label}</div>
                  {active && <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                    {s.id === 'requested' ? 'Searching for nearest driver…' :
                     s.id === 'assigned'  ? 'Driver Marcus assigned · ETA 12 min' :
                     s.id === 'on-the-way'? 'Truck is 2.3 km away' : 'Driver has reached your location'}
                  </div>}
                </div>
                {done && !active && <span style={{ color: 'var(--s-completed)' }}>✓</span>}
                {active && sosStatus !== 'arrived' && (
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--sos)' }}><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {sosStatus === 'arrived' && (
        <div className="card mb-4 text-center" style={{ background: 'var(--s-completed-bg)', border: '1px solid var(--s-completed)' }}>
          <p className="font-bold" style={{ color: 'var(--s-completed)' }}>Driver has arrived! </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Marcus Johnson · +20 100 555 0001</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <a href="tel:+201005550001" className="btn btn-secondary btn-lg w-full justify-center"> Call Driver</a>
        <button className="btn btn-sos btn-lg w-full" onClick={() => setStep('pick')}>Cancel Request</button>
      </div>
    </div>
  );

  if (step === 'location') return (
    <div className="page-in p-4 sm:p-6 pb-6 max-w-xl mx-auto">
      <button onClick={() => setStep('pick')} className="btn btn-ghost btn-sm mb-4">← Back</button>
      <h1 className="font-bold text-xl mb-2" style={{ color: 'var(--text)' }}>Confirm Your Location</h1>
      <p className="text-sm mb-5" style={{ color: 'var(--text-3)' }}>
        Problem: <strong style={{ color: 'var(--text)' }}>{problem?.label}</strong> — share your location and we'll send the nearest truck.
      </p>
      {/* Map placeholder */}
      <div className="rounded-2xl overflow-hidden h-56 mb-4 relative" style={{ background: 'var(--surface-2)' }}>
        <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&h=450&fit=crop&auto=format"
          alt="Map" className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-5xl animate-bounce"></div>
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <div className="card text-xs text-center" style={{ padding: '6px 12px' }}>
                {locationState === 'loading' ? 'Getting your location…' : coordinates
                  ? <><span style={{ color: 'var(--primary)' }}>Location ready</span><br />Latitude {coordinates.latitude.toFixed(6)} · Longitude {coordinates.longitude.toFixed(6)}</>
                  : 'Your location is needed to send emergency help.'}
          </div>
        </div>
      </div>
      <Field label="Registered car license plate">
        <input className="inp" value={carPlate} onChange={e => setCarPlate(e.target.value)} placeholder="Enter the plate on your account" maxLength={6} />
      </Field>
      <div className="flex items-center justify-between gap-3 mt-3">
        <p className="text-xs" style={{ color: locationError ? 'var(--sos)' : 'var(--text-3)' }} role="status">
          {locationError || (locationState === 'ready' ? 'Your current coordinates are ready to share.' : 'Allow location access to continue.')}
        </p>
        <button type="button" onClick={getLocation} disabled={locationState === 'loading'} className="btn btn-secondary btn-sm flex-shrink-0">
          {locationState === 'loading' ? 'Locating…' : coordinates ? 'Refresh location' : 'Get location'}
        </button>
      </div>
      <div className="card mt-4 mb-5" style={{ background: 'var(--sos-light)', border: '1px solid var(--red-200)' }}>
        <p className="text-sm" style={{ color: 'var(--sos)' }}>
           Average response time: <strong>12 minutes</strong>
        </p>
      </div>
      {requestError && <p className="text-sm mb-3" style={{ color: 'var(--sos)' }} role="alert">{requestError}</p>}
      <button onClick={sendHelpRequest} disabled={sending || locationState === 'loading'}
        className="btn btn-sos btn-xl w-full sos-pulse" style={{ fontSize: '18px', fontWeight: 800 }}>
         {sending ? 'Sending request…' : 'SEND HELP NOW'}
      </button>
      <p className="text-center text-xs mt-3" style={{ color: 'var(--text-4)' }}>
        Your location will be shared with the assigned driver only
      </p>
    </div>
  );

  return (
    <div className="page-in p-4 sm:p-6 pb-6 max-w-xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="font-bold text-2xl" style={{ color: 'var(--text)' }}>Emergency Assistance</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>What's the problem? Tap to select.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {SOS_PROBLEM_TYPES.map(p => (
          <button key={p.id} onClick={() => { setProblem(p); setCoordinates(null); setLocationState('idle'); setStep('location'); getLocation(); }}
            className="card card-hover text-left flex flex-col gap-2 transition-all active:scale-95"
            style={{ minHeight: 96, cursor: 'pointer', borderWidth: '2px' }}
            aria-label={p.label}>
            <span className="text-3xl">{p.icon}</span>
            <div>
              <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>{p.label}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{p.desc}</div>
            </div>
          </button>
        ))}
      </div>
      <div className="card text-center" style={{ background: 'var(--sos-light)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--sos)' }}> 24/7 Emergency Hotline</p>
        <a href="tel:+201001234567" className="text-xl font-bold font-mono block mt-1" style={{ color: 'var(--sos)' }}>+20 100 123 4567</a>
        <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Average response: 12 minutes</p>
      </div>
    </div>
  );
}
