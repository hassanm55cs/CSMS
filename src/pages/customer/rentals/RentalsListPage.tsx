import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { RENTAL_FLEET, MOCK_MY_RENTALS } from '../../../data/mock-data';
import { rentalPaths } from '../../../routes/paths';

export default function RentalsListPage() {
  const navigate = useNavigate();
  const [filterCat, setFilterCat]     = useState('All');
  const [filterTrans, setFilterTrans] = useState('All');
  const [sortBy, setSortBy]           = useState<'price-asc' | 'price-desc'>('price-asc');

  const cats = ['All', 'Sedan', 'SUV', 'Electric'];
  const transmissions = ['All', 'Auto', 'Manual'];

  const filtered = RENTAL_FLEET
    .filter(c => filterCat === 'All' || c.category === filterCat)
    .filter(c => filterTrans === 'All' || c.transmission === filterTrans)
    .sort((a, b) => sortBy === 'price-asc' ? a.priceDay - b.priceDay : b.priceDay - a.priceDay);

  return (
    <div className="page-in p-4 sm:p-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-5 max-w-5xl mx-auto">
        <div>
          <h1 className="font-bold text-xl" style={{ color: 'var(--text)' }}>Rent a Car</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>{filtered.filter(c => c.available).length} cars available</p>
        </div>
        <select className="inp" style={{ width: 'auto' }} value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
      </div>
      <div className="max-w-5xl mx-auto">
        {/* Filters */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {cats.map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`btn btn-sm ${filterCat === c ? 'btn-primary' : 'btn-secondary'}`}>{c}</button>
          ))}
          <div className="w-px self-stretch mx-1" style={{ background: 'var(--border)' }} />
          {transmissions.map(t => (
            <button key={t} onClick={() => setFilterTrans(t)}
              className={`btn btn-sm ${filterTrans === t ? 'btn-primary' : 'btn-secondary'}`}>{t}</button>
          ))}
        </div>
        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(car => (
            <div key={car.id} className="card card-hover cursor-pointer overflow-hidden" style={{ padding: 0 }}
              onClick={() => navigate(rentalPaths.detail(car.id))}>
              <div className="h-40 relative overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                <img src={`https://images.unsplash.com/${car.img}?w=400&h=250&fit=crop&auto=format`}
                  alt={`${car.brand} ${car.model}`} className="w-full h-full object-cover" />
                {!car.available && (
                  <div className="absolute inset-0 flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}>
                    <span className="text-white font-bold text-sm">Unavailable</span>
                  </div>
                )}
                <div className="absolute top-2 right-2"><Badge status={car.available ? 'available' : 'unavailable'} /></div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>{car.brand} {car.model}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{car.category} · {car.seats} seats</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold font-mono" style={{ color: 'var(--primary)' }}>EGP {car.priceDay}</div>
                    <div className="text-xs" style={{ color: 'var(--text-4)' }}>/day</div>
                  </div>
                </div>
                <div className="flex gap-2 text-xs flex-wrap" style={{ color: 'var(--text-4)' }}>
                  <span>⚡ {car.fuel}</span><span>⚙️ {car.transmission}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <EmptyState icon="🚗" title="No cars match your filters" desc="Try changing the filters above." />
        )}
        {/* My rentals */}
        <div className="mt-8">
          <div className="divider mb-6" />
          <h2 className="font-semibold text-base mb-3" style={{ color: 'var(--text)' }}>My Rentals</h2>
          <div className="space-y-3">
            {MOCK_MY_RENTALS.map(r => (
              <div key={r.id} className="card flex items-center gap-3">
                <div className="text-2xl">🚗</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{r.car}</div>
                  <div className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>{r.from} → {r.to} · {r.days} days</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-mono font-bold text-sm" style={{ color: 'var(--text)' }}>EGP {r.total}</div>
                  <Badge status={r.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
