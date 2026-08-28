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

export const CONTACT_REMINDER_ASSIGNMENT_BASELINE_COLUMNS = [
  'Baseline Customer ID',
  'Baseline Cash Customer',
  'Baseline Ownership Type',
  'Baseline Record Status',
] as const;

export const CONTACT_REMINDER_WORKBOOK_COLUMNS = [
  ...CONTACT_REMINDER_EXPORT_COLUMNS,
  ...CONTACT_REMINDER_BASELINE_COLUMNS,
  ...CONTACT_REMINDER_ASSIGNMENT_BASELINE_COLUMNS,
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

export function linkedCustomerIdForExport(machine: Machine): string {
  if (machine.customer && typeof machine.customer === 'object') return machine.customer._id || '';
  if (typeof machine.customer === 'string' && /^[a-fA-F0-9]{24}$/i.test(machine.customer)) {
    return machine.customer;
  }
  return '';
}

export function recordStatusForExport(machine: Machine): string {
  return machine.dbStatus === 'archived' || machine.dbStatus === 'deleted' ? machine.dbStatus : 'active';
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
    linkedCustomerIdForExport(machine),
    machine.cashCustomer || '',
    machine.ownershipType || '',
    recordStatusForExport(machine),
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

export const CONTACT_REMINDER_CONTACT_PERSON_COL = 8;
export const CONTACT_REMINDER_WHATSAPP_COL = 9;
export const CONTACT_REMINDER_FREQUENCY_COL = 10;
export const CONTACT_REMINDER_REMINDERS_COL = 11;
export const CONTACT_REMINDER_BASELINE_CONTACT_PERSON_COL = 12;
export const CONTACT_REMINDER_BASELINE_WHATSAPP_COL = 13;
export const EXCEL_TEXT_FORMAT = '@';

function isExcelTextColumn(col: number): boolean {
  return (
    col === CONTACT_REMINDER_CONTACT_PERSON_COL
    || col === CONTACT_REMINDER_WHATSAPP_COL
    || col === CONTACT_REMINDER_BASELINE_CONTACT_PERSON_COL
    || col === CONTACT_REMINDER_BASELINE_WHATSAPP_COL
  );
}

function ensureSheetCell(
  sheet: XLSX.WorkSheet,
  row: number,
  col: number,
): XLSX.CellObject {
  const address = XLSX.utils.encode_cell({ r: row, c: col });
  if (!sheet[address]) sheet[address] = { t: 's', v: '' };
  return sheet[address] as XLSX.CellObject;
}

function applyExcelTextFormat(cell: XLSX.CellObject): void {
  cell.t = 's';
  cell.v = cell.v == null ? '' : String(cell.v);
  cell.z = EXCEL_TEXT_FORMAT;
  delete cell.w;
}

export function buildContactReminderWorkbook(machines: Machine[]): XLSX.WorkBook {
  const aoa = [
    [...CONTACT_REMINDER_WORKBOOK_COLUMNS],
    ...machines.map((machine) => contactReminderExportRow(machine)),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  for (let row = 0; row <= range.e.r; row += 1) {
    for (let col = 0; col <= range.e.c; col += 1) {
      const cell = ensureSheetCell(sheet, row, col);
      if (isExcelTextColumn(col)) {
        applyExcelTextFormat(cell);
        continue;
      }
      if (row === 0) {
        cell.t = 's';
        cell.v = cell.v == null ? '' : String(cell.v);
        delete cell.w;
        continue;
      }
      if (col === CONTACT_REMINDER_FREQUENCY_COL) {
        const raw = cell.v == null ? '' : String(cell.v).trim();
        if (!raw) {
          cell.t = 's';
          cell.v = '';
          delete cell.z;
          delete cell.w;
          continue;
        }
        const numeric = Number(raw);
        if (Number.isFinite(numeric)) {
          cell.t = 'n';
          cell.v = numeric;
          delete cell.z;
          delete cell.w;
        }
        continue;
      }
      cell.t = 's';
      cell.v = cell.v == null ? '' : String(cell.v);
      delete cell.w;
    }
  }
  sheet['!cols'] = CONTACT_REMINDER_WORKBOOK_COLUMNS.map((header, index) => {
    const col: XLSX.ColInfo & { z?: string } = {
      wch: Math.max(header.length, header === 'Machine ID' ? 26 : 18),
      hidden: index >= CONTACT_REMINDER_EXPORT_COLUMNS.length,
    };
    if (isExcelTextColumn(index)) col.z = EXCEL_TEXT_FORMAT;
    return col;
  });
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
