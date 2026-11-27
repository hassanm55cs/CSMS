import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import { adminApi, unwrapList } from '../../utils/adminApi';

type BranchProductDetail = {
  productId: number;
  name: string;
  quantity: number;
  price?: number;
  warrantyMonths?: number;
};

type Branch = {
  branchId: number;
  name: string;
  products?: BranchProductDetail[];
};

type Product = {
  productId: number;
  name: string;
  price?: number;
};

type StockRow = {
  branchId: number;
  branchName: string;
  productId: number;
  productName: string;
  price: number;
  warrantyMonths: number;
  quantity: number;
  savedQuantity: number;
};

type StockFilter = 'all' | 'in-stock' | 'low' | 'out';
type SortOption = 'branch-asc' | 'product-asc' | 'qty-asc' | 'qty-desc' | 'price-desc' | 'value-desc';

const LOW_STOCK_THRESHOLD = 5;

function rowKey(branchId: number, productId: number) {
  return `${branchId}-${productId}`;
}

function stockStatus(quantity: number): { key: Exclude<StockFilter, 'all'>; label: string; badgeClass: string } {
  if (quantity <= 0) return { key: 'out', label: 'Out of Stock', badgeClass: 'badge-cancelled' };
  if (quantity <= LOW_STOCK_THRESHOLD) return { key: 'low', label: 'Low Stock', badgeClass: 'badge-upcoming' };
  return { key: 'in-stock', label: 'In Stock', badgeClass: 'badge-completed' };
}

export default function AdminInventoryPage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Add / upsert form
  const [showAddForm, setShowAddForm] = useState(false);
  const [branchId, setBranchId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');

  // Filtering & sorting
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('branch-asc');

  // Status
  const [busy, setBusy] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [branchResponse, productResponse] = await Promise.all([
        adminApi('/branches?page=1&pageSize=100'),
        adminApi('/products?page=1&pageSize=100'),
      ]);
      const branchList = unwrapList<Branch>(branchResponse);
      const productList = unwrapList<Product>(productResponse);
      setBranches(branchList);
      setProducts(productList);

      const details = await Promise.all(
        branchList.map(async b => ({ b, detail: await adminApi<Branch>(`/branches/${b.branchId}`) })),
      );
      setRows(
        details.flatMap(({ b, detail }) =>
          (detail.products ?? []).map(p => ({
            branchId: b.branchId,
            branchName: b.name,
            productId: p.productId,
            productName: p.name,
            price: Number(p.price ?? 0),
            warrantyMonths: Number(p.warrantyMonths ?? 0),
            quantity: Number(p.quantity ?? 0),
            savedQuantity: Number(p.quantity ?? 0),
          })),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load inventory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const scoped = branchFilter === 'all' ? rows : rows.filter(r => String(r.branchId) === branchFilter);
    let totalUnits = 0;
    let lowCount = 0;
    let outCount = 0;
    let totalValue = 0;
    for (const r of scoped) {
      totalUnits += r.savedQuantity;
      totalValue += r.savedQuantity * r.price;
      if (r.savedQuantity <= 0) outCount++;
      else if (r.savedQuantity <= LOW_STOCK_THRESHOLD) lowCount++;
    }
    return { totalItems: scoped.length, totalUnits, lowCount, outCount, totalValue };
  }, [rows, branchFilter]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = rows.filter(r => {
      if (branchFilter !== 'all' && String(r.branchId) !== branchFilter) return false;
      if (stockFilter !== 'all' && stockStatus(r.savedQuantity).key !== stockFilter) return false;
      if (term) {
        const matchesProduct = r.productName.toLowerCase().includes(term);
        const matchesBranch = r.branchName.toLowerCase().includes(term);
        const matchesId = String(r.productId).includes(term);
        if (!matchesProduct && !matchesBranch && !matchesId) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'branch-asc':
          return a.branchName.localeCompare(b.branchName) || a.productName.localeCompare(b.productName);
        case 'product-asc':
          return a.productName.localeCompare(b.productName) || a.branchName.localeCompare(b.branchName);
        case 'qty-asc':
          return a.savedQuantity - b.savedQuantity || a.productName.localeCompare(b.productName);
        case 'qty-desc':
          return b.savedQuantity - a.savedQuantity || a.productName.localeCompare(b.productName);
        case 'price-desc':
          return b.price - a.price || a.productName.localeCompare(b.productName);
        case 'value-desc':
          return b.price * b.savedQuantity - a.price * a.savedQuantity || a.productName.localeCompare(b.productName);
      }
    });
  }, [rows, search, branchFilter, stockFilter, sortBy]);

  const hasActiveFilters = search.trim() !== '' || branchFilter !== 'all' || stockFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setBranchFilter('all');
    setStockFilter('all');
  };

  const saveNewStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !productId) return;
    const parsedQty = Math.max(0, Math.floor(Number(quantity)));
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await adminApi(`/branches/${branchId}/inventory`, {
        method: 'POST',
        body: JSON.stringify({ productId: Number(productId), quantity: parsedQty }),
      });
      setMessage('Inventory saved.');
      setShowAddForm(false);
      setProductId('');
      setQuantity('1');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save inventory.');
    } finally {
      setBusy(false);
    }
  };

  const setDraftQuantity = (row: StockRow, next: number) => {
    const clamped = Number.isFinite(next) ? Math.max(0, Math.floor(next)) : 0;
    setRows(curr =>
      curr.map(x =>
        x.branchId === row.branchId && x.productId === row.productId ? { ...x, quantity: clamped } : x,
      ),
    );
  };

  const commitQuantity = async (row: StockRow, nextQuantity: number) => {
    const clamped = Math.max(0, Math.floor(nextQuantity));
    if (clamped === row.savedQuantity) return;
    const key = rowKey(row.branchId, row.productId);
    setSavingKey(key);
    setError('');
    setMessage('');
    try {
      await adminApi(`/branches/${row.branchId}/inventory/${row.productId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity: clamped }),
      });
      setRows(current =>
        current.map(x =>
          x.branchId === row.branchId && x.productId === row.productId
            ? { ...x, quantity: clamped, savedQuantity: clamped }
            : x,
        ),
      );
      setMessage(`Updated ${row.productName} at ${row.branchName} to ${clamped}.`);
    } catch (e) {
      // Revert draft on failure
      setRows(current =>
        current.map(x =>
          x.branchId === row.branchId && x.productId === row.productId
            ? { ...x, quantity: x.savedQuantity }
            : x,
        ),
      );
      setError(e instanceof Error ? e.message : 'Could not update stock.');
    } finally {
      setSavingKey(null);
    }
  };

  const remove = async (row: StockRow) => {
    if (!window.confirm(`Remove ${row.productName} from ${row.branchName}?`)) return;
    const key = rowKey(row.branchId, row.productId);
    setSavingKey(key);
    setError('');
    setMessage('');
    try {
      await adminApi(`/branches/${row.branchId}/inventory/${row.productId}`, { method: 'DELETE' });
      setRows(current => current.filter(x => x.branchId !== row.branchId || x.productId !== row.productId));
      setMessage(`Removed ${row.productName} from ${row.branchName}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove inventory.');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="page-in p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-bold text-xl" style={{ color: 'var(--text)' }}>Branch Inventory</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            Track stock levels across branches, filter low or out-of-stock parts, and adjust quantities inline.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              if (!showAddForm && branchFilter !== 'all') setBranchId(branchFilter);
              setShowAddForm(v => !v);
            }}
          >
            {showAddForm ? 'Close Form' : '+ Add / Set Stock'}
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <button
          type="button"
          onClick={() => setStockFilter('all')}
          className="card text-left transition-all"
          style={{ borderColor: stockFilter === 'all' ? 'var(--primary)' : 'var(--border)' }}
        >
          <div className="text-xs" style={{ color: 'var(--text-3)' }}>Stock Entries</div>
          <div className="text-2xl font-bold mt-1 font-mono" style={{ color: 'var(--text)' }}>{stats.totalItems}</div>
        </button>
        <div className="card">
          <div className="text-xs" style={{ color: 'var(--text-3)' }}>Total Units</div>
          <div className="text-2xl font-bold mt-1 font-mono" style={{ color: 'var(--text)' }}>{stats.totalUnits}</div>
        </div>
        <button
          type="button"
          onClick={() => setStockFilter(current => (current === 'low' ? 'all' : 'low'))}
          className="card text-left transition-all"
          style={{ borderColor: stockFilter === 'low' ? 'var(--primary)' : 'var(--border)' }}
        >
          <div className="text-xs" style={{ color: 'var(--text-3)' }}>Low Stock (1–{LOW_STOCK_THRESHOLD})</div>
          <div className="text-2xl font-bold mt-1 font-mono" style={{ color: '#d97706' }}>{stats.lowCount}</div>
        </button>
        <button
          type="button"
          onClick={() => setStockFilter(current => (current === 'out' ? 'all' : 'out'))}
          className="card text-left transition-all"
          style={{ borderColor: stockFilter === 'out' ? 'var(--sos)' : 'var(--border)' }}
        >
          <div className="text-xs" style={{ color: 'var(--text-3)' }}>Out of Stock</div>
          <div className="text-2xl font-bold mt-1 font-mono" style={{ color: 'var(--sos)' }}>{stats.outCount}</div>
        </button>
        <div className="card col-span-2 lg:col-span-1">
          <div className="text-xs" style={{ color: 'var(--text-3)' }}>Inventory Value</div>
          <div className="text-xl font-bold mt-1 font-mono" style={{ color: 'var(--primary)' }}>
            EGP {stats.totalValue.toLocaleString()}
          </div>
        </div>
      </div>

      {error && <div className="card mb-4 text-sm" role="alert" style={{ color: 'var(--sos)' }}>{error}</div>}
      {message && <div className="card mb-4 text-sm" role="status" style={{ color: 'var(--s-completed)' }}>{message}</div>}

      {/* Add / Set Stock Form */}
      {showAddForm && (
        <form onSubmit={saveNewStock} className="card mb-5 grid sm:grid-cols-4 gap-3">
          <label className="text-xs" style={{ color: 'var(--text-3)' }}>
            Branch
            <select required className="inp mt-1" value={branchId} onChange={e => setBranchId(e.target.value)}>
              <option value="">Select branch</option>
              {branches.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
            </select>
          </label>
          <label className="text-xs" style={{ color: 'var(--text-3)' }}>
            Product
            <select required className="inp mt-1" value={productId} onChange={e => setProductId(e.target.value)}>
              <option value="">Select product</option>
              {products.map(p => (
                <option key={p.productId} value={p.productId}>
                  {p.name}{p.price != null ? ` (EGP ${p.price})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs" style={{ color: 'var(--text-3)' }}>
            Quantity
            <input className="inp mt-1" type="number" min="0" required value={quantity} onChange={e => setQuantity(e.target.value)} />
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" className="btn btn-primary flex-1" disabled={busy}>
              {busy ? 'Saving…' : 'Save Stock'}
            </button>
          </div>
        </form>
      )}

      {/* Filter & Sort Toolbar */}
      <div className="card mb-4 space-y-3">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="text-xs" style={{ color: 'var(--text-3)' }}>
            Search
            <input
              className="inp mt-1"
              type="search"
              placeholder="Product, branch, or ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>
          <label className="text-xs" style={{ color: 'var(--text-3)' }}>
            Branch
            <select className="inp mt-1" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
              <option value="all">All branches ({branches.length})</option>
              {branches.map(b => <option key={b.branchId} value={String(b.branchId)}>{b.name}</option>)}
            </select>
          </label>
          <label className="text-xs" style={{ color: 'var(--text-3)' }}>
            Stock Level
            <select className="inp mt-1" value={stockFilter} onChange={e => setStockFilter(e.target.value as StockFilter)}>
              <option value="all">All stock levels</option>
              <option value="in-stock">In Stock (&gt; {LOW_STOCK_THRESHOLD})</option>
              <option value="low">Low Stock (1–{LOW_STOCK_THRESHOLD})</option>
              <option value="out">Out of Stock (0)</option>
            </select>
          </label>
          <label className="text-xs" style={{ color: 'var(--text-3)' }}>
            Sort By
            <select className="inp mt-1" value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}>
              <option value="branch-asc">Branch (A–Z)</option>
              <option value="product-asc">Product (A–Z)</option>
              <option value="qty-asc">Quantity (Low → High)</option>
              <option value="qty-desc">Quantity (High → Low)</option>
              <option value="price-desc">Unit Price (High → Low)</option>
              <option value="value-desc">Stock Value (High → Low)</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}>
          <span>
            Showing <strong style={{ color: 'var(--text)' }}>{filteredRows.length}</strong> of {rows.length} inventory entries
          </span>
          {hasActiveFilters && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Inventory List Table */}
      <div className="card overflow-x-auto" style={{ padding: 0 }}>
        {loading ? (
          <p className="p-6 text-sm" style={{ color: 'var(--text-3)' }}>Loading inventory…</p>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <div className="flex justify-center mb-2" style={{ color: 'var(--text-4)' }}><Icon name="info" size={28} /></div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>No inventory entries yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Click “+ Add / Set Stock” to assign products to a branch.</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>No matching inventory items</p>
            <p className="text-xs mt-1 mb-3" style={{ color: 'var(--text-3)' }}>Try adjusting your search or stock filters.</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={resetFilters}>Reset Filters</button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Branch</th>
                <th>Product</th>
                <th>Unit Price</th>
                <th>Status</th>
                <th>Quantity</th>
                <th>Value</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(r => {
                const key = rowKey(r.branchId, r.productId);
                const status = stockStatus(r.savedQuantity);
                const dirty = r.quantity !== r.savedQuantity;
                const isSaving = savingKey === key;

                return (
                  <tr key={key}>
                    <td className="font-medium" style={{ color: 'var(--text)' }}>{r.branchName}</td>
                    <td>
                      <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{r.productName}</div>
                      <div className="text-xs font-mono" style={{ color: 'var(--text-4)' }}>
                        #{r.productId}{r.warrantyMonths > 0 ? ` · ${r.warrantyMonths}m warranty` : ''}
                      </div>
                    </td>
                    <td className="font-mono text-sm" style={{ color: 'var(--text-2)' }}>
                      EGP {r.price.toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${status.badgeClass}`}>{status.label}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm px-2"
                          disabled={isSaving || r.savedQuantity <= 0}
                          aria-label={`Decrease ${r.productName} quantity`}
                          onClick={() => void commitQuantity(r, Math.max(0, r.savedQuantity - 1))}
                        >
                          −
                        </button>
                        <input
                          aria-label={`Quantity of ${r.productName} at ${r.branchName}`}
                          className="inp w-20 text-center font-mono"
                          type="number"
                          min="0"
                          disabled={isSaving}
                          value={r.quantity}
                          onChange={e => setDraftQuantity(r, Number(e.target.value))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void commitQuantity(r, r.quantity);
                            }
                          }}
                          onBlur={() => {
                            if (dirty) void commitQuantity(r, r.quantity);
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm px-2"
                          disabled={isSaving}
                          aria-label={`Increase ${r.productName} quantity`}
                          onClick={() => void commitQuantity(r, r.savedQuantity + 1)}
                        >
                          +
                        </button>
                        {dirty && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={isSaving}
                            onClick={() => void commitQuantity(r, r.quantity)}
                          >
                            {isSaving ? '…' : 'Save'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="font-mono text-sm" style={{ color: 'var(--text-2)' }}>
                      EGP {(r.price * r.savedQuantity).toLocaleString()}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-red-500"
                        disabled={isSaving}
                        onClick={() => void remove(r)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
