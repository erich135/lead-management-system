import type { Customer, ReadingEscalationAdminOption, ReadingEscalationAdminRef } from './api.ts';

export const DEFAULT_READING_ADMIN_EXPORT_FILTER = 'reminder_enabled_non_rental' as const;

export const READING_ADMIN_EXPORT_FILTERS: Array<{
  value: typeof DEFAULT_READING_ADMIN_EXPORT_FILTER | 'all_active' | 'non_rental_machines' | 'missing_admin';
  label: string;
}> = [
  { value: 'reminder_enabled_non_rental', label: 'Customers with reminder-enabled non-rental machines' },
  { value: 'non_rental_machines', label: 'Customers with non-rental machines' },
  { value: 'missing_admin', label: 'Customers missing a Reading Escalation Admin' },
  { value: 'all_active', label: 'All active customers' },
];

export const READING_ADMIN_CLEAR = 'CLEAR';

export function assignedReadingAdminId(
  value: Customer['readingEscalationAdminUserId'],
): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value;
  return value._id || null;
}

export function readingEscalationAdminLabel(
  value: Customer['readingEscalationAdminUserId'],
  admins: ReadingEscalationAdminOption[] = [],
): string {
  const id = assignedReadingAdminId(value);
  if (!id) return 'Not assigned';
  const listed = admins.find((admin) => admin.userId === id);
  if (listed) return listed.label;
  if (typeof value === 'object' && value) {
    const ref = value as ReadingEscalationAdminRef;
    const name = `${ref.firstName || ''} ${ref.lastName || ''}`.trim() || 'Admin';
    const codes = (ref.adminCodes || [])
      .map((code) => (typeof code === 'string' ? code : code.code || ''))
      .filter(Boolean)
      .join(', ') || '—';
    return `${name} — ${ref.email || 'no email'} — ${codes}`;
  }
  return id;
}

export function customerUpdatePayload(customer: Customer) {
  return {
    name: customer.name,
    address: customer.address,
    phone: customer.phone,
    email: customer.email,
    defaultContactPerson: customer.defaultContactPerson,
    defaultWhatsAppNumber: customer.defaultWhatsAppNumber,
  };
}

export function downloadTextFile(filename: string, contents: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(anchor);
}
