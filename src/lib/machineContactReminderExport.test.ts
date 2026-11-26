import assert from 'node:assert/strict';
import test from 'node:test';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import type { Machine } from './api.ts';
import {
  CONTACT_REMINDER_ASSIGNMENT_BASELINE_COLUMNS,
  CONTACT_REMINDER_BASELINE_COLUMNS,
  CONTACT_REMINDER_BASELINE_CONTACT_PERSON_COL,
  CONTACT_REMINDER_BASELINE_WHATSAPP_COL,
  CONTACT_REMINDER_CONTACT_PERSON_COL,
  CONTACT_REMINDER_EXPORT_COLUMNS,
  CONTACT_REMINDER_FREQUENCY_COL,
  CONTACT_REMINDER_REMINDERS_COL,
  CONTACT_REMINDER_WHATSAPP_COL,
  CONTACT_REMINDER_WORKBOOK_COLUMNS,
  EXCEL_TEXT_FORMAT,
  buildContactReminderCsv,
  buildContactReminderWorkbook,
  contactReminderBaselineValues,
  contactReminderExportRow,
  contactReminderVisibleValues,
  contactReminderXlsxArrayBuffer,
  CONTACT_REMINDER_SCHEDULE_OPTIONS,
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
    'Reading Schedule',
    'Reminders Enabled',
    'Interval (Days)',
    'Day of Month',
    'Checklist Enabled',
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
    'Every X days after a successful reading',
    'Yes',
    '30',
    '',
    'No',
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
  assert.equal(CONTACT_REMINDER_WORKBOOK_COLUMNS.length, 23);
  assert.equal(cols.length, 23);
  for (let index = 0; index < CONTACT_REMINDER_EXPORT_COLUMNS.length; index += 1) {
    assert.equal(cols[index]?.hidden, false);
  }
  for (let index = CONTACT_REMINDER_EXPORT_COLUMNS.length; index < cols.length; index += 1) {
    assert.equal(cols[index]?.hidden, true);
  }
  assert.equal(sheet.P1.v, 'Baseline Contact Person');
  assert.equal(sheet.Q1.v, 'Baseline WhatsApp Number');
  assert.equal(sheet.R1.v, 'Baseline Reading Frequency (Days)');
  assert.equal(sheet.S1.v, 'Baseline Reminders Enabled');
  assert.equal(sheet.I2.v, 'Jane');
  assert.equal(sheet.P2.v, 'Jane');
  assert.equal(sheet.J2.v, '+27821234567');
  assert.equal(sheet.Q2.v, '+27821234567');
  assert.equal(sheet.K2.v, 'Every X days after a successful reading');
  assert.equal(sheet.M2.v, 30);
  assert.equal(sheet.O2.v, 'No');
  assert.equal(sheet.R2.v, '30');
  assert.equal(sheet.L2.v, 'Yes');
  assert.equal(sheet.S2.v, 'Yes');
  assert.equal(sheet.T1.v, 'Baseline Customer ID');
  assert.equal(sheet.U1.v, 'Baseline Cash Customer');
  assert.equal(sheet.V1.v, 'Baseline Ownership Type');
  assert.equal(sheet.W1.v, 'Baseline Record Status');
  assert.equal(sheet.T2.v, '507f191e810c19729de860ea');
  assert.equal(sheet.U2.v, '');
  assert.equal(sheet.V2.v, 'customer');
  assert.equal(sheet.W2.v, 'active');
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

test('XLSX formats Contact Person and WhatsApp as editable Excel Text and frequency as numeric', () => {
  const blankWhatsApp = {
    ...machine,
    contactPerson: '',
    whatsAppNumber: '',
    readingFrequencyDays: undefined,
  } as Machine;
  const workbook = buildContactReminderWorkbook([machine, blankWhatsApp]);
  const sheet = workbook.Sheets['Contact Reminders'];
  const contact = sheet.I2;
  const whatsApp = sheet.J2;
  const frequency = sheet.M2;
  const reminders = sheet.L2;
  const emptyContact = sheet.I3;
  const emptyWhatsApp = sheet.J3;
  const emptyFrequency = sheet.M3;

  assert.equal(CONTACT_REMINDER_CONTACT_PERSON_COL, 8);
  assert.equal(CONTACT_REMINDER_WHATSAPP_COL, 9);
  assert.equal(CONTACT_REMINDER_FREQUENCY_COL, 12);
  assert.equal(CONTACT_REMINDER_REMINDERS_COL, 11);
  assert.equal(CONTACT_REMINDER_BASELINE_CONTACT_PERSON_COL, 15);
  assert.equal(CONTACT_REMINDER_BASELINE_WHATSAPP_COL, 16);

  const cols = sheet['!cols'] || [];
  assert.equal((cols[CONTACT_REMINDER_CONTACT_PERSON_COL] as { z?: string }).z, EXCEL_TEXT_FORMAT);
  assert.equal((cols[CONTACT_REMINDER_WHATSAPP_COL] as { z?: string }).z, EXCEL_TEXT_FORMAT);
  assert.equal(sheet.I1.z, EXCEL_TEXT_FORMAT);
  assert.equal(sheet.J1.z, EXCEL_TEXT_FORMAT);

  assert.equal(contact.t, 's');
  assert.equal(contact.z, EXCEL_TEXT_FORMAT);
  assert.equal(contact.v, 'Jane');
  assert.equal(whatsApp.t, 's');
  assert.equal(whatsApp.z, EXCEL_TEXT_FORMAT);
  assert.equal(whatsApp.v, '+27821234567');
  assert.equal(String(whatsApp.v).startsWith('='), false);

  assert.equal(frequency.t, 'n');
  assert.equal(frequency.v, 30);
  assert.equal(reminders.t, 's');
  assert.equal(reminders.v, 'Yes');

  assert.equal(emptyContact.t, 's');
  assert.equal(emptyContact.z, EXCEL_TEXT_FORMAT);
  assert.equal(emptyWhatsApp.t, 's');
  assert.equal(emptyWhatsApp.z, EXCEL_TEXT_FORMAT);
  assert.equal(emptyWhatsApp.v, '');
  assert.equal(emptyFrequency.v, '');

  const written = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', cellStyles: true });
  const roundTrip = XLSX.read(written, { type: 'array', cellStyles: true, raw: false });
  const roundSheet = roundTrip.Sheets['Contact Reminders'];
  assert.equal(roundSheet.J2.t, 's');
  assert.equal(String(roundSheet.J2.v), '+27821234567');
  assert.equal(roundSheet.M2.t, 'n');
  assert.equal(roundSheet.M2.v, 30);
  assert.equal(roundSheet.L2.v, 'Yes');
});

test('exports all saved schedule modes, numeric parameters and independent flags', () => {
  const modes = Object.keys(CONTACT_REMINDER_SCHEDULE_OPTIONS) as Array<keyof typeof CONTACT_REMINDER_SCHEDULE_OPTIONS>;
  const rows = modes.map((mode, index) => ({ ...machine, readingFrequencyDays: 12 + index,
    readingReminderSchedule: { mode, ...(mode === 'day-of-month' ? { dayOfMonth: 31 } : {}), configuredAt: '2026-11-25T06:00:00Z' },
    checklistEnabled: index % 2 === 0, whatsAppRemindersEnabled: index % 2 !== 0,
  }));
  const sheet = buildContactReminderWorkbook(rows).Sheets['Contact Reminders'];
  rows.forEach((row, index) => {
    const n = index + 2;
    assert.equal(sheet[`K${n}`].v, CONTACT_REMINDER_SCHEDULE_OPTIONS[row.readingReminderSchedule.mode]);
    assert.equal(sheet[`M${n}`].v, row.readingFrequencyDays);
    assert.equal(sheet[`N${n}`].v, row.readingReminderSchedule.mode === 'day-of-month' ? 31 : '');
    assert.equal(sheet[`L${n}`].v, row.whatsAppRemindersEnabled ? 'Yes' : 'No');
    assert.equal(sheet[`O${n}`].v, row.checklistEnabled ? 'Yes' : 'No');
  });
});

test('downloaded XLSX retains hidden baselines/options and native dropdown/whole-number validation', async () => {
  const bytes = await contactReminderXlsxArrayBuffer([machine, { ...machine, _id: '507f1f77bcf86cd799439012', checklistEnabled: true }]);
  const workbook = XLSX.read(bytes, { type: 'array', cellStyles: true });
  const sheet = workbook.Sheets['Contact Reminders'];
  assert.deepEqual(workbook.SheetNames, ['Contact Reminders', 'Reminder Options']);
  assert.equal(workbook.Workbook?.Sheets?.[1].Hidden, 1);
  assert.deepEqual(workbook.Workbook?.Names?.map(name => [name.Name, name.Ref]), [
    ['ARSReadingSchedules', "'Reminder Options'!$A$2:$A$5"], ['ARSReminderYesNo', "'Reminder Options'!$B$2:$B$3"],
  ]);
  for (let index = 10; index < 15; index++) assert.notEqual(sheet['!cols']?.[index]?.hidden, true);
  for (let index = 15; index < 23; index++) assert.equal(sheet['!cols']?.[index]?.hidden, true);
  assert.equal(sheet.J2.v, machine.whatsAppNumber);
  assert.equal(sheet.M2.t, 'n');
  assert.equal(sheet.P2.v, machine.contactPerson);
  assert.equal(sheet.W2.v, 'active');
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
  assert.match(xml, /<dataValidations count="5">/);
  for (const column of ['K', 'L', 'O']) assert.match(xml, new RegExp(`type="list"[^>]*sqref="${column}2:${column}3"`));
  assert.match(xml, /type="whole" operator="greaterThan"[^>]*sqref="M2:M3"/);
  assert.match(xml, /type="whole" operator="between"[^>]*sqref="N2:N3"/);
  assert.match(xml, /<formula1>ARSReadingSchedules<\/formula1>/);
  assert.match(xml, /<formula1>ARSReminderYesNo<\/formula1>/);
  assert.ok(xml.indexOf('<dataValidations') < xml.indexOf('<ignoredErrors'));
});

test('empty exports still contain visible scheduling fields, dropdowns and hidden options', async () => {
  const bytes = await contactReminderXlsxArrayBuffer([]);
  const zip = await JSZip.loadAsync(bytes);
  assert.match(await zip.file('xl/worksheets/sheet1.xml')!.async('string'), /sqref="K2:K2"/);
  const workbook = XLSX.read(bytes, { type: 'array', cellStyles: true });
  assert.equal(workbook.Sheets['Contact Reminders'].O1.v, 'Checklist Enabled');
  assert.equal(workbook.Workbook?.Sheets?.[1].Hidden, 1);
});
