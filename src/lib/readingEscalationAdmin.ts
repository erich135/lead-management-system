import type { Customer, ReadingEscalationAdminCodeOption, ReadingEscalationAdminCodeRef } from './api.ts';

export const DEFAULT_READING_ADMIN_EXPORT_FILTER = 'all_active' as const;

export const READING_ADMIN_EXPORT_FILTERS: Array<{
  value: 'all_active' | 'missing_code' | 'non_rental_machines' | 'reminder_enabled_non_rental';
  label: string;
}> = [
  { value: 'all_active', label: 'All active customers' },
  { value: 'missing_code', label: 'Customers missing an Admin Code' },
  { value: 'non_rental_machines', label: 'Customers with non-rental machines' },
  { value: 'reminder_enabled_non_rental', label: 'Customers with reminder-enabled non-rental machines' },
];

export const READING_ADMIN_CLEAR = 'CLEAR';

export function assignedAdminCodeId(
  value: Customer['readingEscalationAdminCodeId'],
): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value;
  return value._id || null;
}

export function readingEscalationAdminCodeLabel(
  value: Customer['readingEscalationAdminCodeId'],
  options: ReadingEscalationAdminCodeOption[] = [],
): string {
  const id = assignedAdminCodeId(value);
  if (!id) return 'Not assigned';
  const listed = options.find((option) => option.adminCodeId === id);
  if (listed) return listed.label;
  if (typeof value === 'object' && value) {
    const ref = value as ReadingEscalationAdminCodeRef;
    const linked = ref.user
      ? `${ref.user.firstName || ''} ${ref.user.lastName || ''}`.trim() || 'No linked user'
      : 'No linked user';
    return `${ref.code || id} — ${ref.description || '—'} — ${linked}`;
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
