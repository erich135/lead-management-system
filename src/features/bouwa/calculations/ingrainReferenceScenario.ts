/**
 * Bouwa — Ingrain Belville Reference Scenario
 * Phase 4D-18
 *
 * All reference values from Phase 4D-16 workbook extraction.
 * Used for validation and as the default demo data anchor.
 *
 * DO NOT change these without ARS/Bouwa confirmation.
 * Source conflicts documented in bouwa-calculation-map.md section 14.
 */

import type { CompressorSpec, AuditMeasurement, TouRates, AnnualDayCalendar } from './bouwaTypes';
import { ESKOM_RATES_SET_A, INGRAIN_DAY_CALENDAR } from './tariffEngine';
import { INGRAIN_LOAD_PROFILE } from './loadProfileEngine';
import { INGRAIN_ROI_REFERENCE } from './roiEngine';

export { INGRAIN_LOAD_PROFILE, INGRAIN_ROI_REFERENCE, ESKOM_RATES_SET_A, INGRAIN_DAY_CALENDAR };

// ── CompAir L160 ─────────────────────────────────────────────────────────────

export const L160_SPEC: CompressorSpec = {
  id:               'compair-l160',
  make:             'CompAir',
  model:            'L160',
  yearMfg:          2001,
  ratedFadM3Min:    29.7,
  ratedPressureBar: 7.5,
  ratedKw:          184,
  motorEfficiency:  0.90,  // 90% — from PPT Slide 12 and workbook Report!R11
  speedControl:     'fixed',
  type:             'Fixed-speed oil-injected rotary screw',
};

export const L160_AUDIT: AuditMeasurement = {
  compressorId:     'compair-l160',
  measuredFadM3Min: 26.81,  // Peak measured FAD — Report!R3, confirmed PPT Slide 12
  measuredKw:       184,    // Package input kW
  measuredPressureBar: 7.5,
  ambientTempC:     21,
  altitudeM:        10,     // Belville near sea level
  unloadedOpPct:    18,
  loadedHours:      93123,
  totalRunningHours:112782,
  dateOfTest:       '2025-05-30',
  source:           'audit-excel',
};

// ── CompAir L250 ─────────────────────────────────────────────────────────────

export const L250_SPEC: CompressorSpec = {
  id:               'compair-l250',
  make:             'CompAir',
  model:            'L250',
  yearMfg:          2006,
  ratedFadM3Min:    42.7,
  ratedPressureBar: 7.5,
  ratedKw:          294,
  motorEfficiency:  0.87,
  speedControl:     'fixed',
  type:             'Fixed-speed oil-injected rotary screw',
};

export const L250_AUDIT: AuditMeasurement = {
  compressorId:     'compair-l250',
  measuredFadM3Min: 27.86,
  measuredKw:       294,
  measuredPressureBar: 7.5,
  ambientTempC:     21,
  altitudeM:        10,
  unloadedOpPct:    30,
  loadedHours:      64466,
  totalRunningHours:92143,
  dateOfTest:       '2025-05-30',
  source:           'audit-excel',
};

// ── Bouwa Proposed (RS132-II — workbook model) ───────────────────────────────

export const BOUWA_RS132_SPEC: CompressorSpec = {
  id:               'bouwa-svc-rs132-ii',
  make:             'Bouwa',
  model:            'SVC-RS132-II',  // Workbook model — NOT SVC-RS160-II from PPT recs
  yearMfg:          2025,            // Assumed new purchase
  ratedFadM3Min:    28.4,            // From workbook Report!R3 col C
  ratedPressureBar: 7.5,
  ratedKw:          151.8,           // From workbook Report!R5 col C
  motorEfficiency:  0.96,            // From workbook Report!R11 col C
  speedControl:     'vsd',
  type:             '2-stage oil-injected rotary screw VSD',
};

/** ⚠️ Model naming conflict — see section 14.1 of bouwa-calculation-map.md */
export const MODEL_NAMING_CONFLICT_NOTE =
  'CONFLICT: Workbook uses SVC-RS132-II (132kW). PPT recommendations use SVC160-II / SVC-RS160-II (160kW). ' +
  'Savings table column header says "BOUWA® RS 132 VSD COST". Machine unit price R984,810 is for RS132. ' +
  'Do not finalise until ARS/Bouwa confirms which model is proposed.';

// ── Workbook cost reference values ───────────────────────────────────────────

export const INGRAIN_COST_REFERENCE = {
  l160AnnualGrossCostR:   2826866,   // Report!R30 col B
  bouwaAnnualGrossCostR:  1995196,   // Report!R30 col C (before VSD credit)
  vsdSavingCreditR:        279327,   // Report!R31 col C (14% VSD credit)
  bouwaAnnualNetCostR:    1715869,   // Gross − VSD credit
  annualSavingL160R:      1110997,   // Report!R32 (saving after VSD credit)
  // PPT values (for conflict display)
  pptL160CostR:           2830000,   // PPT Slide 4 rounded
  pptBouwaNetCostR:       1680000,   // PPT Slide 4 stated (rounding discrepancy vs workbook ~R1.71M)
  pptAnnualSavingL160R:   1130000,   // PPT Slide 4 (R1.13M)
  pptAnnualSavingL250R:   2640000,   // PPT Slide 4 (R2.64M)
  // Wizard current values (to show in conflict table)
  wizardSavingL160R:      1150000,   // Current wizard demo (R1.15M)
  wizardSavingL250R:      2670000,   // Current wizard demo (R2.67M)
  tariffRateSetUsed:      'Set A (Report sheet — older hardcoded rates)',
  note: 'Workbook uses TOU Set A rates. PPT figures likely from same rates. VSD credit (14%) is an internal adjustment not shown separately in PPT.',
};

// ── Tariff rates actually used in workbook ────────────────────────────────────

export const INGRAIN_RATES: TouRates = ESKOM_RATES_SET_A;
export const INGRAIN_CALENDAR: AnnualDayCalendar = INGRAIN_DAY_CALENDAR;
