/**
 * Bouwa Calculation Engine — Shared Types
 * Phase 4D-18
 */

// ── Source & review metadata ────────────────────────────────────────────────

export type ValueSource =
  | 'workbook'
  | 'ppt'
  | 'audit-excel'
  | 'manufacturer-spec'
  | 'manual'
  | 'estimate'
  | 'calculated';

export type ReviewStatus = 'draft' | 'requires-review' | 'confirmed' | 'conflict';

export interface TrackedValue<T> {
  value: T;
  source: ValueSource;
  reviewStatus: ReviewStatus;
  note?: string;
  /** Override support — for future manual-override workflow */
  overrideValue?: T;
  overrideReason?: string;
  overrideBy?: string;
  overrideDate?: string;
}

export function tracked<T>(
  value: T,
  source: ValueSource,
  reviewStatus: ReviewStatus = 'draft',
  note?: string,
): TrackedValue<T> {
  return { value, source, reviewStatus, note };
}

// ── Unit types ──────────────────────────────────────────────────────────────

export type PressureUnit = 'bar' | 'kPa' | 'psi' | 'MPa';
export type FlowUnit = 'm3/min' | 'm3/h' | 'L/s' | 'cfm';
export type PowerUnit = 'kW' | 'W' | 'hp';
export type EnergyUnit = 'kWh' | 'MWh' | 'GWh';

// ── Compressor spec ─────────────────────────────────────────────────────────

export interface CompressorSpec {
  id: string;
  make: string;
  model: string;
  yearMfg: number;
  ratedFadM3Min: number;       // Manufacturer rated FAD at reference conditions
  ratedPressureBar: number;
  ratedKw: number;             // Package input kW
  motorEfficiency: number;     // 0–1 fraction
  speedControl: 'fixed' | 'vsd';
  type: string;
}

export interface AuditMeasurement {
  compressorId: string;
  measuredFadM3Min: number;   // Measured peak FAD on site
  measuredKw: number;
  measuredPressureBar: number;
  ambientTempC: number;
  altitudeM: number;
  unloadedOpPct: number;       // 0–100
  loadedHours: number;
  totalRunningHours: number;
  dateOfTest: string;
  source: ValueSource;
}

// ── Load profile ────────────────────────────────────────────────────────────

export interface LoadProfileReading {
  timestamp: string;
  flowM3Min: number;
  pressureBar?: number;
}

export interface LoadProfileSummary {
  sourceLabel: string;
  dateRange: string;
  readingCount: number;
  avgFlowM3Min: number;
  peakFlowM3Min: number;
  minFlowM3Min: number;
  avgPressureBar?: number;
  demandUtilisationPct: number; // avgFlow / ratedFAD × 100
  source: ValueSource;
}

// ── Tariff ──────────────────────────────────────────────────────────────────

export interface TouRates {
  ldsStandard: number;
  ldsPeak: number;
  ldsOffPeak: number;
  hdsStandard: number;
  hdsPeak: number;
  hdsOffPeak: number;
  vatIncluded: boolean;
  effectiveDate?: string;
  tariffYear?: string;
  source: ValueSource;
  note?: string;
}

export interface AnnualDayCalendar {
  ldsWorkDays: number;
  ldsSaturdays: number;
  ldsSundays: number;
  hdsWorkDays: number;
  hdsSaturdays: number;
  hdsSundays: number;
  totalDays: number;
}

export interface TouOperatingProfile {
  peakRunFraction: number;     // 0–1
  standardRunFraction: number;
  offPeakRunFraction: number;
  annualRunHours: number;
}

// ── Site correction ─────────────────────────────────────────────────────────

export type CorrectionStatus = 'applied' | 'not-applied' | 'requires-review';

export interface AltitudeCorrectionResult {
  ratedFadM3Min: number;
  correctedFadM3Min: number;
  lossPct: number;
  correctionStatus: CorrectionStatus;
  altitudeM: number;
  altitudeFt: number;
  sitePressureBar: number;
  ambientTempC: number;
  note: string;
}

// ── Performance ─────────────────────────────────────────────────────────────

export interface CompressorPerformanceResult {
  compressorId: string;
  effectiveInputKw: number;
  outputM3PerHour: number;
  kwPerM3Min: number;          // Standard efficiency metric
  kwHPerM3: number;            // kWh per m³ of compressed air (motor-eff adjusted)
  costPerM3: number;           // R per m³ at given tariff
  ratedFadM3Min: number;
  measuredFadM3Min: number;
  motorEfficiency: number;
  source: ValueSource;
}

// ── Energy cost ─────────────────────────────────────────────────────────────

export type CalcBasis = 'blended-estimate' | 'tou' | 'workbook' | 'manual';

export interface EnergyCostResult {
  compressorId: string;
  annualGrossCostR: number;
  annualKwh: number;
  calcBasis: CalcBasis;
  source: ValueSource;
  note?: string;
}

export interface EnergySavingResult {
  currentGrossCostR: number;
  proposedGrossCostR: number;
  vsdSavingCreditR: number;
  proposedNetCostR: number;
  annualSavingR: number;
  annualSavingPct: number;
  annualKwhSaved?: number;
  co2SavingKg?: number;
  calcBasis: CalcBasis;
  reviewStatus: ReviewStatus;
  note?: string;
}

// ── ROI ─────────────────────────────────────────────────────────────────────

export interface RoiInput {
  unitPriceR: number;
  quantity: number;
  buyBackR: number;
  refurbishmentR: number;
  otherCostsR: number;
  annualSavingR: number;
  vatExcluded: boolean;
}

export interface RoiResult {
  grossMachineCostR: number;
  netInitialInvestmentR: number;
  paybackYears: number;
  paybackMonths: number;
  roiPct: number;
  annualSavingR: number;
  source: ValueSource;
}

// ── Validation ───────────────────────────────────────────────────────────────

export type ValidationStatus = 'match' | 'minor-rounding' | 'mismatch' | 'requires-review' | 'not-calculated';

export interface ValidationItem {
  metric: string;
  workbookRef: number | string;
  appCalculated: number | string | null;
  pptValue?: number | string;
  wizardCurrent?: number | string;
  difference?: number | string;
  status: ValidationStatus;
  note?: string;
}

// ── Optimiser ───────────────────────────────────────────────────────────────
//
// Load-sharing optimisation is not implemented. The draft engine that used this
// shape was retired: it applied a 14% VSD credit with no accepted derivation and
// left the optimised scenario at zero cost. The shape stays as the record of
// what an accepted optimiser would need to return.

export interface OptimiserScenario {
  label: string;
  annualCostR: number;
  annualKwh?: number;
  description: string;
  status: ReviewStatus;
}
