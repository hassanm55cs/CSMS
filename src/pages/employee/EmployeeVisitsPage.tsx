import { useEffect, useState } from 'react';
import { useLocation, useOutletContext, useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';
import { EmptyState } from '../../components/ui/EmptyState';
import { VisitStatusBadge } from '../../components/visits/VisitStatusBadge';
import { adminApi, unwrapList } from '../../utils/adminApi';
import type { EmployeeOutletContext, EmployeeVisit } from '../../components/layout/EmployeeLayout';
import { ROUTES } from '../../routes/paths';

type BranchProduct = { productId: number; name: string; price: number; quantity: number; warrantyMonths?: number };
type ProductPage = { page?: number; Page?: number; totalPages?: number; TotalPages?: number; data?: BranchProduct[]; Data?: BranchProduct[] };
type ServiceItem = { serviceId: number; serviceDate: string; product?: { productId: number; name: string; price: number } | null; statusService: string; description: string; approved: boolean };
type DiagnosisDraft = { localId: number; productId: number; description: string; severity: 'critical' | 'warning' | 'normal' };
type StockFilter = 'available' | 'outOfStock';
const normalizeStatus = (status: string) => status.toLowerCase().replace(/[^a-z]/g, '');
const apiError = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback;
const displayServiceDescription = (value: string) => value
  .replace(/(?:^|[;,]\s*)Preferred time slot:\s*\d{1,2}:\d{2}/i, '')
  .replace(/^[\s·,;]+|[\s·,;]+$/g, '')
  .trim();

export default function EmployeeVisitsPage() {
  const location = useLocation();
  const isHistory = location.pathname === ROUTES.employee.history;
  const [searchParams, setSearchParams] = useSearchParams();
  const { visits, historyVisits, loading, error: listError, refreshVisits } = useOutletContext<EmployeeOutletContext>();
  const [selected, setSelected] = useState<EmployeeVisit | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [branchProducts, setBranchProducts] = useState<BranchProduct[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [drafts, setDrafts] = useState<DiagnosisDraft[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [productSeverities, setProductSeverities] = useState<Record<number, DiagnosisDraft['severity']>>({});
  const [productSearch, setProductSearch] = useState('');
  const [productStockFilter, setProductStockFilter] = useState<StockFilter>('available');
  const [productPage, setProductPage] = useState(1);
  const [productTotalPages, setProductTotalPages] = useState(1);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [description, setDescription] = useState('');
  const [completedServiceIds, setCompletedServiceIds] = useState<number[]>([]);
  const [finalKm, setFinalKm] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');

  const loadProducts = async (visit: EmployeeVisit, page: number, search: string, stockStatus: StockFilter = productStockFilter) => {
    setLoadingProducts(true);
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: '25', stockStatus, branchId: String(visit.branchId) });
      if (search.trim()) query.set('search', search.trim());
      const response = await adminApi<ProductPage>(`/products?${query.toString()}`);
      const products = unwrapList<any>(response).map(item => {
        const stockRows = item.branchQuantities ?? item.BranchQuantities ?? [];
        const branchStock = stockRows.find((stock: any) => Number(stock.branchId ?? stock.BranchId) === visit.branchId);
        return {
          productId: Number(item.productId ?? item.ProductId),
          name: item.name ?? item.Name,
          price: Number(item.price ?? item.Price ?? 0),
          quantity: Number(branchStock?.quantity ?? branchStock?.Quantity ?? 0),
          warrantyMonths: item.warrantyMonths ?? item.WarrantyMonths,
        } satisfies BranchProduct;
      });
      setBranchProducts(products);
      setProductPage(response.page ?? response.Page ?? page);
      setProductTotalPages(response.totalPages ?? response.TotalPages ?? 1);
    } catch (cause) {
      setError(apiError(cause, 'Could not load branch products.'));
      setBranchProducts([]);
    } finally { setLoadingProducts(false); }
  };

  const openVisit = async (visit: EmployeeVisit) => {
    setSelected(visit); setServices([]); setBranchProducts([]); setDrafts([]); setSelectedProductIds([]); setProductSeverities({}); setProductSearch(''); setProductStockFilter('available'); setProductPage(1); setProductTotalPages(1); setError(''); setSuccess('');
    setLoadingDetail(true);
    try {
      let currentVisit = visit;
      if (!visit.employeeId) {
        currentVisit = await adminApi<EmployeeVisit>(`/visits/${visit.visitId}/assignment`, { method: 'PUT' });
        setSelected(currentVisit);
        await refreshVisits();
      }
      const servicesResult = await adminApi<any>(`/visits/${visit.visitId}/services`);
      setServices(unwrapList<ServiceItem>(servicesResult));
      if (!isHistory) await loadProducts(visit, 1, '', 'available');
    } catch (cause) {
      setError(apiError(cause, 'Could not open this visit.'));
    } finally { setLoadingDetail(false); }
  };

  useEffect(() => {
    const rawVisitId = searchParams.get('visitId');
    const visitId = rawVisitId ? Number(rawVisitId) : null;
    if (!visitId) {
      if (selected) {
        setSelected(null); setServices([]); setBranchProducts([]); setError(''); setSuccess('');
        setCompletedServiceIds([]); setFinalKm(''); setCompletionNotes('');
      }
      return;
    }
    if (loading) return;
    const visit = (isHistory ? historyVisits : visits).find(item => item.visitId === visitId);
    if (visit && selected?.visitId !== visitId) void openVisit(visit);
  }, [searchParams, loading, visits, historyVisits, isHistory, selected?.visitId]);

  const addDiagnosisItems = () => {
    if (selectedProductIds.length === 0 || !description.trim()) return;
    const chosenProducts = branchProducts.filter(item => selectedProductIds.includes(item.productId));
    const alreadyAdded = new Set([...drafts.map(item => item.productId), ...services.map(item => item.product?.productId).filter((id): id is number => typeof id === 'number')]);
    const newItems = chosenProducts.filter(item => !alreadyAdded.has(item.productId)).map((item, index) => ({
      localId: Date.now() + index,
      productId: item.productId,
      description: description.trim(),
      severity: productSeverities[item.productId] ?? 'normal',
    }));
    setDrafts(items => [...items, ...newItems]);
    setSelectedProductIds([]); setProductSeverities({}); setDescription(''); setError('');
  };

  const submitDiagnosis = async () => {
    if (!selected || drafts.length === 0) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const result = await adminApi<{ status?: string; Status?: string; skippedItemCount?: number; SkippedItemCount?: number }>(`/visits/${selected.visitId}/diagnosis`, {
        method: 'PUT',
        body: JSON.stringify({
          description: drafts.map(item => item.description).join('; '),
          items: drafts.map(item => ({
            productId: item.productId,
            description: item.description,
            severity: item.severity,
            estimatedCost: branchProducts.find(product => product.productId === item.productId)?.price ?? 0,
          })),
        }),
      });
      const status = result.status ?? result.Status ?? 'PendingCustomerConfirmation';
      const skipped = result.skippedItemCount ?? result.SkippedItemCount ?? 0;
      setSelected({ ...selected, status });
      setDrafts([]);
      const updatedServices = await adminApi<any>(`/visits/${selected.visitId}/services`);
      setServices(unwrapList<ServiceItem>(updatedServices));
      setSuccess(skipped > 0 ? `Diagnosis sent. ${skipped} item(s) were skipped by the backend.` : 'Diagnosis sent to the customer. A notification was created by the backend.');
      await refreshVisits();
    } catch (cause) { setError(apiError(cause, 'Could not submit the diagnosis.')); }
    finally { setBusy(false); }
  };

  const startWork = async () => {
    if (!selected) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const result = await adminApi<EmployeeVisit>(`/visits/${selected.visitId}/status`, { method: 'PUT', body: JSON.stringify({ status: 'InProgress' }) });
      setSelected({ ...selected, status: result.status ?? (result as any).Status ?? 'InProgress' });
      setSuccess('Work started.');
      await refreshVisits();
    } catch (cause) { setError(apiError(cause, 'Could not start this job.')); }
    finally { setBusy(false); }
  };

  const completeJob = async () => {
    if (!selected || !finalKm || completedServiceIds.length !== services.filter(item => item.approved).length) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const car = await adminApi<{ currentKm?: number; CurrentKm?: number }>(`/cars/${encodeURIComponent(selected.carLicencePlate)}`);
      const databaseKm = Number(car.currentKm ?? car.CurrentKm);
      if (!Number.isFinite(databaseKm)) {
        throw new Error('Could not verify the vehicle’s current mileage. The visit was not completed.');
      }
      if (Number(finalKm) < databaseKm) {
        setError(`Final odometer must be at least ${databaseKm.toLocaleString()} km, the current mileage recorded in the database.`);
        return;
      }

      const result = await adminApi<{ status?: string; Status?: string }>(`/visits/${selected.visitId}/complete`, {
        method: 'PUT',
        body: JSON.stringify({ finalKm: Number(finalKm), completedServiceIds, completionNotes: completionNotes.trim() || null }),
      });
      setSelected({ ...selected, status: result.status ?? result.Status ?? 'Completed' });
      setSuccess('Visit completed and the vehicle mileage was updated.');
      await refreshVisits();
    } catch (cause) { setError(apiError(cause, 'Could not complete this job.')); }
    finally { setBusy(false); }
  };

  const openVisitFromList = (visitId: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('visitId', String(visitId));
    setSearchParams(params);
  };
  const closeVisit = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('visitId');
    setSearchParams(params, { replace: true });
    setSelected(null); setError(''); setSuccess(''); setServices([]); setBranchProducts([]); setCompletedServiceIds([]); setFinalKm(''); setCompletionNotes('');
  };
  const status = normalizeStatus(selected?.status ?? '');
  const approvedServices = services.filter(item => item.approved);
  const customerResponded = ['approved', 'customerconfirmed', 'rejected', 'inprogress', 'completed'].includes(status);
  const rejectedServices = customerResponded ? services.filter(item => !item.approved) : [];
  const rejectedProductIds = new Set(rejectedServices.map(item => item.product?.productId).filter((id): id is number => typeof id === 'number'));
  const serviceDecision = (item: ServiceItem) => item.approved
    ? 'Accepted by customer'
    : customerResponded ? 'Rejected by customer' : 'Waiting for customer';
  const diagnosisStage = status === 'underdiagnosis' || status === 'requested' || status === 'rejected';
  const awaitingCustomer = status === 'pendingcustomerconfirmation';
  const approvedStage = status === 'approved' || status === 'customerconfirmed';
  const workStage = status === 'inprogress';
  const completedStage = status === 'completed' || status === 'cancelled';
  const filteredProducts = branchProducts;
  const customerSelectedProductIds = new Set(services.filter(item => item.approved).map(item => item.product?.productId).filter((id): id is number => typeof id === 'number'));

  if (selected) return <div className="page-in p-4 sm:p-6 max-w-5xl mx-auto">
    <div className="flex flex-wrap items-start gap-3 mb-5"><button onClick={closeVisit} className="btn btn-secondary btn-sm">← Back to {isHistory ? 'history' : 'open visits'}</button><div className="flex-1 min-w-0"><h1 className="font-bold text-xl" style={{ color: 'var(--text)' }}>{selected.bookingReference}</h1><p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>{selected.carCompany} {selected.carModel} · {selected.carLicencePlate} · {selected.serviceDate}</p></div><VisitStatusBadge status={selected.status} /></div>
    {error && <div className="card mb-4 text-sm" role="alert" style={{ color: 'var(--sos)' }}>{error}</div>}
    {success && <div className="card mb-4 text-sm" role="status" style={{ color: 'var(--s-completed)' }}>{success}</div>}
    {loadingDetail ? <div className="card text-sm" style={{ color: 'var(--text-3)' }}>Loading visit services and branch products…</div> : <div className="grid lg:grid-cols-5 gap-4">
      <section className="card lg:col-span-2"><h2 className="font-bold mb-3" style={{ color: 'var(--text)' }}>Visit information</h2><div className="space-y-2 text-sm"><div className="flex justify-between gap-2"><span style={{ color: 'var(--text-3)' }}>Vehicle</span><span className="text-right" style={{ color: 'var(--text)' }}>{selected.carCompany} {selected.carModel}</span></div><div className="flex justify-between gap-2"><span style={{ color: 'var(--text-3)' }}>Plate</span><span className="font-mono" style={{ color: 'var(--text)' }}>{selected.carLicencePlate}</span></div><div className="flex justify-between gap-2"><span style={{ color: 'var(--text-3)' }}>Branch</span><span className="text-right" style={{ color: 'var(--text)' }}>{selected.branchName}</span></div><div className="flex justify-between gap-2"><span style={{ color: 'var(--text-3)' }}>Services</span><span style={{ color: 'var(--text)' }}>{services.length}</span></div></div>
        <h3 className="font-semibold text-sm mt-5 mb-2">Customer decisions</h3>{services.length === 0 ? <p className="text-xs" style={{ color: 'var(--text-3)' }}>No service items are attached to this visit.</p> : <div className="space-y-2">{services.map(item => <div key={item.serviceId} className="rounded-xl p-3" style={{ background: 'var(--surface-2)' }}><div className="flex justify-between gap-2"><span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{item.product?.name ?? item.description}</span><span className="text-xs font-mono" style={{ color: 'var(--primary)' }}>EGP {item.product?.price ?? 0}</span></div><div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{displayServiceDescription(item.description) && <>{displayServiceDescription(item.description)} · </>}{item.statusService}</div><span className="inline-block mt-2 rounded-full px-2 py-0.5 text-xs font-semibold" style={item.approved ? { background: 'var(--s-completed-bg)', color: 'var(--s-completed)' } : customerResponded ? { background: 'rgba(220,38,38,0.1)', color: 'var(--sos)' } : { background: 'rgba(217,119,6,0.13)', color: '#B45309' }}>{serviceDecision(item)}</span></div>)}</div>}
      </section>

      <section className="card lg:col-span-3">
        {diagnosisStage && <>
          <h2 className="font-bold mb-1" style={{ color: 'var(--text)' }}>{status === 'rejected' ? 'Revise diagnosis' : 'Submit diagnosis'}</h2><p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>{status === 'rejected' ? 'The customer rejected these recommendations. They are marked below and cannot be selected again. Choose different available products to send a revised diagnosis.' : `Add recommendations using products available at ${selected.branchName}. The customer will receive a notification when you submit.`}</p>
          <div className="mb-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <label htmlFor="diagnosis-product-search" className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>Branch products</label>
              <span className="text-xs" style={{ color: 'var(--text-4)' }}>{selectedProductIds.length} selected · Page {productPage} of {productTotalPages}</span>
            </div>
            <div className="flex gap-2 mb-3" role="group" aria-label="Filter products by branch availability">
              {([{ value: 'available', label: 'Available' }, { value: 'outOfStock', label: 'Out of stock' }] as const).map(option => <button key={option.value} type="button" aria-pressed={productStockFilter === option.value} className={`btn btn-sm ${productStockFilter === option.value ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setProductStockFilter(option.value); setProductPage(1); if (selected) void loadProducts(selected, 1, productSearch, option.value); }}>{option.label}</button>)}
            </div>
            <form className="flex gap-2 mb-2" onSubmit={event => { event.preventDefault(); if (selected) void loadProducts(selected, 1, productSearch, productStockFilter); }}>
              <input id="diagnosis-product-search" className="inp w-full" type="search" value={productSearch} onChange={event => setProductSearch(event.target.value)} placeholder="Search all products…" aria-label="Search products" />
              <button className="btn btn-secondary btn-sm" disabled={loadingProducts}>Search</button>
            </form>
            {loadingProducts ? <p className="card text-sm" style={{ color: 'var(--text-3)' }}>Loading products…</p> : branchProducts.length === 0 ? <p className="card text-sm" style={{ color: 'var(--text-3)' }}>No products match your search.</p> : <>
              <div className="max-h-64 overflow-y-auto rounded-xl border divide-y" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
                {filteredProducts.map(item => {
                  const selectedProduct = selectedProductIds.includes(item.productId);
                  const alreadyAdded = drafts.some(draft => draft.productId === item.productId);
                  const customerSelected = customerSelectedProductIds.has(item.productId);
                  const customerRejected = rejectedProductIds.has(item.productId);
                  return <div key={item.productId} className="flex items-center gap-3 px-3 py-2.5" style={{ opacity: alreadyAdded || customerSelected || customerRejected ? 0.6 : 1 }}>
                    <input type="checkbox" checked={selectedProduct} disabled={alreadyAdded || customerSelected || customerRejected || item.quantity <= 0} onChange={() => setSelectedProductIds(current => selectedProduct ? current.filter(id => id !== item.productId) : [...current, item.productId])} aria-label={`Select ${item.name}`} />
                    <span className="flex-1 min-w-0"><span className="block truncate text-sm font-medium" style={{ color: 'var(--text)' }}>{item.name}{customerRejected ? ' · Rejected by customer' : customerSelected ? ' · Accepted by customer' : alreadyAdded ? ' · Added' : ''}</span><span className="block text-xs font-mono" style={{ color: 'var(--text-3)' }}>EGP {item.price} · {item.quantity > 0 ? `${item.quantity} in stock` : 'Out of stock'}</span></span>
                    {selectedProduct && <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-3)' }}><span className="hidden sm:inline">Severity</span><select className="inp" value={productSeverities[item.productId] ?? 'normal'} onChange={event => setProductSeverities(current => ({ ...current, [item.productId]: event.target.value as DiagnosisDraft['severity'] }))}><option value="normal">Normal</option><option value="warning">Warning</option><option value="critical">Critical</option></select></label>}
                  </div>;
                })}
              </div>
              <div className="flex items-center justify-between gap-2 mt-2"><span className="text-xs" style={{ color: 'var(--text-4)' }}>25 products per page · {productStockFilter === 'available' ? 'available items can be selected' : 'out-of-stock items are view only'}</span><div className="flex gap-2"><button type="button" className="btn btn-secondary btn-sm" disabled={loadingProducts || productPage <= 1} onClick={() => selected && void loadProducts(selected, productPage - 1, productSearch, productStockFilter)}>Previous</button><button type="button" className="btn btn-secondary btn-sm" disabled={loadingProducts || productPage >= productTotalPages} onClick={() => selected && void loadProducts(selected, productPage + 1, productSearch, productStockFilter)}>Next</button></div></div>
            </>}
            <p className="text-xs mt-2" style={{ color: 'var(--text-4)' }}>Each selected product becomes its own service line with its own severity.</p>
          </div>
          <label className="block text-xs mb-3" style={{ color: 'var(--text-3)' }}>Recommendation<textarea className="inp mt-1 w-full" rows={2} value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe the issue or recommended work" /></label>
          <button type="button" className="btn btn-secondary btn-sm" disabled={selectedProductIds.length === 0 || !description.trim()} onClick={addDiagnosisItems}>Add selected products</button>
          {drafts.length > 0 && <div className="space-y-2 mt-4">{drafts.map(item => { const product = branchProducts.find(row => row.productId === item.productId); return <div key={item.localId} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}><div className="flex-1"><div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{product?.name} · EGP {product?.price}</div><div className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>{item.description}</div><div className="text-xs mt-1 capitalize" style={{ color: 'var(--text-3)' }}>{item.severity}</div></div><button className="btn btn-ghost btn-sm" aria-label="Remove recommendation" onClick={() => setDrafts(current => current.filter(draft => draft.localId !== item.localId))}>Remove</button></div>; })}</div>}
          <button className="btn btn-primary w-full mt-4" disabled={busy || drafts.length === 0} onClick={() => void submitDiagnosis()}>{busy ? 'Submitting…' : 'Submit diagnosis & notify customer'}</button>
        </>}

        {awaitingCustomer && <div className="rounded-xl p-4" style={{ background: 'var(--primary-light)' }}><h2 className="font-bold" style={{ color: 'var(--text)' }}>Waiting for customer decision</h2><p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Your diagnosis has been sent. The customer can accept or reject each recommendation from their notification.</p></div>}

        {approvedStage && <><h2 className="font-bold mb-2" style={{ color: 'var(--text)' }}>Customer decisions received</h2><p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>{approvedServices.length} accepted item(s) are ready for work{rejectedServices.length ? `; ${rejectedServices.length} rejected item(s) are excluded` : ''}. Start work to mark accepted items complete.</p><button className="btn btn-primary" disabled={busy || approvedServices.length === 0} onClick={() => void startWork()}>{busy ? 'Starting…' : 'Start accepted work'}</button></>}

        {workStage && <><div className="flex items-start justify-between gap-3 mb-4"><div><h2 className="font-bold" style={{ color: 'var(--text)' }}>Work in progress</h2><p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Mark each approved service complete and enter the vehicle’s final odometer reading.</p></div><span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>{completedServiceIds.length}/{approvedServices.length} services complete</span></div>
          <div className="space-y-2 mb-4">{approvedServices.map(item => { const done = completedServiceIds.includes(item.serviceId); return <button key={item.serviceId} type="button" onClick={() => setCompletedServiceIds(current => done ? current.filter(id => id !== item.serviceId) : [...current, item.serviceId])} className="w-full flex items-center gap-3 p-3 rounded-xl text-left" style={{ background: done ? 'var(--s-completed-bg)' : 'var(--surface-2)', border: `1px solid ${done ? 'var(--s-completed)' : 'var(--border)'}` }}><span className="w-5 h-5 rounded border-2 flex items-center justify-center" style={{ background: done ? 'var(--s-completed)' : 'transparent', borderColor: done ? 'var(--s-completed)' : 'var(--border)' }}>{done && <Icon name="check" size={14} />}</span><span className="flex-1 text-sm" style={{ color: 'var(--text)' }}>{item.product?.name ?? item.description}</span><span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>EGP {item.product?.price ?? 0}</span></button>; })}</div>
          <div className="grid sm:grid-cols-2 gap-3 mb-3"><label className="text-xs" style={{ color: 'var(--text-3)' }}>Final odometer (km)<input className="inp mt-1" type="number" min="0" step="1" value={finalKm} onChange={event => setFinalKm(event.target.value)} /></label><label className="text-xs" style={{ color: 'var(--text-3)' }}>Completion notes (optional)<input className="inp mt-1" value={completionNotes} onChange={event => setCompletionNotes(event.target.value)} /></label></div>
          <button className="btn btn-primary w-full" disabled={busy || !finalKm || completedServiceIds.length !== approvedServices.length} onClick={() => void completeJob()}>{busy ? 'Completing…' : 'Complete visit'}</button>
        </>}

        {completedStage && <div className="rounded-xl p-4" style={{ background: 'var(--s-completed-bg)', color: 'var(--s-completed)' }}><h2 className="font-bold">Visit closed</h2><p className="text-sm mt-1">This visit is {selected.status.toLowerCase()} and is read-only.</p></div>}
        {!diagnosisStage && !awaitingCustomer && !approvedStage && !workStage && !completedStage && <div className="card text-sm" style={{ color: 'var(--text-3)' }}>This visit is not in an employee action state.</div>}
      </section>
    </div>}
  </div>;

  const listVisits = isHistory ? historyVisits : visits;
  const sortedVisits = [...listVisits].sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
  return <div className="page-in p-4 sm:p-6 max-w-6xl mx-auto">
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5"><div><h1 className="font-bold text-2xl" style={{ color: 'var(--text)' }}>{isHistory ? 'Visit history' : 'Open visits'}</h1><p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>{isHistory ? 'Completed visits assigned to you.' : 'Unassigned visits for your branch and active visits assigned to you.'}</p></div><button className="btn btn-secondary btn-sm" onClick={() => void refreshVisits()} disabled={loading}>Refresh visits</button></div>
    {listError && <div className="card mb-4 text-sm" role="alert" style={{ color: 'var(--sos)' }}>{listError}</div>}
    {loading ? <div className="card text-sm" style={{ color: 'var(--text-3)' }}>Loading visits…</div>
      : sortedVisits.length === 0 ? <div className="card"><EmptyState icon="" title={isHistory ? 'No completed visits yet' : 'No open visits in your queue'} desc={isHistory ? 'Completed visits assigned to you will appear here.' : 'New unassigned branch visits and active visits assigned to you will appear here.'} /></div>
      : <div className="grid md:grid-cols-2 gap-3">{sortedVisits.map(visit => <button key={visit.visitId} type="button" onClick={() => openVisitFromList(visit.visitId)} className="card card-hover text-left" disabled={loadingDetail}>
        <div className="flex items-start gap-3"><span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}><Icon name="car" size={21} /></span><span className="flex-1 min-w-0"><span className="flex items-center justify-between gap-2"><span className="font-bold text-sm truncate" style={{ color: 'var(--text)' }}>{visit.bookingReference}</span><VisitStatusBadge status={visit.status} /></span><span className="block text-sm mt-2" style={{ color: 'var(--text)' }}>{visit.carCompany} {visit.carModel}</span><span className="block text-xs mt-1 font-mono" style={{ color: 'var(--text-3)' }}>{visit.carLicencePlate} · {visit.serviceDate}</span><span className="block text-xs mt-1" style={{ color: 'var(--text-3)' }}>{visit.branchName} · {visit.serviceCount} services{!visit.employeeId ? ' · Unassigned' : ''}</span></span><Icon name="info" size={17} /></div>
      </button>)}</div>}
  </div>;
}
