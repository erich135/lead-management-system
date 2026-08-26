import type { SalesProposalAirAudit } from '../types';
import {
  PRESSURE_BASIS_NOTE,
  SHORT_RECORD_NOTE,
  displayOrUnavailable,
  formatAuditDate,
  formatCoverageDays,
  formatMeasuredNumber,
  formatMeasuredPercent,
} from '../formatMeasured';

interface MeasuredAuditCardProps {
  audit: SalesProposalAirAudit | null;
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-[#383838]">{displayOrUnavailable(value)}</dd>
    </div>
  );
}

export function MeasuredAuditCard({ audit }: MeasuredAuditCardProps) {
  if (!audit) {
    return (
      <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
          Measured Air Audit
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          Upload the site's Air Audit CSV to see the measured operating profile.
        </p>
      </section>
    );
  }

  const periodStart = formatAuditDate(audit.periodStart);
  const periodEnd = formatAuditDate(audit.periodEnd);
  const period =
    periodStart && periodEnd ? `${periodStart} – ${periodEnd}` : periodStart || periodEnd;

  return (
    <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
        Measured Air Audit
      </h2>
      <dl className="mt-3">
        <Row label="Source file" value={audit.sourceFileName} />
        <Row label="Audit period" value={period} />
        <Row label="Coverage" value={formatCoverageDays(audit.coverageDays)} />
        <Row
          label="Mean measured airflow"
          value={
            formatMeasuredNumber(audit.meanAirflowM3PerMin)
              ? `${formatMeasuredNumber(audit.meanAirflowM3PerMin)} m³/min`
              : null
          }
        />
        <Row
          label="P50 measured airflow"
          value={
            formatMeasuredNumber(audit.p50AirflowM3PerMin)
              ? `${formatMeasuredNumber(audit.p50AirflowM3PerMin)} m³/min`
              : null
          }
        />
        <Row
          label="P90 measured airflow"
          value={
            formatMeasuredNumber(audit.p90AirflowM3PerMin)
              ? `${formatMeasuredNumber(audit.p90AirflowM3PerMin)} m³/min`
              : null
          }
        />
        <Row
          label="Highest recorded airflow"
          value={
            formatMeasuredNumber(audit.highestAirflowM3PerMin)
              ? `${formatMeasuredNumber(audit.highestAirflowM3PerMin)} m³/min`
              : null
          }
        />
        <Row
          label="Delivered air"
          value={
            formatMeasuredNumber(audit.deliveredVolumeM3, 0)
              ? `${formatMeasuredNumber(audit.deliveredVolumeM3, 0)} m³`
              : null
          }
        />
        <Row
          label="Flowing time"
          value={formatMeasuredPercent(audit.flowingFraction)}
        />
        <Row
          label="Recorded pressure"
          value={
            formatMeasuredNumber(audit.recordedPressureBar, 1)
              ? `${formatMeasuredNumber(audit.recordedPressureBar, 1)} bar`
              : null
          }
        />
      </dl>
      {audit.recordedPressureBar !== null && (
        <p className="mt-3 text-xs text-slate-500">{PRESSURE_BASIS_NOTE}</p>
      )}
      {audit.shortRecord && (
        <p className="mt-3 text-xs text-slate-500">{SHORT_RECORD_NOTE}</p>
      )}
    </section>
  );
}
