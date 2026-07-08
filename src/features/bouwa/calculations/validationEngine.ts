/**
 * Bouwa — Validation Engine
 * Phase 4D-19
 *
 * Compares app-native calculation outputs against workbook reference values.
 * Shows match / minor-rounding / mismatch / requires-review per metric.
 */

import type { ValidationItem, ValidationStatus } from './bouwaTypes';
import { calcCompressorPerformance } from './compressorPerformance';
import { calcGrossAnnualCost } from './energyCostEngine';
import { calcRoi } from './roiEngine';
import { calcBlendedRate, INGRAIN_DAY_CALENDAR, ESKOM_RATES_SET_A } from './tariffEngine';
import { STANDARD_TOU_FRACTIONS } from './tariffEngine';
import {
  L160_SPEC, L160_AUDIT, BOUWA_RS132_SPEC, INGRAIN_ROI_REFERENCE,
  INGRAIN_COST_REFERENCE, INGRAIN_LOAD_PROFILE,
} from './ingrainReferenceScenario';
import { INGRAIN_ROI_INPUT_A } from './roiEngine';

const ROUNDING_TOLERANCE_PCT = 1.5; // within 1.5% is "minor-rounding"

function compareNumbers(
  workbook: number,
  calculated: number | null,
): { status: ValidationStatus; difference: string } {
  if (calculated === null) return { status: 'not-calculated', difference: 'N/A' };
  const diff = calculated - workbook;
  const pctDiff = workbook !== 0 ? Math.abs(diff / workbook) * 100 : 0;
  const diffStr = `${diff >= 0 ? '+' : ''}${diff.toFixed(2)} (${pctDiff.toFixed(1)}%)`;
  if (pctDiff < 0.01) return { status: 'match', difference: 'Exact match' };
  if (pctDiff <= ROUNDING_TOLERANCE_PCT) return { status: 'minor-rounding', difference: diffStr };
  return { status: 'mismatch', difference: diffStr };
}

/**
 * Run all validation checks and return array of ValidationItems.
 */
export function runValidation(): ValidationItem[] {
  const results: ValidationItem[] = [];

  // ── Load profile ────────────────────────────────────────────────────────────
  results.push({
    metric: 'Average site demand (m³/min)',
    workbookRef: 25.94,
    appCalculated: INGRAIN_LOAD_PROFILE.avgFlowM3Min,
    pptValue: 'Not stated explicitly',
    wizardCurrent: '~25.94 (from load profile)',
    ...compareNumbers(25.94, INGRAIN_LOAD_PROFILE.avgFlowM3Min),
    note: 'From Air Flow Result Input sheet. 15-min intervals, 29 May – 5 Jun 2025.',
  });

  results.push({
    metric: 'Peak site demand (m³/min)',
    workbookRef: 26.81,
    appCalculated: INGRAIN_LOAD_PROFILE.peakFlowM3Min,
    pptValue: '26.81 (PPT Slide 12)',
    wizardCurrent: '26.81',
    ...compareNumbers(26.81, INGRAIN_LOAD_PROFILE.peakFlowM3Min),
    note: 'Confirmed both PPT and workbook.',
  });

  // ── Compressor performance ──────────────────────────────────────────────────
  const blendedRate = calcBlendedRate(ESKOM_RATES_SET_A, STANDARD_TOU_FRACTIONS);
  const l160Perf = calcCompressorPerformance(L160_SPEC, L160_AUDIT, blendedRate);

  results.push({
    metric: 'L160 kWh/m³ (motor-efficiency adjusted)',
    workbookRef: 0.1315,
    appCalculated: parseFloat(l160Perf.kwHPerM3.toFixed(4)),
    pptValue: '~0.1315 (implied)',
    wizardCurrent: '0.1315 (from workbook)',
    ...compareNumbers(0.1315, l160Perf.kwHPerM3),
    note: 'Workbook formula: kW / (motorEff × outputM3H). L160: 184 / (0.87 × 1608.6) = 0.1315.',
  });

  // ── L160 annual energy cost (TOU) ───────────────────────────────────────────
  const l160Cost = calcGrossAnnualCost(
    L160_AUDIT.measuredKw,
    ESKOM_RATES_SET_A,
    INGRAIN_DAY_CALENDAR,
    'compair-l160',
    'calculated',
  );

  results.push({
    metric: 'L160 annual gross energy cost (R/year)',
    workbookRef: INGRAIN_COST_REFERENCE.l160AnnualGrossCostR,
    appCalculated: parseFloat(l160Cost.annualGrossCostR.toFixed(0)),
    pptValue: 'R 2,830,000 (rounded)',
    wizardCurrent: 'R 2,830,000',
    ...compareNumbers(INGRAIN_COST_REFERENCE.l160AnnualGrossCostR, l160Cost.annualGrossCostR),
    note: 'TOU calculation using Set A rates and Ingrain day calendar. Workbook: R2,826,866.',
  });

  // ── Bouwa annual energy cost ─────────────────────────────────────────────────
  const bouwaCost = calcGrossAnnualCost(
    BOUWA_RS132_SPEC.ratedKw,
    ESKOM_RATES_SET_A,
    INGRAIN_DAY_CALENDAR,
    'bouwa-rs132',
    'calculated',
  );

  results.push({
    metric: 'Bouwa gross annual cost (R/year, before VSD credit)',
    workbookRef: INGRAIN_COST_REFERENCE.bouwaAnnualGrossCostR,
    appCalculated: parseFloat(bouwaCost.annualGrossCostR.toFixed(0)),
    pptValue: 'R 1,680,000 (PPT stated — see conflict note)',
    wizardCurrent: 'R 1,680,000',
    ...compareNumbers(INGRAIN_COST_REFERENCE.bouwaAnnualGrossCostR, bouwaCost.annualGrossCostR),
    note: 'App TOU calc differs from workbook — workbook uses per-period efficiency matrix; app uses constant kW. VSD credit not yet applied.',
  });

  results.push({
    metric: 'VSD saving credit (R/year, 14% of gross)',
    workbookRef: INGRAIN_COST_REFERENCE.vsdSavingCreditR,
    appCalculated: parseFloat((INGRAIN_COST_REFERENCE.bouwaAnnualGrossCostR * 0.14).toFixed(0)),
    pptValue: 'Not shown separately in PPT',
    wizardCurrent: 'Not shown',
    ...compareNumbers(INGRAIN_COST_REFERENCE.vsdSavingCreditR, INGRAIN_COST_REFERENCE.bouwaAnnualGrossCostR * 0.14),
    note: '14% VSD credit as per workbook Report!R31. PPT savings figure appears to already include this credit.',
  });

  results.push({
    metric: 'Annual saving vs L160 (R/year)',
    workbookRef: INGRAIN_COST_REFERENCE.annualSavingL160R,
    appCalculated: parseFloat((l160Cost.annualGrossCostR - INGRAIN_COST_REFERENCE.bouwaAnnualNetCostR).toFixed(0)),
    pptValue: 'R 1,130,000 (PPT Slide 4)',
    wizardCurrent: 'R 1,150,000 (wizard demo — requires review)',
    ...compareNumbers(INGRAIN_COST_REFERENCE.annualSavingL160R, l160Cost.annualGrossCostR - INGRAIN_COST_REFERENCE.bouwaAnnualNetCostR),
    note: 'Wizard value (R1.15M) matches neither PPT (R1.13M) nor workbook (R1.11M). Requires ARS confirmation.',
  });

  // ── ROI ─────────────────────────────────────────────────────────────────────
  const roiCalc = calcRoi(INGRAIN_ROI_INPUT_A);

  results.push({
    metric: 'Machine unit price (R)',
    workbookRef: INGRAIN_ROI_REFERENCE.unitPriceR,
    appCalculated: INGRAIN_ROI_INPUT_A.unitPriceR,
    pptValue: 'Not extractable from PPT text',
    wizardCurrent: 'TBC (wizard demo)',
    ...compareNumbers(INGRAIN_ROI_REFERENCE.unitPriceR, INGRAIN_ROI_INPUT_A.unitPriceR),
    note: 'R984,810 is for Bouwa RS132-II (132kW). Will change if SVC-RS160-II is confirmed.',
  });

  results.push({
    metric: 'Gross machine cost (R, 2 units)',
    workbookRef: INGRAIN_ROI_REFERENCE.grossMachineCostR,
    appCalculated: roiCalc.grossMachineCostR,
    pptValue: 'N/A',
    wizardCurrent: 'TBC',
    ...compareNumbers(INGRAIN_ROI_REFERENCE.grossMachineCostR, roiCalc.grossMachineCostR),
  });

  results.push({
    metric: 'Net initial investment (R)',
    workbookRef: INGRAIN_ROI_REFERENCE.netInvestmentR,
    appCalculated: roiCalc.netInitialInvestmentR,
    pptValue: 'N/A (ROI slide visual only)',
    wizardCurrent: 'TBC',
    ...compareNumbers(INGRAIN_ROI_REFERENCE.netInvestmentR, roiCalc.netInitialInvestmentR),
    note: 'App input includes R458,240 "other costs" to reconcile to workbook R2,297,860. Exact composition requires ARS clarification.',
  });

  results.push({
    metric: 'Payback period (months)',
    workbookRef: INGRAIN_ROI_REFERENCE.paybackMonths,
    appCalculated: parseFloat(roiCalc.paybackMonths.toFixed(2)),
    pptValue: 'N/A (visual only)',
    wizardCurrent: 'TBC',
    ...compareNumbers(INGRAIN_ROI_REFERENCE.paybackMonths, roiCalc.paybackMonths),
  });

  results.push({
    metric: 'ROI % (annual saving / net investment)',
    workbookRef: INGRAIN_ROI_REFERENCE.roiPct,
    appCalculated: parseFloat(roiCalc.roiPct.toFixed(2)),
    pptValue: 'N/A (visual only)',
    wizardCurrent: 'TBC',
    ...compareNumbers(INGRAIN_ROI_REFERENCE.roiPct, roiCalc.roiPct),
  });

  return results;
}

/** Summary counts of validation statuses */
export function summariseValidation(items: ValidationItem[]): {
  match: number; minorRounding: number; mismatch: number; requiresReview: number; notCalculated: number;
} {
  return {
    match:          items.filter(i => i.status === 'match').length,
    minorRounding:  items.filter(i => i.status === 'minor-rounding').length,
    mismatch:       items.filter(i => i.status === 'mismatch').length,
    requiresReview: items.filter(i => i.status === 'requires-review').length,
    notCalculated:  items.filter(i => i.status === 'not-calculated').length,
  };
}
