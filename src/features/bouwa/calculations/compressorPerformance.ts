/**
 * Bouwa — Compressor Performance Calculator
 * Phase 4D-18
 *
 * Formula basis from Ingrain L160.xlsx — Report sheet:
 *   kWh/m³ = kW / (motorEfficiency × outputM3H)    [where outputM3H = fadM3Min × 60]
 *   costPerM3 = kWh/m³ × tariffRateRkWh
 *
 * The workbook uses this for both L160 and Bouwa comparison.
 */

import type { CompressorSpec, AuditMeasurement, CompressorPerformanceResult } from './bouwaTypes';
import { m3MinToM3H } from './unitConversions';

export type PowerBasis =
  | 'measured_package_input'
  | 'motor_shaft_output'
  | 'nameplate_rated'
  | 'unknown_requires_review';

export interface EffectiveInputPowerResult {
  electricalInputKw: number | null;
  status: 'complete' | 'requires-review' | 'incomplete';
  note: string;
}

/**
 * Resolve electrical package input from an explicitly declared power basis.
 * Measured package input already includes motor losses and is never efficiency-adjusted.
 */
export function resolveEffectiveInputPower(
  powerKw: number | null,
  powerBasis: PowerBasis,
  motorEfficiencyPct: number | null,
): EffectiveInputPowerResult {
  if (powerKw === null || !Number.isFinite(powerKw) || powerKw <= 0) {
    return { electricalInputKw: null, status: 'incomplete', note: 'Missing or invalid power input.' };
  }
  if (motorEfficiencyPct === null || !Number.isFinite(motorEfficiencyPct) || motorEfficiencyPct <= 0 || motorEfficiencyPct > 100) {
    return { electricalInputKw: null, status: 'incomplete', note: 'A valid motor efficiency is required.' };
  }

  if (powerBasis === 'measured_package_input') {
    return { electricalInputKw: powerKw, status: 'complete', note: 'Measured package input used directly; no motor-efficiency adjustment applied.' };
  }

  if (powerBasis === 'motor_shaft_output') {
    return {
      electricalInputKw: powerKw / (motorEfficiencyPct / 100),
      status: 'complete',
      note: 'Electrical input derived from shaft output divided by motor efficiency.',
    };
  }

  if (powerBasis === 'nameplate_rated') {
    return { electricalInputKw: powerKw, status: 'requires-review', note: 'Nameplate power is a low-confidence fallback and requires review.' };
  }

  return { electricalInputKw: null, status: 'incomplete', note: 'Power basis is unknown and requires review.' };
}

export interface FirstPrinciplesPerformanceResult {
  outputM3PerHour: number;
  kwPerM3Min: number;
  kwhPerM3: number;
  costPerM3: number | null;
}

/** Stable-operating-point performance from electrical input and delivered FAD. */
export function calcFirstPrinciplesPerformance(
  electricalInputKw: number,
  deliveredFadM3Min: number,
  energyRateRPerKwh: number | null,
): FirstPrinciplesPerformanceResult | null {
  if (!Number.isFinite(electricalInputKw) || electricalInputKw <= 0 || !Number.isFinite(deliveredFadM3Min) || deliveredFadM3Min <= 0) {
    return null;
  }
  const outputM3PerHour = m3MinToM3H(deliveredFadM3Min);
  const kwPerM3Min = electricalInputKw / deliveredFadM3Min;
  const kwhPerM3 = electricalInputKw / outputM3PerHour;
  return {
    outputM3PerHour,
    kwPerM3Min,
    kwhPerM3,
    costPerM3: energyRateRPerKwh !== null && Number.isFinite(energyRateRPerKwh) && energyRateRPerKwh >= 0
      ? kwhPerM3 * energyRateRPerKwh
      : null,
  };
}

/**
 * Calculate compressor performance metrics.
 *
 * @param spec       - Manufacturer spec (rated conditions)
 * @param audit      - Measured audit values (site conditions)
 * @param tariffRkWh - Blended or applicable tariff rate R/kWh
 */
export function calcCompressorPerformance(
  spec: CompressorSpec,
  audit: AuditMeasurement,
  tariffRkWh: number,
): CompressorPerformanceResult {
  const outputM3H    = m3MinToM3H(audit.measuredFadM3Min);
  const motorEff     = spec.motorEfficiency;                // 0–1
  const effectiveKw  = audit.measuredKw;                    // Measured package input kW

  // kWh/m³ — motor efficiency adjusted (workbook formula)
  const kwhPerM3 = motorEff > 0 && outputM3H > 0
    ? effectiveKw / (motorEff * outputM3H)
    : 0;

  // Cost per m³ compressed air
  const costPerM3 = kwhPerM3 * tariffRkWh;

  // Standard kW/m³/min (direct ratio without motor efficiency)
  const kwPerM3Min = audit.measuredFadM3Min > 0
    ? effectiveKw / audit.measuredFadM3Min
    : 0;

  return {
    compressorId:    spec.id,
    effectiveInputKw: effectiveKw,
    outputM3PerHour:  outputM3H,
    kwPerM3Min:       parseFloat(kwPerM3Min.toFixed(4)),
    kwHPerM3:         parseFloat(kwhPerM3.toFixed(6)),
    costPerM3:        parseFloat(costPerM3.toFixed(4)),
    ratedFadM3Min:    spec.ratedFadM3Min,
    measuredFadM3Min: audit.measuredFadM3Min,
    motorEfficiency:  motorEff,
    source:           audit.source,
  };
}

/**
 * Calculate how many machines are required and spare capacity.
 */
export function calcMachineRequirement(
  demandM3Min: number,
  machineOutputM3Min: number,
): { quantityRequired: number; quantityActual: number; spareCapacityM3H: number } {
  if (machineOutputM3Min <= 0) return { quantityRequired: 0, quantityActual: 0, spareCapacityM3H: 0 };
  const raw = demandM3Min / machineOutputM3Min;
  const quantityActual = Math.ceil(raw);
  const spareCapacityM3H = m3MinToM3H(quantityActual * machineOutputM3Min - demandM3Min);
  return { quantityRequired: parseFloat(raw.toFixed(2)), quantityActual, spareCapacityM3H };
}

/** Efficiency improvement % between two machines */
export function calcEfficiencyImprovement(
  currentKwhPerM3: number,
  proposedKwhPerM3: number,
): number {
  if (currentKwhPerM3 <= 0) return 0;
  return parseFloat(((1 - proposedKwhPerM3 / currentKwhPerM3) * 100).toFixed(2));
}
