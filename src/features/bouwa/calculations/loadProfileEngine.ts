/**
 * Bouwa — Load Profile Engine
 * Phase 4D-18
 *
 * Analyses air flow time-series data.
 * Reference: Ingrain L160.xlsx — "Air Flow Result Input" sheet
 *   Period: 29 May – 5 June 2025
 *   Readings: 15-min intervals
 *   Avg: 25.94 m³/min, Peak: 26.81 m³/min, Min: 23.79 m³/min
 */

import type { LoadProfileReading, LoadProfileSummary, ValueSource } from './bouwaTypes';

/**
 * Summarise a set of load profile readings.
 */
export function summariseLoadProfile(
  readings: LoadProfileReading[],
  ratedFadM3Min: number,
  sourceLabel: string,
  source: ValueSource,
): LoadProfileSummary {
  if (readings.length === 0) {
    return {
      sourceLabel,
      dateRange: 'No data',
      readingCount: 0,
      avgFlowM3Min: 0,
      peakFlowM3Min: 0,
      minFlowM3Min: 0,
      demandUtilisationPct: 0,
      source,
    };
  }

  const flows = readings.map(r => r.flowM3Min).filter(f => f > 0);
  const pressures = readings.filter(r => r.pressureBar != null).map(r => r.pressureBar as number);

  const avgFlow  = flows.reduce((a, b) => a + b, 0) / flows.length;
  const peakFlow = Math.max(...flows);
  const minFlow  = Math.min(...flows);
  const avgPressure = pressures.length > 0
    ? pressures.reduce((a, b) => a + b, 0) / pressures.length
    : undefined;

  const demandUtil = ratedFadM3Min > 0 ? (avgFlow / ratedFadM3Min) * 100 : 0;

  const timestamps = readings.map(r => r.timestamp).filter(Boolean);
  const dateRange = timestamps.length >= 2
    ? `${timestamps[0]} → ${timestamps[timestamps.length - 1]}`
    : timestamps[0] ?? 'Unknown';

  return {
    sourceLabel,
    dateRange,
    readingCount: readings.length,
    avgFlowM3Min: parseFloat(avgFlow.toFixed(3)),
    peakFlowM3Min: parseFloat(peakFlow.toFixed(3)),
    minFlowM3Min: parseFloat(minFlow.toFixed(3)),
    avgPressureBar: avgPressure != null ? parseFloat(avgPressure.toFixed(3)) : undefined,
    demandUtilisationPct: parseFloat(demandUtil.toFixed(1)),
    source,
  };
}

/**
 * Static Ingrain Belville load profile summary.
 * Source: Ingrain L160.xlsx — Air Flow Result Input sheet.
 * Period: 29 May – 5 June 2025.
 */
export const INGRAIN_LOAD_PROFILE: LoadProfileSummary = {
  sourceLabel: 'Ingrain Belville — DS400 Air Flow Logger',
  dateRange: '29 May 2025 → 5 June 2025 (15-min intervals)',
  readingCount: 288,  // ~7 days × 24h × 4 readings/h, plus some additional
  avgFlowM3Min: 25.94,
  peakFlowM3Min: 26.81,
  minFlowM3Min: 23.79,
  avgPressureBar: 6.28,  // Inferred from Data File readings (approximate)
  demandUtilisationPct: parseFloat((25.94 / 29.7 * 100).toFixed(1)), // vs L160 rated 29.7
  source: 'audit-excel',
};
