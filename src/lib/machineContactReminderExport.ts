import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import type { Machine } from './api';

export const CONTACT_REMINDER_SCHEDULE_OPTIONS = {
  'month-end': 'Last calendar day of every month',
  'last-working-day': 'Last working day of every month',
  'day-of-month': 'Specific day of every month',
  interval: 'Every X days after a successful reading',
} as const;

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
  'Reading Schedule',
  'Reminders Enabled',
  'Interval (Days)',
  'Day of Month',
  'Checklist Enabled',
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
    CONTACT_REMINDER_SCHEDULE_OPTIONS[machine.readingReminderSchedule?.mode || 'interval'],
    machine.whatsAppRemindersEnabled !== false ? 'Yes' : 'No',
    machine.readingFrequencyDays == null ? '' : String(machine.readingFrequencyDays),
    machine.readingReminderSchedule?.dayOfMonth == null ? '' : String(machine.readingReminderSchedule.dayOfMonth),
    machine.checklistEnabled === true ? 'Yes' : 'No',
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
export const CONTACT_REMINDER_SCHEDULE_COL = 10;
export const CONTACT_REMINDER_REMINDERS_COL = 11;
export const CONTACT_REMINDER_FREQUENCY_COL = 12;
export const CONTACT_REMINDER_DAY_COL = 13;
export const CONTACT_REMINDER_CHECKLIST_COL = 14;
export const CONTACT_REMINDER_BASELINE_CONTACT_PERSON_COL = 15;
export const CONTACT_REMINDER_BASELINE_WHATSAPP_COL = 16;
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
      if (col === CONTACT_REMINDER_FREQUENCY_COL || col === CONTACT_REMINDER_DAY_COL) {
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
          cell.z = '0';
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
      wch: Math.max(header.length, header === 'Machine ID' ? 26 : index === CONTACT_REMINDER_SCHEDULE_COL ? 45 : 18),
      hidden: index >= CONTACT_REMINDER_EXPORT_COLUMNS.length,
    };
    if (isExcelTextColumn(index)) col.z = EXCEL_TEXT_FORMAT;
    return col;
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Contact Reminders');
  const options = XLSX.utils.aoa_to_sheet([
    ['Reading Schedule', 'Yes/No'],
    ...Object.values(CONTACT_REMINDER_SCHEDULE_OPTIONS).map((value, index) => [value, ['Yes', 'No'][index] || '']),
  ]);
  XLSX.utils.book_append_sheet(workbook, options, 'Reminder Options');
  workbook.Workbook = {
    Sheets: [{ name: 'Contact Reminders', Hidden: 0 }, { name: 'Reminder Options', Hidden: 1 }],
    Names: [
      { Name: 'ARSReadingSchedules', Ref: "'Reminder Options'!$A$2:$A$5" },
      { Name: 'ARSReminderYesNo', Ref: "'Reminder Options'!$B$2:$B$3" },
    ],
  };
  return workbook;
}

export async function contactReminderXlsxArrayBuffer(machines: Machine[]): Promise<ArrayBuffer> {
  const workbook = buildContactReminderWorkbook(machines);
  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', cellStyles: true }) as ArrayBuffer;
  // SheetJS CE does not serialize data validation. Add only those OOXML nodes
  // with the existing ZIP dependency, retaining all cells, styles and hidden data.
  const zip = await JSZip.loadAsync(bytes);
  const entry = zip.file('xl/worksheets/sheet1.xml');
  if (!entry) throw new Error('Contact Reminders worksheet was not generated');
  const end = Math.max(2, machines.length + 1);
  const list = (column: string, name: string) => `<dataValidation type="list" allowBlank="1" showDropDown="0" showErrorMessage="1" errorStyle="stop" errorTitle="Choose an option" error="Choose a value from the dropdown, or leave blank to preserve the saved value." sqref="${column}2:${column}${end}"><formula1>${name}</formula1></dataValidation>`;
  const validation = `<dataValidations count="5">${list('K', 'ARSReadingSchedules')}${list('L', 'ARSReminderYesNo')}${list('O', 'ARSReminderYesNo')}<dataValidation type="whole" operator="greaterThan" allowBlank="1" showErrorMessage="1" errorStyle="stop" errorTitle="Invalid interval" error="Enter a positive whole number of days." sqref="M2:M${end}"><formula1>0</formula1></dataValidation><dataValidation type="whole" operator="between" allowBlank="1" showErrorMessage="1" errorStyle="stop" errorTitle="Invalid day" error="Enter a whole number from 1 to 31." sqref="N2:N${end}"><formula1>1</formula1><formula2>31</formula2></dataValidation></dataValidations>`;
  const xml = await entry.async('string');
  const insertionPoint = /<(?:hyperlinks|printOptions|pageMargins|pageSetup|headerFooter|rowBreaks|colBreaks|ignoredErrors|drawing|legacyDrawing|extLst)\b|<\/worksheet>/;
  if (!insertionPoint.test(xml)) throw new Error('Contact Reminders worksheet is incomplete');
  zip.file(entry.name, xml.replace(insertionPoint, match => validation + match));
  return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
}

export function generalExportProtectedPrefix(machine: Machine): string[] {
  return [machine._id || '', machineRecordUpdatedAt(machine)];
}
