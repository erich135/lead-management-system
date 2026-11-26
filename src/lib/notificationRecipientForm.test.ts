import { describe, expect, it } from 'vitest';
import { notificationRecipientEditDraft, notificationRecipientMatchesScope, notificationRecipientSaveBody } from './notificationRecipientForm';
import type { NotificationRecipientRecord } from './api';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArchivedCustomerNotificationRecipients } from '../components/NotificationRecipients';

describe('notification recipient editor', () => {
  it('keeps the customer name and id while editing', () => {
    const draft = notificationRecipientEditDraft({
      _id: '1',
      email: 'site@example.com',
      displayName: 'Site office',
      group: 'customer',
      customerId: '507f1f77bcf86cd799439011',
      customerName: 'Rosslyn Plant',
      customerMissing: false,
      active: true,
      updatedAt: '2026-11-17T10:00:00.000Z',
      subscriptions: [
        { typeId: 'checklist', enabled: true },
        { typeId: 'service_due', enabled: false },
      ],
    });
    expect(draft.customerId).toBe('507f1f77bcf86cd799439011');
    expect(draft.customerName).toBe('Rosslyn Plant');
    expect(draft.customerMissing).toBe(false);
    expect(draft.checklist).toBe(true);
    expect(draft.serviceDue).toBe(false);
    expect(draft.updatedAt).toBe('2026-11-17T10:00:00.000Z');
  });

  it('shows a missing customer without clearing the relationship', () => {
    const draft = notificationRecipientEditDraft({
      _id: '1',
      email: 'site@example.com',
      displayName: 'Site office',
      group: 'customer',
      customerId: '507f1f77bcf86cd799439011',
      customerName: null,
      customerMissing: true,
      active: false,
      subscriptions: [],
    });
    expect(draft.customerId).toBe('507f1f77bcf86cd799439011');
    expect(draft.customerName).toBe('');
    expect(draft.customerMissing).toBe(true);
    expect(draft.active).toBe(false);
  });

  const customerId = '507f1f77bcf86cd799439011';
  const otherCustomerId = '507f1f77bcf86cd799439012';
  const recipient: NotificationRecipientRecord = {
    _id: 'recipient-1', email: 'site@example.com', displayName: 'Site office',
    group: 'customer', customerId, customerName: 'Duplicate name', active: true,
    updatedAt: '2026-11-21T07:00:00.000Z',
    subscriptions: [{ typeId: 'checklist', enabled: true }, { typeId: 'service_due', enabled: false }],
  };

  it('separates same-named customers by permanent ID and excludes Global recipients', () => {
    const scope = { group: 'customer', customerId } as const;
    expect(notificationRecipientMatchesScope(recipient, scope)).toBe(true);
    expect(notificationRecipientMatchesScope({ ...recipient, customerId: otherCustomerId }, scope)).toBe(false);
    expect(notificationRecipientMatchesScope({ ...recipient, group: 'global', customerId: null }, scope)).toBe(false);
    expect(notificationRecipientMatchesScope(recipient, { group: 'global' })).toBe(false);
  });

  it('keeps the reviewed version and independent preferences during explicit deactivation', () => {
    const draft = { ...notificationRecipientEditDraft(recipient), active: false, email: ' site@example.com ' };
    const body = notificationRecipientSaveBody(draft, { group: 'customer', customerId }, true);
    expect(body.customerId).toBe(customerId);
    expect(body.email).toBe('site@example.com');
    expect(body.updatedAt).toBe(recipient.updatedAt);
    expect(body.active).toBe(false);
    expect(body.enabledTypeIds).toEqual(['checklist']);
    expect(notificationRecipientSaveBody({ ...draft, checklist: false, serviceDue: true }, { group: 'customer', customerId }, true).enabledTypeIds).toEqual(['service_due']);
  });

  it('rejects ownership transfer and edits without a concurrency version', () => {
    const draft = notificationRecipientEditDraft(recipient);
    expect(() => notificationRecipientSaveBody(draft, { group: 'customer', customerId: otherCustomerId }, true)).toThrow('another customer');
    expect(() => notificationRecipientSaveBody(draft, { group: 'global' }, true)).toThrow('another customer');
    expect(() => notificationRecipientSaveBody({ ...draft, updatedAt: undefined }, { group: 'customer', customerId }, true)).toThrow('version is missing');
  });

  it('requires a saved customer identity and valid address before proposing a new recipient', () => {
    const draft = notificationRecipientEditDraft(recipient);
    expect(() => notificationRecipientSaveBody(draft, { group: 'customer', customerId: '' }, false)).toThrow('Save the customer');
    expect(() => notificationRecipientSaveBody({ ...draft, displayName: ' ' }, { group: 'customer', customerId }, false)).toThrow('recipient name');
    expect(() => notificationRecipientSaveBody({ ...draft, email: 'invalid' }, { group: 'customer', customerId }, false)).toThrow('valid email');
    const global = notificationRecipientSaveBody(draft, { group: 'global' }, false);
    expect(global.group).toBe('global');
    expect(global.customerId).toBeNull();
    expect(global.updatedAt).toBeUndefined();
  });

  it('opens archived recipient maintenance in a fixed customer context without a restore action', () => {
    const html = renderToStaticMarkup(createElement(ArchivedCustomerNotificationRecipients, { customerId }));
    expect(html).toContain('Archived customer.');
    expect(html).toContain(customerId);
    expect(html).toContain('Customer notification recipients');
    expect(html).toContain('Loading recipients');
    expect(html).toContain('<fieldset disabled=""');
    expect(html).not.toContain('Restore customer');
    expect(html).not.toContain('Search customer');
    expect(html).not.toContain('<select');
  });
});
