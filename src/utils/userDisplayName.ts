const nameClaimKeys = [
  'name',
  'fullName',
  'FullName',
  'unique_name',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
];
const emailClaimKeys = [
  'email',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
];

export function getTokenDisplayName(): string {
  try {
    const token = localStorage.getItem('csms.token');
    const encodedPayload = token?.split('.')[1];
    if (!encodedPayload) return '';
    const payload = JSON.parse(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/')));
    const name = nameClaimKeys.map(key => payload[key]).find(value => typeof value === 'string' && value.trim());
    if (name) return name.trim();

    const email = emailClaimKeys.map(key => payload[key]).find(value => typeof value === 'string' && value.includes('@'));
    if (!email) return '';
    return email.split('@')[0].split(/[._-]+/).filter(Boolean)
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  } catch {
    return '';
  }
}
