import * as XLSX from 'xlsx';
import type { Machine } from './api';

export const CONTACT_REMINDER_EXPORT_COLUMNS = [
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
] as const;

export const CONTACT_REMINDER_BASELINE_COLUMNS = [
  'Baseline Contact Person',
  'Baseline WhatsApp Number',
  'Baseline Reading Frequency (Days)',
  'Baseline Reminders Enabled',
] as const;

export const CONTACT_REMINDER_WORKBOOK_COLUMNS = [
  ...CONTACT_REMINDER_EXPORT_COLUMNS,
  ...CONTACT_REMINDER_BASELINE_COLUMNS,
] as const;

export function machineRecordUpdatedAt(machine: Pick<Machine, 'updatedAt'>): string {
  if (!machine.updatedAt) return '';
  const date = new Date(machine.updatedAt);
  if (Number.isNaN(date.getTime())) return String(machine.updatedAt);
  return date.toISOString();
}

export function customerNameForExport(machine: Machine): string {
  if (machine.customer && typeof machine.customer === 'object') return machine.customer.name || '';
  if (typeof machine.customer === 'string') return machine.customer;
  return machine.cashCustomer || '';
}

export function contactReminderVisibleValues(machine: Machine): string[] {
  return [
    machine._id || '',
    machineRecordUpdatedAt(machine),
    machine.make || '',
    machine.model || '',
    machine.serialNumber || '',
    machine.assetNumber || '',
    customerNameForExport(machine),
    machine.ownershipType || '',
    machine.contactPerson || '',
    machine.whatsAppNumber || '',
    machine.readingFrequencyDays == null ? '' : String(machine.readingFrequencyDays),
    machine.whatsAppRemindersEnabled !== false ? 'Yes' : 'No',
  ];
}

export function contactReminderBaselineValues(machine: Machine): string[] {
  return [
    machine.contactPerson || '',
    machine.whatsAppNumber || '',
    machine.readingFrequencyDays == null ? '' : String(machine.readingFrequencyDays),
    machine.whatsAppRemindersEnabled !== false ? 'Yes' : 'No',
  ];
}

export function contactReminderExportRow(machine: Machine): string[] {
  return [...contactReminderVisibleValues(machine), ...contactReminderBaselineValues(machine)];
}

export function csvEscapePlainText(value: unknown): string {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildContactReminderCsv(machines: Machine[]): string {
  const lines = [
    CONTACT_REMINDER_WORKBOOK_COLUMNS.join(','),
    ...machines.map((machine) => contactReminderExportRow(machine).map(csvEscapePlainText).join(',')),
  ];
  return `\uFEFF${lines.join('\n')}`;
}

export function buildContactReminderWorkbook(machines: Machine[]): XLSX.WorkBook {
  const aoa = [
    [...CONTACT_REMINDER_WORKBOOK_COLUMNS],
    ...machines.map((machine) => contactReminderExportRow(machine)),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  for (let row = 1; row <= range.e.r; row += 1) {
    for (let col = 0; col <= range.e.c; col += 1) {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[address];
      if (!cell) continue;
      cell.t = 's';
      cell.v = cell.v == null ? '' : String(cell.v);
      delete cell.w;
      delete cell.z;
    }
  }
  sheet['!cols'] = CONTACT_REMINDER_WORKBOOK_COLUMNS.map((header, index) => ({
    wch: Math.max(header.length, header === 'Machine ID' ? 26 : 18),
    hidden: index >= CONTACT_REMINDER_EXPORT_COLUMNS.length,
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Contact Reminders');
  return workbook;
}

export function contactReminderXlsxArrayBuffer(machines: Machine[]): ArrayBuffer {
  const workbook = buildContactReminderWorkbook(machines);
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array', cellStyles: true }) as ArrayBuffer;
}

export function generalExportProtectedPrefix(machine: Machine): string[] {
  return [machine._id || '', machineRecordUpdatedAt(machine)];
}
