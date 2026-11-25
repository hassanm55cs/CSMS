// ─────────────────────────────────────────────────────────────────────────────
// CSMS Mock Data
// Each export mirrors the DTO shape from the ASP.NET Core Web API.
// To connect to a real backend, replace each constant with a fetch/axios call
// to the corresponding endpoint shown in the comment above it.
// Base URL: import.meta.env.VITE_API_URL (set in .env)
// Auth: all protected routes send  Authorization: Bearer <jwt>
// ─────────────────────────────────────────────────────────────────────────────

// API: GET /api/v1/auth/me
export const MOCK_USER = {
  id: 1,
  name: 'Ahmed Hassan',
  nameAr: 'أحمد حسن',
  email: 'ahmed.hassan@example.com',
  phone: '+20 100 123 4567',
  avatar: null as string | null,
  joinedAt: '2024-01-15',
  notifyEmail: true,
  notifySms: true,
  notifyPush: false,
};

// API: GET /api/v1/cars?userId=me
export const MOCK_MY_CARS = [
  { id: 1, brand: 'Toyota', model: 'Camry',  year: 2022, plate: 'أ ب ج 1234', color: 'Pearl White', fuel: 'Gasoline', km: 42800, img: 'photo-1621007947382-bb3c3994e3fb' },
  { id: 2, brand: 'Honda',  model: 'CR-V',   year: 2023, plate: 'د هـ و 5678', color: 'Midnight Blue', fuel: 'Hybrid',   km: 18200, img: 'photo-1609521263047-f8f205293f24' },
];

// API: GET /api/v1/services/types
export const SERVICE_TYPES = [
  { id: 1, name: 'Oil Change',         nameAr: 'تغيير الزيت',         icon: '🛢️', price: 350,  durationMin: 45  },
  { id: 2, name: 'Tire Rotation',      nameAr: 'تدوير الإطارات',      icon: '🔄', price: 200,  durationMin: 30  },
  { id: 3, name: 'Brake Service',      nameAr: 'صيانة الفرامل',       icon: '🔧', price: 900,  durationMin: 120 },
  { id: 4, name: 'AC Service',         nameAr: 'صيانة التكييف',       icon: '❄️', price: 600,  durationMin: 90  },
  { id: 5, name: 'Full Inspection',    nameAr: 'فحص شامل',            icon: '🔍', price: 500,  durationMin: 60  },
  { id: 6, name: 'Battery Check',      nameAr: 'فحص البطارية',        icon: '⚡', price: 150,  durationMin: 20  },
  { id: 7, name: 'Wheel Alignment',    nameAr: 'ضبط الزوايا',         icon: '🎯', price: 300,  durationMin: 45  },
  { id: 8, name: 'Engine Diagnostic',  nameAr: 'تشخيص المحرك',        icon: '💻', price: 400,  durationMin: 60  },
];

// API: GET /api/v1/branches
export const BRANCHES = [
  { id: 1, name: 'Downtown Cairo Hub',    nameAr: 'فرع وسط القاهرة',      address: '12 Tahrir Sq, Cairo',            phone: '+20 2 555 0101', hours: 'Sat–Thu 8:00–20:00', rating: 4.8, manager: 'Priya Sharma',  staff: 12 },
  { id: 2, name: 'Heliopolis Center',     nameAr: 'فرع مصر الجديدة',      address: '45 Roxy St, Heliopolis',         phone: '+20 2 555 0202', hours: 'Sat–Thu 8:00–21:00', rating: 4.6, manager: 'Elena Vasquez', staff: 9  },
  { id: 3, name: '6th of October Branch', nameAr: 'فرع السادس من أكتوبر', address: 'Central Services Zone, 6th Oct', phone: '+20 2 555 0303', hours: 'Sat–Thu 9:00–19:00', rating: 4.7, manager: 'Hassan Nour',   staff: 7  },
];

// API: GET /api/v1/bookings?userId=me&status=upcoming
export const MOCK_UPCOMING_BOOKINGS = [
  { id: 'BK-2094', carId: 1, car: 'Toyota Camry', plate: 'أ ب ج 1234', serviceType: 'Oil Change', branch: 'Downtown Cairo Hub', date: '2026-09-30', time: '10:00', status: 'confirmed', estimatedCost: 350 },
];

// API: GET /api/v1/bookings?userId=me&status=all
export const MOCK_BOOKING_HISTORY = [
  { id: 'BK-2094', car: 'Toyota Camry',  serviceType: 'Oil Change',        branch: 'Downtown Cairo Hub', date: '2026-09-30', time: '10:00', status: 'confirmed',   cost: 350 },
  { id: 'BK-1987', car: 'Honda CR-V',    serviceType: 'Full Inspection',   branch: 'Heliopolis Center',  date: '2026-09-10', time: '09:00', status: 'completed',   cost: 500 },
  { id: 'BK-1842', car: 'Toyota Camry',  serviceType: 'Brake Service',     branch: 'Downtown Cairo Hub', date: '2026-08-21', time: '11:30', status: 'completed',   cost: 900 },
  { id: 'BK-1710', car: 'Honda CR-V',    serviceType: 'Tire Rotation',     branch: '6th of October Branch', date: '2026-07-15', time: '14:00', status: 'cancelled', cost: 0   },
  { id: 'BK-1605', car: 'Toyota Camry',  serviceType: 'AC Service',        branch: 'Heliopolis Center',  date: '2026-06-03', time: '10:00', status: 'completed',   cost: 600 },
];

// API: GET /api/v1/rental-cars?available=true
export const RENTAL_FLEET = [
  { id: 1, brand: 'BMW',      model: '5 Series',  category: 'Sedan',   priceDay: 1200, seats: 5, transmission: 'Auto',   fuel: 'Gasoline', km: 12400, available: true,  img: 'photo-1555215695-3004980ad54e',  features: ['GPS', 'Bluetooth', 'Heated Seats'] },
  { id: 2, brand: 'Mercedes', model: 'GLC 300',   category: 'SUV',     priceDay: 1600, seats: 5, transmission: 'Auto',   fuel: 'Gasoline', km: 8200,  available: true,  img: 'photo-1618843479313-40f8afb4b4d8', features: ['GPS', 'Sunroof', 'Leather'] },
  { id: 3, brand: 'Tesla',    model: 'Model 3',   category: 'Electric',priceDay: 1400, seats: 5, transmission: 'Auto',   fuel: 'Electric', km: 6100,  available: false, img: 'photo-1560958089-b8a1929cea89',  features: ['Autopilot', 'Supercharger', 'App Control'] },
  { id: 4, brand: 'Audi',     model: 'Q5',        category: 'SUV',     priceDay: 1500, seats: 5, transmission: 'Auto',   fuel: 'Diesel',   km: 22000, available: true,  img: 'photo-1606664515524-ed2f786a0bd6', features: ['GPS', 'Panoramic Roof', 'AWD'] },
  { id: 5, brand: 'Hyundai',  model: 'Tucson',    category: 'SUV',     priceDay: 650,  seats: 5, transmission: 'Auto',   fuel: 'Gasoline', km: 31000, available: true,  img: 'photo-1533473359331-0135ef1b58bf', features: ['GPS', 'Lane Assist'] },
  { id: 6, brand: 'Toyota',   model: 'Corolla',   category: 'Sedan',   priceDay: 450,  seats: 5, transmission: 'Manual', fuel: 'Gasoline', km: 55000, available: true,  img: 'photo-1621007947382-bb3c3994e3fb', features: ['Bluetooth', 'Backup Camera'] },
  { id: 7, brand: 'Kia',      model: 'Sportage',  category: 'SUV',     priceDay: 700,  seats: 5, transmission: 'Auto',   fuel: 'Gasoline', km: 18700, available: true,  img: 'photo-1609521263047-f8f205293f24', features: ['GPS', 'Sunroof'] },
  { id: 8, brand: 'Ford',     model: 'Explorer',  category: 'SUV',     priceDay: 950,  seats: 7, transmission: 'Auto',   fuel: 'Gasoline', km: 29000, available: true,  img: 'photo-1544636331-e26879cd4d9b', features: ['3rd Row', 'GPS', 'Towing'] },
];

// API: GET /api/v1/rentals?userId=me
export const MOCK_MY_RENTALS = [
  { id: 'RNT-301', car: 'BMW 5 Series',   from: '2026-09-01', to: '2026-09-05', days: 4, total: 4800,  status: 'completed' },
  { id: 'RNT-289', car: 'Audi Q5',        from: '2026-09-15', to: '2026-09-18', days: 3, total: 4500,  status: 'active'    },
  { id: 'RNT-274', car: 'Toyota Corolla', from: '2026-10-02', to: '2026-10-05', days: 3, total: 1350,  status: 'upcoming'  },
];

// API: GET /api/v1/sos/problem-types
export const SOS_PROBLEM_TYPES = [
  { id: 'breakdown',  label: 'Breakdown',   labelAr: 'عطل مفاجئ',    icon: '🔧', desc: 'Car won\'t start or stalled' },
  { id: 'flat-tire',  label: 'Flat Tire',   labelAr: 'إطار مثقوب',   icon: '🚗', desc: 'Puncture or blowout'         },
  { id: 'accident',   label: 'Accident',    labelAr: 'حادث',          icon: '💥', desc: 'Minor collision'              },
  { id: 'fuel',       label: 'Out of Fuel', labelAr: 'نفاد الوقود',   icon: '⛽', desc: 'Need emergency fuel'          },
  { id: 'locked-out', label: 'Locked Out',  labelAr: 'مفتاح داخل',   icon: '🔑', desc: 'Keys locked inside'           },
  { id: 'towing',     label: 'Need Towing', labelAr: 'سحب السيارة',   icon: '🚛', desc: 'Car needs to be towed'        },
];

export type BookingStatus = 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
export type RentalStatus  = 'upcoming' | 'active' | 'completed';
export type SosStatus     = 'requested' | 'assigned' | 'on-the-way' | 'arrived';
export type VisitStatus   =
  | 'requested'
  | 'diagnosis-pending'
  | 'pending-customer-confirmation'
  | 'pending-fix'
  | 'in-progress'
  | 'completed';
export type Severity = 'critical' | 'warning' | 'normal';

export interface DiagnosisItem {
  id: number;
  description: string;
  severity: Severity;
  estimatedCost: number;
  selectedByCustomer: boolean;
}

export interface Visit {
  id: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  car: {
    brand: string; model: string; year: number;
    plate: string; km: number; color: string;
    fuel: string; engine: string; img: string;
  };
  requestedService: string;
  requestedAt: string;
  scheduledAt: string;
  branch: string;
  status: VisitStatus;
  customerNotes: string;
  mechanicNotes: string;
  diagnosis: DiagnosisItem[];
  checklist: { task: string; done: boolean }[];
}

// API: GET /api/v1/visits?branchId=1&assignedTo=me
export const MOCK_VISITS: Visit[] = [
  {
    id: 'VST-3041',
    customerId: 1,
    customerName: 'Ahmed Hassan',
    customerPhone: '+20 100 123 4567',
    car: { brand: 'Toyota', model: 'Camry', year: 2022, plate: 'أ ب ج 1234', km: 42800, color: 'Pearl White', fuel: 'Gasoline', engine: '2.5L 4-cyl', img: 'photo-1621007947382-bb3c3994e3fb' },
    requestedService: 'Engine check + Oil change',
    requestedAt: '2026-09-28T08:30:00',
    scheduledAt: '2026-09-30T10:00:00',
    branch: 'Downtown Cairo Hub',
    status: 'requested',
    customerNotes: 'Car makes a knocking sound when accelerating, also due for oil change.',
    mechanicNotes: '',
    diagnosis: [],
    checklist: [],
  },
  {
    id: 'VST-3040',
    customerId: 2,
    customerName: 'Sara Mostafa',
    customerPhone: '+20 100 987 6543',
    car: { brand: 'Honda', model: 'CR-V', year: 2023, plate: 'د هـ و 5678', km: 18200, color: 'Midnight Blue', fuel: 'Hybrid', engine: '1.5L Turbo', img: 'photo-1609521263047-f8f205293f24' },
    requestedService: 'AC not cooling',
    requestedAt: '2026-09-27T14:00:00',
    scheduledAt: '2026-09-30T11:30:00',
    branch: 'Downtown Cairo Hub',
    status: 'requested',
    customerNotes: 'AC blows warm air. Checked refrigerant last month.',
    mechanicNotes: '',
    diagnosis: [],
    checklist: [],
  },
  {
    id: 'VST-3038',
    customerId: 3,
    customerName: 'Karim Adel',
    customerPhone: '+20 100 555 2200',
    car: { brand: 'Volkswagen', model: 'Passat', year: 2020, plate: 'MKT-9901', km: 67400, color: 'Graphite', fuel: 'Gasoline', engine: '2.0L TSI', img: 'photo-1541899481282-d53bffe3c35d' },
    requestedService: 'Brake noise + Full inspection',
    requestedAt: '2026-09-26T09:00:00',
    scheduledAt: '2026-09-29T09:00:00',
    branch: 'Downtown Cairo Hub',
    status: 'pending-customer-confirmation',
    customerNotes: 'Squealing sound from front brakes. Also check everything.',
    mechanicNotes: 'Inspected front and rear braking system and suspension.',
    diagnosis: [
      { id: 1, description: 'Front brake pads worn to 2mm — immediate replacement needed', severity: 'critical', estimatedCost: 480, selectedByCustomer: false },
      { id: 2, description: 'Rear brake rotors show grooves and heat spots', severity: 'warning', estimatedCost: 320, selectedByCustomer: false },
      { id: 3, description: 'Engine air filter clogged — replace recommended', severity: 'normal', estimatedCost: 120, selectedByCustomer: false },
      { id: 4, description: 'Brake fluid level low — top up required', severity: 'warning', estimatedCost: 60, selectedByCustomer: false },
    ],
    checklist: [],
  },
  {
    id: 'VST-3035',
    customerId: 4,
    customerName: 'Nour Khaled',
    customerPhone: '+20 100 333 7890',
    car: { brand: 'Kia', model: 'Sportage', year: 2021, plate: 'RNB-4421', km: 51000, color: 'Silver', fuel: 'Gasoline', engine: '2.0L GDI', img: 'photo-1533473359331-0135ef1b58bf' },
    requestedService: 'Routine service 50k',
    requestedAt: '2026-09-25T10:00:00',
    scheduledAt: '2026-09-28T14:00:00',
    branch: 'Downtown Cairo Hub',
    status: 'pending-fix',
    customerNotes: '50,000 km full service.',
    mechanicNotes: 'Completed full inspection. Customer approved 3 of 4 items.',
    diagnosis: [
      { id: 1, description: 'Oil and filter change — overdue by 3,000 km', severity: 'critical', estimatedCost: 350, selectedByCustomer: true },
      { id: 2, description: 'Spark plugs worn — replace set of 4', severity: 'warning', estimatedCost: 280, selectedByCustomer: true },
      { id: 3, description: 'Cabin air filter blocked', severity: 'normal', estimatedCost: 90, selectedByCustomer: true },
      { id: 4, description: 'Windshield wiper blades — minor streaking', severity: 'normal', estimatedCost: 80, selectedByCustomer: false },
    ],
    checklist: [
      { task: 'Oil & filter drain and refill', done: false },
      { task: 'Replace spark plugs (×4)', done: false },
      { task: 'Replace cabin air filter', done: false },
    ],
  },
];
