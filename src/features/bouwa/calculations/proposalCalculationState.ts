/**
 * Editable proposal inputs, and nothing else.
 *
 * This module used to orchestrate a second scientific pipeline in the browser:
 * electrical input resolution, specific power, energy per cubic metre, annual
 * energy and cost, saving, payback and return. The accepted backend owns all of
 * those, and it releases each one only when the audit evidence it depends on is
 * present, so a browser copy could only ever disagree or answer where the
 * backend had deliberately declined to. The orchestration is retired; what
 * remains is the editing surface for the values an operator types in, together
 * with the reference values and provenance each one carries.
 */

import type { PowerBasis } from './compressorPerformance';

export type ProposalInputSource =
  | 'reference' | 'workbook' | 'audit' | 'logger' | 'manual'
  | 'customer_bill' | 'tariff_database' | 'manufacturer' | 'calculated';

export type ProposalReviewStatus = 'draft' | 'requires_review' | 'confirmed';
export type ProposalScenarioId = 'ingrain' | 'element-six';
export type CorrectionMethod = 'approved_loss' | 'standard_atmosphere_screening' | 'none_requires_review';

export interface EditableCalculationValue {
  key: string;
  label: string;
  value: string;
  unit: string;
  referenceValue: string;
  source: ProposalInputSource;
  referenceSource: ProposalInputSource;
  reviewStatus: ProposalReviewStatus;
  referenceReviewStatus: ProposalReviewStatus;
  notes?: string;
  isEdited: boolean;
}

export type ProposalCalculationInputs = Record<string, EditableCalculationValue>;

export const POWER_BASIS_OPTIONS: { value: PowerBasis; label: string }[] = [
  { value: 'measured_package_input', label: 'Measured package input' },
  { value: 'motor_shaft_output', label: 'Motor shaft output' },
  { value: 'nameplate_rated', label: 'Nameplate rated — review required' },
  { value: 'unknown_requires_review', label: 'Unknown — calculation incomplete' },
];

export const CORRECTION_METHOD_OPTIONS: { value: CorrectionMethod; label: string }[] = [
  { value: 'approved_loss', label: 'Approved proposal loss %' },
  { value: 'standard_atmosphere_screening', label: 'Standard-atmosphere screening' },
  { value: 'none_requires_review', label: 'Not selected — review required' },
];

export const ALTITUDE_UNIT_OPTIONS = [
  { value: 'm', label: 'metres (m)' },
  { value: 'ft', label: 'feet (ft)' },
] as const;

const input = (
  key: string, label: string, value: string | number, unit: string,
  source: ProposalInputSource, reviewStatus: ProposalReviewStatus = 'confirmed', notes?: string,
): EditableCalculationValue => ({
  key, label, value: String(value), unit, referenceValue: String(value),
  source, referenceSource: source, reviewStatus, referenceReviewStatus: reviewStatus,
  notes, isEdited: false,
});

export function createReferenceProposalInputs(scenario: ProposalScenarioId): ProposalCalculationInputs {
  const isE6 = scenario === 'element-six';
  return {
    existingModel: input('existingModel', 'Existing compressor model', isE6 ? 'ML250' : 'L160', '', 'reference'),
    existingFadM3Min: input('existingFadM3Min', 'Existing delivered FAD', isE6 ? 43.9 : 26.81, 'm³/min', 'audit'),
    existingKw: input('existingKw', 'Existing power', isE6 ? 250 : 184, 'kW', 'audit'),
    existingPowerBasis: input('existingPowerBasis', 'Existing power basis', 'measured_package_input', '', 'audit'),
    existingMotorEfficiency: input('existingMotorEfficiency', 'Existing motor efficiency', isE6 ? 94 : 87, '%', 'workbook', 'requires_review'),
    existingPressureBar: input('existingPressureBar', 'Existing pressure', 7.5, 'bar(g)', 'audit'),
    loadedPct: input('loadedPct', 'Loaded operation', isE6 ? 100 : 82, '%', 'audit'),
    unloadedPct: input('unloadedPct', 'Unloaded operation', isE6 ? 0 : 18, '%', 'audit'),
    proposedModel: input('proposedModel', 'Proposed Bouwa model', isE6 ? 'SVC-RS132A-II' : 'SVC-RS132-II', '', 'manufacturer', 'requires_review'),
    proposedBaseModel: input('proposedBaseModel', 'Base model', 'SVC-RS132-II', '', 'manufacturer', 'requires_review'),
    coolingType: input('coolingType', 'Cooling type', isE6 ? 'Air cooled' : 'TBC', '', 'manufacturer', 'requires_review'),
    proposedSeaLevelFadM3Min: input('proposedSeaLevelFadM3Min', 'Proposed sea-level FAD', isE6 ? 30.1 : 28.4, 'm³/min', 'manufacturer', 'requires_review'),
    proposedKw: input('proposedKw', 'Proposed power', isE6 ? 132 : 151.8, 'kW', 'workbook', 'requires_review'),
    proposedPowerBasis: input('proposedPowerBasis', 'Proposed power basis', 'nameplate_rated', '', 'manufacturer', 'requires_review'),
    proposedMotorEfficiency: input('proposedMotorEfficiency', 'Proposed motor efficiency', 96, '%', 'workbook', 'requires_review'),
    altitudeM: input('altitudeM', 'Altitude', isE6 ? 1627 : 10, 'm', isE6 ? 'workbook' : 'audit'),
    altitudeUnit: input('altitudeUnit', 'Altitude unit', 'm', '', 'reference'),
    ambientTempC: input('ambientTempC', 'Ambient temperature', isE6 ? 25 : 21, '°C', 'audit'),
    correctionMethod: input('correctionMethod', 'Site correction method', isE6 ? 'approved_loss' : 'standard_atmosphere_screening', '', 'reference', isE6 ? 'confirmed' : 'requires_review'),
    altitudeLossPct: input('altitudeLossPct', 'Approved altitude loss', isE6 ? 20 : 0, '%', isE6 ? 'reference' : 'audit', isE6 ? 'confirmed' : 'requires_review'),
    tariffSource: input('tariffSource', 'Tariff source', 'estimate', '', 'workbook', 'requires_review', 'Historical workbook value is a seed only; confirm a current tariff source.'),
    tariffConfidence: input('tariffConfidence', 'Tariff confidence', 'estimate', '', 'reference', 'requires_review'),
    blendedRate: input('blendedRate', 'Blended electricity rate', isE6 ? 1.5 : 2, 'R/kWh', 'workbook', 'requires_review'),
    peakRate: input('peakRate', 'Peak rate', isE6 ? 1.9646 : 2.7678, 'R/kWh', 'workbook', 'requires_review'),
    standardRate: input('standardRate', 'Standard rate', isE6 ? 1.3524 : 1.5562, 'R/kWh', 'workbook', 'requires_review'),
    offPeakRate: input('offPeakRate', 'Off-peak rate', isE6 ? 0.859 : 1.1115, 'R/kWh', 'workbook', 'requires_review'),
    vatTreatment: input('vatTreatment', 'VAT treatment', 'unknown', '', 'workbook', 'requires_review'),
    demandCharge: input('demandCharge', 'Demand charge', 'Not available', 'R/kVA/month', 'reference', 'draft'),
    annualDays: input('annualDays', 'Annual days', 365, 'days', 'reference'),
    annualOperatingHours: input('annualOperatingHours', 'Annual operating hours', isE6 ? 8736 : 8760, 'h/year', 'reference', 'requires_review'),
    hoursPerDay: input('hoursPerDay', 'Hours per day', 24, 'h/day', 'reference'),
    unitPrice: input('unitPrice', 'Machine unit price', isE6 ? 838350 : 984810, 'R', 'workbook', 'requires_review'),
    quantity: input('quantity', 'Machine quantity', isE6 ? 1 : 2, '', 'workbook'),
    buyBack: input('buyBack', 'Buy-back total', isE6 ? 320000 : 130000, 'R', 'workbook', 'requires_review'),
    installation: input('installation', 'Installation cost', 0, 'R', 'manual', 'draft'),
    refurbishment: input('refurbishment', 'Refurbishment cost', 0, 'R', 'workbook', 'requires_review'),
    otherCosts: input('otherCosts', 'Other approved costs', isE6 ? 0 : 458240, 'R', 'workbook', 'requires_review'),
  };
}

export function updateProposalInput(inputs: ProposalCalculationInputs, key: string, value: string): ProposalCalculationInputs {
  const current = inputs[key];
  if (!current) return inputs;
  const isEdited = value !== current.referenceValue;
  return {
    ...inputs,
    [key]: {
      ...current,
      value,
      isEdited,
      source: isEdited ? 'manual' : current.referenceSource,
      reviewStatus: isEdited ? 'requires_review' : current.referenceReviewStatus,
    },
  };
}

export function readNumericInput(inputs: ProposalCalculationInputs, key: string): number | null {
  const inputValue = inputs[key];
  if (!inputValue || inputValue.value.trim() === '') return null;
  const parsed = Number(inputValue.value.replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}
