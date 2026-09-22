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
import type { ElectricalPowerKind, SitePerformanceView } from '../types';
import {
  AIRFLOW_REFERENCE_BASIS_LABEL,
  REFERENCE_INLET_PRESSURE_LABEL,
  REFERENCE_INLET_PRESSURE_UNIT,
  SPECIFICATION_REFERENCE_LABEL,
  flowReferenceBasisLabel,
  formatBarAbsoluteFromPa,
  resolveDraftPublishedFlowReference,
} from '../publishedFlowReference';

interface MachineSummaryCardProps {
  current: CurrentEquipmentDraft[];
  proposed: ProposedEquipmentDraft | ProposedEquipmentDraft[];
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

function asProposedList(
  proposed: ProposedEquipmentDraft | ProposedEquipmentDraft[],
): ProposedEquipmentDraft[] {
  return Array.isArray(proposed) ? proposed : [proposed];
}

export function MachineSummaryCard({
  current,
  proposed,
  proposedSitePerformance = null,
}: MachineSummaryCardProps) {
  const currentRows = current.filter(
    (row) => row.arsMachineId || row.specLibraryRecordId || row.sourceBacked || row.enteringManually,
  );
  const proposedRows = asProposedList(proposed).filter(
    (row) => row.selectedSpec || row.sourceBacked || row.manufacturer || row.model,
  );

  if (currentRows.length === 0 && proposedRows.length === 0) {
    return (
      <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
          Current / proposed machine summary
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          Select current equipment and proposed machines to see published ratings here.
          Measured air-audit values stay on the card above when an audit is used.
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
          <h3 className="text-sm font-bold text-[#383838]">Current machine specifications</h3>
          {currentRows.map((row) => (
            <MachineBlock
              key={row.key}
              title={currentMachineCardTitle(row) || `${row.make} ${row.model}`}
              subtitle={[
                row.serialNumber ? `Serial ${row.serialNumber}` : null,
                `× ${row.quantity}`,
              ]
                .filter(Boolean)
                .join(' · ')}
              library={row.selectedSpec}
              source={row.sourceBacked}
              electricalPowerKind={row.electricalPowerKind ?? null}
              flowReference={resolveDraftPublishedFlowReference(row)}
            />
          ))}
        </div>
      )}
      {proposedRows.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-bold text-[#383838]">Proposed machine specifications</h3>
          {proposedRows.map((row, index) => (
            <MachineBlock
              key={row.key}
              title={
                specDisplayName({
                  manufacturer: row.manufacturer ?? row.selectedSpec?.manufacturer,
                  model: row.model ?? row.selectedSpec?.model,
                  modelVariant: row.selectedSpec?.modelVariant,
                }) || 'Proposed machine'
              }
              subtitle={`× ${row.quantity}`}
              library={row.selectedSpec}
              source={row.sourceBacked}
              sitePerformance={index === 0 ? proposedSitePerformance : null}
              electricalPowerKind={row.electricalPowerKind ?? null}
              flowReference={resolveDraftPublishedFlowReference(row)}
            />
          ))}
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
  electricalPowerKind = null,
  flowReference = null,
}: {
  title: string;
  subtitle?: string;
  library: CurrentEquipmentDraft['selectedSpec'];
  source: CurrentEquipmentDraft['sourceBacked'];
  sitePerformance?: SitePerformanceView | null;
  electricalPowerKind?: ElectricalPowerKind | null;
  flowReference?: ReturnType<typeof resolveDraftPublishedFlowReference> | null;
}) {
  const airflow = effectiveRatedAirflow(library, source);
  const pressure = effectiveRatedPressure(library, source);
  const powerRows = publishedPowerRatingRows(library, source, electricalPowerKind);
  const sourceNote = sourceBackedLabel(source);
  const published = library !== null;

  return (
    <div className="mt-3">
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
        <Row
          label={AIRFLOW_REFERENCE_BASIS_LABEL}
          value={flowReferenceBasisLabel(flowReference?.flowReferenceBasis) ?? 'Not available'}
        />
        <Row
          label={REFERENCE_INLET_PRESSURE_LABEL}
          value={
            formatBarAbsoluteFromPa(flowReference?.referenceAbsolutePressurePa)
              ? `${formatBarAbsoluteFromPa(flowReference?.referenceAbsolutePressurePa)} ${REFERENCE_INLET_PRESSURE_UNIT}`
              : 'Not available'
          }
        />
        {flowReference?.specificationReference && (
          <Row
            label={SPECIFICATION_REFERENCE_LABEL}
            value={flowReference.specificationReference}
          />
        )}
      </dl>
      {sitePerformance && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {sitePerformance.sectionTitle}
          </p>
          <dl className="mt-1">
            <Row
              label={sitePerformance.altitudeLabel}
              value={sitePerformance.altitudeDisplay ?? 'Not available'}
            />
            {sitePerformance.status === 'estimated' ? (
              <Row
                label={sitePerformance.estimatedLabel}
                value={
                  formatAirflow(sitePerformance.estimatedSiteAirflowM3PerMin) ??
                  'Not available'
                }
              />
            ) : (
              <Row label={sitePerformance.estimatedLabel} value="Not available" />
            )}
          </dl>
          {sitePerformance.status === 'estimated' && sitePerformance.basisNote && (
            <p className="mt-1 text-xs text-slate-500">{sitePerformance.basisNote}</p>
          )}
          {sitePerformance.status !== 'estimated' && sitePerformance.unavailableReason && (
            <p className="mt-1 text-xs text-slate-500">{sitePerformance.unavailableReason}</p>
          )}
        </div>
      )}
      {sourceNote && <p className="mt-1 text-xs text-slate-500">{sourceNote}</p>}
      {!published && sourceNote && (
        <p className="text-xs text-slate-500">These values are not published Machine Spec Library data.</p>
      )}
    </div>
  );
}
