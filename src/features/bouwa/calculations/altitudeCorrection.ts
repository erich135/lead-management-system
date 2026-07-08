/**
 * Bouwa — Altitude & Site Condition Correction
 * Phase 4D-18
 *
 * Based on the correction methodology found in Ingrain L160.xlsx
 * "Effect Output calc" sheet (ISO 1217 / Eskom altitude calculation approach).
 *
 * Formula source (from workbook cells):
 *   sitePressureBar = 1.013 - (altitudeFt × 0.001 / 30)
 *                   ≈ 1.013 × (1 - altitudeFt/145366)^5.256
 *   flowLs          = m3Min × 1000 / 60
 *   correctedLs     = (flowLs × 273 × sitePressureBar) / ((273 + siteAmbientC) × 1.013)
 *   correctedM3Min  = correctedLs × 60 / 1000
 *   lossPct         = 1 - (correctedM3Min / ratedM3Min)
 */

import { mToFt } from './unitConversions';
import type { AltitudeCorrectionResult, CorrectionStatus } from './bouwaTypes';

/** Reference standard conditions (ISO 1217) */
export const ISO_1217_REF = {
  pressureBar: 1.013,
  tempC: 20,
  tempK: 293, // 273 + 20
};

/**
 * Calculate site atmospheric pressure from altitude.
 * Workbook approximation: -1 mbar per 30 ft of altitude.
 */
export function calcSitePressureBar(altitudeM: number): number {
  const altFt = mToFt(altitudeM);
  return Math.max(0.6, ISO_1217_REF.pressureBar - (altFt * 0.001 / 30));
}

/**
 * Apply altitude and ambient temperature correction to a rated FAD (m³/min).
 * Returns corrected site FAD, loss %, and correction metadata.
 */
export function applyAltitudeCorrection(
  ratedFadM3Min: number,
  altitudeM: number,
  ambientTempC: number,
): AltitudeCorrectionResult {
  if (ratedFadM3Min <= 0) {
    return {
      ratedFadM3Min,
      correctedFadM3Min: 0,
      lossPct: 0,
      correctionStatus: 'requires-review',
      altitudeM,
      altitudeFt: mToFt(altitudeM),
      sitePressureBar: ISO_1217_REF.pressureBar,
      ambientTempC,
      note: 'Invalid rated FAD — cannot compute correction.',
    };
  }

  const altFt = mToFt(altitudeM);
  const sitePressureBar = calcSitePressureBar(altitudeM);

  // Convert rated FAD to L/s
  const ratedLs = ratedFadM3Min * 1000 / 60;

  // Correct for site pressure and temperature (ISO 1217 style)
  const correctedLs =
    (ratedLs * (ISO_1217_REF.tempK) * sitePressureBar) /
    ((273 + ambientTempC) * ISO_1217_REF.pressureBar);

  const correctedFadM3Min = correctedLs * 60 / 1000;
  const lossPct = Math.max(0, (1 - correctedFadM3Min / ratedFadM3Min) * 100);

  let correctionStatus: CorrectionStatus;
  let note: string;

  if (altitudeM < 100) {
    correctionStatus = 'not-applied';
    note = `Site near sea level (${altitudeM} m). Correction is negligible (<0.5%). Datasheet values used as-is.`;
  } else if (altitudeM < 500) {
    correctionStatus = 'requires-review';
    note = `Moderate altitude (${altitudeM} m). Correction applied: ~${lossPct.toFixed(1)}% FAD loss. Verify with manufacturer correction table.`;
  } else {
    correctionStatus = 'applied';
    note = `High altitude site (${altitudeM} m / ${altFt.toFixed(0)} ft). Correction applied: ${lossPct.toFixed(1)}% FAD loss. Confirm with manufacturer ISO 1217 altitude table.`;
  }

  return {
    ratedFadM3Min,
    correctedFadM3Min: parseFloat(correctedFadM3Min.toFixed(3)),
    lossPct: parseFloat(lossPct.toFixed(2)),
    correctionStatus,
    altitudeM,
    altitudeFt: parseFloat(altFt.toFixed(0)),
    sitePressureBar: parseFloat(sitePressureBar.toFixed(4)),
    ambientTempC,
    note,
  };
}

/** Lookup table examples for Gauteng reference */
export const ALTITUDE_REFERENCE_EXAMPLES = [
  { site: 'Cape Town / Belville (near sea level)', altitudeM: 10,   expectedLossPct: '< 0.5%', note: 'Negligible — use datasheet values' },
  { site: 'Durban (near sea level)',               altitudeM: 5,    expectedLossPct: '< 0.5%', note: 'Negligible' },
  { site: 'Pretoria / Tshwane',                    altitudeM: 1350, expectedLossPct: '~8–10%', note: 'Moderate derating required' },
  { site: 'Johannesburg / Gauteng',                altitudeM: 1750, expectedLossPct: '~14–18%',note: 'Significant derating — confirm with manufacturer' },
  { site: 'Wireforce Germiston (workbook ref)',     altitudeM: 1644, expectedLossPct: '~25%',   note: 'Workbook example: 5,394 ft site' },
  { site: 'Element Six (workbook ref)',             altitudeM: 1627, expectedLossPct: '~24%',   note: 'Workbook example: 5,337 ft site' },
];
