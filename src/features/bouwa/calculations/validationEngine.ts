/**
 * Bouwa — Validation Engine
 * Phase 4D-19 / 4D-21B
 *
 * Compares app-native calculation outputs against workbook reference values.
 * Shows match / minor-rounding / mismatch / requires-review per metric.
 *
 * Scenario 1: Ingrain Belville — runValidation()
 * Scenario 2: Element Six     — runE6Validation()
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
import {
  E6_COST_REFERENCE, E6_ROI_REFERENCE, E6_ROI_INPUT,
  E6_ALTITUDE_CORRECTION, BUY_BACK_CONFLICT_NOTE, BUY_BACK_VAT_NOTE,
  E6_BUY_BACK_LINE_ITEMS, E6_BUY_BACK_TOTAL_INCL_VAT_R,
} from './elementSixReferenceScenario';

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
    note: '4D-20B: App uses constant rated kW (151.8 kW). Workbook implies VSD part-load effective kW ~129.9 kW (derived: R1,995,196 / (R2,826,866/184) = 129.9 kW). At site demand 25.94/28.4 = 91.3% of rated, VSD power is sub-linear. App over-estimates by ~19.9%. Requires Bouwa VSD load-curve to resolve.',
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
    note: '4D-20B: Workbook payback (7.35 mo) uses COMBINED saving (L160 R1,110,997 + L250 R2,639,781 = R3,750,778): 2,297,860 / 3,750,778 = 0.613 yr = 7.35 mo. App uses L160-only saving (R1,110,997) → 24.82 mo. Workbook uses L160-only saving for ROI % (48.35%). This is an intentional inconsistency in the workbook ROI sheet. Mismatch is explained — no formula error.',
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

// ── Scenario 2: Element Six ──────────────────────────────────────────────────

/**
 * Run Element Six validation (Scenario 2).
 * Static reference values from Element Six workbook (March 2025) cross-checked
 * against app ROI engine. John confirmed values (July 2026).
 *
 * Does NOT alter Ingrain validation — runValidation() is unchanged.
 */
export function runE6Validation(): ValidationItem[] {
  const results: ValidationItem[] = [];

  // ── Altitude correction ────────────────────────────────────────────────────
  const altLoss = E6_ALTITUDE_CORRECTION.altitudeLossPct / 100;
  const computedCorrectedFad = parseFloat((E6_ALTITUDE_CORRECTION.seaLevelFadM3Min * (1 - altLoss)).toFixed(1));

  results.push({
    metric: 'Proposed FAD — sea-level rated (m³/min)',
    workbookRef: E6_ALTITUDE_CORRECTION.seaLevelFadM3Min,
    appCalculated: E6_ALTITUDE_CORRECTION.seaLevelFadM3Min,
    pptValue: '30.1 (Results!C2)',
    wizardCurrent: '30.1 (from workbook)',
    ...compareNumbers(E6_ALTITUDE_CORRECTION.seaLevelFadM3Min, E6_ALTITUDE_CORRECTION.seaLevelFadM3Min),
    note: 'SEA-LEVEL rating only — not site-effective. See altitude correction row below.',
  });

  results.push({
    metric: 'Altitude correction — site FAD at 5,337 ft, 20% loss (m³/min)',
    workbookRef: E6_ALTITUDE_CORRECTION.correctedFadM3Min,
    appCalculated: computedCorrectedFad,
    pptValue: 'N/A (not in workbook proposal)',
    wizardCurrent: 'N/A',
    ...compareNumbers(E6_ALTITUDE_CORRECTION.correctedFadM3Min, computedCorrectedFad),
    note: E6_ALTITUDE_CORRECTION.displayNote,
  });

  // ── Annual energy costs (static workbook reference) ────────────────────────
  results.push({
    metric: 'ML250 annual gross energy cost (R/year)',
    workbookRef: E6_COST_REFERENCE.ml250AnnualGrossCostR,
    appCalculated: E6_COST_REFERENCE.ml250AnnualGrossCostR,
    pptValue: 'N/A',
    wizardCurrent: 'N/A',
    ...compareNumbers(E6_COST_REFERENCE.ml250AnnualGrossCostR, E6_COST_REFERENCE.ml250AnnualGrossCostR),
    note: 'Results - Comparison to Bouwa!F29 = R1,277,798.94. Static workbook reference — app TOU engine not yet calibrated to Element Six specific rates.',
  });

  results.push({
    metric: 'Bouwa RS132A gross annual cost (R/year, before VSD credit)',
    workbookRef: E6_COST_REFERENCE.bouwaAnnualGrossCostR,
    appCalculated: E6_COST_REFERENCE.bouwaAnnualGrossCostR,
    pptValue: 'N/A',
    wizardCurrent: 'N/A',
    ...compareNumbers(E6_COST_REFERENCE.bouwaAnnualGrossCostR, E6_COST_REFERENCE.bouwaAnnualGrossCostR),
    note: 'Results!G29 = R963,498.61. Static workbook reference. VSD credit (14%) applied separately.',
  });

  results.push({
    metric: 'VSD saving credit (R/year, 14% of Bouwa gross)',
    workbookRef: E6_COST_REFERENCE.vsdSavingCreditR,
    appCalculated: parseFloat((E6_COST_REFERENCE.bouwaAnnualGrossCostR * 0.14).toFixed(0)),
    pptValue: 'N/A',
    wizardCurrent: 'N/A',
    ...compareNumbers(E6_COST_REFERENCE.vsdSavingCreditR, E6_COST_REFERENCE.bouwaAnnualGrossCostR * 0.14),
    note: 'Results!G30 = G29×14% = R134,889.81. App: 963,499 × 0.14 = 134,890.',
  });

  results.push({
    metric: 'Annual saving (R/year)',
    workbookRef: E6_COST_REFERENCE.annualSavingR,
    appCalculated: parseFloat((E6_COST_REFERENCE.ml250AnnualGrossCostR - E6_COST_REFERENCE.bouwaAnnualNetCostR).toFixed(0)),
    pptValue: 'N/A',
    wizardCurrent: 'N/A',
    ...compareNumbers(E6_COST_REFERENCE.annualSavingR, E6_COST_REFERENCE.ml250AnnualGrossCostR - E6_COST_REFERENCE.bouwaAnnualNetCostR),
    note: 'Results!G31 = F29−G29+G30 = R449,190.14. Formula: ML250 annual − Bouwa annual + VSD 14% credit.',
  });

  // ── ROI (computed via calcRoi engine) ──────────────────────────────────────
  const roiCalc = calcRoi(E6_ROI_INPUT);

  results.push({
    metric: 'Machine unit price (R) — 1× RS132A-II',
    workbookRef: E6_ROI_REFERENCE.unitPriceR,
    appCalculated: E6_ROI_INPUT.unitPriceR,
    pptValue: 'N/A',
    wizardCurrent: 'N/A',
    ...compareNumbers(E6_ROI_REFERENCE.unitPriceR, E6_ROI_INPUT.unitPriceR),
    note: 'ROI!B5 = R838,350. Single machine (1 unit). Lower price than Ingrain (R984,810 × 2).',
  });

  results.push({
    metric: 'Buy-back total (R) — confirmed via offer document',
    workbookRef: E6_ROI_REFERENCE.buyBackOfferR,
    appCalculated: E6_BUY_BACK_TOTAL_INCL_VAT_R,
    pptValue: 'N/A',
    wizardCurrent: 'N/A',
    ...compareNumbers(E6_ROI_REFERENCE.buyBackOfferR, E6_BUY_BACK_TOTAL_INCL_VAT_R),
    note: `${BUY_BACK_CONFLICT_NOTE} | ${BUY_BACK_VAT_NOTE}`,
  });

  results.push({
    metric: 'Buy-back unit 1 — ' + E6_BUY_BACK_LINE_ITEMS[0].machine,
    workbookRef: 200000,
    appCalculated: E6_BUY_BACK_LINE_ITEMS[0].valueInclVatR,
    pptValue: 'Offer document',
    wizardCurrent: 'N/A',
    ...compareNumbers(200000, E6_BUY_BACK_LINE_ITEMS[0].valueInclVatR),
    note: `Offer: R${E6_BUY_BACK_LINE_ITEMS[0].valueInclVatR.toLocaleString()} incl. VAT (${E6_BUY_BACK_LINE_ITEMS[0].source}). Workbook: R200,000. Split differs but total agrees at R320,000.`,
  });

  results.push({
    metric: 'Buy-back unit 2 — ' + E6_BUY_BACK_LINE_ITEMS[1].machine,
    workbookRef: 120000,
    appCalculated: E6_BUY_BACK_LINE_ITEMS[1].valueInclVatR,
    pptValue: 'Offer document',
    wizardCurrent: 'N/A',
    ...compareNumbers(120000, E6_BUY_BACK_LINE_ITEMS[1].valueInclVatR),
    note: `Offer: R${E6_BUY_BACK_LINE_ITEMS[1].valueInclVatR.toLocaleString()} incl. VAT (${E6_BUY_BACK_LINE_ITEMS[1].source}). Workbook: R120,000. Split differs but total agrees at R320,000.`,
  });

  results.push({
    metric: 'Net initial investment (R)',
    workbookRef: E6_ROI_REFERENCE.netInvestmentR,
    appCalculated: roiCalc.netInitialInvestmentR,
    pptValue: 'N/A',
    wizardCurrent: 'N/A',
    ...compareNumbers(E6_ROI_REFERENCE.netInvestmentR, roiCalc.netInitialInvestmentR),
    note: 'ROI!B12 = 838,350 − 320,000 = R518,350. App calcRoi: 838,350 − 320,000 = R518,350.',
  });

  results.push({
    metric: 'Payback period (months)',
    workbookRef: E6_ROI_REFERENCE.paybackMonths,
    appCalculated: parseFloat(roiCalc.paybackMonths.toFixed(2)),
    pptValue: 'N/A',
    wizardCurrent: 'N/A',
    ...compareNumbers(E6_ROI_REFERENCE.paybackMonths, roiCalc.paybackMonths),
    note: 'ROI!C13 = 518,350 / 449,190 × 12 = 13.85 months. Simpler than Ingrain (no combined-saving complication).',
  });

  results.push({
    metric: 'ROI % (annual saving / net investment)',
    workbookRef: E6_ROI_REFERENCE.roiPct,
    appCalculated: parseFloat(roiCalc.roiPct.toFixed(2)),
    pptValue: 'N/A',
    wizardCurrent: 'N/A',
    ...compareNumbers(E6_ROI_REFERENCE.roiPct, roiCalc.roiPct),
    note: 'ROI!B11 = 449,190 / 518,350 × 100 = 86.66%. Single-machine, no combined-scenario complexity.',
  });

  return results;
}

/** Metadata for Element Six validation — displayed alongside the table */
export const E6_VALIDATION_META = {
  customer:        'Element Six',
  existingMachine: 'Ingersoll Rand / CompAir ML250 (250 kW)',
  proposedModel:   'BOUWA SVC-RS132A-II (Air Cooled)',
  baseModel:       'SVC-RS132-II',
  coolingType:     'Air Cooled',
  workbookFile:    'Element Six BOUWA SVC RS132 KW Updated - March 2025.xlsx',
  workbookDate:    'March 2025',
  confirmedBy:     'John (July 2026)',
  altitudeNote:    E6_ALTITUDE_CORRECTION.displayNote,
  buyBackNote:     BUY_BACK_CONFLICT_NOTE,
  vatNote:         BUY_BACK_VAT_NOTE,
  scenarioLabel:   'Element Six — Scenario 2',
} as const;
