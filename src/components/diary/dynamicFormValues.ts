/**
 * Shared value helpers for dynamic planner forms (avoids circular imports).
 */

import type { PlannerFormField } from '../../lib/api';

export type DynamicFormValues = Record<string, string | string[] | boolean | number | null>;

/**
 * Returns true when a dynamic field value is considered empty.
 */
export function isDynamicFieldEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** CRM / appointment details used to prefill empty planner form fields. */
export interface DynamicFormCrmPrefillSource {
  companyName?: string | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactAddress?: string | null;
  location?: string | null;
  repCode?: string | null;
}

/**
 * Normalizes a planner field key for CRM prefill matching.
 */
function normalizePlannerFieldKey(key: string): string {
  return key.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

/**
 * Fills empty dynamic form fields from the linked customer / appointment.
 * Matches by field key and common labels (Company Name, Contact Person, etc.).
 * Never overwrites values the rep already typed.
 */
export function prefillDynamicFormValuesFromCrm(
  fields: PlannerFormField[],
  values: DynamicFormValues,
  source: DynamicFormCrmPrefillSource,
): DynamicFormValues {
  const companyName = (source.companyName || '').trim();
  const contactPerson = (source.contactPerson || '').trim();
  const rawPhone = (source.contactPhone || '').trim();
  const contactPhone =
    rawPhone && rawPhone.toLowerCase() !== 'pending' ? rawPhone : '';
  const contactEmail = (source.contactEmail || '').trim();
  const address = (source.contactAddress || source.location || '').trim();
  const repCode = (source.repCode || '').trim();

  // When contact person was stubbed as the company name, still fill company;
  // only fill Contact Person when it differs or is a real contact name.
  const contactForForm =
    contactPerson &&
    companyName &&
    contactPerson.toLowerCase() === companyName.toLowerCase()
      ? ''
      : contactPerson;

  const byKey: Record<string, string> = {};
  if (companyName) {
    byKey.companyname = companyName;
    byKey.customer = companyName;
    byKey.company = companyName;
  }
  if (contactForForm) {
    byKey.contactperson = contactForForm;
    byKey.customername = contactForForm;
    byKey.customercontactname = contactForForm;
    byKey.contact = contactForForm;
  }
  if (contactPhone) {
    byKey.telephone = contactPhone;
    byKey.contactnumber = contactPhone;
    byKey.customercontactno = contactPhone;
    byKey.phone = contactPhone;
    byKey.mobilenumber = contactPhone;
    byKey.cellphone = contactPhone;
  }
  if (contactEmail) {
    byKey.email = contactEmail;
    byKey.emailaddress = contactEmail;
    byKey.customeremail = contactEmail;
  }
  if (address) {
    byKey.physicaladdress = address;
    byKey.address = address;
    byKey.location = address;
  }
  if (repCode) {
    byKey.repcode = repCode;
  }

  if (Object.keys(byKey).length === 0) {
    return values;
  }

  /**
   * Maps common RFC labels onto CRM values when field keys are custom.
   */
  function valueForLabel(label: string): string | undefined {
    const normalized = label.trim().toLowerCase();
    if (!normalized) return undefined;
    if (
      normalized.includes('company') ||
      normalized === 'customer' ||
      normalized.includes('besigheid')
    ) {
      return companyName || undefined;
    }
    if (
      normalized.includes('contact person') ||
      normalized.includes('contact name') ||
      normalized === 'contact'
    ) {
      return contactForForm || undefined;
    }
    if (
      normalized.includes('telephone') ||
      normalized.includes('phone') ||
      normalized.includes('mobile') ||
      normalized.includes('cell')
    ) {
      return contactPhone || undefined;
    }
    if (normalized.includes('email')) {
      return contactEmail || undefined;
    }
    if (normalized.includes('address') || normalized.includes('location')) {
      return address || undefined;
    }
    if (normalized.includes('rep')) {
      return repCode || undefined;
    }
    return undefined;
  }

  const next: DynamicFormValues = { ...values };
  for (const field of fields) {
    if (field.enabled === false) continue;
    if (!isDynamicFieldEmpty(next[field.id])) continue;
    const mapped =
      byKey[normalizePlannerFieldKey(field.key)] || valueForLabel(field.label);
    if (mapped) {
      next[field.id] = mapped;
    }
  }
  return next;
}
