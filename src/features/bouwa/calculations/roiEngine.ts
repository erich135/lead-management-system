/**
 * Bouwa — ROI Engine
 * Phase 4D-18
 *
 * Workbook reference (Ingrain L160.xlsx — ROI Calculation sheet):
 *   Unit price:          R 984,810 (Bouwa RS132-II, 132kW)
 *   Quantity:            2
 *   Gross machine cost:  R 1,969,620
 *   Buy-back (L160+L250):R   130,000
 *   Refurb L160:         R   472,760
 *   Refurb L250:         R   671,000
 *   Net investment:      R 2,297,860  (gross − buy-back only, not including refurb)
 *   Annual saving L160:  R 1,110,997
 *   Payback:             0.613 years = 7.35 months
 *   ROI %:               48.35%
 *   VAT:                 Excluded
 *
 * Note: Two net investment figures in workbook:
 *   R2,297,860 — gross machine cost (R1,969,620) minus buy-back (R130,000) + some other costs
 *   R2,968,860 — higher figure (includes refurb costs)
 */

import type { RoiInput, RoiResult } from './bouwaTypes';

/**
 * Calculate ROI metrics from inputs.
 */
export function calcRoi(input: RoiInput): RoiResult {
  const grossMachineCostR   = input.unitPriceR * input.quantity;
  const netInitialInvestmentR = grossMachineCostR - input.buyBackR + input.refurbishmentR + input.otherCostsR;
  const paybackYears        = input.annualSavingR > 0 ? netInitialInvestmentR / input.annualSavingR : Infinity;
  const paybackMonths       = paybackYears * 12;
  const roiPct              = netInitialInvestmentR > 0 ? (input.annualSavingR / netInitialInvestmentR) * 100 : 0;

  return {
    grossMachineCostR:     parseFloat(grossMachineCostR.toFixed(2)),
    netInitialInvestmentR: parseFloat(netInitialInvestmentR.toFixed(2)),
    paybackYears:          parseFloat(paybackYears.toFixed(4)),
    paybackMonths:         parseFloat(paybackMonths.toFixed(2)),
    roiPct:                parseFloat(roiPct.toFixed(2)),
    annualSavingR:         input.annualSavingR,
    source:                'calculated',
  };
}

// ── Workbook reference inputs ────────────────────────────────────────────────

/** Workbook ROI input (RS132-II, buy-back only net investment scenario) */
export const INGRAIN_ROI_INPUT_A: RoiInput = {
  unitPriceR:       984810,
  quantity:         2,
  buyBackR:         130000,
  refurbishmentR:   0,        // Not included in net investment R2,297,860 scenario
  otherCostsR:      458240,   // R2,297,860 − (R1,969,620 − R130,000) = R458,240 unaccounted
  annualSavingR:    1110997,
  vatExcluded:      true,
};

/** Workbook ROI reference outputs (from ROI Calculation sheet) */
export const INGRAIN_ROI_REFERENCE = {
  unitPriceR:             984810,
  quantity:               2,
  grossMachineCostR:      1969620,
  buyBackR:               130000,
  refurbL160R:            472760,
  refurbL250R:            671000,
  netInvestmentR:         2297860,  // Lower scenario (ROI sheet R13)
  netInvestmentHighR:     2968860,  // Higher scenario (includes refurb, ROI sheet R17)
  annualSavingL160R:      1110997,
  annualSavingL250R:      2639781,
  paybackMonths:          7.35,
  paybackYears:           0.6126,
  roiPct:                 48.35,
  vatExcluded:            true,
  note: 'From Ingrain L160.xlsx ROI Calculation sheet. Machine: RS132-II (132kW). Confirm model before using price.',
};
