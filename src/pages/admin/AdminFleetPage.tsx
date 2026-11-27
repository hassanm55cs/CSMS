import { useCallback, useEffect, useState } from 'react';
import { adminApi, unwrapList } from '../../utils/adminApi';
import { Badge } from '../../components/ui/Badge';

type RentalCar = { licencePlate: string; color: string; noOfCylinders: number; fuelType: string; engineType: string; manufactureDate: string; carCompany: string; model: string; pricePerDay: number; status: string; available: boolean; branchId?: number | null };
type Truck = { licencePlate: string; truckCompany: string; truckModel: string; isAvailable: boolean; startDate: string; manufactureDate: string; branchId: number; driverId?: number | null };
type Branch = { branchId: number; name: string };
type FormValues = Record<string, string>;

const rentalDefaults = (): FormValues => ({ licencePlate: '', color: '', noOfCylinders: '4', fuelType: 'Gasoline', engineType: 'NaturallyAspirated', manufactureDate: '', carCompany: '', model: '', pricePerDay: '', status: 'Available' });
const truckDefaults = (): FormValues => ({ licencePlate: '', truckCompany: '', truckModel: '', isAvailable: 'true', startDate: '', manufactureDate: '', branchId: '', driverId: '' });

export default function AdminFleetPage() {
  const [tab, setTab] = useState<'rental' | 'trucks'>('rental');
  const [rentals, setRentals] = useState<RentalCar[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormValues>(rentalDefaults());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [rentalResult, truckResult, branchResult] = await Promise.allSettled([
      adminApi('/rental-cars?page=1&pageSize=100'), adminApi('/emergency-trucks'), adminApi('/branches?page=1&pageSize=100'),
    ]);
    if (rentalResult.status === 'fulfilled') setRentals(unwrapList<RentalCar>(rentalResult.value));
    if (truckResult.status === 'fulfilled') setTrucks(unwrapList<Truck>(truckResult.value));
    if (branchResult.status === 'fulfilled') setBranches(unwrapList<Branch>(branchResult.value));
    const failed = [rentalResult, truckResult, branchResult].find(result => result.status === 'rejected');
    if (failed?.status === 'rejected') setError(failed.reason instanceof Error ? failed.reason.message : 'Could not load fleet data.');
    else setError('');
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const beginCreate = () => { setEditingId(null); setForm(tab === 'rental' ? rentalDefaults() : truckDefaults()); setShowForm(true); };
  const beginRentalEdit = (car: RentalCar) => {
    setEditingId(car.licencePlate);
    setForm({ licencePlate: car.licencePlate, color: car.color, noOfCylinders: String(car.noOfCylinders), fuelType: car.fuelType,
      engineType: car.engineType, manufactureDate: car.manufactureDate?.slice(0, 10), carCompany: car.carCompany, model: car.model,
      pricePerDay: String(car.pricePerDay), status: car.status, branchId: car.branchId ? String(car.branchId) : '' });
    setShowForm(true);
  };
  const beginTruckEdit = (truck: Truck) => {
    setEditingId(truck.licencePlate);
    setForm({ licencePlate: truck.licencePlate, truckCompany: truck.truckCompany, truckModel: truck.truckModel,
      isAvailable: String(truck.isAvailable), startDate: truck.startDate?.slice(0, 10), manufactureDate: truck.manufactureDate?.slice(0, 10),
      branchId: String(truck.branchId), driverId: truck.driverId ? String(truck.driverId) : '' });
    setShowForm(true);
  };
  const setField = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      if (tab === 'rental') {
        const body = { color: form.color, noOfCylinders: Number(form.noOfCylinders), fuelType: form.fuelType, engineType: form.engineType,
          manufactureDate: form.manufactureDate, carCompany: form.carCompany, model: form.model, pricePerDay: Number(form.pricePerDay), status: form.status,
          ...(form.branchId ? { branchId: Number(form.branchId) } : {}) };
        if (editingId) await adminApi(`/rental-cars/${encodeURIComponent(editingId)}`, { method: 'PUT', body: JSON.stringify(body) });
        else await adminApi('/rental-cars', { method: 'POST', body: JSON.stringify({ licencePlate: form.licencePlate, ...body }) });
      } else {
        const body = { truckCompany: form.truckCompany, truckModel: form.truckModel, isAvailable: form.isAvailable === 'true',
          startDate: form.startDate || null, manufactureDate: form.manufactureDate, branchId: Number(form.branchId), driverId: form.driverId ? Number(form.driverId) : null };
        if (editingId) await adminApi(`/emergency-trucks/${encodeURIComponent(editingId)}`, { method: 'PUT', body: JSON.stringify(body) });
        else await adminApi('/emergency-trucks', { method: 'POST', body: JSON.stringify({ licencePlate: form.licencePlate, ...body }) });
      }
      setShowForm(false); setEditingId(null); setMessage(editingId ? 'Vehicle updated.' : 'Vehicle added.'); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save vehicle.'); }
    finally { setSaving(false); }
  };

  const remove = async (plate: string) => {
    if (!window.confirm(`Delete vehicle ${plate}?`)) return;
    setError('');
    try {
      await adminApi(tab === 'rental' ? `/rental-cars/${encodeURIComponent(plate)}` : `/emergency-trucks/${encodeURIComponent(plate)}`, { method: 'DELETE' });
      if (tab === 'rental') setRentals(current => current.filter(car => car.licencePlate !== plate));
      else setTrucks(current => current.filter(truck => truck.licencePlate !== plate));
      setMessage('Vehicle deleted.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete vehicle.'); }
  };

  const input = (key: string, label: string, type = 'text', required = true) => (
    <label className="text-xs" style={{ color: 'var(--text-3)' }}>{label}<input className="inp mt-1" type={type} required={required} value={form[key] ?? ''} onChange={event => setField(key, event.target.value)} /></label>
  );

  return (
    <div className="page-in p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4"><div><h1 className="font-bold text-xl" style={{ color: 'var(--text)' }}>Fleet Management</h1><p className="text-sm" style={{ color: 'var(--text-3)' }}>Rental vehicles and emergency trucks from the backend.</p></div><button className="btn btn-primary btn-sm" onClick={beginCreate}>+ Add Vehicle</button></div>
      {error && <div className="card mb-3 text-sm" role="alert" style={{ color: 'var(--sos)' }}>{error}</div>}
      {message && <div className="card mb-3 text-sm" role="status" style={{ color: 'var(--s-completed)' }}>{message}</div>}
      <div className="flex gap-1 border-b mb-4" style={{ borderColor: 'var(--border)' }}>
        {(['rental', 'trucks'] as const).map(value => <button key={value} onClick={() => { setTab(value); setShowForm(false); }} className="px-5 py-2.5 text-sm font-medium border-b-2 -mb-px capitalize" style={{ borderColor: tab === value ? 'var(--primary)' : 'transparent', color: tab === value ? 'var(--primary)' : 'var(--text-3)' }}>{value === 'rental' ? 'Rental Fleet' : 'Emergency Trucks'}</button>)}
      </div>
      {showForm && <form onSubmit={save} className="card mb-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tab === 'rental' ? <>
          {!editingId && input('licencePlate', 'License plate')}{input('carCompany', 'Make')}{input('model', 'Model')}{input('color', 'Color')}{input('noOfCylinders', 'Cylinders', 'number')}
          <label className="text-xs" style={{ color: 'var(--text-3)' }}>Fuel type<select className="inp mt-1" value={form.fuelType} onChange={event => setField('fuelType', event.target.value)}>{['Gasoline','Diesel','Electric','Hybrid'].map(x => <option key={x}>{x}</option>)}</select></label>
          <label className="text-xs" style={{ color: 'var(--text-3)' }}>Engine type<select className="inp mt-1" value={form.engineType} onChange={event => setField('engineType', event.target.value)}>{['Turbocharged','NaturallyAspirated','Supercharged'].map(x => <option key={x}>{x}</option>)}</select></label>
          {input('manufactureDate', 'Manufacture date', 'date')}{input('pricePerDay', 'Price per day (EGP)', 'number')}
          {editingId && <label className="text-xs" style={{ color: 'var(--text-3)' }}>Status<select className="inp mt-1" value={form.status} onChange={event => setField('status', event.target.value)}><option>Available</option><option>Maintenance</option></select></label>}
        </> : <>
          {!editingId && input('licencePlate', 'License plate')}{input('truckCompany', 'Make')}{input('truckModel', 'Model')}{input('manufactureDate', 'Manufacture date', 'date')}{input('startDate', 'Start date', 'date', false)}
          <label className="text-xs" style={{ color: 'var(--text-3)' }}>Branch<select className="inp mt-1" required value={form.branchId} onChange={event => setField('branchId', event.target.value)}><option value="">Choose branch</option>{branches.map(branch => <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>)}</select></label>
          {input('driverId', 'Driver ID (optional)', 'number', false)}
          <label className="text-xs" style={{ color: 'var(--text-3)' }}>Availability<select className="inp mt-1" value={form.isAvailable} onChange={event => setField('isAvailable', event.target.value)}><option value="true">Available</option><option value="false">Unavailable</option></select></label>
        </>}
        <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Vehicle'}</button></div>
      </form>}
      <div className="card overflow-x-auto" style={{ padding: 0 }}>
        {loading ? <div className="p-5 text-sm" style={{ color: 'var(--text-3)' }}>Loading fleet…</div> : tab === 'rental' ? (
          <table><thead><tr><th>Vehicle</th><th>Plate</th><th>Price/Day</th><th>Status</th><th>Available</th><th>Actions</th></tr></thead><tbody>
            {rentals.map(car => <tr key={car.licencePlate}><td className="font-medium" style={{ color: 'var(--text)' }}>{car.carCompany} {car.model}</td><td className="font-mono">{car.licencePlate}</td><td>EGP {car.pricePerDay}</td><td><Badge status={car.status.toLowerCase()} /></td><td>{car.available ? 'Yes' : 'No'}</td><td><div className="flex gap-1"><button className="btn btn-secondary btn-sm" onClick={() => beginRentalEdit(car)}>Edit</button><button className="btn btn-ghost btn-sm text-red-500" onClick={() => void remove(car.licencePlate)}>Delete</button></div></td></tr>)}
          </tbody></table>
        ) : (
          <table><thead><tr><th>Plate</th><th>Truck</th><th>Branch</th><th>Driver</th><th>Manufactured</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {trucks.map(truck => <tr key={truck.licencePlate}><td className="font-mono">{truck.licencePlate}</td><td>{truck.truckCompany} {truck.truckModel}</td><td>{truck.branchId}</td><td>{truck.driverId ?? '—'}</td><td>{truck.manufactureDate}</td><td><Badge status={truck.isAvailable ? 'available' : 'unavailable'} /></td><td><div className="flex gap-1"><button className="btn btn-secondary btn-sm" onClick={() => beginTruckEdit(truck)}>Edit</button><button className="btn btn-ghost btn-sm text-red-500" onClick={() => void remove(truck.licencePlate)}>Delete</button></div></td></tr>)}
          </tbody></table>
        )}
      </div>
    </div>
  );
}
