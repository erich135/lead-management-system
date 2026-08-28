import assert from 'node:assert/strict';
import test from 'node:test';
import * as XLSX from 'xlsx';
import type { Machine } from './api.ts';
import {
  CONTACT_REMINDER_EXPORT_COLUMNS,
  buildContactReminderCsv,
  buildContactReminderWorkbook,
  contactReminderExportRow,
  csvEscapePlainText,
  generalExportProtectedPrefix,
  machineRecordUpdatedAt,
} from './machineContactReminderExport.ts';

const machine = {
  _id: '507f1f77bcf86cd799439011',
  make: 'Atlas Copco',
  model: 'GA15',
  serialNumber: 'SN-001',
  assetNumber: 'A-1',
  customer: { _id: 'c1', name: 'Acme (Pty) Ltd' },
  ownershipType: 'customer',
  machineHours: 100,
  nextServiceHours: 200,
  isActive: true,
  contactPerson: 'Jane',
  whatsAppNumber: '+27821234567',
  readingFrequencyDays: 30,
  whatsAppRemindersEnabled: true,
  updatedAt: '2026-08-20T08:00:00.123Z',
} as Machine;

test('contact reminder export uses the recommended column order', () => {
  assert.deepEqual([...CONTACT_REMINDER_EXPORT_COLUMNS], [
    'Machine ID',
    'Record Updated At',
    'Make',
    'Model',
    'Serial Number',
    'Asset Number',
    'Customer',
    'Ownership Type',
    'Contact Person',
    'WhatsApp Number',
    'Reading Frequency (Days)',
    'Reminders Enabled',
  ]);
  assert.deepEqual(contactReminderExportRow(machine), [
    '507f1f77bcf86cd799439011',
    '2026-08-20T08:00:00.123Z',
    'Atlas Copco',
    'GA15',
    'SN-001',
    'A-1',
    'Acme (Pty) Ltd',
    'customer',
    'Jane',
    '+27821234567',
    '30',
    'Yes',
  ]);
});

test('Machine ID and Record Updated At are plain quoted text, not Excel formula wrappers', () => {
  assert.equal(csvEscapePlainText(machine._id), '"507f1f77bcf86cd799439011"');
  assert.equal(machineRecordUpdatedAt(machine), '2026-08-20T08:00:00.123Z');
  const csv = buildContactReminderCsv([machine]);
  assert.equal(csv.includes('="'), false);
  assert.match(csv, /"507f1f77bcf86cd799439011"/);
  assert.match(csv, /"2026-08-20T08:00:00.123Z"/);
  assert.deepEqual(generalExportProtectedPrefix(machine), [
    '507f1f77bcf86cd799439011',
    '2026-08-20T08:00:00.123Z',
  ]);
});

test('XLSX cells for Machine ID and Record Updated At are strings', () => {
  const workbook = buildContactReminderWorkbook([machine]);
  const sheet = workbook.Sheets['Contact Reminders'];
  const machineId = sheet.A2;
  const updatedAt = sheet.B2;
  assert.equal(machineId.t, 's');
  assert.equal(machineId.v, '507f1f77bcf86cd799439011');
  assert.equal(String(machineId.v).startsWith('='), false);
  assert.equal(updatedAt.t, 's');
  assert.equal(updatedAt.v, '2026-08-20T08:00:00.123Z');
  const csv = XLSX.utils.sheet_to_csv(sheet);
  assert.match(csv, /507f1f77bcf86cd799439011/);
  assert.equal(csv.includes('="'), false);
});
