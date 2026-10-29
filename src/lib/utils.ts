export function formatCentsToCurrency(cents: number): string {
  if (typeof cents !== 'number' || isNaN(cents)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return '***';
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const [localPart, domain] = parts;
  if (!localPart || !domain) return '***';
  
  const maskedLocal =
    localPart.length <= 2
      ? `${localPart[0] || '*'}***`
      : `${localPart[0]}***${localPart[localPart.length - 1]}`;
      
  return `${maskedLocal}@${domain}`;
}

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}

export function formatDateToReadable(isoString: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Invalid date';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
}

export function getDaysDiffFromToday(isoString: string): number {
  if (!isoString) return 0;
  const target = new Date(isoString);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function isInvoiceOverdue(invoice: { dueDate: string; status: string }): boolean {
  if (invoice.status === 'paid') return false;
  const daysDiff = getDaysDiffFromToday(invoice.dueDate);
  return daysDiff < 0;
}
