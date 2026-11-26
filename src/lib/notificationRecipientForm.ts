import type { NotificationRecipientRecord } from './api';

export type NotificationRecipientScope =
  | { group: 'global' }
  | { group: 'customer'; customerId: string };

export interface NotificationRecipientDraft {
  email: string;
  displayName: string;
  group: 'global' | 'customer';
  customerId: string;
  customerName: string;
  customerMissing: boolean;
  active: boolean;
  serviceDue: boolean;
  checklist: boolean;
  updatedAt: string | undefined;
}

export function notificationRecipientEditDraft(row: NotificationRecipientRecord): NotificationRecipientDraft {
  const enabled = (typeId: string) => row.subscriptions?.some((item) => item.typeId === typeId && item.enabled) ?? false;
  return {
    email: row.email,
    displayName: row.displayName,
    group: row.group,
    customerId: row.customerId ? String(row.customerId) : '',
    customerName: row.customerMissing ? '' : (row.customerName || ''),
    customerMissing: Boolean(row.customerMissing),
    active: row.active !== false,
    serviceDue: enabled('service_due'),
    checklist: enabled('checklist'),
    updatedAt: row.updatedAt,
  };
}

export function notificationRecipientMatchesScope(row: NotificationRecipientRecord, scope: NotificationRecipientScope): boolean {
  return row.group === scope.group
    && (scope.group === 'global' || String(row.customerId || '') === scope.customerId);
}

export function notificationRecipientSaveBody(
  draft: NotificationRecipientDraft,
  scope: NotificationRecipientScope,
  editing: boolean,
) {
  if (scope.group === 'customer' && !scope.customerId) throw new Error('Save the customer before adding recipients.');
  if (editing && (draft.group !== scope.group || (scope.group === 'customer' && draft.customerId !== scope.customerId))) {
    throw new Error('This recipient belongs to another customer or recipient group. Reload the register.');
  }
  if (editing && !draft.updatedAt) throw new Error('The recipient version is missing. Reload before editing.');
  if (!draft.displayName.trim()) throw new Error('Enter a recipient name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) throw new Error('Enter a valid email address.');
  return {
    email: draft.email.trim(),
    displayName: draft.displayName.trim(),
    group: scope.group,
    customerId: scope.group === 'customer' ? scope.customerId : null,
    active: draft.active,
    enabledTypeIds: [draft.checklist ? 'checklist' : '', draft.serviceDue ? 'service_due' : ''].filter(Boolean),
    updatedAt: editing ? draft.updatedAt : undefined,
  };
}
