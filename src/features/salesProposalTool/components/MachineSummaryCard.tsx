import {
  effectiveRatedAirflow,
  effectiveRatedPressure,
  publishedPowerRatingRows,
  sourceBackedLabel,
  specDisplayName,
} from '../specDisplay';
import { formatMeasuredNumber } from '../formatMeasured';
import {
  currentMachineCardTitle,
  type CurrentEquipmentDraft,
  type ProposedEquipmentDraft,
} from '../equipmentState';
import type { SitePerformanceView } from '../types';

interface MachineSummaryCardProps {
  current: CurrentEquipmentDraft[];
  proposed: ProposedEquipmentDraft;
  proposedSitePerformance?: SitePerformanceView | null;
}

function formatAirflow(value: number | null): string | null {
  const formatted = formatMeasuredNumber(value);
  return formatted ? `${formatted} m³/min` : null;
}

function formatPressure(value: number | null): string | null {
  const formatted = formatMeasuredNumber(value, 1);
  return formatted ? `${formatted} bar` : null;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-[#383838]">{value}</dd>
    </div>
  );
}

export function MachineSummaryCard({
  current,
  proposed,
  proposedSitePerformance = null,
}: MachineSummaryCardProps) {
  const currentRows = current.filter(
    (row) => row.arsMachineId || row.specLibraryRecordId || row.sourceBacked,
  );
  const hasProposed = Boolean(proposed.selectedSpec || proposed.sourceBacked);

  if (currentRows.length === 0 && !hasProposed) {
    return (
      <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
          Current / proposed machine summary
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          Select current equipment and a proposed BOUWA replacement to see published ratings here.
          Measured Air Audit values stay on the card above.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
        Current / proposed machine summary
      </h2>
      {currentRows.length > 0 && (
        <div className="mt-3 space-y-4">
          <h3 className="text-sm font-bold text-[#383838]">Current equipment</h3>
          {currentRows.map((row) => (
            <MachineBlock
              key={row.key}
              title={currentMachineCardTitle(row) || `${row.make} ${row.model}`}
              subtitle={row.serialNumber ? `Serial ${row.serialNumber}` : undefined}
              library={row.selectedSpec}
              source={row.sourceBacked}
            />
          ))}
        </div>
      )}
      {hasProposed && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-bold text-[#383838]">Proposed replacement</h3>
          <MachineBlock
            title={
              specDisplayName({
                manufacturer: proposed.manufacturer ?? proposed.selectedSpec?.manufacturer,
                model: proposed.model ?? proposed.selectedSpec?.model,
                modelVariant: proposed.selectedSpec?.modelVariant,
              }) || 'Proposed machine'
            }
            subtitle={`× ${proposed.quantity}`}
            library={proposed.selectedSpec}
            source={proposed.sourceBacked}
            sitePerformance={proposedSitePerformance}
          />
        </div>
      )}
    </section>
  );
}

function MachineBlock({
  title,
  subtitle,
  library,
  source,
  sitePerformance = null,
}: {
  title: string;
  subtitle?: string;
  library: CurrentEquipmentDraft['selectedSpec'];
  source: CurrentEquipmentDraft['sourceBacked'];
  sitePerformance?: SitePerformanceView | null;
}) {
  const airflow = effectiveRatedAirflow(library, source);
  const pressure = effectiveRatedPressure(library, source);
  const powerRows = publishedPowerRatingRows(library, source);
  const sourceNote = sourceBackedLabel(source);
  const published = library !== null;

  return (
    <div>
      <p className="text-sm font-medium text-[#383838]">{title}</p>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      {published && (
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Published specification
        </p>
      )}
      <dl className="mt-1">
        <Row
          label="Published airflow"
          value={formatAirflow(airflow.value) ?? 'Not available'}
        />
        <Row
          label="Published pressure"
          value={formatPressure(pressure.value) ?? 'Not available'}
        />
        {powerRows.map((row) => (
          <Row key={row.label} label={row.label} value={row.value} />
        ))}
      </dl>
      {sitePerformance?.status === 'estimated' && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {sitePerformance.sectionTitle}
          </p>
          <dl className="mt-1">
            <Row
              label={sitePerformance.estimatedLabel}
              value={
                formatAirflow(sitePerformance.estimatedSiteAirflowM3PerMin) ??
                'Not available'
              }
            />
            {sitePerformance.altitudeDisplay && (
              <Row
                label={sitePerformance.altitudeLabel}
                value={sitePerformance.altitudeDisplay}
              />
            )}
          </dl>
          {sitePerformance.basisNote && (
            <p className="mt-1 text-xs text-slate-500">{sitePerformance.basisNote}</p>
          )}
        </div>
      )}
      {sitePerformance && sitePerformance.status !== 'estimated' && sitePerformance.unavailableReason && (
        <p className="mt-2 text-xs text-slate-500">{sitePerformance.unavailableReason}</p>
      )}
      {sourceNote && <p className="mt-1 text-xs text-slate-500">{sourceNote}</p>}
      {!published && sourceNote && (
        <p className="text-xs text-slate-500">These values are not published Machine Spec Library data.</p>
      )}
    </div>
  );
}
