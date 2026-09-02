import type { AirAndElectricityComparison, SitePerformanceView } from '../types';
import { formatMeasuredNumber } from '../formatMeasured';

interface AirMachineComparisonCardProps {
  comparison: AirAndElectricityComparison | null;
  proposedSitePerformance?: SitePerformanceView | null;
}

function airflow(value: number | null | undefined): string {
  const formatted = formatMeasuredNumber(value);
  return formatted ? `${formatted} m³/min` : 'Not available';
}

function pressure(value: number | null | undefined): string {
  const formatted = formatMeasuredNumber(value, 1);
  return formatted ? `${formatted} bar` : 'Not available';
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-[#383838]">{value}</dd>
    </div>
  );
}

export function AirMachineComparisonCard({
  comparison,
  proposedSitePerformance = null,
}: AirMachineComparisonCardProps) {
  const air = comparison?.air ?? null;

  return (
    <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
        Air &amp; machine comparison
      </h2>
      {!comparison ? (
        <p className="mt-3 text-sm text-slate-600">
          The comparison will appear here once the Air Audit and selected machines are available.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <h3 className="text-sm font-bold text-[#383838]">Measured</h3>
            <dl className="mt-2">
              <Row label="Mean measured airflow" value={airflow(air?.meanAirflowM3PerMin)} />
              <Row label="P90 measured airflow" value={airflow(air?.p90AirflowM3PerMin)} />
              <Row label="Highest recorded airflow" value={airflow(air?.highestAirflowM3PerMin)} />
            </dl>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#383838]">Current system</h3>
            <dl className="mt-2">
              <Row
                label="Published capacity"
                value={airflow(comparison.current.totalRatedFadM3PerMin)}
              />
            </dl>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#383838]">Proposed</h3>
            <dl className="mt-2">
              <Row
                label="Published capacity"
                value={airflow(comparison.proposed.totalRatedFadM3PerMin)}
              />
              {proposedSitePerformance?.status === 'estimated' && (
                <Row
                  label={proposedSitePerformance.estimatedLabel}
                  value={airflow(proposedSitePerformance.estimatedSiteAirflowTotalM3PerMin)}
                />
              )}
            </dl>
          </div>
        </div>
      )}
      {comparison && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-bold text-[#383838]">Pressure</h3>
          <dl className="mt-2">
            <Row
              label="Recorded pressure"
              value={pressure(air?.recordedPressureBar)}
            />
            <Row
              label="Current published rated pressure"
              value={pressure(comparison.current.ratedPressureBarG)}
            />
            <Row
              label="Proposed published rated pressure"
              value={pressure(comparison.proposed.ratedPressureBarG)}
            />
          </dl>
        </div>
      )}
      {proposedSitePerformance?.advisory && (
        <p className="mt-3 text-sm text-slate-600">{proposedSitePerformance.advisory}</p>
      )}
      {comparison?.warnings.map((warning) => (
        <p key={warning} className="mt-3 text-sm text-amber-800">
          {warning}
        </p>
      ))}
    </section>
  );
}
