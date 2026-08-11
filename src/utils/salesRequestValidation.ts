import type { SalesRequestType } from '../lib/api';
import {
  getRfcFormProgress,
  getRfcMissingFields,
  normalizeRfcForm,
  type RfcFormData,
} from '../components/diary/rfcFormUtils';
import {
  getLoanRentalFormProgress,
  normalizeLoanRentalForm,
  type LoanRentalFormData,
} from '../components/diary/loanRentalFormUtils';
import {
  getNewServiceLevelFormProgress,
  normalizeNewServiceLevelForm,
  type NewServiceLevelFormData,
} from '../components/diary/newServiceLevelFormUtils';

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
    case 'loan_rental': {
      const form = normalizeLoanRentalForm(formData as Partial<LoanRentalFormData>);
      const progress = getLoanRentalFormProgress(form);
      return {
        valid: progress.filled === progress.total,
        missingFields:
          progress.filled === progress.total
            ? []
            : [`Complete all important Loan & Rental fields (${progress.filled}/${progress.total} done)`],
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
            : [`Complete all important New Service Level fields (${progress.filled}/${progress.total} done)`],
        filled: progress.filled,
        total: progress.total,
      };
    }
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
    case 'loan_rental':
      return normalizeLoanRentalForm(null) as unknown as Record<string, unknown>;
    case 'rfc_new_service_level':
      return normalizeNewServiceLevelForm(null) as unknown as Record<string, unknown>;
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
  switch (requestType) {
    case 'rfc':
      return normalizeRfcForm(formData as Partial<RfcFormData>) as unknown as Record<string, unknown>;
    case 'loan_rental':
      return normalizeLoanRentalForm(formData as Partial<LoanRentalFormData>) as unknown as Record<string, unknown>;
    case 'rfc_new_service_level':
      return normalizeNewServiceLevelForm(
        formData as Partial<NewServiceLevelFormData>,
      ) as unknown as Record<string, unknown>;
    default:
      return formData;
  }
}
