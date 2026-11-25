import { useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import type { RentalConfirmation } from '../../../types';
import { Field } from '../../../components/ui/Field';
import { RENTAL_FLEET } from '../../../data/mock-data';
import { ROUTES, rentalPaths } from '../../../routes/paths';

export default function RentalCheckoutPage() {
  const navigate = useNavigate();
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');
  const [bookingRef] = useState(() => 'RNT-' + Math.floor(300 + Math.random() * 99));
  const { carId } = useParams();
  const selectedCar = RENTAL_FLEET.find(c => String(c.id) === carId);
  if (!selectedCar) return <Navigate to={ROUTES.customer.rentals} replace />;

  // Unavailable cars can't be rented — send the user back to the detail page
  if (!selectedCar.available) return <Navigate to={rentalPaths.detail(selectedCar.id)} replace />;

  const days = from && to ? Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000)) : 0;
  const total = days * selectedCar.priceDay;

  return (
    <div className="page-in p-4 sm:p-6 pb-24 md:pb-6 max-w-xl mx-auto">
      <button onClick={() => navigate(rentalPaths.detail(selectedCar.id))} className="btn btn-ghost btn-sm mb-4">← Back</button>
      <h1 className="font-bold text-xl mb-5" style={{ color: 'var(--text)' }}>Rental Checkout</h1>
      <div className="card flex gap-3 mb-4">
        <div className="w-20 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
          <img src={`https://images.unsplash.com/${selectedCar.img}?w=160&h=110&fit=crop&auto=format`} alt={selectedCar.brand} className="w-full h-full object-cover" />
        </div>
        <div>
          <div className="font-bold" style={{ color: 'var(--text)' }}>{selectedCar.brand} {selectedCar.model}</div>
          <div className="text-sm" style={{ color: 'var(--text-3)' }}>{selectedCar.category} · {selectedCar.transmission}</div>
          <div className="text-sm font-mono font-bold mt-1" style={{ color: 'var(--primary)' }}>EGP {selectedCar.priceDay}/day</div>
        </div>
      </div>
      <div className="card mb-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Pick-up Date">
            <input type="date" className="inp" value={from} min={new Date().toISOString().split('T')[0]} onChange={e => setFrom(e.target.value)} />
          </Field>
          <Field label="Return Date">
            <input type="date" className="inp" value={to} min={from || new Date().toISOString().split('T')[0]} onChange={e => setTo(e.target.value)} />
          </Field>
        </div>
        {days > 0 && (
          <div className="pt-3 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
            <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-3)' }}>EGP {selectedCar.priceDay} × {days} days</span><span style={{ color: 'var(--text)' }}>EGP {selectedCar.priceDay * days}</span></div>
            <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-3)' }}>Insurance</span><span style={{ color: 'var(--text)' }}>EGP 200</span></div>
            <div className="flex justify-between font-bold text-base pt-2 border-t" style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}>
              <span>Total</span><span className="font-mono">EGP {total + 200}</span>
            </div>
          </div>
        )}
      </div>
      <button onClick={() => from && to && days > 0 && navigate(rentalPaths.confirmed(selectedCar.id), {
        state: { from, to, days, total, bookingRef } satisfies RentalConfirmation,
      })} disabled={!from || !to || days <= 0}
        className="btn btn-primary btn-lg w-full">✓ Confirm Rental</button>
      <p className="text-center text-xs mt-3" style={{ color: 'var(--text-4)' }}>Free cancellation up to 24h before pick-up</p>
    </div>
  );
}
