export interface ExtractedSpecSheetValues {
  manufacturer: string | null;
  model: string | null;
  modelVariant: string | null;
  ratedPressureBarG: number | null;
  ratedAirflowM3PerMin: number | null;
  packageInputPowerKw: number | null;
  motorShaftPowerKw: number | null;
  controlType: string | null;
}

export const SPEC_SHEET_VERIFY_NOTE =
  'Values extracted from uploaded specification sheet. Please verify before use.';

export const SPEC_SHEET_MANUAL_FALLBACK_NOTE =
  'We could not reliably read the technical values from this specification sheet. Please enter the values shown on the uploaded document.';

export const SPEC_SHEET_READ_FAILED_NOTE =
  'We could not read this PDF. Please try another copy of the specification sheet or enter the values manually.';

export type SpecSheetOutcomeStatus =
  | 'extracted'
  | 'no_supported_values'
  | 'read_failed';

export function specSheetStatusMessage(
  status: SpecSheetOutcomeStatus | null | undefined,
): string | null {
  if (status === 'extracted') return SPEC_SHEET_VERIFY_NOTE;
  if (status === 'no_supported_values') return SPEC_SHEET_MANUAL_FALLBACK_NOTE;
  if (status === 'read_failed') return SPEC_SHEET_READ_FAILED_NOTE;
  return null;
}

export function emptyExtractedSpecSheetValues(): ExtractedSpecSheetValues {
  return {
    manufacturer: null,
    model: null,
    modelVariant: null,
    ratedPressureBarG: null,
    ratedAirflowM3PerMin: null,
    packageInputPowerKw: null,
    motorShaftPowerKw: null,
    controlType: null,
  };
}

export function hasExtractedTechnicalValues(
  values: ExtractedSpecSheetValues | null | undefined,
): boolean {
  if (!values) return false;
  return (
    values.manufacturer != null ||
    values.model != null ||
    values.ratedPressureBarG != null ||
    values.ratedAirflowM3PerMin != null ||
    values.packageInputPowerKw != null ||
    values.motorShaftPowerKw != null ||
    values.controlType != null
  );
}

export function formatPrefillNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return String(Math.round(value * 100) / 100);
}

export interface SpecSheetFormFields {
  manufacturer: string;
  model: string;
  variant: string;
  pressure: string;
  airflow: string;
  packageInput: string;
  motorRating: string;
  controlType: string;
}

export function formFieldsFromExtracted(
  extracted: ExtractedSpecSheetValues | null | undefined,
  fallback: { manufacturer?: string; model?: string } = {},
): SpecSheetFormFields {
  const values = extracted ?? emptyExtractedSpecSheetValues();
  return {
    manufacturer: values.manufacturer ?? fallback.manufacturer ?? '',
    model: values.model ?? fallback.model ?? '',
    variant: values.modelVariant ?? '',
    pressure: formatPrefillNumber(values.ratedPressureBarG),
    airflow: formatPrefillNumber(values.ratedAirflowM3PerMin),
    packageInput: formatPrefillNumber(values.packageInputPowerKw),
    motorRating: formatPrefillNumber(values.motorShaftPowerKw),
    controlType: values.controlType ?? '',
  };
}
