import type { SalesRequestType } from '../lib/api';
import {
  getRfcFormProgress,
  getRfcMissingFields,
  normalizeRfcForm,
  prefillRfcForm,
  type RfcFormData,
} from '../components/diary/rfcFormUtils.ts';
import {
  getLoanRentalFormProgress,
  normalizeLoanRentalForm,
  prefillLoanRentalForm,
  type LoanRentalFormData,
} from '../components/diary/loanRentalFormUtils.ts';
import {
  getNewServiceLevelFormProgress,
  normalizeNewServiceLevelForm,
  prefillNewServiceLevelForm,
  type NewServiceLevelFormData,
} from '../components/diary/newServiceLevelFormUtils.ts';

export interface SalesRequestValidationResult {
  valid: boolean;
  missingFields: string[];
  filled: number;
  total: number;
}

/**
 * Validates whether a sales request form is complete enough to submit.
 * Uses the same important-field checks as the backend submit endpoint.
 */
export function validateSalesRequestForm(
  requestType: SalesRequestType,
  formData: Record<string, unknown>,
): SalesRequestValidationResult {
  const schema = formData.formSchemaSnapshot as
    | { fields?: Array<{ id?: string; label?: string; required?: boolean; enabled?: boolean }> }
    | undefined;
  const values = formData.values as Record<string, unknown> | undefined;
  if (schema && Array.isArray(schema.fields) && values && typeof values === 'object') {
    const enabled = schema.fields.filter((field) => field && field.enabled !== false);
    const missingFields = enabled
      .filter((field) => field.required)
      .filter((field) => {
        const raw = values[String(field.id)];
        if (raw == null) return true;
        if (typeof raw === 'string') return raw.trim().length === 0;
        if (Array.isArray(raw)) return raw.length === 0;
        return false;
      })
      .map((field) => field.label || String(field.id));
    const filled = enabled.length - missingFields.length;
    return {
      valid: missingFields.length === 0,
      missingFields,
      filled: Math.max(0, filled),
      total: enabled.length,
    };
  }

  switch (requestType) {
    case 'rfc': {
      const form = normalizeRfcForm(formData as Partial<RfcFormData>);
      const missingFields = getRfcMissingFields(form);
      const progress = getRfcFormProgress(form);
      return {
        valid: missingFields.length === 0,
        missingFields,
        filled: progress.filled,
        total: progress.total,
      };
    }
    case 'loan':
    case 'rental':
    case 'loan_rental': {
      const form = normalizeLoanRentalForm(formData as Partial<LoanRentalFormData>);
      const progress = getLoanRentalFormProgress(form);
      return {
        valid: progress.filled === progress.total,
        missingFields:
          progress.filled === progress.total
            ? []
            : ['Complete required loan/rental fields'],
        filled: progress.filled,
        total: progress.total,
      };
    }
    case 'rfc_new_service_level': {
      const form = normalizeNewServiceLevelForm(formData as Partial<NewServiceLevelFormData>);
      const progress = getNewServiceLevelFormProgress(form);
      return {
        valid: progress.filled === progress.total,
        missingFields:
          progress.filled === progress.total
            ? []
            : ['Complete required service level fields'],
        filled: progress.filled,
        total: progress.total,
      };
    }
    case 'general_visit':
      return {
        valid: false,
        missingFields: ['Published General Visit form data is missing'],
        filled: 0,
        total: 0,
      };
    default:
      return { valid: false, missingFields: ['Unknown request type'], filled: 0, total: 0 };
  }
}

/**
 * Returns the empty form shape for a given request type.
 */
export function createEmptyFormForRequestType(
  requestType: SalesRequestType,
): Record<string, unknown> {
  switch (requestType) {
    case 'rfc':
      return normalizeRfcForm(null) as unknown as Record<string, unknown>;
    case 'loan':
    case 'rental':
    case 'loan_rental':
      return normalizeLoanRentalForm(null) as unknown as Record<string, unknown>;
    case 'rfc_new_service_level':
      return normalizeNewServiceLevelForm(null) as unknown as Record<string, unknown>;
    case 'general_visit':
      return {};
    default:
      return {};
  }
}

/**
 * Normalizes stored form data back to the current schema shape.
 */
export function normalizeFormForRequestType(
  requestType: SalesRequestType,
  formData: Record<string, unknown>,
): Record<string, unknown> {
  if (formData.formSchemaSnapshot && formData.values) {
    return formData;
  }

  switch (requestType) {
    case 'rfc':
      return normalizeRfcForm(formData as Partial<RfcFormData>) as unknown as Record<string, unknown>;
    case 'loan':
    case 'rental':
    case 'loan_rental':
      return normalizeLoanRentalForm(formData as Partial<LoanRentalFormData>) as unknown as Record<string, unknown>;
    case 'rfc_new_service_level':
      return normalizeNewServiceLevelForm(
        formData as Partial<NewServiceLevelFormData>,
      ) as unknown as Record<string, unknown>;
    case 'general_visit':
      return formData;
    default:
      return formData;
  }
}

/**
 * Fills empty customer/contact form fields from stored RFQ snapshot values
 * without overwriting captured form input. Used by the review modal so the
 * approve payload carries customer/contact when the RFC template would
 * otherwise post blank strings.
 */
export function mergeStoredCustomerIntoForm(
  requestType: SalesRequestType,
  formData: Record<string, unknown>,
  companyName?: string,
  contactPerson?: string,
): Record<string, unknown> {
  const source = {
    companyName: (companyName || '').trim() || undefined,
    contactPerson: (contactPerson || '').trim() || undefined,
  };
  if (!source.companyName && !source.contactPerson) {
    return formData;
  }
  if (formData.formSchemaSnapshot && formData.values) {
    return formData;
  }

  switch (requestType) {
    case 'rfc':
      return prefillRfcForm(formData as unknown as RfcFormData, source) as unknown as Record<
        string,
        unknown
      >;
    case 'loan':
    case 'rental':
    case 'loan_rental':
      return prefillLoanRentalForm(
        formData as unknown as LoanRentalFormData,
        source,
      ) as unknown as Record<string, unknown>;
    case 'rfc_new_service_level':
      return prefillNewServiceLevelForm(
        formData as unknown as NewServiceLevelFormData,
        source,
      ) as unknown as Record<string, unknown>;
    default:
      return formData;
  }
}

/**
 * Returns true when stored form data uses the published dynamic planner schema
 * (formSchemaSnapshot + values) rather than legacy section-based RFC fields.
 */
export function isDynamicPlannerFormData(data: Record<string, unknown>): boolean {
  return (
    Boolean(data.formSchemaSnapshot) &&
    Boolean(data.values) &&
    typeof data.values === 'object' &&
    !Array.isArray(data.values)
  );
}
