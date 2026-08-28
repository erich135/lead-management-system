import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_READING_ADMIN_EXPORT_FILTER,
  READING_ADMIN_CLEAR,
  assignedReadingAdminId,
  customerUpdatePayload,
  readingEscalationAdminLabel,
} from './readingEscalationAdmin.ts';

test('customer save payload never includes readingEscalationAdminUserId', () => {
  const payload = customerUpdatePayload({
    _id: '507f1f77bcf86cd799439011',
    name: 'Acme',
    address: '1 Main',
    phone: '011',
    email: 'a@b.c',
    defaultContactPerson: 'Pat',
    defaultWhatsAppNumber: '+27821234567',
    readingEscalationAdminUserId: '507f191e810c19729de860ea',
  });
  assert.equal('readingEscalationAdminUserId' in payload, false);
  assert.equal(payload.name, 'Acme');
  assert.equal(payload.address, '1 Main');
});

test('assigned admin id unwraps populated User refs', () => {
  assert.equal(assignedReadingAdminId(null), null);
  assert.equal(assignedReadingAdminId('507f191e810c19729de860ea'), '507f191e810c19729de860ea');
  assert.equal(
    assignedReadingAdminId({
      _id: '507f191e810c19729de860ea',
      firstName: 'Ann',
      lastName: 'Admin',
      email: 'ann@ars.test',
      adminCodes: [{ code: 'AA' }],
    }),
    '507f191e810c19729de860ea',
  );
});

test('dropdown label uses full name — email — Admin code', () => {
  assert.equal(
    readingEscalationAdminLabel(
      {
        _id: '507f191e810c19729de860ea',
        firstName: 'Ann',
        lastName: 'Admin',
        email: 'ann@ars.test',
        adminCodes: [{ code: 'AA' }],
      },
    ),
    'Ann Admin — ann@ars.test — AA',
  );
  assert.equal(readingEscalationAdminLabel(null), 'Not assigned');
});

test('default export filter is reminder-enabled non-rental machines and CLEAR is explicit', () => {
  assert.equal(DEFAULT_READING_ADMIN_EXPORT_FILTER, 'reminder_enabled_non_rental');
  assert.equal(READING_ADMIN_CLEAR, 'CLEAR');
});
