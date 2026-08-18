/**
 * Bouwa — Tariff & TOU Engine
 * Phase 4D-18
 *
 * Reference: Ingrain L160.xlsx — "Report" sheet and "Electricity Rates" sheet.
 *
 * Two rate sets exist in the workbook (see Phase 4D-16B reconciliation):
 *  SET_A (Report sheet, older hardcoded) — used for PPT savings figures
 *  SET_B (Electricity Rates sheet, newer) — current Eskom schedule
 */

import type { TouRates, AnnualDayCalendar, TouOperatingProfile, CalcBasis } from './bouwaTypes';

// ── Reference rate sets from Ingrain L160.xlsx ──────────────────────────────

/** Set A — Report sheet hardcoded rates (older — produced the PPT R2.83M L160 figure) */
export const ESKOM_RATES_SET_A: TouRates = {
  ldsStandard: 1.5562,
  ldsPeak:     2.7678,
  ldsOffPeak:  1.1115,
  hdsStandard: 1.6673,
  hdsPeak:     6.6692,
  hdsOffPeak:  1.1115,
  vatIncluded: false,
  source: 'workbook',
  note: 'Report sheet hardcoded rates (older tariff year). Produced the PPT R2.83M L160 figure. Effective date unknown.',
};

/** Set B — Electricity Rates sheet (newer — more current Eskom schedule) */
export const ESKOM_RATES_SET_B: TouRates = {
  ldsStandard: 1.6311,
  ldsPeak:     2.2919,
  ldsOffPeak:  1.0979,
  hdsStandard: 2.1322,
  hdsPeak:     5.3783,
  hdsOffPeak:  1.2365,
  vatIncluded: false,
  source: 'workbook',
  note: 'Electricity Rates sheet (newer). More current Eskom schedule. Effective date unknown — must be confirmed.',
};

// ── Ingrain production day calendar ─────────────────────────────────────────

/** From Ingrain L160.xlsx — Day Calculations sheet */
export const INGRAIN_DAY_CALENDAR: AnnualDayCalendar = {
  ldsWorkDays:   186,
  ldsSaturdays:   42,
  ldsSundays:     44,
  hdsWorkDays:    64,
  hdsSaturdays:   13,
  hdsSundays:     15,
  totalDays:     364,
};

/** Standard Eskom TOU period fractions (approximate — workday 24h basis)
 *  Peak:     06:00–09:00, 17:00–20:00 on weekdays in LDS/HDS = 6h/24h = 0.25
 *  Standard: remaining weekday hours excluding off-peak
 *  Off-peak: 22:00–06:00 + all weekend hours
 *  These are approximations. Exact split requires the full hour-by-hour matrix.
 */
export const STANDARD_TOU_FRACTIONS: TouOperatingProfile = {
  peakRunFraction:     0.18,
  standardRunFraction: 0.44,
  offPeakRunFraction:  0.38,
  annualRunHours:      8736, // 364 days × 24h
};

// ── Blended average rate ─────────────────────────────────────────────────────

/**
 * Calculate blended average tariff rate from TOU rates and operating profile.
 */
export function calcBlendedRate(rates: TouRates, profile: TouOperatingProfile): number {
  // Simplified blended rate using peak/standard/off-peak fractions.
  // Uses weighted average of LDS and HDS (weighted by day counts if calendar provided).
  const avgStandard = (rates.ldsStandard + rates.hdsStandard) / 2;
  const avgPeak     = (rates.ldsPeak     + rates.hdsPeak)     / 2;
  const avgOffPeak  = (rates.ldsOffPeak  + rates.hdsOffPeak)  / 2;

  return (
    profile.peakRunFraction     * avgPeak +
    profile.standardRunFraction * avgStandard +
    profile.offPeakRunFraction  * avgOffPeak
  );
}

// ── TOU annual cost calculation ──────────────────────────────────────────────

/**
 * Calculate annual energy cost using TOU rate structure and day calendar.
 *
 * Matches the Ingrain L160.xlsx Report sheet methodology:
 *   cost_period = kw / (motorEff × outputM3H) × costPerM3 × hoursPerPeriod × outputM3H
 *               = effectiveInputKw × costPerKwh × hoursInPeriod
 *
 * Uses per-period effective kW (constant in fixed-speed assumption).
 */
export function calcAnnualCostTou(
  effectiveInputKw: number,
  rates: TouRates,
  calendar: AnnualDayCalendar,
): {
  ldsCost: number;
  hdsCost: number;
  totalCost: number;
  breakdown: Record<string, number>;
  basis: CalcBasis;
} {
  // Eskom TOU period hours per day (standard weekday approximation)
  const HOURS_PER_DAY = 24;
  const PEAK_HRS_WORKDAY     = 6;   // 2 × 3-hour peak windows
  const STANDARD_HRS_WORKDAY = 10;  // ~10h standard Mon–Fri
  const OFFPEAK_HRS_WORKDAY  = HOURS_PER_DAY - PEAK_HRS_WORKDAY - STANDARD_HRS_WORKDAY; // 8h
  // Weekends: no peak — all standard + off-peak
  const PEAK_HRS_SAT         = 3;   // Sat has some peak in HDS
  const STANDARD_HRS_SAT     = 9;
  const OFFPEAK_HRS_SAT      = 12;
  const PEAK_HRS_SUN         = 0;
  const STANDARD_HRS_SUN     = 8;
  const OFFPEAK_HRS_SUN      = 16;

  function periodCost(kw: number, rate: number, days: number, hoursPerDay: number) {
    return kw * rate * days * hoursPerDay;
  }

  // LDS costs
  const ldsWorkPeak     = periodCost(effectiveInputKw, rates.ldsPeak,     calendar.ldsWorkDays,  PEAK_HRS_WORKDAY);
  const ldsWorkStd      = periodCost(effectiveInputKw, rates.ldsStandard, calendar.ldsWorkDays,  STANDARD_HRS_WORKDAY);
  const ldsWorkOff      = periodCost(effectiveInputKw, rates.ldsOffPeak,  calendar.ldsWorkDays,  OFFPEAK_HRS_WORKDAY);
  const ldsSatPeak      = periodCost(effectiveInputKw, rates.ldsPeak,     calendar.ldsSaturdays, PEAK_HRS_SAT);
  const ldsSatStd       = periodCost(effectiveInputKw, rates.ldsStandard, calendar.ldsSaturdays, STANDARD_HRS_SAT);
  const ldsSatOff       = periodCost(effectiveInputKw, rates.ldsOffPeak,  calendar.ldsSaturdays, OFFPEAK_HRS_SAT);
  const ldsSunOff       = periodCost(effectiveInputKw, rates.ldsOffPeak,  calendar.ldsSundays,   OFFPEAK_HRS_SUN);
  const ldsSunStd       = periodCost(effectiveInputKw, rates.ldsStandard, calendar.ldsSundays,   STANDARD_HRS_SUN);

  // HDS costs
  const hdsWorkPeak     = periodCost(effectiveInputKw, rates.hdsPeak,     calendar.hdsWorkDays,  PEAK_HRS_WORKDAY);
  const hdsWorkStd      = periodCost(effectiveInputKw, rates.hdsStandard, calendar.hdsWorkDays,  STANDARD_HRS_WORKDAY);
  const hdsWorkOff      = periodCost(effectiveInputKw, rates.hdsOffPeak,  calendar.hdsWorkDays,  OFFPEAK_HRS_WORKDAY);
  const hdsSatPeak      = periodCost(effectiveInputKw, rates.hdsPeak,     calendar.hdsSaturdays, PEAK_HRS_SAT);
  const hdsSatStd       = periodCost(effectiveInputKw, rates.hdsStandard, calendar.hdsSaturdays, STANDARD_HRS_SAT);
  const hdsSatOff       = periodCost(effectiveInputKw, rates.hdsOffPeak,  calendar.hdsSaturdays, OFFPEAK_HRS_SAT);
  const hdsSunOff       = periodCost(effectiveInputKw, rates.hdsOffPeak,  calendar.hdsSundays,   OFFPEAK_HRS_SUN);
  const hdsSunStd       = periodCost(effectiveInputKw, rates.hdsStandard, calendar.hdsSundays,   STANDARD_HRS_SUN);

  const ldsCost = ldsWorkPeak + ldsWorkStd + ldsWorkOff + ldsSatPeak + ldsSatStd + ldsSatOff + ldsSunStd + ldsSunOff;
  const hdsCost = hdsWorkPeak + hdsWorkStd + hdsWorkOff + hdsSatPeak + hdsSatStd + hdsSatOff + hdsSunStd + hdsSunOff;

  return {
    ldsCost,
    hdsCost,
    totalCost: ldsCost + hdsCost,
    breakdown: {
      ldsWorkPeak, ldsWorkStd, ldsWorkOff,
      ldsSatPeak, ldsSatStd, ldsSatOff,
      ldsSunStd, ldsSunOff,
      hdsWorkPeak, hdsWorkStd, hdsWorkOff,
      hdsSatPeak, hdsSatStd, hdsSatOff,
      hdsSunStd, hdsSunOff,
    },
    basis: 'tou' as CalcBasis,
  };
}

/**
 * Annual kWh from effective kW and calendar.
 */
export function calcAnnualKwh(effectiveInputKw: number, annualHours: number): number {
  return effectiveInputKw * annualHours;
}

/**
 * CO₂ savings from kWh saved and emission factor.
 * SA grid default: 0.61 kg CO₂/kWh (DFFE 2024 reference).
 */
export function calcCo2SavingKg(kwhSaved: number, co2FactorKgPerKwh = 0.61): number {
  return kwhSaved * co2FactorKgPerKwh;
}
