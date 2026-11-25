import type { Role } from '../types';

/**
 * Single source of truth for every URL in the app.
 * Always navigate with these constants — never hard-code path strings in components.
 */
export const ROUTES = {
  login: '/login',

  customer: {
    root:       '/customer',
    dashboard:  '/customer',
    bookService:'/customer/book-service',
    rentals:    '/customer/rentals',
    sos:        '/customer/sos',
    profile:    '/customer/profile',
  },

  employee: {
    root:      '/employee',
    dashboard: '/employee',
    visits:    '/employee/visits',
  },

  admin: {
    root:      '/admin',
    dashboard: '/admin',
    branches:  '/admin/branches',
    fleet:     '/admin/fleet',
    staff:     '/admin/staff',
    reports:   '/admin/reports',
  },
} as const;

/** Rental flow — nested under /customer/rentals */
export const rentalPaths = {
  detail:    (carId: number | string) => `${ROUTES.customer.rentals}/${carId}`,
  checkout:  (carId: number | string) => `${ROUTES.customer.rentals}/${carId}/checkout`,
  confirmed: (carId: number | string) => `${ROUTES.customer.rentals}/${carId}/confirmed`,
};

/** Where each role lands after login / when hitting "/" */
export function homePathForRole(role: Role): string {
  switch (role) {
    case 'customer': return ROUTES.customer.dashboard;
    case 'employee': return ROUTES.employee.dashboard;
    case 'admin':    return ROUTES.admin.dashboard;
  }
}

const ROOT_PATHS: string[] = [ROUTES.customer.root, ROUTES.employee.root, ROUTES.admin.root];

/**
 * Active-link check for nav items.
 * Section roots (/customer, /employee, /admin) match exactly;
 * everything else also matches its children (so /customer/rentals/3 highlights "Rentals").
 */
export function isActivePath(pathname: string, to: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (ROOT_PATHS.includes(to)) return p === to;
  return p === to || p.startsWith(to + '/');
}
