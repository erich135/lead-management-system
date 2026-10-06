/**
 * Helpers for reading fixed job card submission field values.
 */

export interface FieldValueEntry {
  fieldId: string;
  type: string;
  value: unknown;
  signatureData?: string;
  imageData?: string;
}

/**
 * Builds a lookup map from submission fieldValues array.
 */
export function buildFieldValueMap(fieldValues: FieldValueEntry[]): Map<string, unknown> {
  const map = new Map<string, unknown>();
  for (const entry of fieldValues || []) {
    map.set(entry.fieldId, entry.value);
    if (entry.signatureData) {
      map.set(`${entry.fieldId}_signature`, entry.signatureData);
    }
    if (entry.imageData) {
      map.set(`${entry.fieldId}_image`, entry.imageData);
    }
  }
  return map;
}

/**
 * Returns display text for a field value from the submission map.
 */
export function getFieldDisplayValue(map: Map<string, unknown>, fieldId: string): string {
  const value = map.get(fieldId);
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'boolean') return value ? '✓' : '';
  if (value === true || value === 'true' || value === 'yes' || value === 'pass') return '✓';
  return String(value);
}

/**
 * Returns whether a checklist/status field is checked.
 */
export function isFieldChecked(map: Map<string, unknown>, fieldId: string): boolean {
  const value = map.get(fieldId);
  if (value === true) return true;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    return s === 'true' || s === 'yes' || s === 'pass' || s === '1' || s === 'x' || s === '✓';
  }
  return false;
}

const DATABASE_ID = /^[a-f0-9]{24}$/i;

/**
 * Returns true when a value is a MongoDB id rather than a display name.
 */
export function looksLikeDatabaseId(value: unknown): boolean {
  return typeof value === 'string' && DATABASE_ID.test(value.trim());
}

/**
 * Chooses a customer label without ever showing a raw database id.
 * A saved name is kept. An unresolved id becomes "Customer unavailable".
 */
export function customerDisplayName(input: {
  populatedName?: unknown;
  savedName?: unknown;
  cashCustomer?: unknown;
}): string {
  const candidates = [input.populatedName, input.savedName, input.cashCustomer];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && 'name' in candidate) {
      const name = String((candidate as { name?: unknown }).name || '').trim();
      if (name && !looksLikeDatabaseId(name)) return name;
      continue;
    }
    const text = candidate === undefined || candidate === null ? '' : String(candidate).trim();
    if (text && !looksLikeDatabaseId(text) && text !== '[object Object]') return text;
  }
  return 'Customer unavailable';
}

/**
 * Resolves job field value for header auto-fill on print preview.
 */
export function getJobFieldValue(job: Record<string, unknown> | undefined, key: string): string {
  if (!job) return '';
  switch (key) {
    case 'jobNumber': return String(job.jobNumber ?? '');
    case 'customer':
      return customerDisplayName({
        populatedName: job.customer,
        cashCustomer: job.cashCustomer,
      });
    case 'rsrNumber': return String(job.rsrNumber ?? '');
    default: {
      const value = (job as Record<string, unknown>)[key];
      if (looksLikeDatabaseId(value)) return '';
      return value !== undefined && value !== null ? String(value) : '';
    }
  }
}

/**
 * Resolves machine field value for header auto-fill on print preview.
 */
export function getMachineFieldValue(machine: Record<string, unknown> | undefined, key: string): string {
  if (!machine) return '';
  const val = machine[key];
  return val !== undefined && val !== null ? String(val) : '';
}
