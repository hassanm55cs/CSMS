// API: GET /api/v1/employees/me
export const MECHANIC = {
  name: 'David Chen', role: 'Senior Mechanic', employeeId: 'EMP-0041',
  branch: 'Downtown Cairo Hub', joined: '2023-03-15', phone: '+20 100 555 1001',
  email: 'david.chen@csms.com', salary: 4800, bonus: 320, nextPay: '2026-09-30',
  hoursThisMonth: 148, carsServiced: 34, avgRating: 4.9,
  specializations: ['Engine', 'Brakes', 'AC', 'Electrical'],
  payHistory: [
    { month: 'Jun', gross: 4800, bonus: 0, net: 3984 },
    { month: 'Jul', gross: 4800, bonus: 150, net: 4109 },
    { month: 'Aug', gross: 4800, bonus: 480, net: 4382 },
    { month: 'Sep', gross: 4800, bonus: 320, net: 4261 },
  ],
};
