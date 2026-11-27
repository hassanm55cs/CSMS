import { adminApi } from './adminApi';

type NotificationStatusSource = {
  visitId: number;
  confirmationPending?: boolean;
  ConfirmationPending?: boolean;
};

type VisitStatusResponse = { status?: string; Status?: string };

const isWaitingForConfirmation = (status = '') =>
  status.toLowerCase().replace(/[^a-z]/g, '') === 'pendingcustomerconfirmation';

/** Recheck waiting/unknown notifications against the visit record so badges survive reloads. */
export async function reconcileNotificationStatuses<T extends NotificationStatusSource>(items: T[]): Promise<T[]> {
  const visitIdsToCheck = [...new Set(items
    .filter(item => item.confirmationPending ?? item.ConfirmationPending ?? true)
    .map(item => item.visitId))];

  const statuses = new Map<number, boolean>();
  await Promise.all(visitIdsToCheck.map(async visitId => {
    try {
      const visit = await adminApi<VisitStatusResponse>(`/bookings/${visitId}`);
      statuses.set(visitId, isWaitingForConfirmation(visit.status ?? visit.Status ?? ''));
    } catch {
      // Keep the notification marked pending if its current visit state cannot be checked.
    }
  }));

  return items.map(item => statuses.has(item.visitId)
    ? { ...item, confirmationPending: statuses.get(item.visitId) }
    : item);
}
