import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Role } from '../../types';
import { ROUTES, isActivePath } from '../../routes/paths';
import { useT } from '../../i18n/useT';
import { Icon } from '../ui/Icon';
import { getTokenDisplayName } from '../../utils/userDisplayName';

type Link = { path: string; label: string; icon: 'home' | 'wrench' | 'car' | 'driver' | 'alert' | 'user' | 'calendar' | 'sparkles' | 'info' | 'history' };
export function SlidingSidebar({ role, open, onClose, showRentals = false, displayName }: { role: Role; open: boolean; onClose: () => void; showRentals?: boolean; displayName?: string }) {
  const navigate = useNavigate(); const { pathname } = useLocation(); const t = useT();
  useEffect(() => {
    if (!open || window.matchMedia('(min-width: 768px)').matches) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKeyDown); };
  }, [open, onClose]);
  const links: Link[] = role === 'customer' ? [
    { path: ROUTES.customer.dashboard, label: t.dashboard, icon: 'home' },
    { path: ROUTES.customer.bookService, label: t.bookService, icon: 'wrench' },
    { path: ROUTES.customer.visits, label: t.visits, icon: 'info' },
    ...(showRentals ? [{ path: ROUTES.customer.rentals, label: t.rentACar, icon: 'car' as const }] : []),
    { path: ROUTES.customer.sos, label: t.sos, icon: 'alert' },
    { path: ROUTES.customer.profile, label: t.profile, icon: 'user' },
  ] : role === 'employee' ? [
    { path: ROUTES.employee.dashboard, label: 'My Dashboard', icon: 'home' },
    { path: ROUTES.employee.visits, label: 'Open visits', icon: 'wrench' },
    { path: ROUTES.employee.history, label: 'Visit history', icon: 'history' },
  ] : role === 'driver' ? [
    { path: ROUTES.driver.dashboard, label: 'Driver Dispatch', icon: 'driver' },
  ] : [
    { path: ROUTES.admin.dashboard, label: 'Dashboard', icon: 'home' },
    { path: ROUTES.admin.branches, label: 'Branches', icon: 'info' },
    { path: ROUTES.admin.fleet, label: 'Fleet', icon: 'car' },
    { path: ROUTES.admin.staff, label: 'Employees', icon: 'user' },
    { path: ROUTES.admin.drivers, label: 'Drivers', icon: 'driver' },
    { path: ROUTES.admin.products, label: 'Products', icon: 'sparkles' },
    { path: ROUTES.admin.inventory, label: 'Inventory', icon: 'info' },
    { path: ROUTES.admin.schedules, label: 'Service Schedules', icon: 'calendar' },
    { path: ROUTES.admin.emergencies, label: 'Emergencies', icon: 'alert' },
    { path: ROUTES.admin.records, label: 'Record Lookup', icon: 'car' },
    { path: ROUTES.admin.reports, label: 'Reports', icon: 'sparkles' },
  ];
  const title = displayName?.trim() || getTokenDisplayName() || t.appName;
  return <div className={'sliding-sidebar-layer' + (open ? ' open' : '')} role="presentation">
    {open && <button className="sliding-sidebar-backdrop" aria-label="Close navigation" onClick={onClose} />}
    <aside className="sliding-sidebar" aria-label="Navigation menu" data-open={open}>
      <div className="sliding-sidebar-header">
        {open && <span className="font-bold sliding-sidebar-title">{title}</span>}
      </div>
      <nav className="sliding-sidebar-links">{links.map(link => <button key={link.path} onClick={() => { navigate(link.path); if (window.matchMedia('(max-width: 767px)').matches) onClose(); }} className={'sliding-sidebar-link' + (isActivePath(pathname, link.path) ? ' active' : '')} aria-label={link.label} title={!open ? link.label : undefined} aria-current={isActivePath(pathname, link.path) ? 'page' : undefined}><Icon name={link.icon} size={19} />{open && <span>{link.label}</span>}</button>)}</nav>
    </aside>
  </div>;
}
