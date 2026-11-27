import { useEffect, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n/useT';
import { useTheme } from '../../context/ThemeContext';
import { Icon } from '../../components/ui/Icon';
import { authorizedFetch } from '../../utils/adminApi';

type ProfileData = { fullName: string; email: string; phone: string; address: string };
type CustomerCar = {
  licencePlate: string; color: string; noOfCylinders: number; fuelType: string | number;
  engineType: string | number; manufactureDate: string; carCompany: string; model: string;
  priceInEgp?: number | null; currentKm: number;
};
const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) || 'https://localhost:7260').replace(/\/$/, '');
const fuelNames = ['Gasoline', 'Diesel', 'Electric', 'Hybrid'];
const engineNames = ['Turbocharged', 'Naturally aspirated', 'Supercharged'];
const enumLabel = (value: string | number, names: string[]) => typeof value === 'number' ? names[value] ?? String(value) : value;

async function readApiError(response: Response) {
  const body = await response.json().catch(() => null);
  if (typeof body === 'string') return body;
  if (body?.message || body?.Message || body?.title) return body.message ?? body.Message ?? body.title;
  if (body?.errors) return Object.values(body.errors).flat().join(' ');
  return `Request failed (${response.status}).`;
}

export default function ProfilePage() {
  const { logout } = useAuth();
  const t = useT();
  const { dark, toggleDark, lang, toggleLang } = useTheme();
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName]   = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success'|'error'|'info' } | null>(null);
  const [showAddCar, setShowAddCar] = useState(false);
  const [cars, setCars]   = useState<CustomerCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');

  // Add car form
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear]   = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newCylinders, setNewCylinders] = useState('4');
  const [newFuel, setNewFuel] = useState('Gasoline');
  const [newEngine, setNewEngine] = useState('NaturallyAspirated');
  const [newKm, setNewKm] = useState('0');

  const token = localStorage.getItem('csms.token');
  const requestHeaders = (json = false): HeadersInit => ({
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      setLoading(true);
      setPageError('');
      if (!token) {
        setPageError('Sign in with a customer account to load your profile and cars.');
        setLoading(false);
        return;
      }
      try {
        const [profileResponse, carsResponse] = await Promise.all([
          authorizedFetch(`${API_URL}/profile`, { headers: requestHeaders() }),
          authorizedFetch(`${API_URL}/cars?page=1&pageSize=100`, { headers: requestHeaders() }),
        ]);
        if (!profileResponse.ok) throw new Error(await readApiError(profileResponse));
        if (!carsResponse.ok) throw new Error(await readApiError(carsResponse));
        const profileData = await profileResponse.json() as ProfileData;
        const carsData = await carsResponse.json();
        if (!active) return;
        setProfile(profileData);
        setName(profileData.fullName ?? '');
        setPhone(profileData.phone ?? '');
        setAddress(profileData.address ?? '');
        setCars(carsData.data ?? carsData.Data ?? []);
      } catch (error) {
        if (active) setPageError(error instanceof Error ? error.message : 'Could not load your profile.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadProfile();
    return () => { active = false; };
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const response = await authorizedFetch(`${API_URL}/profile`, {
        method: 'PUT', headers: requestHeaders(true),
        body: JSON.stringify({ fullName: name.trim(), phone: phone.trim(), address: address.trim() }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const updated = await response.json() as ProfileData;
      setProfile(updated);
      setName(updated.fullName); setPhone(updated.phone); setAddress(updated.address);
      setEditMode(false);
      setToast({ msg: 'Profile updated successfully', type: 'success' });
    } catch (error) {
      setToast({ msg: error instanceof Error ? error.message : 'Could not update profile.', type: 'error' });
    } finally { setSaving(false); }
  };

  const resetCarForm = () => {
    setNewBrand(''); setNewModel(''); setNewYear(''); setNewPlate(''); setNewColor('');
    setNewCylinders('4'); setNewFuel('Gasoline'); setNewEngine('NaturallyAspirated'); setNewKm('0');
  };

  const addCar = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await authorizedFetch(`${API_URL}/Add-Car`, {
        method: 'POST', headers: requestHeaders(true),
        body: JSON.stringify({
          licencePlate: newPlate.trim(), color: newColor.trim(), noOfCylinders: Number(newCylinders),
          fuelType: newFuel, engineType: newEngine, manufactureDate: `${newYear}-01-01`,
          carCompany: newBrand.trim(), model: newModel.trim(), currentKm: Number(newKm),
        }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const refreshed = await authorizedFetch(`${API_URL}/cars?page=1&pageSize=100`, { headers: requestHeaders() });
      if (!refreshed.ok) throw new Error(await readApiError(refreshed));
      const result = await refreshed.json();
      setCars(result.data ?? result.Data ?? []);
      resetCarForm(); setShowAddCar(false);
      setToast({ msg: 'Car added successfully', type: 'success' });
    } catch (error) {
      setToast({ msg: error instanceof Error ? error.message : 'Could not add the car.', type: 'error' });
    } finally { setSaving(false); }
  };

  const deleteCar = async (plate: string) => {
    try {
      const response = await authorizedFetch(`${API_URL}/cars/${encodeURIComponent(plate)}`, { method: 'DELETE', headers: requestHeaders() });
      if (!response.ok) throw new Error(await readApiError(response));
      setCars(prev => prev.filter(car => car.licencePlate !== plate));
      setToast({ msg: 'Car removed', type: 'info' });
    } catch (error) {
      setToast({ msg: error instanceof Error ? error.message : 'Could not remove the car.', type: 'error' });
    }
  };

  return (
    <div className="page-in p-4 sm:p-6 pb-6 max-w-xl mx-auto">
      {pageError && <div className="card mb-4 text-sm" role="alert" style={{ borderColor: 'var(--sos)', color: 'var(--sos)' }}>{pageError}</div>}
      {loading && <div className="card mb-4 text-sm" style={{ color: 'var(--text-3)' }}>Loading profile…</div>}
      {/* Profile card */}
      <div className="card mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
            style={{ background: 'var(--primary)' }} aria-label="Profile avatar">
            {name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg" style={{ color: 'var(--text)' }}>{name}</div>
            <div className="text-sm" style={{ color: 'var(--text-3)' }}>{profile?.email ?? ''}</div>
          </div>
          <button onClick={() => setEditMode(v => !v)} className="btn btn-ghost btn-sm" aria-label="Edit profile">
            {editMode ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editMode ? (
          <div className="space-y-3">
            <Field label="Full Name">
              <input required maxLength={30} type="text" className="inp" value={name} onChange={e => setName(e.target.value)} />
            </Field>
            <Field label="Phone">
              <input required maxLength={11} type="tel" className="inp" value={phone} onChange={e => setPhone(e.target.value)} />
            </Field>
            <Field label="Address">
              <input required type="text" className="inp" value={address} onChange={e => setAddress(e.target.value)} maxLength={50} />
            </Field>
            <div className="flex gap-2">
              <button onClick={() => setEditMode(false)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={saveProfile} disabled={saving || !token} className="btn btn-primary flex-1">{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            {[[ 'Email', profile?.email ?? '' ], [ 'Phone', phone ], [ 'Address', address ]].map(([label, value]) => (
              <div key={label as string} className="flex items-center gap-2" style={{ color: 'var(--text-2)' }}>
                <span style={{ color: 'var(--text-3)' }}>{label}:</span><span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Cars */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base" style={{ color: 'var(--text)' }}>{t.myCars}</h2>
          <button onClick={() => setShowAddCar(true)} disabled={loading || !token} className="btn btn-primary btn-sm">+ {t.addCar}</button>
        </div>
        {cars.length === 0 ? (
          loading ? <div className="text-sm" style={{ color: 'var(--text-3)' }}>Loading cars…</div> :
          <EmptyState icon="" title="No cars yet" desc="Add your car to start booking services." />
        ) : (
          <div className="space-y-3">
            {cars.map(car => (
              <div key={car.licencePlate} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                <span className="text-primary"><Icon name="car" size={24} /></span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{car.carCompany} {car.model} ({car.manufactureDate?.slice(0, 4)})</div>
                  <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-3)' }}>{car.licencePlate}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>{car.color} · {enumLabel(car.fuelType, fuelNames)} · {car.currentKm.toLocaleString()} km · {enumLabel(car.engineType, engineNames)}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => deleteCar(car.licencePlate)} className="btn btn-ghost btn-sm" aria-label={`Delete ${car.licencePlate}`} title="Delete car">×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preferences */}
      <div className="card mb-4">
        <h2 className="font-bold text-base mb-4" style={{ color: 'var(--text)' }}>Preferences</h2>
        <div className="space-y-4">
          {[
            { label: 'Dark Mode', desc: 'Switch between light and dark theme', checked: dark, onChange: toggleDark },
            { label: 'Arabic Language (RTL)', desc: 'Switch to Arabic interface', checked: lang === 'ar', onChange: toggleLang },
            { label: 'Email Notifications', desc: 'Receive booking confirmations', checked: true, onChange: () => {} },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{item.label}</div>
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>{item.desc}</div>
              </div>
              <button onClick={item.onChange}
                className="w-12 h-6 rounded-full transition-all relative flex-shrink-0"
                style={{ background: item.checked ? 'var(--primary)' : 'var(--border-2)' }}
                role="switch" aria-checked={item.checked} aria-label={item.label}>
                <span className="absolute w-5 h-5 rounded-full bg-white shadow transition-all top-0.5"
                  style={{ left: item.checked ? '26px' : '2px' }} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Sign out */}
      <button className="btn btn-secondary w-full" style={{ color: 'var(--sos)', borderColor: 'var(--sos)' }}
        onClick={logout}>
        Sign Out
      </button>

      {showAddCar && (
        <Modal title={t.addCar} onClose={() => setShowAddCar(false)}>
          <form onSubmit={addCar} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Make"><input required maxLength={35} type="text" className="inp" value={newBrand} onChange={e => setNewBrand(e.target.value)} placeholder="Toyota" /></Field>
              <Field label="Model"><input required maxLength={20} type="text" className="inp" value={newModel} onChange={e => setNewModel(e.target.value)} placeholder="Camry" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Manufacture year"><input required type="number" className="inp" value={newYear} onChange={e => setNewYear(e.target.value)} placeholder="2022" min="1900" max={new Date().getFullYear()} /></Field>
              <Field label="Plate Number"><input required maxLength={6} type="text" className="inp" value={newPlate} onChange={e => setNewPlate(e.target.value)} placeholder="ABC123" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Color"><input required maxLength={20} type="text" className="inp" value={newColor} onChange={e => setNewColor(e.target.value)} placeholder="Black" /></Field>
              <Field label="Cylinders"><input required min="1" type="number" className="inp" value={newCylinders} onChange={e => setNewCylinders(e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fuel type"><select className="inp" value={newFuel} onChange={e => setNewFuel(e.target.value)}><option>Gasoline</option><option>Diesel</option><option>Electric</option><option>Hybrid</option></select></Field>
              <Field label="Engine type"><select className="inp" value={newEngine} onChange={e => setNewEngine(e.target.value)}><option value="NaturallyAspirated">Naturally aspirated</option><option value="Turbocharged">Turbocharged</option><option value="Supercharged">Supercharged</option></select></Field>
            </div>
            <div>
              <Field label="Current mileage (km)"><input required min="0" type="number" className="inp" value={newKm} onChange={e => setNewKm(e.target.value)} /></Field>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setShowAddCar(false)} className="btn btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary flex-1">{saving ? 'Adding…' : 'Add Car'}</button>
            </div>
          </form>
        </Modal>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
