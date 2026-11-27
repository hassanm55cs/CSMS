import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import { CustomerLayout } from '../components/layout/CustomerLayout';
import { EmployeeLayout } from '../components/layout/EmployeeLayout';
import { AdminLayout } from '../components/layout/AdminLayout';
import { DriverLayout } from '../components/layout/DriverLayout';
import { PageFallback } from '../components/ui/PageFallback';
import { HomeRedirect, PublicOnlyRoute, RequireRole } from './guards';

// Pages are code-split — each one is downloaded the first time it is visited.
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));

const DashboardPage      = lazy(() => import('../pages/customer/DashboardPage'));
const ServiceBookingPage = lazy(() => import('../pages/customer/ServiceBookingPage'));
const CustomerVisitsPage = lazy(() => import('../pages/customer/CustomerVisitsPage'));
const CustomerNotificationsPage = lazy(() => import('../pages/customer/CustomerNotificationsPage'));
const SOSPage            = lazy(() => import('../pages/customer/SOSPage'));
const ProfilePage        = lazy(() => import('../pages/customer/ProfilePage'));
const RentalsListPage     = lazy(() => import('../pages/customer/rentals/RentalsListPage'));
const RentalDetailPage    = lazy(() => import('../pages/customer/rentals/RentalDetailPage'));
const RentalCheckoutPage  = lazy(() => import('../pages/customer/rentals/RentalCheckoutPage'));
const RentalConfirmedPage = lazy(() => import('../pages/customer/rentals/RentalConfirmedPage'));

const EmployeeDashboardPage = lazy(() => import('../pages/employee/EmployeeDashboardPage'));
const EmployeeVisitsPage    = lazy(() => import('../pages/employee/EmployeeVisitsPage'));

const DriverDashboardPage   = lazy(() => import('../pages/driver/DriverDashboardPage'));

const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'));
const AdminBranchesPage  = lazy(() => import('../pages/admin/AdminBranchesPage'));
const AdminFleetPage     = lazy(() => import('../pages/admin/AdminFleetPage'));
const AdminStaffPage     = lazy(() => import('../pages/admin/AdminStaffPage'));
const AdminDriversPage   = lazy(() => import('../pages/admin/AdminDriversPage'));
const AdminProductsPage  = lazy(() => import('../pages/admin/AdminProductsPage'));
const AdminInventoryPage = lazy(() => import('../pages/admin/AdminInventoryPage'));
const AdminSchedulesPage = lazy(() => import('../pages/admin/AdminSchedulesPage'));
const AdminEmergenciesPage = lazy(() => import('../pages/admin/AdminEmergenciesPage'));
  const AdminRecordsPage = lazy(() => import('../pages/admin/AdminRecordsPage'));
const AdminReportsPage   = lazy(() => import('../pages/admin/AdminReportsPage'));

export function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<SuspendedLogin />} />
      </Route>

      {/* Customer  →  /customer/... */}
      <Route element={<RequireRole role="customer" />}>
        <Route path="/customer" element={<CustomerLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="book-service" element={<ServiceBookingPage />} />
          <Route path="visits" element={<CustomerVisitsPage />} />
          <Route path="notifications" element={<CustomerNotificationsPage />} />
          <Route path="rentals">
            <Route index element={<RentalsListPage />} />
            <Route path=":carId" element={<RentalDetailPage />} />
            <Route path=":carId/checkout" element={<RentalCheckoutPage />} />
            <Route path=":carId/confirmed" element={<RentalConfirmedPage />} />
          </Route>
          <Route path="sos" element={<SOSPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* Employee  →  /employee/... */}
      <Route element={<RequireRole role="employee" />}>
        <Route path="/employee" element={<EmployeeLayout />}>
          <Route index element={<EmployeeDashboardPage />} />
          <Route path="visits" element={<EmployeeVisitsPage />} />
          <Route path="history" element={<EmployeeVisitsPage />} />
        </Route>
      </Route>

      {/* Driver  →  /driver/... */}
      <Route element={<RequireRole role="driver" />}>
        <Route path="/driver" element={<DriverLayout />}>
          <Route index element={<DriverDashboardPage />} />
        </Route>
      </Route>

      {/* Admin  →  /admin/... */}
      <Route element={<RequireRole role="admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="branches" element={<AdminBranchesPage />} />
          <Route path="fleet" element={<AdminFleetPage />} />
          <Route path="staff" element={<AdminStaffPage />} />
          <Route path="drivers" element={<AdminDriversPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="inventory" element={<AdminInventoryPage />} />
          <Route path="service-schedules" element={<AdminSchedulesPage />} />
          <Route path="emergencies" element={<AdminEmergenciesPage />} />
            <Route path="records" element={<AdminRecordsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
        </Route>
      </Route>

      {/* "/" and anything unknown */}
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

// The login page lives outside any layout, so it needs its own Suspense boundary.
function SuspendedLogin() {
  return (
    <Suspense fallback={<PageFallback />}>
      <LoginPage />
    </Suspense>
  );
}
