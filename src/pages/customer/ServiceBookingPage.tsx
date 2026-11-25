import { useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field } from '../../components/ui/Field';
import { MOCK_MY_CARS, SERVICE_TYPES, BRANCHES, MOCK_BOOKING_HISTORY, type BookingStatus } from '../../data/mock-data';

export default function ServiceBookingPage() {
  const [step, setStep] = useState(1);
  const [selectedCar, setSelectedCar]     = useState<number | null>(null);
  const [selectedSvc, setSelectedSvc]     = useState<number | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [date, setDate]       = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookingRef] = useState(() => 'BK-' + Math.floor(2000 + Math.random() * 999));
  const [filterStatus, setFilterStatus] = useState<BookingStatus | 'all'>('all');

  const car = MOCK_MY_CARS.find(c => c.id === selectedCar);
  const svc = SERVICE_TYPES.find(s => s.id === selectedSvc);
  const branch = BRANCHES.find(b => b.id === selectedBranch);

  const timeSlots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

  const confirm = async () => {
    setLoading(true);
    // API: POST /api/v1/bookings  { carId, serviceTypeId, branchId, date, time }
    await new Promise(r => setTimeout(r, 1500));
    setConfirmed(true);
    setLoading(false);
  };

  const filteredHistory = filterStatus === 'all'
    ? MOCK_BOOKING_HISTORY
    : MOCK_BOOKING_HISTORY.filter(b => b.status === filterStatus);

  const steps = ['Select Car', 'Service & Date', 'Review', 'Confirmed'];

  if (confirmed) return (
    <div className="page-in p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-5"
        style={{ background: 'var(--s-completed-bg)' }}>✅</div>
      <h2 className="font-bold text-2xl mb-2" style={{ color: 'var(--text)' }}>Booking Confirmed!</h2>
      <p className="mb-1" style={{ color: 'var(--text-3)' }}>{svc?.name} for {car?.brand} {car?.model}</p>
      <p className="mb-1" style={{ color: 'var(--text-3)' }}>{branch?.name}</p>
      <p className="font-mono text-sm mb-4" style={{ color: 'var(--text-3)' }}>{date} at {timeSlot}</p>
      <div className="card mb-5" style={{ background: 'var(--primary-light)', border: 'none' }}>
        <span className="font-mono text-sm" style={{ color: 'var(--primary)' }}>Booking Ref: <strong>{bookingRef}</strong></span>
      </div>
      <div className="flex gap-3">
        <button onClick={() => { setConfirmed(false); setStep(1); setSelectedCar(null); setSelectedSvc(null); }} className="btn btn-secondary">
          Book Another
        </button>
        <button onClick={() => setStep(5)} className="btn btn-outline-primary">View History</button>
      </div>
    </div>
  );

  return (
    <div className="page-in p-4 sm:p-6 pb-24 md:pb-6 max-w-2xl mx-auto">
      <h1 className="font-bold text-xl mb-5" style={{ color: 'var(--text)' }}>Book a Service</h1>

      {/* Step bar */}
      {step <= 4 && (
        <div className="mb-6">
          <div className="step-bar">
            {steps.slice(0, 3).map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`step-dot ${i + 1 < step ? 'done' : i + 1 === step ? 'active' : ''}`}
                  role="status" aria-label={`Step ${i + 1}: ${s}`}>
                  {i + 1 < step ? '✓' : i + 1}
                </div>
                <div className={`step-line ${i + 1 < step ? 'done' : ''}`} />
              </div>
            ))}
            <div className={`step-dot ${step >= 4 ? 'done' : step === 3 ? 'active' : ''}`}
              aria-label={`Step 4: ${steps[3]}`}>
              {step >= 4 ? '✓' : 3}
            </div>
          </div>
          <div className="flex justify-between mt-1.5 px-0.5">
            {steps.slice(0,3).map((s, i) => (
              <div key={s} className="flex-1 text-center text-xs" style={{ color: i + 1 <= step ? 'var(--primary)' : 'var(--text-4)' }}>{s}</div>
            ))}
            <div className="text-xs" style={{ color: step >= 3 ? 'var(--primary)' : 'var(--text-4)' }}>Review</div>
          </div>
        </div>
      )}

      {/* STEP 1: Select car */}
      {step === 1 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-base mb-4" style={{ color: 'var(--text)' }}>Which car needs service?</h2>
          {MOCK_MY_CARS.map(car => (
            <button key={car.id} onClick={() => setSelectedCar(car.id)}
              className={`w-full card card-hover flex items-center gap-4 text-left transition-all ${selectedCar === car.id ? 'border-blue-500' : ''}`}
              style={{ borderColor: selectedCar === car.id ? 'var(--primary)' : undefined, borderWidth: '2px' }}>
              <div className="w-16 h-14 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
                <img src={`https://images.unsplash.com/${car.img}?w=120&h=90&fit=crop&auto=format`}
                  alt={car.brand} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="font-semibold" style={{ color: 'var(--text)' }}>{car.brand} {car.model} ({car.year})</div>
                <div className="text-sm font-mono mt-0.5" style={{ color: 'var(--text-3)' }}>{car.plate}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>{car.km.toLocaleString()} km</div>
              </div>
              {selectedCar === car.id && <span className="text-2xl">✅</span>}
            </button>
          ))}
          <button
            onClick={() => step === 1 && selectedCar && setStep(2)}
            disabled={!selectedCar}
            className="btn btn-primary btn-lg w-full mt-2">Next →</button>
        </div>
      )}

      {/* STEP 2: Service + branch + date + time */}
      {step === 2 && (
        <div className="space-y-5">
          <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>Choose service & schedule</h2>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>Service Type</label>
            <div className="grid grid-cols-2 gap-2">
              {SERVICE_TYPES.map(svc => (
                <button key={svc.id} onClick={() => setSelectedSvc(svc.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${selectedSvc === svc.id ? '' : ''}`}
                  style={{
                    background: selectedSvc === svc.id ? 'var(--primary-light)' : 'var(--surface-2)',
                    borderColor: selectedSvc === svc.id ? 'var(--primary)' : 'var(--border)',
                  }}>
                  <div className="text-xl mb-1">{svc.icon}</div>
                  <div className="text-sm font-semibold" style={{ color: selectedSvc === svc.id ? 'var(--primary)' : 'var(--text)' }}>{svc.name}</div>
                  <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-3)' }}>EGP {svc.price}</div>
                </button>
              ))}
            </div>
          </div>
          <Field label="Branch">
            <select className="inp" value={selectedBranch ?? ''} onChange={e => setSelectedBranch(Number(e.target.value))}>
              <option value="">Select a branch…</option>
              {BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name} ★ {b.rating}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date">
              <input type="date" className="inp" value={date} min={new Date().toISOString().split('T')[0]}
                onChange={e => setDate(e.target.value)} />
            </Field>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>Time Slot</label>
              <div className="grid grid-cols-2 gap-1.5">
                {timeSlots.map(t => (
                  <button key={t} onClick={() => setTimeSlot(t)}
                    className={`text-sm py-2 rounded-lg border font-mono transition-all ${timeSlot === t ? '' : ''}`}
                    style={{
                      background: timeSlot === t ? 'var(--primary)' : 'var(--surface-2)',
                      borderColor: timeSlot === t ? 'var(--primary)' : 'var(--border)',
                      color: timeSlot === t ? 'white' : 'var(--text)',
                    }}>{t}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn btn-secondary flex-1">← Back</button>
            <button onClick={() => selectedSvc && selectedBranch && date && timeSlot && setStep(3)}
              disabled={!selectedSvc || !selectedBranch || !date || !timeSlot}
              className="btn btn-primary flex-1">Review →</button>
          </div>
        </div>
      )}

      {/* STEP 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-base mb-4" style={{ color: 'var(--text)' }}>Review your booking</h2>
          <div className="card space-y-3">
            {[
              { label: 'Car', value: `${car?.brand} ${car?.model} (${car?.plate})` },
              { label: 'Service', value: `${svc?.icon} ${svc?.name}` },
              { label: 'Branch', value: branch?.name },
              { label: 'Date & Time', value: `${date} at ${timeSlot}` },
              { label: 'Duration', value: `~${svc?.durationMin} minutes` },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm" style={{ color: 'var(--text-3)' }}>{row.label}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{row.value}</span>
              </div>
            ))}
          </div>
          <div className="card flex items-center justify-between" style={{ background: 'var(--primary-light)', border: '1px solid var(--blue-200)' }}>
            <span className="font-semibold" style={{ color: 'var(--primary)' }}>Estimated Cost</span>
            <span className="font-bold text-xl font-mono" style={{ color: 'var(--primary)' }}>EGP {svc?.price}</span>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn btn-secondary flex-1">← Back</button>
            <button onClick={confirm} disabled={loading} className="btn btn-primary flex-1">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
                  Confirming…
                </span>
              ) : '✓ Confirm Booking'}
            </button>
          </div>
        </div>
      )}

      {/* Booking History */}
      {(step === 5 || step > 4) && (
        <div className="mt-6">
          <div className="divider mb-6" />
          <h2 className="font-semibold text-base mb-3" style={{ color: 'var(--text)' }}>Booking History</h2>
          <div className="flex gap-2 mb-4 flex-wrap">
            {(['all', 'pending', 'confirmed', 'in-progress', 'completed', 'cancelled'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-secondary'}`}>
                {s.replace('-', ' ')}
              </button>
            ))}
          </div>
          {filteredHistory.length === 0 ? (
            <EmptyState icon="📭" title="No bookings" desc="No bookings match this filter." />
          ) : (
            <div className="space-y-3">
              {filteredHistory.map(b => (
                <div key={b.id} className="card flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{b.serviceType}</span>
                      <Badge status={b.status} />
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-3)' }}>{b.car} · {b.branch}</div>
                    <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-4)' }}>{b.date} · Ref: {b.id}</div>
                  </div>
                  {b.cost > 0 && <div className="font-mono font-bold text-sm flex-shrink-0" style={{ color: 'var(--text)' }}>EGP {b.cost}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Show history link after step 1 */}
      {step <= 3 && (
        <button onClick={() => setStep(5)} className="w-full text-center text-sm mt-4" style={{ color: 'var(--text-3)' }}>
          View booking history →
        </button>
      )}
    </div>
  );
}
