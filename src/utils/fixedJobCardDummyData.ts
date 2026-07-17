import type { FieldValueEntry } from './fixedJobCardValues';

interface FixedFormField {
  id: string;
  label: string;
  type: string;
  options?: string[];
  companionField?: FixedFormField;
}

interface ChecklistItem {
  id: string;
  number: number;
  label: string;
  inputType?: string;
  unit?: string;
}

interface FixedFormSection {
  id: string;
  title: string;
  type: string;
  fields?: FixedFormField[];
  items?: ChecklistItem[];
  rows?: { fields: FixedFormField[] }[];
}

export interface DummyJobCardPreviewData {
  fieldValues: FieldValueEntry[];
  job: Record<string, unknown>;
  machine: Record<string, unknown>;
  reportNumber: string;
}

/**
 * Sample job header data used for admin preview of filled forms.
 */
const DUMMY_JOB: Record<string, unknown> = {
  jobNumber: 'SARSJHB0126010708001',
  customer: { name: 'Sample Mining Co (Pty) Ltd' },
  cashCustomer: '',
  rsrNumber: '051383',
  notes: 'John Smith — Site contact',
};

/**
 * Sample machine data used for admin preview of filled forms.
 */
const DUMMY_MACHINE: Record<string, unknown> = {
  make: 'Atlas Copco',
  model: 'GA 75 VSD',
  serialNumber: 'API987654321',
  assetNumber: 'COMP-042',
  machineHours: 12450,
  nextServiceHours: 14450,
};

/**
 * Builds dummy field values for a single template field.
 */
function dummyValueForField(field: FixedFormField, index: number): unknown {
  switch (field.type) {
    case 'yesno':
      return index % 4 !== 0;
    case 'checkbox':
      return true;
    case 'number':
      return String(80 + (index % 15));
    case 'textarea':
      return 'Routine service completed. Replaced air filter and oil separator element. No leaks observed. Unit running satisfactorily.';
    case 'date':
      return '09 Jun 2026';
    case 'signature':
      return index % 2 === 0 ? 'J. van Wyk' : 'M. Nkosi';
    case 'select':
      return field.options?.[1] ?? field.options?.[0] ?? 'Breakdown';
    case 'text':
      return `Sample value ${index + 1}`;
    default:
      return '';
  }
}

/**
 * Builds dummy checklist item values (status + optional comment).
 */
function dummyChecklistValues(item: ChecklistItem): FieldValueEntry[] {
  const entries: FieldValueEntry[] = [];

  if (item.inputType === 'number') {
    const values: Record<number, string> = {
      1: '88',
      2: '12.5',
      3: '110',
    };
    entries.push({
      fieldId: `${item.id}_status`,
      type: 'number',
      value: values[item.number] ?? '42',
    });
  } else if (item.inputType === 'text') {
    entries.push({
      fieldId: `${item.id}_status`,
      type: 'text',
      value: '1.250 / 1.255 / 1.248',
    });
  } else {
    entries.push({
      fieldId: `${item.id}_status`,
      type: 'checkbox',
      value: item.number % 5 !== 0,
    });
  }

  if (item.number === 27) {
    entries.push({
      fieldId: `${item.id}_comment`,
      type: 'text',
      value: 'Not leaking',
    });
  } else if (item.number % 11 === 0) {
    entries.push({
      fieldId: `${item.id}_comment`,
      type: 'text',
      value: 'OK — within spec',
    });
  }

  return entries;
}

/**
 * Generates complete dummy submission data for previewing a filled job card form.
 */
export function generateDummyJobCardPreviewData(
  sections: FixedFormSection[] | undefined,
  templateKey?: string
): DummyJobCardPreviewData {
  const fieldValues: FieldValueEntry[] = [];
  let fieldIndex = 0;

  for (const section of sections || []) {
    if (section.type === 'checklist' && section.items) {
      for (const item of section.items) {
        fieldValues.push(...dummyChecklistValues(item));
      }
      continue;
    }

    if (section.rows) {
      for (const row of section.rows) {
        for (const field of row.fields) {
          if (field.type === 'jobField' || field.type === 'machineField') continue;
          fieldValues.push({
            fieldId: field.id,
            type: field.type,
            value: dummyValueForField(field, fieldIndex++),
          });
        }
      }
    }

    if (section.fields) {
      for (const field of section.fields) {
        if (field.type === 'jobField' || field.type === 'machineField') continue;
        fieldValues.push({
          fieldId: field.id,
          type: field.type,
          value: dummyValueForField(field, fieldIndex++),
        });
        if (field.companionField) {
          fieldValues.push({
            fieldId: field.companionField.id,
            type: field.companionField.type,
            value: `PN-${String(fieldIndex).padStart(4, '0')}`,
          });
        }
      }
    }
  }

  if (templateKey === 'mechanical_checklist') {
    fieldValues.push(
      { fieldId: 'mc_contact', type: 'text', value: 'John Smith' },
      {
        fieldId: 'mc_overall_comments',
        type: 'textarea',
        value: 'All checks completed. Minor oil seepage noted on HP line — monitor on next visit.',
      },
      { fieldId: 'mc_tech_name', type: 'text', value: 'J. van Wyk' },
      { fieldId: 'mc_tech_signature', type: 'signature', value: 'J. van Wyk' },
      { fieldId: 'mc_tech_date', type: 'date', value: '09 Jun 2026' },
      { fieldId: 'mc_client_name', type: 'text', value: 'M. Nkosi' },
      { fieldId: 'mc_client_signature', type: 'signature', value: 'M. Nkosi' },
      { fieldId: 'mc_client_date', type: 'date', value: '09 Jun 2026' }
    );
  }

  if (templateKey === 'repair_status_report') {
    fieldValues.push(
      {
        fieldId: 'rsr_comments',
        type: 'textarea',
        value:
          'Attended breakdown call. Replaced failed minimum pressure valve. Test ran unit loaded and unloaded — pressures stable. Customer satisfied.',
      },
      { fieldId: 'rsr_km', type: 'number', value: '142' },
      { fieldId: 'rsr_travel_time', type: 'text', value: '1h 45m' },
      { fieldId: 'rsr_arrival', type: 'text', value: '08:30' },
      { fieldId: 'rsr_departure', type: 'text', value: '14:15' },
      { fieldId: 'rsr_hours_worked', type: 'number', value: '5.5' },
      { fieldId: 'rsr_overtime', type: 'text', value: 'Time' },
      { fieldId: 'rsr_job_completed', type: 'yesno', value: true },
      { fieldId: 'rsr_tech_name', type: 'text', value: 'J. van Wyk' },
      { fieldId: 'rsr_tech_signature', type: 'signature', value: 'J. van Wyk' },
      { fieldId: 'rsr_tech_date', type: 'date', value: '09 Jun 2026' },
      { fieldId: 'rsr_cust_name', type: 'text', value: 'M. Nkosi' },
      { fieldId: 'rsr_cust_signature', type: 'signature', value: 'M. Nkosi' },
      { fieldId: 'rsr_cust_date', type: 'date', value: '09 Jun 2026' }
    );
  }

  return {
    fieldValues,
    job: DUMMY_JOB,
    machine: DUMMY_MACHINE,
    reportNumber: templateKey === 'mechanical_checklist' ? 'MCC000001' : 'RSR000001',
  };
}
