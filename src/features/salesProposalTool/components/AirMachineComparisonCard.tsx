import type { AirAndElectricityComparison, SitePerformanceView } from '../types';
import { formatMeasuredNumber } from '../formatMeasured';
import { ConfigurationAcceptancePanel } from './ConfigurationAcceptancePanel';
import {
  AIR_AUDIT_DEMAND_HELP,
  PUBLISHED_CAPACITY_HELP,
  type ElectricityCalculationBasis,
} from '../electricityCalculationBasis';

interface AirMachineComparisonCardProps {
  comparison: AirAndElectricityComparison | null;
  proposedSitePerformance?: SitePerformanceView | null;
  validationFailed?: boolean;
  configurationAccepted?: boolean;
  acceptedByName?: string | null;
  acceptedAt?: string | null;
  acceptanceNote?: string | null;
  canAcceptConfiguration?: boolean;
  onAcceptConfiguration?: (note: string) => void;
  onRevokeConfiguration?: () => void;
  calculationBasis?: ElectricityCalculationBasis;
  onCalculationBasisChange?: (basis: ElectricityCalculationBasis) => void;
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
  validationFailed = false,
  configurationAccepted = false,
  acceptedByName = null,
  acceptedAt = null,
  acceptanceNote = null,
  canAcceptConfiguration = false,
  onAcceptConfiguration,
  onRevokeConfiguration,
  calculationBasis = 'air_audit',
  onCalculationBasisChange,
}: AirMachineComparisonCardProps) {
  const air = comparison?.air ?? null;
  const help =
    calculationBasis === 'published_capacity' ? PUBLISHED_CAPACITY_HELP : AIR_AUDIT_DEMAND_HELP;

  return (
    <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
        Air &amp; machine comparison
      </h2>
      {onCalculationBasisChange && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-[#383838]">Electricity calculation basis</p>
          <div className="mt-2 inline-flex rounded-lg border border-slate-300 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => onCalculationBasisChange('air_audit')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                calculationBasis === 'air_audit'
                  ? 'bg-[#0969a9] text-white'
                  : 'text-slate-700'
              }`}
            >
              Air Audit demand
            </button>
            <button
              type="button"
              onClick={() => onCalculationBasisChange('published_capacity')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                calculationBasis === 'published_capacity'
                  ? 'bg-[#0969a9] text-white'
                  : 'text-slate-700'
              }`}
            >
              Published capacity / Legacy method
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-600">{help}</p>
        </div>
      )}
      {!comparison ? (
        <p className="mt-3 text-sm text-slate-600">
          The comparison will appear here once machines, the air requirement, and the site are available.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <h3 className="text-sm font-bold text-[#383838]">
              {comparison.airRequirement?.label ?? (air ? 'Measured air requirement' : 'Air requirement')}
            </h3>
            <dl className="mt-2">
              {comparison.airRequirement?.kind === 'measured' ? (
                <>
                  <Row label="Overall measured mean airflow" value={airflow(air?.meanAirflowM3PerMin)} />
                  {calculationBasis === 'air_audit' && (
                    <Row
                      label="24-hour profile average used for electricity calculation"
                      value={airflow(air?.profileAverageM3PerMin)}
                    />
                  )}
                  <Row label="P90 measured airflow" value={airflow(air?.p90AirflowM3PerMin)} />
                  <Row label="Highest recorded airflow" value={airflow(air?.highestAirflowM3PerMin)} />
                </>
              ) : (
                <>
                  <Row
                    label="Assumed airflow"
                    value={airflow(comparison.airRequirement?.airflowM3PerMin)}
                  />
                  {comparison.airRequirement?.instruction && (
                    <p className="mt-2 text-xs text-slate-600">{comparison.airRequirement.instruction}</p>
                  )}
                  {comparison.airRequirement?.assumedNote && (
                    <p className="mt-2 text-xs text-slate-600">{comparison.airRequirement.assumedNote}</p>
                  )}
                </>
              )}
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
              <Row
                label={proposedSitePerformance?.altitudeLabel ?? 'Site altitude'}
                value={proposedSitePerformance?.altitudeDisplay ?? 'Not available'}
              />
              {proposedSitePerformance?.status === 'estimated' ? (
                <Row
                  label="Site-adjusted capacity"
                  value={airflow(proposedSitePerformance.estimatedSiteAirflowTotalM3PerMin)}
                />
              ) : (
                <Row
                  label="Site-adjusted capacity"
                  value="Not available"
                />
              )}
            </dl>
            {proposedSitePerformance &&
              proposedSitePerformance.status !== 'estimated' &&
              proposedSitePerformance.unavailableReason && (
                <p className="mt-2 text-xs text-slate-600">
                  {proposedSitePerformance.unavailableReason}
                </p>
              )}
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
      {!configurationAccepted &&
        comparison?.warnings.map((warning) => (
          <p key={warning} className="mt-3 text-sm text-amber-800">
            {warning}
          </p>
        ))}
      {onAcceptConfiguration && onRevokeConfiguration && (
        <ConfigurationAcceptancePanel
          validationFailed={validationFailed}
          accepted={configurationAccepted}
          acceptedByName={acceptedByName}
          acceptedAt={acceptedAt}
          note={acceptanceNote}
          canAccept={canAcceptConfiguration}
          onAccept={onAcceptConfiguration}
          onRevoke={onRevokeConfiguration}
        />
      )}
      {configurationAccepted &&
        comparison?.warnings.map((warning) => (
          <p key={warning} className="mt-3 text-sm text-amber-800">
            {warning}
          </p>
        ))}
    </section>
  );
}
