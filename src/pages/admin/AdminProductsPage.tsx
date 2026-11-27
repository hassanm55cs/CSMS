import { useCallback, useEffect, useState } from 'react';
import { adminApi, unwrapList } from '../../utils/adminApi';

type Product = { productId: number; name: string; price: number; warrantyMonths: number; description?: string | null };
type ProductForm = { name: string; price: string; warrantyMonths: string; description: string };
const empty = (): ProductForm => ({ name: '', price: '', warrantyMonths: '0', description: '' });

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>(empty());
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try { setProducts(unwrapList<Product>(await adminApi('/products?page=1&pageSize=100'))); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load products.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const body = { name: form.name, price: Number(form.price), warrantyMonths: Number(form.warrantyMonths), description: form.description || null };
      await adminApi(editing ? `/products/${editing}` : '/products', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(body) });
      setShowForm(false); setEditing(null); setForm(empty()); setMessage(editing ? 'Product updated.' : 'Product created.'); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save product.'); }
    finally { setSaving(false); }
  };
  const remove = async (product: Product) => {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    try { await adminApi(`/products/${product.productId}`, { method: 'DELETE' }); setProducts(list => list.filter(item => item.productId !== product.productId)); setMessage('Product deleted.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete product.'); }
  };

  return <div className="page-in p-4 sm:p-6">
    <div className="flex items-center justify-between mb-5"><div><h1 className="font-bold text-xl" style={{ color: 'var(--text)' }}>Products</h1><p className="text-sm" style={{ color: 'var(--text-3)' }}>Manage service parts and products.</p></div><button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setForm(empty()); setShowForm(true); }}>+ Add Product</button></div>
    {error && <div className="card mb-3 text-sm" role="alert" style={{ color: 'var(--sos)' }}>{error}</div>}{message && <div className="card mb-3 text-sm" role="status" style={{ color: 'var(--s-completed)' }}>{message}</div>}
    {showForm && <form onSubmit={save} className="card mb-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <label className="text-xs" style={{ color: 'var(--text-3)' }}>Product name<input className="inp mt-1" maxLength={200} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
      <label className="text-xs" style={{ color: 'var(--text-3)' }}>Price (EGP)<input className="inp mt-1" type="number" min="0" step="0.01" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></label>
      <label className="text-xs" style={{ color: 'var(--text-3)' }}>Warranty months<input className="inp mt-1" type="number" min="0" max="600" required value={form.warrantyMonths} onChange={e => setForm({ ...form, warrantyMonths: e.target.value })} /></label>
      <label className="text-xs" style={{ color: 'var(--text-3)' }}>Description<input className="inp mt-1" maxLength={1000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
      <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Product'}</button></div>
    </form>}
    <div className="card overflow-x-auto" style={{ padding: 0 }}>{loading ? <p className="p-5 text-sm" style={{ color: 'var(--text-3)' }}>Loading products…</p> : <table><thead><tr><th>Product</th><th>Price</th><th>Warranty</th><th>Description</th><th>Actions</th></tr></thead><tbody>{products.map(product => <tr key={product.productId}><td className="font-semibold">{product.name}</td><td>EGP {product.price}</td><td>{product.warrantyMonths} months</td><td>{product.description || '—'}</td><td><div className="flex gap-1"><button className="btn btn-secondary btn-sm" onClick={() => { setEditing(product.productId); setForm({ name: product.name, price: String(product.price), warrantyMonths: String(product.warrantyMonths), description: product.description ?? '' }); setShowForm(true); }}>Edit</button><button className="btn btn-ghost btn-sm text-red-500" onClick={() => void remove(product)}>Delete</button></div></td></tr>)}</tbody></table>}</div>
  </div>;
}
