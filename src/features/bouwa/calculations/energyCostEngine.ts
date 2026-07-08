/**
 * Bouwa — Energy Cost Engine
 * Phase 4D-18
 *
 * Calculates annual energy costs, savings, and VSD credit.
 *
 * Source reconciliation (from Phase 4D-16B):
 *   PPT Bouwa cost:          R 1,680,000  (rounded, older tariff)
 *   Workbook Bouwa gross:    R 1,995,196  (TOU calc with Set A rates)
 *   Workbook VSD credit:     R   279,327  (14% of Bouwa gross, workbook R31)
 *   Workbook Bouwa net:      R 1,715,869  (R1,995,196 − R279,327, matches implied PPT ~R1.70M)
 *
 * The engine shows gross, VSD credit, and net separately to preserve transparency.
 */

import type {
  EnergyCostResult, EnergySavingResult, CalcBasis, ReviewStatus, ValueSource,
} from './bouwaTypes';
import { calcAnnualCostTou, calcAnnualKwh, calcCo2SavingKg } from './tariffEngine';
import type { TouRates, AnnualDayCalendar } from './bouwaTypes';

/** VSD saving credit % applied in the workbook (14% of gross proposed cost) */
export const WORKBOOK_VSD_CREDIT_PCT = 0.14;

/**
 * Calculate annual gross energy cost using TOU rates and calendar.
 */
export function calcGrossAnnualCost(
  effectiveInputKw: number,
  rates: TouRates,
  calendar: AnnualDayCalendar,
  compressorId: string,
  source: ValueSource,
): EnergyCostResult {
  const tou = calcAnnualCostTou(effectiveInputKw, rates, calendar);
  const annualHours = (
    (calendar.ldsWorkDays + calendar.ldsSaturdays + calendar.ldsSundays +
     calendar.hdsWorkDays + calendar.hdsSaturdays + calendar.hdsSundays) * 24
  );
  return {
    compressorId,
    annualGrossCostR: parseFloat(tou.totalCost.toFixed(2)),
    annualKwh: parseFloat(calcAnnualKwh(effectiveInputKw, annualHours).toFixed(0)),
    calcBasis: tou.basis,
    source,
  };
}

/**
 * Calculate energy saving between current and proposed machine.
 * Separates gross proposed cost, VSD saving credit, and net proposed cost.
 *
 * Workbook methodology:
 *   grossProposedCost  = TOU calculation using proposed machine kW
 *   vsdSavingCredit    = grossProposedCost × 14%
 *   netProposedCost    = grossProposedCost − vsdSavingCredit
 *   annualSaving       = currentCost − netProposedCost
 */
export function calcEnergySaving(
  currentGrossCostR: number,
  proposedGrossCostR: number,
  applyVsdCredit: boolean,
  co2FactorKgPerKwh: number,
  annualKwhSaved?: number,
): EnergySavingResult {
  const vsdSavingCreditR = applyVsdCredit
    ? parseFloat((proposedGrossCostR * WORKBOOK_VSD_CREDIT_PCT).toFixed(2))
    : 0;

  const proposedNetCostR = parseFloat((proposedGrossCostR - vsdSavingCreditR).toFixed(2));
  const annualSavingR    = parseFloat((currentGrossCostR - proposedNetCostR).toFixed(2));
  const annualSavingPct  = currentGrossCostR > 0
    ? parseFloat(((annualSavingR / currentGrossCostR) * 100).toFixed(1))
    : 0;

  const co2SavingKg = annualKwhSaved != null
    ? parseFloat(calcCo2SavingKg(annualKwhSaved, co2FactorKgPerKwh).toFixed(0))
    : undefined;

  let reviewStatus: ReviewStatus;
  let note: string | undefined;

  if (Math.abs(annualSavingPct - 40) < 5) {
    reviewStatus = 'confirmed';
    note = 'Saving % within expected range (~40%). Consistent with workbook.';
  } else {
    reviewStatus = 'requires-review';
    note = `Saving ${annualSavingPct.toFixed(1)}% differs from workbook expected ~40%. Check tariff rates and VSD credit assumption.`;
  }

  return {
    currentGrossCostR,
    proposedGrossCostR,
    vsdSavingCreditR,
    proposedNetCostR,
    annualSavingR,
    annualSavingPct,
    annualKwhSaved,
    co2SavingKg,
    calcBasis: 'tou',
    reviewStatus,
    note,
  };
}
