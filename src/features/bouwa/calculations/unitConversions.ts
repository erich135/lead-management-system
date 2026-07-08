/**
 * Bouwa — Unit Conversion Functions
 * Phase 4D-18
 */

/** m³/min → m³/h */
export function m3MinToM3H(m3Min: number): number {
  return m3Min * 60;
}

/** m³/h → m³/min */
export function m3HToM3Min(m3H: number): number {
  return m3H / 60;
}

/** m³/min → L/s */
export function m3MinToLs(m3Min: number): number {
  return m3Min * 1000 / 60;
}

/** L/s → m³/min */
export function lsToM3Min(ls: number): number {
  return ls * 60 / 1000;
}

/** CFM → m³/min  (1 CFM = 0.028317 m³/min) */
export function cfmToM3Min(cfm: number): number {
  return cfm * 0.028317;
}

/** m³/min → CFM */
export function m3MinToCfm(m3Min: number): number {
  return m3Min / 0.028317;
}

/** m → ft */
export function mToFt(m: number): number {
  return m * 3.28084;
}

/** ft → m */
export function ftToM(ft: number): number {
  return ft / 3.28084;
}

/** Annual hours → period splits given fraction per period */
export function splitAnnualHours(
  annualHours: number,
  peakFraction: number,
  standardFraction: number,
  offPeakFraction: number,
): { peak: number; standard: number; offPeak: number } {
  return {
    peak: annualHours * peakFraction,
    standard: annualHours * standardFraction,
    offPeak: annualHours * offPeakFraction,
  };
}

/** kWh/m³ (motor-efficiency-adjusted) → kW/m³/min */
export function kwhPerM3ToKwPerM3Min(kwhPerM3: number): number {
  // kWh/m³ × (1 m³ / 1 min) × (60 min / h) = kW/m³/min
  return kwhPerM3 * 60;
}

/** kW/m³/min → kWh/m³ */
export function kwPerM3MinToKwhPerM3(kwPerM3Min: number): number {
  return kwPerM3Min / 60;
}
