export type Role = 'customer' | 'employee' | 'admin';
export type Lang = 'en' | 'ar';
export type ToastType = 'success' | 'error' | 'info';

/** Passed from the rental checkout page to the confirmation page via router state */
export interface RentalConfirmation {
  from: string; to: string; days: number; total: number; bookingRef: string;
}
