/**
 * Frontend-only editable proposal inputs and calculation orchestration.
 * Historical workbook values seed comparison scenarios; active outputs are
 * calculated only through controlled first-principles helpers.
 */

import { applyApprovedFadLoss, applyFirstPrinciplesSiteCorrection } from './altitudeCorrection';
import {
  calcFirstPrinciplesPerformance, resolveEffectiveInputPower,
  type PowerBasis,
} from './compressorPerformance';
import { calcFirstPrinciplesAnnualCost, calcFirstPrinciplesSavings } from './energyCostEngine';
import { calcRoi } from './roiEngine';
import { ftToM } from './unitConversions';

export type ProposalInputSource =
  | 'reference' | 'workbook' | 'audit' | 'logger' | 'manual'
  | 'customer_bill' | 'tariff_database' | 'manufacturer' | 'calculated';

export type ProposalReviewStatus = 'draft' | 'requires_review' | 'confirmed';
export type ProposalScenarioId = 'ingrain' | 'element-six';
export type CorrectionMethod = 'approved_loss' | 'standard_atmosphere_screening' | 'none_requires_review';
export type ProposalCalculationStatus = 'complete' | 'requires_review' | 'incomplete';

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

export interface ProposalCalculationResults {
  status: ProposalCalculationStatus;
  messages: string[];
  existingElectricalInputKw: number | null;
  proposedElectricalInputKw: number | null;
  existingM3Hour: number | null;
  proposedM3Hour: number | null;
  proposedCorrectedFad: number | null;
  correctionLossPct: number | null;
  existingSpecificPower: number | null;
  proposedSpecificPower: number | null;
  existingEnergyPerM3: number | null;
  proposedEnergyPerM3: number | null;
  existingCostPerM3: number | null;
  proposedCostPerM3: number | null;
  existingAnnualEnergyKwh: number | null;
  proposedAnnualEnergyKwh: number | null;
  annualEnergySavingKwh: number | null;
  existingAnnualCost: number | null;
  proposedAnnualCost: number | null;
  annualSaving: number | null;
  savingPct: number | null;
  netInvestment: number | null;
  roiPct: number | null;
  paybackMonths: number | null;
}

export function calculateProposal(inputs: ProposalCalculationInputs): ProposalCalculationResults {
  const n = (key: string) => readNumericInput(inputs, key);
  const messages: string[] = [];
  let requiresReview = Object.values(inputs).some(value => value.reviewStatus === 'requires_review');

  const existingPower = resolveEffectiveInputPower(
    n('existingKw'), inputs.existingPowerBasis.value as PowerBasis, n('existingMotorEfficiency'),
  );
  const proposedPower = resolveEffectiveInputPower(
    n('proposedKw'), inputs.proposedPowerBasis.value as PowerBasis, n('proposedMotorEfficiency'),
  );
  if (existingPower.status !== 'complete') messages.push(`Existing machine: ${existingPower.note}`);
  if (proposedPower.status !== 'complete') messages.push(`Proposed machine: ${proposedPower.note}`);
  requiresReview ||= existingPower.status === 'requires-review' || proposedPower.status === 'requires-review';

  const seaLevelFad = n('proposedSeaLevelFadM3Min');
  const correctionMethod = inputs.correctionMethod.value as CorrectionMethod;
  const altitudeValue = n('altitudeM');
  const altitudeM = altitudeValue === null ? null : inputs.altitudeUnit.value === 'ft' ? ftToM(altitudeValue) : inputs.altitudeUnit.value === 'm' ? altitudeValue : null;
  const approvedLossPct = n('altitudeLossPct');
  const ambientTempC = n('ambientTempC');
  const correction = correctionMethod === 'approved_loss'
    ? (seaLevelFad === null || approvedLossPct === null ? null : applyApprovedFadLoss(seaLevelFad, approvedLossPct))
    : correctionMethod === 'standard_atmosphere_screening'
      ? (seaLevelFad === null || altitudeM === null || ambientTempC === null ? null : applyFirstPrinciplesSiteCorrection(seaLevelFad, altitudeM, ambientTempC))
      : null;
  if (!correction) messages.push(correctionMethod === 'none_requires_review' ? 'Site correction method requires review.' : 'Site correction inputs are missing or invalid.');
  if (correctionMethod === 'standard_atmosphere_screening') requiresReview = true;

  const tariffRate = n('blendedRate');
  if (tariffRate === null || tariffRate < 0) messages.push('Blended tariff rate is missing or invalid.');
  const annualHours = n('annualOperatingHours');
  if (annualHours === null || annualHours <= 0) messages.push('Annual operating hours are missing or invalid.');

  const existingFad = n('existingFadM3Min');
  const existingPerformance = existingPower.electricalInputKw === null || existingFad === null
    ? null : calcFirstPrinciplesPerformance(existingPower.electricalInputKw, existingFad, tariffRate);
  const proposedPerformance = proposedPower.electricalInputKw === null || !correction
    ? null : calcFirstPrinciplesPerformance(proposedPower.electricalInputKw, correction.correctedFadM3Min, tariffRate);
  if (!existingPerformance) messages.push('Existing delivered FAD is missing or invalid.');
  if (!proposedPerformance && correction) messages.push('Proposed performance inputs are incomplete.');

  const existingAnnual = existingPower.electricalInputKw !== null && annualHours !== null && tariffRate !== null
    ? calcFirstPrinciplesAnnualCost(existingPower.electricalInputKw, annualHours, tariffRate) : null;
  const proposedAnnual = proposedPower.electricalInputKw !== null && annualHours !== null && tariffRate !== null
    ? calcFirstPrinciplesAnnualCost(proposedPower.electricalInputKw, annualHours, tariffRate) : null;
  const savings = existingAnnual && proposedAnnual
    ? calcFirstPrinciplesSavings(existingAnnual.annualEnergyKwh, proposedAnnual.annualEnergyKwh, existingAnnual.annualEnergyCostR, proposedAnnual.annualEnergyCostR)
    : null;

  const commercialValues = ['unitPrice', 'quantity', 'buyBack', 'installation', 'refurbishment', 'otherCosts'].map(n);
  const roiCandidate = savings && commercialValues.every(value => value !== null) && savings.annualCostSavingR > 0
    ? calcRoi({
        unitPriceR: commercialValues[0]!, quantity: commercialValues[1]!, buyBackR: commercialValues[2]!,
        refurbishmentR: commercialValues[4]!, otherCostsR: commercialValues[3]! + commercialValues[5]!,
        annualSavingR: savings.annualCostSavingR, vatExcluded: inputs.vatTreatment.value.toLowerCase() === 'excluded',
      })
    : null;
  const roi = roiCandidate && roiCandidate.netInitialInvestmentR > 0 ? roiCandidate : null;
  if (!commercialValues.every(value => value !== null)) messages.push('ROI commercial inputs are incomplete.');
  if (savings && savings.annualCostSavingR <= 0) messages.push('Annual saving is not positive; ROI and payback are not applicable.');
  if (roiCandidate && roiCandidate.netInitialInvestmentR <= 0) messages.push('Net investment is not positive; ROI and payback are not applicable.');

  const incomplete = existingPower.status === 'incomplete' || proposedPower.status === 'incomplete' || !correction || !existingPerformance || !proposedPerformance || !existingAnnual || !proposedAnnual || !savings;
  const status: ProposalCalculationStatus = incomplete ? 'incomplete' : requiresReview ? 'requires_review' : 'complete';

  return {
    status, messages,
    existingElectricalInputKw: existingPower.electricalInputKw,
    proposedElectricalInputKw: proposedPower.electricalInputKw,
    existingM3Hour: existingPerformance?.outputM3PerHour ?? null,
    proposedM3Hour: proposedPerformance?.outputM3PerHour ?? null,
    proposedCorrectedFad: correction?.correctedFadM3Min ?? null,
    correctionLossPct: correction?.lossPct ?? null,
    existingSpecificPower: existingPerformance?.kwPerM3Min ?? null,
    proposedSpecificPower: proposedPerformance?.kwPerM3Min ?? null,
    existingEnergyPerM3: existingPerformance?.kwhPerM3 ?? null,
    proposedEnergyPerM3: proposedPerformance?.kwhPerM3 ?? null,
    existingCostPerM3: existingPerformance?.costPerM3 ?? null,
    proposedCostPerM3: proposedPerformance?.costPerM3 ?? null,
    existingAnnualEnergyKwh: existingAnnual?.annualEnergyKwh ?? null,
    proposedAnnualEnergyKwh: proposedAnnual?.annualEnergyKwh ?? null,
    annualEnergySavingKwh: savings?.annualEnergySavingKwh ?? null,
    existingAnnualCost: existingAnnual?.annualEnergyCostR ?? null,
    proposedAnnualCost: proposedAnnual?.annualEnergyCostR ?? null,
    annualSaving: savings?.annualCostSavingR ?? null,
    savingPct: savings?.savingPct ?? null,
    netInvestment: roi?.netInitialInvestmentR ?? null,
    roiPct: roi?.roiPct ?? null,
    paybackMonths: roi?.paybackMonths ?? null,
  };
}
