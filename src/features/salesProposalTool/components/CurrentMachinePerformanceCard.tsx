import type { CurrentMachineMeasuredPerformance } from '../types';
import { displayOrUnavailable, formatMeasuredNumber } from '../formatMeasured';

interface CurrentMachinePerformanceCardProps {
  result: CurrentMachineMeasuredPerformance | null;
}

function airflow(value: number | null | undefined): string | null {
  const formatted = formatMeasuredNumber(value);
  return formatted ? `${formatted} m³/min` : null;
}

function pressure(value: number | null | undefined): string | null {
  const formatted = formatMeasuredNumber(value, 1);
  return formatted ? `${formatted} bar` : null;
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-[#383838]">{displayOrUnavailable(value)}</dd>
    </div>
  );
}

export function CurrentMachinePerformanceCard({
  result,
}: CurrentMachinePerformanceCardProps) {
  if (!result) return null;

  if (result.scopeType === 'site_header') {
    if (!result.siteHeaderNote) return null;
    return (
      <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
          {result.copy.title}
        </h2>
        <p className="mt-3 text-sm text-slate-600">{result.siteHeaderNote}</p>
      </section>
    );
  }

  if (result.scopeType === 'single_machine' && !result.machineName) {
    return null;
  }

  return (
    <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
        {result.copy.title}
      </h2>
      {result.machineName && (
        <p className="mt-3 text-sm font-semibold text-[#383838]">{result.machineName}</p>
      )}
      <dl className="mt-3">
        <Row label={result.copy.publishedLabel} value={airflow(result.publishedFlowM3PerMin)} />
        <Row label={result.copy.measuredLabel} value={airflow(result.measuredFlowM3PerMin)} />
        <Row
          label={result.copy.differenceLabel}
          value={airflow(result.absoluteDifferenceM3PerMin)}
        />
        {result.copy.comparisonLabel && (
          <Row label={result.copy.comparisonLabel} value={result.copy.comparisonDisplay} />
        )}
        <Row label="Recorded Air Audit pressure" value={pressure(result.recordedPressureBar)} />
        <Row label="Published rated pressure" value={pressure(result.publishedPressureBarG)} />
      </dl>
      {result.copy.unavailableReason && (
        <p className="mt-3 text-xs text-slate-500">{result.copy.unavailableReason}</p>
      )}
      {result.comparisonCaveat && (
        <p className="mt-3 text-xs text-slate-500">{result.comparisonCaveat}</p>
      )}
      {result.flowBasisNote && (
        <p className="mt-3 text-xs text-slate-500">{result.flowBasisNote}</p>
      )}
    </section>
  );
}
