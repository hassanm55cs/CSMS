import { useState, useEffect } from 'react';
import { Field } from '../../components/ui/Field';
import { SOS_PROBLEM_TYPES, type SosStatus } from '../../data/mock-data';

export default function SOSPage() {
  const [step, setStep] = useState<'pick' | 'location' | 'tracking'>('pick');
  const [problem, setProblem] = useState<typeof SOS_PROBLEM_TYPES[0] | null>(null);
  const [sosStatus, setSosStatus] = useState<SosStatus>('requested');
  const [reqId] = useState(() => 'SOS-' + Math.floor(1000 + Math.random() * 8999));

  useEffect(() => {
    if (step !== 'tracking') return;
    const schedule: [SosStatus, number][] = [['assigned', 3000], ['on-the-way', 6000], ['arrived', 14000]];
    const timers = schedule.map(([s, delay]) => setTimeout(() => setSosStatus(s), delay));
    return () => timers.forEach(clearTimeout);
  }, [step]);

  const statusSteps: { id: SosStatus; label: string; icon: string }[] = [
    { id: 'requested',  label: 'Help Requested', icon: '📡' },
    { id: 'assigned',   label: 'Driver Assigned', icon: '👨‍🔧' },
    { id: 'on-the-way', label: 'On the Way',      icon: '🚛' },
    { id: 'arrived',    label: 'Arrived',          icon: '✅' },
  ];
  const statusOrder: SosStatus[] = ['requested', 'assigned', 'on-the-way', 'arrived'];
  const currentIdx = statusOrder.indexOf(sosStatus);

  if (step === 'tracking') return (
    <div className="page-in p-4 sm:p-6 pb-24 md:pb-6 max-w-xl mx-auto">
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">🆘</div>
        <h1 className="font-bold text-xl" style={{ color: 'var(--text)' }}>Help is on the way</h1>
        <p className="text-sm mt-1 font-mono" style={{ color: 'var(--text-3)' }}>Request ID: {reqId}</p>
      </div>
      {/* Map placeholder */}
      <div className="rounded-2xl overflow-hidden h-48 mb-5 relative" style={{ background: 'var(--surface-2)' }}>
        <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&h=400&fit=crop&auto=format"
          alt="Map view" className="w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="card text-center" style={{ padding: '8px 16px' }}>
            <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>📍 Your location confirmed</div>
            <div className="text-xs" style={{ color: 'var(--text-3)' }}>Tahrir Square, Cairo</div>
          </div>
        </div>
        {sosStatus === 'on-the-way' || sosStatus === 'arrived' ? (
          <div className="absolute bottom-3 right-3 text-3xl animate-bounce">🚛</div>
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
          <p className="font-bold" style={{ color: 'var(--s-completed)' }}>Driver has arrived! ✅</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Marcus Johnson · +20 100 555 0001</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <a href="tel:+201005550001" className="btn btn-secondary btn-lg w-full justify-center">📞 Call Driver</a>
        <button className="btn btn-sos btn-lg w-full" onClick={() => setStep('pick')}>Cancel Request</button>
      </div>
    </div>
  );

  if (step === 'location') return (
    <div className="page-in p-4 sm:p-6 pb-24 md:pb-6 max-w-xl mx-auto">
      <button onClick={() => setStep('pick')} className="btn btn-ghost btn-sm mb-4">← Back</button>
      <h1 className="font-bold text-xl mb-2" style={{ color: 'var(--text)' }}>Confirm Your Location</h1>
      <p className="text-sm mb-5" style={{ color: 'var(--text-3)' }}>
        Problem: <strong style={{ color: 'var(--text)' }}>{problem?.label}</strong> — we'll send the nearest truck.
      </p>
      {/* Map placeholder */}
      <div className="rounded-2xl overflow-hidden h-56 mb-4 relative" style={{ background: 'var(--surface-2)' }}>
        <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&h=450&fit=crop&auto=format"
          alt="Map" className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-5xl animate-bounce">📍</div>
        </div>
        {/* API hook: replace with real maps SDK, e.g. Google Maps or Leaflet */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="card text-xs text-center" style={{ padding: '6px 12px' }}>
            {/* API: GET /api/v1/geocode?lat=...&lng=... */}
            📍 Tahrir Square, Cairo — <span style={{ color: 'var(--primary)' }}>GPS confirmed</span>
          </div>
        </div>
      </div>
      <Field label="Manual address (optional)">
        <input type="text" className="inp" placeholder="e.g. 12 Tahrir Sq, Cairo" />
      </Field>
      <div className="card mt-4 mb-5" style={{ background: 'var(--sos-light)', border: '1px solid var(--red-200)' }}>
        <p className="text-sm" style={{ color: 'var(--sos)' }}>
          ⏱ Average response time: <strong>12 minutes</strong>
        </p>
      </div>
      <button onClick={() => setStep('tracking')}
        className="btn btn-sos btn-xl w-full sos-pulse" style={{ fontSize: '18px', fontWeight: 800 }}>
        🆘 SEND HELP NOW
      </button>
      <p className="text-center text-xs mt-3" style={{ color: 'var(--text-4)' }}>
        Your location will be shared with the assigned driver only
      </p>
    </div>
  );

  return (
    <div className="page-in p-4 sm:p-6 pb-24 md:pb-6 max-w-xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="font-bold text-2xl" style={{ color: 'var(--text)' }}>Emergency Assistance</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>What's the problem? Tap to select.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {SOS_PROBLEM_TYPES.map(p => (
          <button key={p.id} onClick={() => { setProblem(p); setStep('location'); }}
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
        <p className="text-sm font-semibold" style={{ color: 'var(--sos)' }}>🚨 24/7 Emergency Hotline</p>
        <a href="tel:+201001234567" className="text-xl font-bold font-mono block mt-1" style={{ color: 'var(--sos)' }}>+20 100 123 4567</a>
        <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Average response: 12 minutes</p>
      </div>
    </div>
  );
}
