import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { adminApi, unwrapList } from '../../utils/adminApi';
import { ROUTES } from '../../routes/paths';

type CustomerCar = { licencePlate: string; carCompany: string; model: string; manufactureDate: string; currentKm: number; color: string };
type Branch = { branchId: number; name: string; location: string };
type StockProduct = { productId: number; name: string; price: number; quantity: number; warrantyMonths?: number };
type BookingResult = { visitId: number; bookingReference: string; carLicencePlate: string; branchId: number; serviceDate: string; status: string };
type Step = 1 | 2 | 3;

const apiError = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
const localToday = () => {
  const now = new Date();
  return String(now.getFullYear()) + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
};

export default function ServiceBookingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [cars, setCars] = useState<CustomerCar[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchProducts, setBranchProducts] = useState<StockProduct[]>([]);
  const [selectedCar, setSelectedCar] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [date, setDate] = useState(localToday);
  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const branchRequestId = useRef(0);

  const loadPage = useCallback(async () => {
    setLoadingPage(true); setError('');
    try {
      const results = await Promise.all([adminApi('/cars?page=1&pageSize=100'), adminApi('/branches?page=1&pageSize=100')]);
      setCars(unwrapList<CustomerCar>(results[0]));
      setBranches(unwrapList<Branch>(results[1]));
    } catch (cause) {
      setError(apiError(cause, 'Could not load your cars and service branches.'));
    } finally { setLoadingPage(false); }
  }, []);
  useEffect(() => { void loadPage(); }, [loadPage]);

  const car = cars.find(item => item.licencePlate === selectedCar) ?? null;
  const selectedProducts = branchProducts.filter(item => selectedProductIds.includes(item.productId));
  const productsTotal = selectedProducts.reduce((total, item) => total + item.price, 0);
  const branch = branches.find(item => item.branchId === selectedBranch) ?? null;
  const today = useMemo(localToday, []);

  const chooseBranch = async (branchId: number) => {
    const requestId = ++branchRequestId.current;
    setSelectedBranch(branchId); setSelectedProductIds([]); setBranchProducts([]); setError('');
    if (!branchId) { setLoadingProducts(false); return; }
    setLoadingProducts(true);
    try {
      const detail = await adminApi<any>('/branches/' + branchId);
      const products = detail?.products ?? detail?.Products ?? [];
      if (requestId === branchRequestId.current) setBranchProducts(products.filter((item: StockProduct) => item.quantity > 0));
    } catch (cause) { if (requestId === branchRequestId.current) setError(apiError(cause, 'Could not load products available at this branch.')); }
    finally { if (requestId === branchRequestId.current) setLoadingProducts(false); }
  };

  const confirm = async () => {
    if (!car || selectedProducts.length === 0 || !branch || !date) return;
    setSubmitting(true); setError('');
    try {
      const result = await adminApi<BookingResult>('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          carLicencePlate: car.licencePlate,
          serviceProductIds: selectedProducts.map(item => item.productId),
          branchId: branch.branchId,
          serviceDate: date,
        }),
      });
      setBooking(result); setStep(3);
    } catch (cause) { setError(apiError(cause, 'Could not create the booking.')); }
    finally { setSubmitting(false); }
  };

  const reset = () => {
    setBooking(null); setStep(1); setSelectedCar(null); setSelectedProductIds([]); setSelectedBranch(null);
    setBranchProducts([]); setDate(localToday()); setError('');
  };

  if (booking) return (
    <div className="page-in p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: 'var(--s-completed-bg)', color: 'var(--s-completed)' }}><Icon name="check" size={36} /></div>
      <h2 className="font-bold text-2xl mb-2" style={{ color: 'var(--text)' }}>Booking Confirmed</h2>
      <p className="mb-1" style={{ color: 'var(--text-3)' }}>{selectedProducts.map(item => item.name).join(', ')} for {car?.carCompany} {car?.model}</p>
      <p className="mb-1" style={{ color: 'var(--text-3)' }}>{branch?.name}</p>
      <p className="font-mono text-sm mb-4" style={{ color: 'var(--text-3)' }}>{booking.serviceDate}</p>
      <div className="card mb-5"><span className="font-mono text-sm" style={{ color: 'var(--primary)' }}>Booking reference: <strong>{booking.bookingReference}</strong></span><div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Visit #{booking.visitId} · {booking.status}</div></div>
      <div className="flex flex-wrap justify-center gap-3"><button onClick={reset} className="btn btn-secondary">Book Another</button><button onClick={() => navigate(ROUTES.customer.visits)} className="btn btn-primary">View Visits</button></div>
    </div>
  );

  const steps = ['Select Car', 'Service & Date', 'Review'];
  return (
    <div className="page-in p-4 sm:p-6 pb-6 max-w-2xl mx-auto">
      <h1 className="font-bold text-xl mb-5" style={{ color: 'var(--text)' }}>Book a Service</h1>
      {error && <div className="card mb-4 text-sm" role="alert" style={{ color: 'var(--sos)' }}>{error}</div>}
      {loadingPage ? <div className="card text-sm" style={{ color: 'var(--text-3)' }}>Loading your cars and branches…</div> : cars.length === 0 ? (
        <div className="card text-center py-8"><div className="flex justify-center mb-3" style={{ color: 'var(--primary)' }}><Icon name="car" size={30} /></div><h2 className="font-semibold" style={{ color: 'var(--text)' }}>Add a car to get started</h2><p className="text-sm mt-1 mb-4" style={{ color: 'var(--text-3)' }}>Bookings are linked to one of your customer cars.</p><button className="btn btn-primary" onClick={() => navigate(ROUTES.customer.profile)}>Go to Profile</button></div>
      ) : (
        <>
          <div className="mb-6"><div className="step-bar">{steps.map((label, index) => <div key={label} className="flex items-center flex-1"><div className={'step-dot ' + (index + 1 < step ? 'done' : index + 1 === step ? 'active' : '')}>{index + 1 < step ? '✓' : index + 1}</div>{index < steps.length - 1 && <div className={'step-line ' + (index + 1 < step ? 'done' : '')} />}</div>)}</div><div className="flex justify-between mt-1.5 text-xs" style={{ color: 'var(--text-3)' }}>{steps.map(label => <span key={label}>{label}</span>)}</div></div>

          {step === 1 && <div className="space-y-3"><h2 className="font-semibold text-base mb-4" style={{ color: 'var(--text)' }}>Which of your cars needs service?</h2>{cars.map(item => <button key={item.licencePlate} onClick={() => setSelectedCar(item.licencePlate)} className="w-full card card-hover flex items-center gap-4 text-left" style={{ borderColor: selectedCar === item.licencePlate ? 'var(--primary)' : undefined, borderWidth: selectedCar === item.licencePlate ? 2 : undefined }}><div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}><Icon name="car" size={28} /></div><div className="flex-1"><div className="font-semibold" style={{ color: 'var(--text)' }}>{item.carCompany} {item.model}</div><div className="text-sm font-mono mt-0.5" style={{ color: 'var(--text-3)' }}>{item.licencePlate}</div><div className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>{item.currentKm.toLocaleString()} km · {item.color}</div></div>{selectedCar === item.licencePlate && <Icon name="check" size={22} />}</button>)}<button onClick={() => setStep(2)} disabled={!selectedCar} className="btn btn-primary btn-lg w-full mt-2">Next →</button></div>}

          {step === 2 && <div className="space-y-5"><h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>Choose branch, service & date</h2>
            <div>
              <span className="block text-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>Branch</span>
              <CustomSelect
                value={selectedBranch ? String(selectedBranch) : ''}
                onChange={value => void chooseBranch(Number(value))}
                placeholder="Select a branch…"
                options={branches.map(item => ({
                  value: String(item.branchId),
                  label: item.name,
                  sublabel: item.location,
                }))}
              />
            </div>
            <div><label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>Service products <span className="text-xs font-normal" style={{ color: 'var(--text-4)' }}>(select all that you need)</span></label>{!selectedBranch ? <p className="text-sm" style={{ color: 'var(--text-3)' }}>Choose a branch to see products currently in stock.</p> : loadingProducts ? <p className="text-sm" style={{ color: 'var(--text-3)' }}>Loading available products…</p> : branchProducts.length === 0 ? <p className="card text-sm" style={{ color: 'var(--text-3)' }}>No service products are currently in stock at this branch.</p> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{branchProducts.map(item => { const selected = selectedProductIds.includes(item.productId); return <button key={item.productId} type="button" aria-pressed={selected} onClick={() => setSelectedProductIds(current => selected ? current.filter(id => id !== item.productId) : [...current, item.productId])} className="text-left p-3 rounded-xl border-2 transition-all" style={{ background: selected ? 'var(--primary-light)' : 'var(--surface)', borderColor: selected ? 'var(--primary)' : 'var(--border)' }}><div className="flex items-start justify-between gap-2"><span className="text-sm font-semibold" style={{ color: selected ? 'var(--primary)' : 'var(--text)' }}>{item.name}</span>{selected && <Icon name="check" size={17} />}</div><div className="text-xs mt-1 font-mono" style={{ color: 'var(--text-3)' }}>EGP {item.price} · {item.quantity} in stock</div></button>; })}</div>}</div>
            <label className="block text-sm font-medium" style={{ color: 'var(--text-2)' }}>Date<input type="date" className="inp mt-2" value={date} min={today} onChange={event => setDate(event.target.value)} /></label>
            <div className="flex gap-3"><button onClick={() => setStep(1)} className="btn btn-secondary flex-1">← Back</button><button onClick={() => setStep(3)} disabled={selectedProductIds.length === 0 || !selectedBranch || !date} className="btn btn-primary flex-1">Review →</button></div>
          </div>}

          {step === 3 && <div className="space-y-4"><h2 className="font-semibold text-base mb-4" style={{ color: 'var(--text)' }}>Review your booking</h2><div className="card space-y-3">{[{ label: 'Car', value: car ? car.carCompany + ' ' + car.model + ' (' + car.licencePlate + ')' : '' }, { label: 'Services', value: selectedProducts.map(item => `${item.name} (EGP ${item.price})`).join(', ') }, { label: 'Branch', value: branch?.name ?? '' }, { label: 'Date', value: date }].map(row => <div key={row.label} className="flex justify-between items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}><span className="text-sm" style={{ color: 'var(--text-3)' }}>{row.label}</span><span className="text-sm font-semibold text-right" style={{ color: 'var(--text)' }}>{row.value}</span></div>)}</div><div className="card flex items-center justify-between"><span className="font-semibold" style={{ color: 'var(--primary)' }}>Selected products total</span><span className="font-bold text-xl font-mono" style={{ color: 'var(--primary)' }}>EGP {productsTotal}</span></div><div className="flex gap-3"><button onClick={() => setStep(2)} className="btn btn-secondary flex-1">← Back</button><button onClick={() => void confirm()} disabled={submitting} className="btn btn-primary flex-1">{submitting ? 'Booking…' : 'Confirm Booking'}</button></div></div>}
        </>
      )}
    </div>
  );
}
