import { useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field } from '../../components/ui/Field';
import { MOCK_USER, MOCK_MY_CARS } from '../../data/mock-data';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n/useT';
import { useTheme } from '../../context/ThemeContext';

export default function ProfilePage() {
  const { logout } = useAuth();
  const t = useT();
  const { dark, toggleDark, lang, toggleLang } = useTheme();
  const [editMode, setEditMode] = useState(false);
  const [name, setName]   = useState(MOCK_USER.name);
  const [phone, setPhone] = useState(MOCK_USER.phone);
  const [toast, setToast] = useState<{ msg: string; type: 'success'|'error'|'info' } | null>(null);
  const [showAddCar, setShowAddCar] = useState(false);
  const [cars, setCars]   = useState(MOCK_MY_CARS);

  // Add car form
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear]   = useState('');
  const [newPlate, setNewPlate] = useState('');

  const saveProfile = () => {
    // API: PUT /api/v1/profile  { fullName, phone }
    setEditMode(false);
    setToast({ msg: 'Profile updated successfully', type: 'success' });
  };

  const addCar = () => {
    if (!newBrand || !newModel || !newYear || !newPlate) return;
    // API: POST /api/v1/cars  { brand, model, year, plate }
    setCars(prev => [...prev, { id: Date.now(), brand: newBrand, model: newModel, year: parseInt(newYear), plate: newPlate, color: '', fuel: 'Gasoline', km: 0, img: 'photo-1621007947382-bb3c3994e3fb' }]);
    setNewBrand(''); setNewModel(''); setNewYear(''); setNewPlate('');
    setShowAddCar(false);
    setToast({ msg: 'Car added successfully', type: 'success' });
  };

  const deleteCar = (id: number) => {
    // API: DELETE /api/v1/cars/{id}
    setCars(prev => prev.filter(c => c.id !== id));
    setToast({ msg: 'Car removed', type: 'info' });
  };

  return (
    <div className="page-in p-4 sm:p-6 pb-24 md:pb-6 max-w-xl mx-auto">
      {/* Profile card */}
      <div className="card mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
            style={{ background: 'var(--primary)' }} aria-label="Profile avatar">
            {name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg" style={{ color: 'var(--text)' }}>{name}</div>
            <div className="text-sm" style={{ color: 'var(--text-3)' }}>{MOCK_USER.email}</div>
            <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-4)' }}>Member since {MOCK_USER.joinedAt}</div>
          </div>
          <button onClick={() => setEditMode(v => !v)} className="btn btn-ghost btn-sm" aria-label="Edit profile">
            {editMode ? '✕' : '✏️'}
          </button>
        </div>
        {editMode ? (
          <div className="space-y-3">
            <Field label="Full Name">
              <input type="text" className="inp" value={name} onChange={e => setName(e.target.value)} />
            </Field>
            <Field label="Phone">
              <input type="tel" className="inp" value={phone} onChange={e => setPhone(e.target.value)} />
            </Field>
            <div className="flex gap-2">
              <button onClick={() => setEditMode(false)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={saveProfile} className="btn btn-primary flex-1">Save Changes</button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            {[['📧', 'Email', MOCK_USER.email], ['📱', 'Phone', phone]].map(([icon, label, value]) => (
              <div key={label as string} className="flex items-center gap-2" style={{ color: 'var(--text-2)' }}>
                <span>{icon}</span><span style={{ color: 'var(--text-3)' }}>{label}:</span><span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Cars */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base" style={{ color: 'var(--text)' }}>{t.myCars}</h2>
          <button onClick={() => setShowAddCar(true)} className="btn btn-primary btn-sm">+ {t.addCar}</button>
        </div>
        {cars.length === 0 ? (
          <EmptyState icon="🚗" title="No cars yet" desc="Add your car to start booking services." />
        ) : (
          <div className="space-y-3">
            {cars.map(car => (
              <div key={car.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                <span className="text-2xl">🚗</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{car.brand} {car.model} ({car.year})</div>
                  <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-3)' }}>{car.plate}</div>
                </div>
                <div className="flex gap-1">
                  <button className="btn btn-ghost btn-sm" aria-label="Edit car">✏️</button>
                  <button onClick={() => deleteCar(car.id)} className="btn btn-ghost btn-sm" aria-label="Delete car">🗑️</button>
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
            { label: 'Email Notifications', desc: 'Receive booking confirmations', checked: MOCK_USER.notifyEmail, onChange: () => {} },
            { label: 'SMS Notifications', desc: 'Get SMS updates on your phone', checked: MOCK_USER.notifySms, onChange: () => {} },
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
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Brand"><input type="text" className="inp" value={newBrand} onChange={e => setNewBrand(e.target.value)} placeholder="Toyota" /></Field>
              <Field label="Model"><input type="text" className="inp" value={newModel} onChange={e => setNewModel(e.target.value)} placeholder="Camry" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Year"><input type="number" className="inp" value={newYear} onChange={e => setNewYear(e.target.value)} placeholder="2022" min="1990" max="2026" /></Field>
              <Field label="Plate Number"><input type="text" className="inp" value={newPlate} onChange={e => setNewPlate(e.target.value)} placeholder="أ ب ج 1234" /></Field>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAddCar(false)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={addCar} className="btn btn-primary flex-1">Add Car</button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
