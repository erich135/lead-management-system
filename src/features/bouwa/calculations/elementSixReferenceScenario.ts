/**
 * Bouwa — Element Six Reference Scenario
 * Phase 4D-21B
 *
 * Validation Scenario 2 — static reference extracted from:
 *   "Element Six BOUWA SVC RS132 KW Updated - March 2025.xlsx"
 *
 * John feedback (confirmed July 2026):
 *   1. SVC-RS132A-II: "A" = Air Cooled. Same RS132 model family as Ingrain SVC-RS132-II.
 *      ARS staff sometimes omit the Air-Cooled letter. Store with "A" suffix + cooling type.
 *   2. Buy-back: two units confirmed via Offer document (Ingersoll Rand ML250 R220,000 incl VAT
 *      + Ingersoll Rand R132i R100,000 incl VAT = R320,000 total). Workbook split differs
 *      (R200,000 + R120,000) but total agrees at R320,000. See BUY_BACK_CONFLICT_NOTE.
 *   3. Altitude: 30.1 m³/min is sea-level FAD. At 5,337 ft and 20% loss, corrected site
 *      output is 24.0 m³/min. App must NOT treat 30.1 m³/min as site-effective output.
 *
 * DO NOT change these without ARS/Bouwa confirmation.
 */

import type { CompressorSpec, TouRates, AnnualDayCalendar, RoiInput } from './bouwaTypes';

// ── Customer / Site ──────────────────────────────────────────────────────────

export const E6_SITE = {
  customer: 'Element Six',
  site:     'Element Six',
  note:     'Source: Effect Output calc!B58 — workbook title confirms customer name.',
} as const;

// ── Existing machine: Ingersoll Rand / CompAir ML250 ────────────────────────

export const E6_ML250_SPEC: CompressorSpec = {
  id:               'ingersoll-rand-ml250',
  make:             'Ingersoll Rand / CompAir',
  model:            'ML250',
  yearMfg:          2000,             // Unknown — estimate only
  ratedFadM3Min:    43.9,             // Results - Comparison to Bouwa!B2 (audit-based; differs from Report!B3 = 46)
  ratedPressureBar: 7.5,              // Assumed standard — not explicitly stated in workbook
  ratedKw:          250,              // Results!B4 = 250, Report!B5 = 250
  motorEfficiency:  0.94,             // Results!B10 = 0.94 (confirmed; different from Ingrain L160 = 0.87)
  speedControl:     'fixed',
  type:             'Fixed-speed oil-injected rotary screw',
};

// ── FAD discrepancy note ─────────────────────────────────────────────────────
export const E6_EXISTING_FAD_DISCREPANCY_NOTE =
  'FAD discrepancy between workbook sheets: Results - Comparison to Bouwa!B2 = 43.9 m³/min (audit-based, used for cost calcs); ' +
  'Report!B3 = 46 m³/min (nominal/rounded). Cost calculations use 43.9 m³/min (Results sheet). ' +
  'Report value (46 m³/min) is informational only.';

// ── Proposed machine: Bouwa SVC-RS132A-II ────────────────────────────────────

/**
 * Proposed model: SVC-RS132A-II
 * John confirmed: "A" = Air Cooled. Same RS132 model family as SVC-RS132-II.
 * Base model: SVC-RS132-II | Cooling type: Air Cooled
 *
 * ALTITUDE NOTE: 30.1 m³/min is the SEA-LEVEL FAD (manufacturer rated).
 * Site altitude is 5,337 ft. After 20% altitude loss, corrected site output = 24.0 m³/min.
 * Do NOT use 30.1 m³/min as the site-effective output.
 */
export const E6_BOUWA_RS132A_SPEC: CompressorSpec = {
  id:               'bouwa-svc-rs132a-ii',
  make:             'Bouwa',
  model:            'SVC-RS132A-II',   // "A" = Air Cooled (John confirmed). Base model: SVC-RS132-II.
  yearMfg:          2025,              // Assumed new purchase
  ratedFadM3Min:    30.1,              // Results!C2 — SEA-LEVEL FAD. See altitude correction below.
  ratedPressureBar: 7.5,
  ratedKw:          132,               // Results!C4 = 132, Report!C5 = 132
  motorEfficiency:  0.96,              // Results!C10 = 0.96 (same as Ingrain proposed)
  speedControl:     'vsd',
  type:             '2-stage oil-injected rotary screw VSD — Air Cooled',
};

export const E6_MODEL_NOTE =
  'Model: SVC-RS132A-II. "A" suffix = Air Cooled (John confirmed, July 2026). ' +
  'Base model family: SVC-RS132-II. ARS staff may omit the "A" when referencing. ' +
  'Same 132 kW class as Ingrain scenario proposed model (SVC-RS132-II). ' +
  'Cooling type: Air Cooled.';

// ── Altitude correction ──────────────────────────────────────────────────────

export const E6_ALTITUDE_CORRECTION = {
  seaLevelFadM3Min:   30.1,      // Manufacturer rated FAD at sea level
  altitudeFt:         5337,      // Effect Output calc!D63 = 5,337 ft (~1,627 m)
  altitudeM:          1627,      // Derived: 5,337 ft ÷ 3.281 ≈ 1,627 m
  ambientTempC:       25,        // Effect Output calc!D64 = 25°C
  altitudeLossPct:    20,        // John confirmed: 20% effective output loss at this altitude
  correctedFadM3Min:  24.0,      // John confirmed: 30.1 × 0.80 = 24.08 ≈ 24.0 m³/min
  displayNote:
    '30.1 m³/min is the sea-level (manufacturer rated) FAD. ' +
    'At site altitude of 5,337 ft and 20% altitude loss, the corrected site output is 24.0 m³/min. ' +
    'App must not treat 30.1 m³/min as the site-effective output. ' +
    'Source: John (July 2026) + workbook Effect Output calc!D63.',
} as const;

// ── Tariff rates — Element Six workbook Set A ─────────────────────────────────
// Source: Eskom Tariff sheet row 9 (via Results sheet formulas: e.g. B13 = ='Eskom Tariff'!R9/100)
// VAT: Eskom Tariff!W7 = "VAT incl" applies to the W column (network capacity charges) only.
// Energy rate columns (J/L/N/P/R/T) used for calculations appear VAT-exclusive (workbook convention).
// FLAG: VAT treatment of energy rates not conclusively confirmed from extraction. Review with ARS.

export const E6_ESKOM_RATES_SET_A: TouRates = {
  ldsStandard: 1.3524,   // Results!B13 = ='Eskom Tariff'!R9/100
  ldsPeak:     1.9646,   // Results!B14 = ='Eskom Tariff'!P9/100
  ldsOffPeak:  0.8590,   // Results!B15 = ='Eskom Tariff'!T9/100
  hdsStandard: 1.8247,   // Results!B16 = ='Eskom Tariff'!L9/100
  hdsPeak:     6.0234,   // Results!B17 = ='Eskom Tariff'!J9/100
  hdsOffPeak:  0.9911,   // Results!B18 = ='Eskom Tariff'!N9/100
  vatIncluded: false,    // Workbook calculation convention (consistent with Ingrain). FLAG for review.
  source:      'workbook',
  note:        'Element Six workbook Set A (Eskom Tariff sheet row 9). Different values from Ingrain Set A — different tariff year/category. VAT treatment: energy rate columns assumed VAT-exclusive (workbook convention); confirm with ARS.',
};

// ── Day calendar ──────────────────────────────────────────────────────────────
// Day Calculations sheet — identical to Ingrain calendar (both use same Eskom LDS/HDS template).

export const E6_DAY_CALENDAR: AnnualDayCalendar = {
  ldsWorkDays:   186,   // Day Calculations!K2 = 35+151
  ldsSaturdays:   42,   // K3 = 42
  ldsSundays:     44,   // K4 = 44
  hdsWorkDays:    64,   // K5 = 13+51
  hdsSaturdays:   13,   // K6 = 13
  hdsSundays:     15,   // K7 = 15
  totalDays:     364,   // K8 = SUM(K2:K7) — same as Ingrain
};

// ── Workbook cost reference values ───────────────────────────────────────────
// Source: Results - Comparison to Bouwa sheet (F29, G29, G30, G31)

export const E6_COST_REFERENCE = {
  ml250AnnualGrossCostR:   1277799,    // Results!F29 = R1,277,798.94 (rounded)
  bouwaAnnualGrossCostR:    963499,    // Results!G29 = R963,498.61 (rounded)
  vsdSavingCreditR:         134890,    // Results!G30 = G29×14% = R134,889.81 (rounded)
  bouwaAnnualNetCostR:      828609,    // Derived: 963,499 − 134,890 = R828,609
  annualSavingR:            449190,    // Results!G31 = F29−G29+G30 = R449,190.14 (rounded)
  // Formula: annualSaving = ML250_annual − Bouwa_annual + (Bouwa_annual × 14%)
  // Same methodology as Ingrain. VSD 14% credit added to saving.
  tariffRateSetUsed: 'Set A (Eskom Tariff sheet row 9 — Element Six workbook)',
  note: 'Annual saving formula: F29 − G29 + G30 (ML250 cost − Bouwa cost + VSD 14% credit). Same methodology as Ingrain scenario.',
};

// ── Buy-back line items ───────────────────────────────────────────────────────
// John confirmed (July 2026): two units confirmed via Offer document.
// Workbook ROI sheet values and Offer document values both total R320,000 but SPLIT differs.

export const E6_BUY_BACK_LINE_ITEMS = [
  {
    machine:         'Ingersoll Rand ML250',
    valueInclVatR:   220000,
    source:          'Offer To Purchase document (confirmed by John, July 2026)',
    vatNote:         'Incl. VAT',
  },
  {
    machine:         'Ingersoll Rand R132i',
    valueInclVatR:   100000,
    source:          'Offer To Purchase document (confirmed by John, July 2026)',
    vatNote:         'Incl. VAT',
  },
] as const;

export const E6_BUY_BACK_TOTAL_INCL_VAT_R = 320000; // R220,000 + R100,000 = R320,000 incl. VAT

export const BUY_BACK_CONFLICT_NOTE =
  'Offer document (confirmed) lists two buy-back units totalling R320,000 incl. VAT: ' +
  'Ingersoll Rand ML250 (R220,000) + Ingersoll Rand R132i (R100,000). ' +
  'Workbook ROI sheet lists: Buy back Machine 1 = R200,000 + Buy back Machine 2 = R120,000 (total R320,000). ' +
  'Both sources agree on the TOTAL (R320,000) but the per-unit SPLIT differs. ' +
  'Net investment calculation is unaffected (total deduction is the same). ' +
  'Source for line items: Offer document. Workbook split kept visible for audit trail.';

// VAT note: Offer document values are incl. VAT. Workbook ROI convention is VAT-excluded.
// The workbook buy-back values (R200,000 + R120,000) may therefore be VAT-exclusive.
// R220,000 incl VAT ÷ 1.15 ≈ R191,304 excl VAT (close to R200,000 — possible rounding/approximation).
// R100,000 incl VAT ÷ 1.15 ≈ R86,957 excl VAT (not close to R120,000 — unexplained gap).
export const BUY_BACK_VAT_NOTE =
  'VAT treatment conflict: Offer values are incl. VAT; workbook convention is excl. VAT. ' +
  'ML250: R220,000 incl VAT ÷ 1.15 ≈ R191,304 excl VAT (workbook shows R200,000 — close). ' +
  'R132i: R100,000 incl VAT ÷ 1.15 ≈ R86,957 excl VAT (workbook shows R120,000 — larger gap). ' +
  'Requires ARS clarification. Net investment uses R320,000 total from offer.';

// ── Workbook ROI reference values ────────────────────────────────────────────
// Source: ROI Calculation sheet (B5, B6, B7, B8, B9, B11, B12, B13, C13)

export const E6_ROI_REFERENCE = {
  unitPriceR:              838350,   // ROI!B5 = R838,350 (1 machine)
  quantity:                     1,   // ROI!C5 = 1
  grossMachineCostR:       838350,   // ROI!D5 = B5×C5 = R838,350
  buyBackWorkbookR:        320000,   // ROI!B7+B8 = 200,000+120,000 (workbook split — see conflict note)
  buyBackOfferR:           320000,   // Offer document total: 220,000+100,000 (confirmed by John)
  refurbishmentR:               0,   // ROI!B9 = R0
  annualSavingR:           449190,   // ROI!B6 = ='Results - Comparison to Bouwa'!G31 = R449,190.14
  netInvestmentR:          518350,   // ROI!B12 = B5+B9−B8−B7 = 838,350+0−120,000−200,000
  roiPct:                   86.66,   // ROI!B11 = (B6/B12)×100 = 449,190/518,350 = 86.66%
  paybackYears:              1.154,  // ROI!B13 = B12/B6 = 518,350/449,190 = 1.154 years
  paybackMonths:            13.85,   // ROI!C13 = B13×12 = 13.85 months
  vatExcluded:              true,    // Workbook convention: VAT excluded (consistent with Ingrain)
  note: 'Single machine (1×RS132A-II). No refurbishment. Two buy-backs per workbook, confirmed via offer document (total R320,000). See BUY_BACK_CONFLICT_NOTE.',
};

/** ROI input for use with calcRoi() engine — uses confirmed total buy-back */
export const E6_ROI_INPUT: RoiInput = {
  unitPriceR:       838350,
  quantity:         1,
  buyBackR:         320000,   // Total confirmed — offer document (John, July 2026)
  refurbishmentR:   0,
  otherCostsR:      0,        // No other costs (unlike Ingrain which had R458,240 unaccounted)
  annualSavingR:    449190,
  vatExcluded:      true,
};
// calcRoi(E6_ROI_INPUT) → netInvestment = 838,350 − 320,000 = 518,350 ✓
//                       → payback = 518,350 / 449,190 / 12 = 13.85 mo ✓
//                       → ROI = 449,190 / 518,350 × 100 = 86.66% ✓
