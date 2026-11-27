import { useState } from 'react';
import { adminApi } from '../../utils/adminApi';

type Car = {
  licencePlate: string;
  color: string;
  noOfCylinders: number;
  fuelType: string | number;
  engineType: string | number;
  manufactureDate: string;
  carCompany: string;
  model: string;
  customerId: number;
  priceInEgp?: number | null;
  currentKm: number;
};

type RentalRecord = {
  rentedCarCustomerId: number;
  licencePlate: string;
  carCompany: string;
  model: string;
  rentStartDate: string;
  rentEndDate: string;
  noOfDays: number;
  priceForRent: number;
  status: string;
  createdAt: string;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  cancellationFee?: number | null;
  vehicle?: { color?: string; fuelType?: string; engineType?: string; pricePerDay?: number };
  customer?: { customerId?: number; fullName?: string; email?: string; phone?: string };
};

const FUEL_OPTIONS = ['Gasoline', 'Diesel', 'Electric', 'Hybrid'] as const;
const ENGINE_OPTIONS = ['Turbocharged', 'NaturallyAspirated', 'Supercharged'] as const;

const normalizeEnum = (val: string | number, options: readonly string[]): string => {
  if (typeof val === 'number') return options[val] ?? String(val);
  const idx = Number(val);
  if (!Number.isNaN(idx) && val !== '' && options[idx]) return options[idx];
  return val;
};

export default function AdminRecordsPage() {
  const [plate, setPlate] = useState('');
  const [car, setCar] = useState<Car | null>(null);
  const [rentalId, setRentalId] = useState('');
  const [rental, setRental] = useState<RentalRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const findCar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setCar(null);
    try {
      const found = await adminApi<Car>(`/cars/${encodeURIComponent(plate.trim())}`);
      setCar({
        ...found,
        fuelType: normalizeEnum(found.fuelType, FUEL_OPTIONS),
        engineType: normalizeEnum(found.engineType, ENGINE_OPTIONS),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not find vehicle.');
    }
  };

  const saveCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!car) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const body = {
        color: car.color,
        noOfCylinders: Number(car.noOfCylinders),
        fuelType: normalizeEnum(car.fuelType, FUEL_OPTIONS),
        engineType: normalizeEnum(car.engineType, ENGINE_OPTIONS),
        manufactureDate: car.manufactureDate,
        carCompany: car.carCompany,
        model: car.model,
        priceInEgp: car.priceInEgp == null ? null : Number(car.priceInEgp),
        currentKm: Number(car.currentKm),
      };
      const updated = await adminApi<Car>(`/cars/${encodeURIComponent(car.licencePlate)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      setCar({
        ...updated,
        fuelType: normalizeEnum(updated.fuelType, FUEL_OPTIONS),
        engineType: normalizeEnum(updated.engineType, ENGINE_OPTIONS),
      });
      setMessage('Vehicle updated.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update vehicle.');
    } finally {
      setBusy(false);
    }
  };

  const deleteCar = async () => {
    if (!car || !window.confirm(`Delete vehicle ${car.licencePlate}?`)) return;
    try {
      await adminApi(`/cars/${encodeURIComponent(car.licencePlate)}`, { method: 'DELETE' });
      setCar(null);
      setMessage('Vehicle deleted.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete vehicle.');
    }
  };

  const findRental = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setRental(null);
    try {
      setRental(await adminApi<RentalRecord>(`/Rentals/${Number(rentalId)}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not find rental.');
    }
  };

  const textField = (key: keyof Car, label: string, type = 'text') => (
    <label className="text-xs" style={{ color: 'var(--text-3)' }}>
      {label}
      <input
        className="inp mt-1"
        type={type}
        value={String(car?.[key] ?? '')}
        onChange={e => car && setCar({ ...car, [key]: type === 'number' ? Number(e.target.value) : e.target.value } as Car)}
      />
    </label>
  );

  return (
    <div className="page-in p-4 sm:p-6">
      <div className="mb-5">
        <h1 className="font-bold text-xl" style={{ color: 'var(--text)' }}>Record Lookup</h1>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>Search customer vehicles by license plate or inspect rental reservations by ID.</p>
      </div>
      {error && <div className="card mb-3 text-sm" role="alert" style={{ color: 'var(--sos)' }}>{error}</div>}
      {message && <div className="card mb-3 text-sm" role="status" style={{ color: 'var(--s-completed)' }}>{message}</div>}
      <div className="grid xl:grid-cols-2 gap-4">
        <section className="card">
          <h2 className="font-semibold mb-3">Customer vehicle</h2>
          <form onSubmit={findCar} className="flex gap-2">
            <input className="inp flex-1" required placeholder="License plate (e.g. ABC123)" value={plate} onChange={e => setPlate(e.target.value)} />
            <button className="btn btn-primary">Find</button>
          </form>
          {car && (
            <form onSubmit={saveCar} className="mt-4 grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 text-xs" style={{ color: 'var(--text-3)' }}>Vehicle {car.licencePlate} · Customer #{car.customerId}</div>
              {textField('carCompany', 'Make')}
              {textField('model', 'Model')}
              {textField('color', 'Color')}
              {textField('noOfCylinders', 'Cylinders', 'number')}
              <label className="text-xs" style={{ color: 'var(--text-3)' }}>
                Fuel type
                <select className="inp mt-1" value={String(car.fuelType)} onChange={e => setCar({ ...car, fuelType: e.target.value })}>
                  {FUEL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </label>
              <label className="text-xs" style={{ color: 'var(--text-3)' }}>
                Engine type
                <select className="inp mt-1" value={String(car.engineType)} onChange={e => setCar({ ...car, engineType: e.target.value })}>
                  {ENGINE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt.replace(/([a-z])([A-Z])/g, '$1 $2')}</option>)}
                </select>
              </label>
              {textField('manufactureDate', 'Manufacture date', 'date')}
              {textField('currentKm', 'Current km', 'number')}
              {textField('priceInEgp', 'Price (EGP)', 'number')}
              <div className="sm:col-span-2 flex justify-end gap-2">
                <button type="button" className="btn btn-ghost text-red-500" onClick={() => void deleteCar()}>Delete</button>
                <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Update Vehicle'}</button>
              </div>
            </form>
          )}
        </section>

        <section className="card">
          <h2 className="font-semibold mb-3">Rental details</h2>
          <form onSubmit={findRental} className="flex gap-2">
            <input className="inp flex-1" required min="1" type="number" placeholder="Reservation ID" value={rentalId} onChange={e => setRentalId(e.target.value)} />
            <button className="btn btn-primary">Find</button>
          </form>
          {rental && (
            <dl className="mt-4 grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
              <dt style={{ color: 'var(--text-3)' }}>Reservation</dt>
              <dd className="font-mono">#{rental.rentedCarCustomerId} · {rental.status}</dd>
              <dt style={{ color: 'var(--text-3)' }}>Vehicle</dt>
              <dd>{rental.carCompany} {rental.model} · <span className="font-mono">{rental.licencePlate}</span></dd>
              {rental.vehicle && (
                <>
                  <dt style={{ color: 'var(--text-3)' }}>Vehicle specs</dt>
                  <dd>{[rental.vehicle.color, rental.vehicle.fuelType, rental.vehicle.engineType?.replace(/([a-z])([A-Z])/g, '$1 $2')].filter(Boolean).join(' · ')}</dd>
                </>
              )}
              {rental.customer && (
                <>
                  <dt style={{ color: 'var(--text-3)' }}>Customer</dt>
                  <dd>{rental.customer.fullName} ({rental.customer.phone ?? rental.customer.email})</dd>
                </>
              )}
              <dt style={{ color: 'var(--text-3)' }}>Dates</dt>
              <dd className="font-mono">{rental.rentStartDate} → {rental.rentEndDate} ({rental.noOfDays} {rental.noOfDays === 1 ? 'day' : 'days'})</dd>
              <dt style={{ color: 'var(--text-3)' }}>Total price</dt>
              <dd className="font-mono font-semibold" style={{ color: 'var(--primary)' }}>EGP {rental.priceForRent?.toLocaleString()}</dd>
              {rental.cancelledAt && (
                <>
                  <dt style={{ color: 'var(--text-3)' }}>Cancelled</dt>
                  <dd>{new Date(rental.cancelledAt).toLocaleString()}{rental.cancellationReason ? ` — ${rental.cancellationReason}` : ''}</dd>
                </>
              )}
            </dl>
          )}
        </section>
      </div>
    </div>
  );
}
