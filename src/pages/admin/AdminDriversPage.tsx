import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import { adminApi, unwrapList } from '../../utils/adminApi';

type Branch = {
  branchId: number;
  name: string;
};

type DriverItem = {
  driverId: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  salary: number;
  branchId: number;
  startWorkDate: string;
  isAvailable: boolean;
};

type CreatedCredentials = {
  fullName: string;
  email: string;
  defaultPassword: string;
};

type CreateDriverForm = {
  fullName: string;
  email: string;
  phoneNumber: string;
  branchId: string;
  salary: string;
  startWorkDate: string;
};

const emptyForm = (): CreateDriverForm => ({
  fullName: '',
  email: '',
  phoneNumber: '',
  branchId: '',
  salary: '',
  startWorkDate: new Date().toISOString().slice(0, 10),
});

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState<CreateDriverForm>(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null);
  const [copied, setCopied] = useState(false);

  const branchNames = useMemo(
    () => new Map(branches.map(branch => [branch.branchId, branch.name])),
    [branches],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [driverResult, branchResult] = await Promise.all([
        adminApi('/Driver?page=1&pageSize=100'),
        adminApi('/branches?page=1&pageSize=100'),
      ]);
      setDrivers(unwrapList<DriverItem>(driverResult));
      setBranches(unwrapList<Branch>(branchResult));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load drivers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createDriver = async (event: React.FormEvent) => {
    event.preventDefault();
    if (Number(form.salary) <= 0) {
      setError('Salary must be greater than 0.');
      return;
    }
    setCreating(true);
    setError('');
    setMessage('');
    setCopied(false);
    try {
      const response = await adminApi<any>('/auth/register/Driver', {
        method: 'POST',
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phoneNumber: form.phoneNumber.trim(),
          branchId: Number(form.branchId),
          salary: Number(form.salary),
          startWorkDate: form.startWorkDate,
        }),
      });
      const defaultPassword = response?.defaultPassword ?? response?.DefaultPassword ?? '';
      const email = response?.email ?? response?.Email ?? form.email.trim();
      setCreatedCredentials({
        fullName: form.fullName.trim(),
        email,
        defaultPassword,
      });
      setMessage(response?.message ?? response?.Message ?? 'Driver account created.');
      setShowForm(false);
      setForm(emptyForm());
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create driver account.');
    } finally {
      setCreating(false);
    }
  };

  const changeField = (driverId: number, field: 'email' | 'phoneNumber' | 'salary', value: string) => {
    setDrivers(current =>
      current.map(driver =>
        driver.driverId === driverId
          ? { ...driver, [field]: field === 'salary' ? Number(value) : value }
          : driver,
      ),
    );
  };

  const saveDriver = async (driver: DriverItem) => {
    if (driver.salary <= 0) {
      setError('Salary must be greater than 0.');
      return;
    }
    setBusyId(driver.driverId);
    setError('');
    setMessage('');
    try {
      await adminApi(`/Driver/${driver.driverId}`, {
        method: 'PUT',
        body: JSON.stringify({
          email: driver.email.trim(),
          phoneNumber: driver.phoneNumber.trim(),
          salary: driver.salary,
        }),
      });
      setMessage(`Updated ${driver.fullName}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update driver details.');
    } finally {
      setBusyId(null);
    }
  };

  const copyCredentials = async () => {
    if (!createdCredentials) return;
    const text = `Email: ${createdCredentials.email}\nDefault Password: ${createdCredentials.defaultPassword}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="page-in p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
        >
          <Icon name="driver" size={23} />
        </div>
        <div>
          <h1 className="font-bold text-xl" style={{ color: 'var(--text)' }}>Drivers</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            Create driver accounts with a default password and manage existing drivers.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm ml-auto"
          onClick={() => {
            setForm(emptyForm());
            setShowForm(open => !open);
          }}
        >
          {showForm ? 'Close Form' : 'Add Driver'}
        </button>
      </div>

      {error && (
        <div className="card mb-4 text-sm" role="alert" style={{ color: 'var(--sos)' }}>
          {error}
        </div>
      )}
      {message && !createdCredentials && (
        <div className="card mb-4 text-sm" role="status" style={{ color: 'var(--s-completed)' }}>
          {message}
        </div>
      )}

      {createdCredentials && (
        <section
          className="card mb-5"
          role="status"
          style={{
            background: 'var(--primary-light)',
            borderColor: 'color-mix(in srgb, var(--primary) 30%, var(--border))',
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                Driver account ready for {createdCredentials.fullName}
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                Hand these credentials to the driver. They can change the default password later from their account.
              </p>
              <div className="mt-3 space-y-1 text-sm font-mono" style={{ color: 'var(--text)' }}>
                <div>Email: <strong>{createdCredentials.email}</strong></div>
                <div>Default Password: <strong>{createdCredentials.defaultPassword}</strong></div>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void copyCredentials()}>
                {copied ? 'Copied' : 'Copy Credentials'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCreatedCredentials(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </section>
      )}

      {showForm && (
        <form onSubmit={createDriver} className="card mb-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <h2 className="font-semibold sm:col-span-2 lg:col-span-3" style={{ color: 'var(--text)' }}>
            Create Driver Account
          </h2>
          <label className="text-xs" style={{ color: 'var(--text-3)' }}>
            Full name
            <input
              className="inp mt-1"
              type="text"
              required
              value={form.fullName}
              onChange={event => setForm({ ...form, fullName: event.target.value })}
            />
          </label>
          <label className="text-xs" style={{ color: 'var(--text-3)' }}>
            Email
            <input
              className="inp mt-1"
              type="email"
              required
              value={form.email}
              onChange={event => setForm({ ...form, email: event.target.value })}
            />
          </label>
          <label className="text-xs" style={{ color: 'var(--text-3)' }}>
            Phone
            <input
              className="inp mt-1"
              type="tel"
              required
              value={form.phoneNumber}
              onChange={event => setForm({ ...form, phoneNumber: event.target.value })}
            />
          </label>
          <label className="text-xs" style={{ color: 'var(--text-3)' }}>
            Branch
            <select
              className="inp mt-1"
              required
              value={form.branchId}
              onChange={event => setForm({ ...form, branchId: event.target.value })}
            >
              <option value="">Select branch</option>
              {branches.map(branch => (
                <option key={branch.branchId} value={branch.branchId}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs" style={{ color: 'var(--text-3)' }}>
            Salary
            <input
              className="inp mt-1"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={form.salary}
              onChange={event => setForm({ ...form, salary: event.target.value })}
            />
          </label>
          <label className="text-xs" style={{ color: 'var(--text-3)' }}>
            Start work date
            <input
              className="inp mt-1"
              type="date"
              required
              value={form.startWorkDate}
              onChange={event => setForm({ ...form, startWorkDate: event.target.value })}
            />
          </label>
          <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between gap-3 pt-1">
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>
              A default password will be assigned automatically and shown after creation.
            </span>
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? 'Creating…' : 'Create Driver'}
              </button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="card text-sm" style={{ color: 'var(--text-3)' }}>Loading drivers…</div>
      ) : drivers.length === 0 ? (
        <div className="card text-center py-12">
          <div className="flex justify-center mb-3" style={{ color: 'var(--text-4)' }}>
            <Icon name="driver" size={30} />
          </div>
          <h2 className="font-semibold" style={{ color: 'var(--text)' }}>No drivers yet</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
            Click “Add Driver” to create a driver account.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {drivers.map(driver => (
            <section key={driver.driverId} className="card">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-semibold" style={{ color: 'var(--text)' }}>{driver.fullName}</h2>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                    Driver #{driver.driverId} · {branchNames.get(driver.branchId) ?? `Branch ${driver.branchId}`} · Started {driver.startWorkDate}
                  </p>
                </div>
                <span className={`badge ${driver.isAvailable ? 'badge-completed' : 'badge-upcoming'}`}>
                  {driver.isAvailable ? 'Available' : 'Unavailable'}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-[1fr_1fr_180px_auto] gap-3 items-end">
                <label className="text-xs" style={{ color: 'var(--text-3)' }}>
                  Email
                  <input
                    className="inp mt-1"
                    type="email"
                    value={driver.email}
                    onChange={event => changeField(driver.driverId, 'email', event.target.value)}
                  />
                </label>
                <label className="text-xs" style={{ color: 'var(--text-3)' }}>
                  Phone
                  <input
                    className="inp mt-1"
                    type="tel"
                    value={driver.phoneNumber}
                    onChange={event => changeField(driver.driverId, 'phoneNumber', event.target.value)}
                  />
                </label>
                <label className="text-xs" style={{ color: 'var(--text-3)' }}>
                  Salary
                  <input
                    className="inp mt-1"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={driver.salary}
                    onChange={event => changeField(driver.driverId, 'salary', event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={busyId === driver.driverId || driver.salary <= 0}
                  onClick={() => void saveDriver(driver)}
                >
                  {busyId === driver.driverId ? 'Saving…' : 'Save'}
                </button>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
