export type Role = 'customer' | 'employee' | 'admin' | 'driver';
export type Lang = 'en' | 'ar';
export type ToastType = 'success' | 'error' | 'info';
export type PaletteId = 'slate-cobalt' | 'british-racing' | 'graphite-amber' | 'nordic-teal' | 'monochrome-crimson';

/** Passed from the rental checkout page to the confirmation page via router state */
export interface RentalConfirmation {
  from: string; to: string; days: number; total: number; bookingRef: string;
}
