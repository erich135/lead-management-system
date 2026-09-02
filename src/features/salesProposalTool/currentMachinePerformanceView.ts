import type { CurrentMachineMeasuredPerformance, CustomerProposalDocument } from './types';
import { displayOrUnavailable, formatMeasuredNumber } from './formatMeasured.ts';

export interface PerformanceDisplayRow {
  label: string;
  value: string;
}

export type EditorPerformanceView =
  | { kind: 'hidden' }
  | { kind: 'site_note'; title: string; note: string }
  | {
      kind: 'machine';
      title: string;
      machineName: string | null;
      rows: PerformanceDisplayRow[];
      notes: string[];
    };

export type CustomerProposalPerformanceView =
  | { kind: 'hidden' }
  | {
      kind: 'shown';
      title: string;
      machineName: string | null;
      rows: PerformanceDisplayRow[];
      limitationNote: string | null;
      caveat: string | null;
      estimatedBasisNote: string | null;
    };

function airflow(value: number | null | undefined): string {
  const formatted = formatMeasuredNumber(value);
  return displayOrUnavailable(formatted ? `${formatted} m³/min` : null);
}

function pressure(value: number | null | undefined): string {
  const formatted = formatMeasuredNumber(value, 1);
  return displayOrUnavailable(formatted ? `${formatted} bar` : null);
}

function percent(value: number | null | undefined): string {
  const formatted = formatMeasuredNumber(value, 0);
  return displayOrUnavailable(formatted ? `${formatted}%` : null);
}

function hours(value: number | null | undefined): string {
  return displayOrUnavailable(formatMeasuredNumber(value, 0));
}

/**
 * Editor presentation of backend current-machine performance.
 * Site/common-header audits never produce an individual-machine comparison.
 */
export function editorPerformanceView(
  result: CurrentMachineMeasuredPerformance | null,
): EditorPerformanceView {
  if (!result) return { kind: 'hidden' };

  if (result.scopeType === 'site_header') {
    if (!result.siteHeaderNote) return { kind: 'hidden' };
    return {
      kind: 'site_note',
      title: result.copy.title,
      note: result.siteHeaderNote,
    };
  }

  if (result.scopeType === 'single_machine' && !result.machineName) {
    return { kind: 'hidden' };
  }

  const estimatedOperating = result.presentation === 'estimated_operating';
  const rows: PerformanceDisplayRow[] = [
    { label: result.copy.publishedLabel, value: airflow(result.publishedFlowM3PerMin) },
  ];
  if (result.sitePerformance?.status === 'estimated') {
    rows.push({
      label: result.sitePerformance.estimatedLabel,
      value: airflow(result.sitePerformance.estimatedSiteAirflowM3PerMin),
    });
  }
  if (estimatedOperating) {
    rows.push(
      {
        label: result.copy.annualOperatingHoursLabel ?? 'Annual operating hours',
        value: hours(result.annualOperatingHours),
      },
      {
        label: result.copy.averageLoadLabel ?? 'Average load',
        value: percent(result.averageLoadPercent),
      },
      {
        label:
          result.copy.estimatedAverageOperatingAirflowLabel ??
          'Estimated average operating airflow',
        value: airflow(result.estimatedAverageOperatingAirflowM3PerMin),
      },
    );
  } else {
    if (result.copy.measuredLabel) {
      rows.push({
        label: result.copy.measuredLabel,
        value: airflow(result.measuredFlowM3PerMin),
      });
    }
    if (result.copy.differenceLabel) {
      rows.push({
        label: result.copy.differenceLabel,
        value: airflow(result.absoluteDifferenceM3PerMin),
      });
    }
    if (result.copy.comparisonLabel) {
      rows.push({
        label: result.copy.comparisonLabel,
        value: displayOrUnavailable(result.copy.comparisonDisplay),
      });
    }
    rows.push(
      { label: 'Recorded Air Audit pressure', value: pressure(result.recordedPressureBar) },
      { label: 'Published rated pressure', value: pressure(result.publishedPressureBarG) },
    );
  }

  return {
    kind: 'machine',
    title: result.copy.title,
    machineName: result.machineName,
    rows,
    notes: [
      result.sitePerformance?.status === 'estimated'
        ? result.sitePerformance.basisNote
        : estimatedOperating
          ? result.sitePerformance?.unavailableReason ?? null
          : null,
      result.publishedCapacityFallbackNote,
      result.copy.unavailableReason,
      result.copy.limitationNote,
      estimatedOperating ? null : result.comparisonCaveat,
      estimatedOperating ? null : result.flowBasisNote,
    ].filter((note, index, all): note is string => Boolean(note) && all.indexOf(note) === index),
  };
}

/**
 * Customer-proposal presentation. Backend already omits unavailable /
 * site-header results (available === false → null on the document).
 */
export function customerProposalPerformanceView(
  performance: CustomerProposalDocument['currentMachinePerformance'],
): CustomerProposalPerformanceView {
  if (!performance) return { kind: 'hidden' };
  const rows: PerformanceDisplayRow[] = [
    {
      label: performance.publishedLabel,
      value: performance.publishedAirflow ?? 'Not available',
    },
  ];
  if (performance.estimatedAirflow) {
    rows.push({
      label: performance.estimatedLabel ?? 'Estimated airflow at site conditions',
      value: performance.estimatedAirflow,
    });
  }
  if (performance.presentation === 'estimated_operating' || performance.annualOperatingHoursLabel) {
    if (performance.annualOperatingHoursLabel) {
      rows.push({
        label: performance.annualOperatingHoursLabel,
        value: performance.annualOperatingHours ?? 'Not available',
      });
    }
    if (performance.averageLoadLabel) {
      rows.push({
        label: performance.averageLoadLabel,
        value: performance.averageLoad ?? 'Not available',
      });
    }
    if (performance.estimatedAverageOperatingAirflowLabel) {
      rows.push({
        label: performance.estimatedAverageOperatingAirflowLabel,
        value: performance.estimatedAverageOperatingAirflow ?? 'Not available',
      });
    }
  } else if (performance.measuredLabel) {
    rows.push({
      label: performance.measuredLabel,
      value: performance.measuredAirflow ?? 'Not available',
    });
    if (performance.differenceLabel) {
      rows.push({
        label: performance.differenceLabel,
        value: performance.differenceAirflow ?? 'Not available',
      });
    }
    if (performance.comparisonLabel) {
      rows.push({
        label: performance.comparisonLabel,
        value: performance.comparisonValue ?? 'Not available',
      });
    }
  }
  return {
    kind: 'shown',
    title: performance.title,
    machineName: performance.machineName,
    rows,
    limitationNote: performance.limitationNote,
    caveat: performance.caveat,
    estimatedBasisNote: performance.estimatedBasisNote,
  };
}
