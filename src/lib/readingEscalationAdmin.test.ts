import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_READING_ADMIN_EXPORT_FILTER,
  READING_ADMIN_CLEAR,
  assignedAdminCodeId,
  customerUpdatePayload,
  readingEscalationAdminCodeLabel,
} from './readingEscalationAdmin.ts';

test('customer save payload never includes readingEscalationAdminCodeId or the obsolete User field', () => {
  const payload = customerUpdatePayload({
    _id: '507f1f77bcf86cd799439011',
    name: 'Acme',
    address: '1 Main',
    phone: '011',
    email: 'a@b.c',
    defaultContactPerson: 'Pat',
    defaultWhatsAppNumber: '+27821234567',
    readingEscalationAdminCodeId: '507f191e810c19729de860ea',
  });
  assert.equal('readingEscalationAdminCodeId' in payload, false);
  assert.equal('readingEscalationAdminUserId' in payload, false);
  assert.equal(payload.name, 'Acme');
  assert.equal(payload.address, '1 Main');
});

test('assigned Admin Code id unwraps populated AdminCode refs', () => {
  assert.equal(assignedAdminCodeId(null), null);
  assert.equal(assignedAdminCodeId('507f191e810c19729de860ea'), '507f191e810c19729de860ea');
  assert.equal(
    assignedAdminCodeId({
      _id: '507f191e810c19729de860ea',
      code: 'AC',
      description: 'Antoinette Coetzee',
      user: { _id: 'u1', firstName: 'Antoinette', lastName: 'Coetzee', email: 'ac@ars.test' },
    }),
    '507f191e810c19729de860ea',
  );
});

test('dropdown label uses Code — Description — Linked User', () => {
  assert.equal(
    readingEscalationAdminCodeLabel(
      {
        _id: '507f191e810c19729de860ea',
        code: 'AC',
        description: 'Antoinette Coetzee',
        user: { _id: 'u1', firstName: 'Antoinette', lastName: 'Coetzee' },
      },
    ),
    'AC — Antoinette Coetzee — Antoinette Coetzee',
  );
  assert.equal(readingEscalationAdminCodeLabel(null), 'Not assigned');
});

test('default export filter is all active customers and CLEAR is explicit', () => {
  assert.equal(DEFAULT_READING_ADMIN_EXPORT_FILTER, 'all_active');
  assert.equal(READING_ADMIN_CLEAR, 'CLEAR');
});
