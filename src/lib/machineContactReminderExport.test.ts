import assert from 'node:assert/strict';
import test from 'node:test';
import * as XLSX from 'xlsx';
import type { Machine } from './api.ts';
import {
  CONTACT_REMINDER_BASELINE_COLUMNS,
  CONTACT_REMINDER_ASSIGNMENT_BASELINE_COLUMNS,
  CONTACT_REMINDER_EXPORT_COLUMNS,
  CONTACT_REMINDER_WORKBOOK_COLUMNS,
  buildContactReminderCsv,
  buildContactReminderWorkbook,
  contactReminderBaselineValues,
  contactReminderExportRow,
  contactReminderVisibleValues,
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
  customer: { _id: '507f191e810c19729de860ea', name: 'Acme (Pty) Ltd' },
  cashCustomer: '',
  ownershipType: 'customer',
  machineHours: 100,
  nextServiceHours: 200,
  isActive: true,
  dbStatus: 'active',
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
  assert.deepEqual([...CONTACT_REMINDER_BASELINE_COLUMNS], [
    'Baseline Contact Person',
    'Baseline WhatsApp Number',
    'Baseline Reading Frequency (Days)',
    'Baseline Reminders Enabled',
  ]);
  assert.deepEqual([...CONTACT_REMINDER_ASSIGNMENT_BASELINE_COLUMNS], [
    'Baseline Customer ID',
    'Baseline Cash Customer',
    'Baseline Ownership Type',
    'Baseline Record Status',
  ]);
  assert.deepEqual(contactReminderVisibleValues(machine), [
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
  assert.deepEqual(contactReminderBaselineValues(machine), [
    'Jane',
    '+27821234567',
    '30',
    'Yes',
    '507f191e810c19729de860ea',
    '',
    'customer',
    'active',
  ]);
  assert.deepEqual(contactReminderExportRow(machine), [
    ...contactReminderVisibleValues(machine),
    ...contactReminderBaselineValues(machine),
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

test('XLSX hides protected baseline columns with the original exported contact values', () => {
  const workbook = buildContactReminderWorkbook([machine]);
  const sheet = workbook.Sheets['Contact Reminders'];
  const cols = sheet['!cols'] || [];
  assert.equal(CONTACT_REMINDER_WORKBOOK_COLUMNS.length, 20);
  assert.equal(cols.length, 20);
  for (let index = 0; index < CONTACT_REMINDER_EXPORT_COLUMNS.length; index += 1) {
    assert.equal(cols[index]?.hidden, false);
  }
  for (let index = CONTACT_REMINDER_EXPORT_COLUMNS.length; index < cols.length; index += 1) {
    assert.equal(cols[index]?.hidden, true);
  }
  assert.equal(sheet.M1.v, 'Baseline Contact Person');
  assert.equal(sheet.N1.v, 'Baseline WhatsApp Number');
  assert.equal(sheet.O1.v, 'Baseline Reading Frequency (Days)');
  assert.equal(sheet.P1.v, 'Baseline Reminders Enabled');
  assert.equal(sheet.I2.v, 'Jane');
  assert.equal(sheet.M2.v, 'Jane');
  assert.equal(sheet.J2.v, '+27821234567');
  assert.equal(sheet.N2.v, '+27821234567');
  assert.equal(sheet.K2.v, '30');
  assert.equal(sheet.O2.v, '30');
  assert.equal(sheet.L2.v, 'Yes');
  assert.equal(sheet.P2.v, 'Yes');
  assert.equal(sheet.Q1.v, 'Baseline Customer ID');
  assert.equal(sheet.R1.v, 'Baseline Cash Customer');
  assert.equal(sheet.S1.v, 'Baseline Ownership Type');
  assert.equal(sheet.T1.v, 'Baseline Record Status');
  assert.equal(sheet.Q2.v, '507f191e810c19729de860ea');
  assert.equal(sheet.R2.v, '');
  assert.equal(sheet.S2.v, 'customer');
  assert.equal(sheet.T2.v, 'active');
});

test('cash-customer machines export an empty customer ID and the cash customer name', () => {
  const cashMachine = {
    ...machine,
    customer: undefined,
    cashCustomer: 'Walk-in Plant',
  } as Machine;
  const baseline = contactReminderBaselineValues(cashMachine);
  assert.equal(baseline[4], '');
  assert.equal(baseline[5], 'Walk-in Plant');
  assert.equal(baseline[7], 'active');
});
