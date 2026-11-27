import { useCallback, useEffect, useState } from 'react';
import { adminApi, unwrapList } from '../../utils/adminApi';

type Employee = { employeeId: number; fullName: string; email: string; faculty?: string; yearsOfExperience?: number };
type Branch = { branchId: number; name: string; location: string; openTime: string; closeTime: string; openingDate?: string; employeeCount: number; driverCount: number; manager?: { employeeId: number; fullName: string; email?: string } | null; employees?: Employee[] };
type BranchForm = { branchName: string; branchLocation: string; openTime: string; closeTime: string; openingDate: string; managerId: string };
const emptyForm = (): BranchForm => ({ branchName: '', branchLocation: '', openTime: '08:00', closeTime: '18:00', openingDate: new Date().toISOString().slice(0, 10), managerId: '' });

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState<BranchForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branchEmployees, setBranchEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [managerOptions, setManagerOptions] = useState<Employee[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi('/branches?page=1&pageSize=100');
      setBranches(unwrapList<Branch>(result));
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load branches.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const viewBranchEmployees = async (branch: Branch) => {
    setSelectedBranch(branch); setBranchEmployees([]); setLoadingEmployees(true); setError('');
    try {
      const detail = await adminApi<Branch>(`/branches/${branch.branchId}`);
      setSelectedBranch({ ...branch, ...detail });
      setBranchEmployees(detail.employees ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load branch employees.'); }
    finally { setLoadingEmployees(false); }
  };

  const editBranch = async (branch: Branch) => {
    try {
      const detail = await adminApi<Branch>(`/branches/${branch.branchId}`);
      setManagerOptions(detail.employees ?? []);
      setEditingId(branch.branchId);
      setForm({ branchName: detail.name ?? branch.name, branchLocation: detail.location ?? branch.location,
        openTime: detail.openTime ?? branch.openTime, closeTime: detail.closeTime ?? branch.closeTime,
        openingDate: (detail.openingDate ?? branch.openingDate ?? '').slice(0, 10), managerId: detail.manager?.employeeId ? String(detail.manager.employeeId) : '' });
      setShowForm(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load branch details.'); }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      const body = { branchName: form.branchName, branchLocation: form.branchLocation, openTime: form.openTime, closeTime: form.closeTime,
        openingDate: form.openingDate, managerId: form.managerId ? Number(form.managerId) : null };
      await adminApi(editingId ? `/branches/${editingId}` : '/branches', {
        method: editingId ? 'PUT' : 'POST', body: JSON.stringify(body),
      });
      setShowForm(false); setEditingId(null); setForm(emptyForm()); setManagerOptions([]);
      setMessage(editingId ? 'Branch updated.' : 'Branch created.');
      await load();
      if (editingId && selectedBranch?.branchId === editingId) await viewBranchEmployees(selectedBranch);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save branch.'); }
    finally { setSaving(false); }
  };

  const remove = async (branch: Branch) => {
    if (!window.confirm(`Delete ${branch.name}?`)) return;
    setError('');
    try {
      await adminApi(`/branches/${branch.branchId}`, { method: 'DELETE' });
      setBranches(current => current.filter(item => item.branchId !== branch.branchId));
      setMessage('Branch deleted.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete branch.'); }
  };

  return (
    <div className="page-in p-4 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="font-bold text-xl" style={{ color: 'var(--text)' }}>Branches</h1><p className="text-sm" style={{ color: 'var(--text-3)' }}>Manage branch details and operating hours.</p></div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditingId(null); setManagerOptions([]); setForm(emptyForm()); setShowForm(true); }}>+ Add Branch</button>
      </div>
      {error && <div className="card mb-4 text-sm" role="alert" style={{ color: 'var(--sos)' }}>{error}</div>}
      {message && <div className="card mb-4 text-sm" role="status" style={{ color: 'var(--s-completed)' }}>{message}</div>}
      {showForm && <form onSubmit={save} className="card mb-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <label className="text-xs" style={{ color: 'var(--text-3)' }}>Branch name<input className="inp mt-1" required maxLength={100} value={form.branchName} onChange={e => setForm({ ...form, branchName: e.target.value })} /></label>
        <label className="text-xs" style={{ color: 'var(--text-3)' }}>Location<input className="inp mt-1" required maxLength={200} value={form.branchLocation} onChange={e => setForm({ ...form, branchLocation: e.target.value })} /></label>
        <label className="text-xs" style={{ color: 'var(--text-3)' }}>Opening date<input className="inp mt-1" type="date" required value={form.openingDate} onChange={e => setForm({ ...form, openingDate: e.target.value })} /></label>
        <label className="text-xs" style={{ color: 'var(--text-3)' }}>Open time<input className="inp mt-1" type="time" required value={form.openTime} onChange={e => setForm({ ...form, openTime: e.target.value })} /></label>
        <label className="text-xs" style={{ color: 'var(--text-3)' }}>Close time<input className="inp mt-1" type="time" required value={form.closeTime} onChange={e => setForm({ ...form, closeTime: e.target.value })} /></label>
        <label className="text-xs" style={{ color: 'var(--text-3)' }}>Branch manager<select className="inp mt-1" value={form.managerId} onChange={e => setForm({ ...form, managerId: e.target.value })}><option value="">No manager</option>{managerOptions.map(employee => <option key={employee.employeeId} value={employee.employeeId}>{employee.fullName} · #{employee.employeeId}</option>)}</select><span className="block mt-1">Only employees in this branch can be selected.</span></label>
        <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Branch'}</button></div>
      </form>}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {loading ? <p className="p-5 text-sm" style={{ color: 'var(--text-3)' }}>Loading branches…</p> : (
          <table><thead><tr><th>Branch</th><th>Manager</th><th>Employees</th><th>Drivers</th><th>Hours</th><th>Actions</th></tr></thead>
            <tbody>{branches.map(branch => <tr key={branch.branchId}>
              <td><button className="text-left" onClick={() => void viewBranchEmployees(branch)}><div className="font-semibold underline-offset-2 hover:underline" style={{ color: 'var(--primary)' }}>{branch.name}</div><div className="text-xs font-mono" style={{ color: 'var(--text-4)' }}>{branch.location}</div></button></td>
              <td style={{ color: 'var(--text-2)' }}>{branch.manager?.fullName ?? '—'}</td>
              <td className="font-mono">{branch.employeeCount}</td><td className="font-mono">{branch.driverCount}</td>
              <td className="text-xs" style={{ color: 'var(--text-3)' }}>{branch.openTime}–{branch.closeTime}</td>
              <td><div className="flex gap-1"><button className="btn btn-secondary btn-sm" onClick={() => void editBranch(branch)}>Edit</button><button className="btn btn-ghost btn-sm text-red-500" onClick={() => void remove(branch)}>Delete</button></div></td>
            </tr>)}</tbody>
          </table>
        )}
      </div>
      {selectedBranch && <section className="card mt-4"><div className="flex items-start justify-between gap-3 mb-4"><div><h2 className="font-bold" style={{ color: 'var(--text)' }}>{selectedBranch.name} employees</h2><p className="text-sm" style={{ color: 'var(--text-3)' }}>{selectedBranch.location} · Manager: {selectedBranch.manager?.fullName ?? 'Not assigned'}</p></div><button className="btn btn-ghost btn-sm" onClick={() => { setSelectedBranch(null); setBranchEmployees([]); }}>Close</button></div>
        {loadingEmployees ? <p className="text-sm" style={{ color: 'var(--text-3)' }}>Loading employees…</p> : branchEmployees.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-3)' }}>No employees are assigned to this branch yet.</p> : <div className="overflow-x-auto"><table><thead><tr><th>Employee</th><th>Email</th><th>Faculty</th><th>Experience</th><th>Branch role</th></tr></thead><tbody>{branchEmployees.map(employee => <tr key={employee.employeeId}><td>{employee.fullName}</td><td>{employee.email}</td><td>{employee.faculty ?? '—'}</td><td>{employee.yearsOfExperience ?? 0} years</td><td>{selectedBranch.manager?.employeeId === employee.employeeId ? 'Manager' : 'Employee'}</td></tr>)}</tbody></table></div>}
        {branchEmployees.length > 0 && !selectedBranch.manager && <p className="mt-3 text-sm" style={{ color: 'var(--text-3)' }}>This branch has no manager. Choose one from Edit Branch; only these employees will be offered.</p>}
      </section>}
    </div>
  );
}
