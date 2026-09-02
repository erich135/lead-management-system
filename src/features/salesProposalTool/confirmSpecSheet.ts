import type { SourceBackedSpec } from './types';

export type SpecSheetConfirmTarget = 'current' | 'proposed';

export const CONFIRM_SPEC_BUTTON_LABEL =
  'Confirm specification and add to Machine Spec Library';

export const PROPOSAL_ONLY_LIBRARY_STATUS =
  'Proposal only / not yet in Machine Spec Library';

export const LIBRARY_ADDED_STATUS = 'Specification added to Machine Spec Library';

export const LIBRARY_USING_STATUS = 'Using Machine Spec Library record';

export const AUTHORITATIVE_SOURCE_CONFIRMATION_NOTE =
  'I confirm this uploaded document is an authoritative manufacturer/CAGI/approved technical source and I have checked the displayed values against that source.';

export interface SpecSheetConfirmInput {
  target: SpecSheetConfirmTarget;
  currentEquipmentId?: string | null;
  sourceFileId: string;
  sourceFileName: string;
  sourceSha256: string | null;
  manufacturer: string;
  model: string;
  modelVariant: string | null;
  ratedPressureBarG: number | null;
  ratedAirflowM3PerMin: number | null;
  packageInputPowerKw: number | null;
  motorShaftPowerKw: number | null;
  controlType: string | null;
}

export interface SpecSheetConfirmPayload extends SpecSheetConfirmInput {
  authoritativeSourceConfirmed: true;
}

const FORBIDDEN_CONFIRM_KEYS = [
  'estimatedSiteAirflowM3PerMin',
  'siteAltitudeMetres',
  'annualOperatingHours',
  'averageLoadPercent',
  'operatingAssumptions',
  'estimatedAnnualKwh',
  'flatRateRandPerKwh',
  'electricityBasis',
  'commercialOffer',
  'equipmentPrice',
  'deliveredVolumeM3',
  'highestAirflowM3PerMin',
  'recordedPressureBar',
] as const;

export function buildSpecSheetConfirmPayload(
  input: SpecSheetConfirmInput,
): SpecSheetConfirmPayload {
  return {
    target: input.target,
    currentEquipmentId:
      input.target === 'current' ? input.currentEquipmentId ?? null : null,
    sourceFileId: input.sourceFileId,
    sourceFileName: input.sourceFileName,
    sourceSha256: input.sourceSha256,
    manufacturer: input.manufacturer,
    model: input.model,
    modelVariant: input.modelVariant,
    ratedPressureBarG: input.ratedPressureBarG,
    ratedAirflowM3PerMin: input.ratedAirflowM3PerMin,
    packageInputPowerKw: input.packageInputPowerKw,
    motorShaftPowerKw: input.motorShaftPowerKw,
    controlType: input.controlType,
    authoritativeSourceConfirmed: true,
  };
}

export function specSheetConfirmPayloadKeys(
  payload: SpecSheetConfirmPayload,
): string[] {
  return Object.keys(payload);
}

export function confirmPayloadContainsForbiddenField(
  payload: SpecSheetConfirmPayload,
): boolean {
  const keys = specSheetConfirmPayloadKeys(payload);
  return FORBIDDEN_CONFIRM_KEYS.some((key) => keys.includes(key));
}

export function sourceBackedFromConfirmInput(
  input: SpecSheetConfirmInput,
): SourceBackedSpec {
  return {
    manufacturer: input.manufacturer,
    model: input.model,
    modelVariant: input.modelVariant,
    ratedPressureBarG: input.ratedPressureBarG,
    ratedAirflowM3PerMin: input.ratedAirflowM3PerMin,
    packageInputPowerKw: input.packageInputPowerKw,
    motorShaftPowerKw: input.motorShaftPowerKw,
    controlType: input.controlType,
    sourceFileName: input.sourceFileName,
    sourceFileId: input.sourceFileId,
    sourceSha256: input.sourceSha256,
  };
}
