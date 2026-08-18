/**
 * Pure form logic for correcting report metadata on an uploaded machine RSR.
 *
 * Kept separate from the modal so the prepopulation, change detection and
 * permitted-field filtering can be tested without a DOM.
 */

/**
 * Report metadata a machine RSR correction may change.
 *
 * The uploaded file, its title, the original uploader and the upload date are
 * deliberately absent: they are upload evidence and are never editable. The
 * hour-meter and next-service fields are also excluded because they drive
 * machine service scheduling at upload time.
 */
export const EDITABLE_MACHINE_RSR_FIELDS = [
  'workDate',
  'rsrNumber',
  'jobNumber',
  'poNumber',
  'invNumber',
  'quoteDate',
  'value',
  'tech',
  'hoursWorked',
  'description',
  'comments',
] as const;

export type EditableMachineRSRField = (typeof EDITABLE_MACHINE_RSR_FIELDS)[number];

export type MachineRSRMetadataUpdate = Partial<
  Record<EditableMachineRSRField, string | number | null>
>;

/** Fields the form edits as numbers. */
export const NUMERIC_MACHINE_RSR_FIELDS: readonly EditableMachineRSRField[] = [
  'value',
  'hoursWorked',
];

/** Fields that carry a value at upload time and may not be cleared. */
export const REQUIRED_MACHINE_RSR_FIELDS: readonly EditableMachineRSRField[] = [
  'workDate',
];

export type FormState = Record<EditableMachineRSRField, string>;

/** Metadata the form reads to prepopulate itself. */
export interface EditableRsrSource {
  workDate?: string;
  rsrNumber?: string;
  jobNumber?: string;
  poNumber?: string;
  invNumber?: string;
  quoteDate?: string;
  value?: number;
  tech?: string;
  hoursWorked?: number;
  description?: string;
  comments?: string;
}

export function dateInputValue(value?: string): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
}

export function numberInputValue(value?: number): string {
  return value === undefined || value === null ? '' : String(value);
}

/** Prepopulates the form from the RSR's current effective metadata. */
export function initialForm(rsr: EditableRsrSource): FormState {
  return {
    workDate: dateInputValue(rsr.workDate),
    rsrNumber: rsr.rsrNumber || '',
    jobNumber: rsr.jobNumber || '',
    poNumber: rsr.poNumber || '',
    invNumber: rsr.invNumber || '',
    quoteDate: dateInputValue(rsr.quoteDate),
    value: numberInputValue(rsr.value),
    tech: rsr.tech || '',
    hoursWorked: numberInputValue(rsr.hoursWorked),
    description: rsr.description || '',
    comments: rsr.comments || '',
  };
}

/**
 * Builds the payload from the fields the user actually changed.
 *
 * An untouched field is omitted so a correction never rewrites values the user
 * did not intend to touch. A cleared field is sent as null.
 */
export function changedFields(
  form: FormState,
  original: FormState,
): MachineRSRMetadataUpdate {
  const updates: MachineRSRMetadataUpdate = {};
  for (const field of EDITABLE_MACHINE_RSR_FIELDS) {
    if (form[field] === original[field]) continue;
    const raw = form[field].trim();
    if (raw === '') {
      updates[field] = null;
      continue;
    }
    updates[field] = NUMERIC_MACHINE_RSR_FIELDS.includes(field)
      ? Number(raw)
      : raw;
  }
  return updates;
}

/**
 * Drops anything that is not a correctable field, so a request can never carry
 * file identity, uploader or upload-date values to the server.
 */
export function permittedMetadataPayload(
  updates: Record<string, unknown>,
): MachineRSRMetadataUpdate {
  const permitted: Record<string, unknown> = {};
  for (const field of EDITABLE_MACHINE_RSR_FIELDS) {
    if (field in updates) permitted[field] = updates[field];
  }
  return permitted as MachineRSRMetadataUpdate;
}

/** A required field may be corrected but not emptied. */
export function missingRequiredField(
  form: FormState,
): EditableMachineRSRField | undefined {
  return REQUIRED_MACHINE_RSR_FIELDS.find(
    (field) => form[field].trim() === '',
  );
}
