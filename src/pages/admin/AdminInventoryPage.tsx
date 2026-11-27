import { useCallback, useEffect, useState } from 'react';
import { adminApi, unwrapList } from '../../utils/adminApi';

type Branch = { branchId: number; name: string; products?: Array<{ productId: number; name: string; quantity: number; price?: number }> };
type Product = { productId: number; name: string };
type StockRow = { branchId: number; branchName: string; productId: number; productName: string; quantity: number };

export default function AdminInventoryPage() {
  const [rows, setRows] = useState<StockRow[]>([]); const [branches, setBranches] = useState<Branch[]>([]); const [products, setProducts] = useState<Product[]>([]);
  const [branchId, setBranchId] = useState(''); const [productId, setProductId] = useState(''); const [quantity, setQuantity] = useState('0');
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [branchResponse, productResponse] = await Promise.all([adminApi('/branches?page=1&pageSize=100'), adminApi('/products?page=1&pageSize=100')]);
      const branchList = unwrapList<Branch>(branchResponse); setBranches(branchList); setProducts(unwrapList<Product>(productResponse));
      const details = await Promise.all(branchList.map(async b => ({ b, detail: await adminApi<Branch>(`/branches/${b.branchId}`) })));
      setRows(details.flatMap(({ b, detail }) => (detail.products ?? []).map(p => ({ branchId: b.branchId, branchName: b.name, productId: p.productId, productName: p.name, quantity: p.quantity }))));
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load inventory.'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const save = async (e: React.FormEvent) => { e.preventDefault(); if (!branchId || !productId) return; setBusy(true); setError(''); setMessage('');
    try { await adminApi(`/branches/${branchId}/inventory`, { method: 'POST', body: JSON.stringify({ productId: Number(productId), quantity: Number(quantity) }) }); setMessage('Inventory saved.'); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save inventory.'); } finally { setBusy(false); }
  };
  const update = async (row: StockRow, next: number) => { try { await adminApi(`/branches/${row.branchId}/inventory/${row.productId}`, { method: 'PUT', body: JSON.stringify({ quantity: next }) }); setRows(current => current.map(x => x.branchId === row.branchId && x.productId === row.productId ? { ...x, quantity: next } : x)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not update stock.'); }
  };
  const remove = async (row: StockRow) => { if (!window.confirm(`Remove ${row.productName} from ${row.branchName}?`)) return; try { await adminApi(`/branches/${row.branchId}/inventory/${row.productId}`, { method: 'DELETE' }); setRows(current => current.filter(x => x.branchId !== row.branchId || x.productId !== row.productId)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not remove inventory.'); }
  };
  return <div className="page-in p-4 sm:p-6"><div className="mb-5"><h1 className="font-bold text-xl" style={{ color: 'var(--text)' }}>Branch Inventory</h1><p className="text-sm" style={{ color: 'var(--text-3)' }}>Stock is loaded from each branch detail; inventory endpoints support add, update and delete.</p></div>
    {error && <div className="card mb-3 text-sm" role="alert" style={{ color: 'var(--sos)' }}>{error}</div>}{message && <div className="card mb-3 text-sm" role="status" style={{ color: 'var(--s-completed)' }}>{message}</div>}
    <form onSubmit={save} className="card mb-4 grid sm:grid-cols-4 gap-3"><label className="text-xs">Branch<select required className="inp mt-1" value={branchId} onChange={e => setBranchId(e.target.value)}><option value="">Select branch</option>{branches.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}</select></label><label className="text-xs">Product<select required className="inp mt-1" value={productId} onChange={e => setProductId(e.target.value)}><option value="">Select product</option>{products.map(p => <option key={p.productId} value={p.productId}>{p.name}</option>)}</select></label><label className="text-xs">Quantity<input className="inp mt-1" type="number" min="0" required value={quantity} onChange={e => setQuantity(e.target.value)} /></label><button className="btn btn-primary self-end" disabled={busy}>{busy ? 'Saving…' : 'Add / Set Stock'}</button></form>
    <div className="card overflow-x-auto" style={{ padding: 0 }}>{loading ? <p className="p-5 text-sm">Loading inventory…</p> : <table><thead><tr><th>Branch</th><th>Product</th><th>Quantity</th><th>Actions</th></tr></thead><tbody>{rows.map(r => <tr key={`${r.branchId}-${r.productId}`}><td>{r.branchName}</td><td>{r.productName}</td><td><input aria-label={`Quantity of ${r.productName}`} className="inp w-24" type="number" min="0" value={r.quantity} onChange={e => setRows(curr => curr.map(x => x.branchId === r.branchId && x.productId === r.productId ? { ...x, quantity: Number(e.target.value) } : x))} onBlur={e => { const n = Number(e.target.value); if (n !== r.quantity) void update(r, n); }} /></td><td><button className="btn btn-ghost btn-sm text-red-500" onClick={() => void remove(r)}>Remove</button></td></tr>)}</tbody></table>}</div>
  </div>;
}
