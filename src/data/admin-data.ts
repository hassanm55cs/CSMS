// Admin mock data — replace with the reports / fleet / staff endpoints.
export const REVENUE_DATA = [
  { month: 'Mar', rentals: 18400, services: 12200, emergency: 3100 },
  { month: 'Apr', rentals: 21000, services: 14800, emergency: 2800 },
  { month: 'May', rentals: 19800, services: 13500, emergency: 4200 },
  { month: 'Jun', rentals: 24200, services: 16100, emergency: 3500 },
  { month: 'Jul', rentals: 28900, services: 18400, emergency: 5100 },
  { month: 'Aug', rentals: 31200, services: 19800, emergency: 4700 },
  { month: 'Sep', rentals: 26800, services: 17200, emergency: 3900 },
];

export const FLEET_UTIL = [
  { name: 'Available', value: 42, color: '#16A34A' },
  { name: 'Rented',    value: 31, color: '#2563EB' },
  { name: 'Maintenance', value: 8, color: '#DC2626' },
  { name: 'Reserved',  value: 19, color: '#D97706' },
];

export const BRANCH_PERF = [
  { name: 'Downtown', services: 142, rentals: 87 },
  { name: 'Heliopolis', services: 98, rentals: 124 },
  { name: 'Oct 6', services: 167, rentals: 54 },
];

export const ADMIN_STAFF = [
  { id: 1, name: 'David Chen',    role: 'Mechanic',        branch: 'Downtown Cairo Hub',   status: 'active',   joined: '2023-03-15', phone: '+20 100 555 1001' },
  { id: 2, name: 'Elena Vasquez', role: 'Service Advisor', branch: 'Heliopolis Center',    status: 'active',   joined: '2022-11-01', phone: '+20 100 555 1002' },
  { id: 3, name: 'Priya Sharma',  role: 'Manager',         branch: 'Downtown Cairo Hub',   status: 'active',   joined: '2021-06-10', phone: '+20 100 555 1004' },
];

export const ADMIN_FLEET = [
  { id: 1, plate: 'TRK-001', brand: 'Ford',   model: 'Transit',  type: 'Tow Truck', status: 'available', driver: 'Marcus Johnson', km: 89200 },
  { id: 2, plate: 'TRK-002', brand: 'Chevy',  model: 'Silverado',type: 'Service Van', status: 'on-duty', driver: 'Elena Vasquez', km: 54100 },
  { id: 3, plate: 'TRK-003', brand: 'Ram',    model: '1500',     type: 'Pickup',    status: 'maintenance', driver: '—', km: 112000 },
];
