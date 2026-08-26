import {
  displayedMotorRatingKw,
  effectivePackageInput,
  effectiveRatedAirflow,
  effectiveRatedPressure,
  hasUsableSourceBacked,
  MOTOR_RATING_LABEL,
  packageInputUnavailableCopy,
  PUBLISHED_PACKAGE_INPUT_LABEL,
  sourceBackedLabel,
  specDisplayName,
} from '../specDisplay';
import { formatMeasuredNumber } from '../formatMeasured';
import {
  currentMachineCardTitle,
  type CurrentEquipmentDraft,
  type ProposedEquipmentDraft,
} from '../equipmentState';

interface MachineSummaryCardProps {
  current: CurrentEquipmentDraft[];
  proposed: ProposedEquipmentDraft;
}

function formatAirflow(value: number | null): string | null {
  const formatted = formatMeasuredNumber(value);
  return formatted ? `${formatted} m³/min` : null;
}

function formatPressure(value: number | null): string | null {
  const formatted = formatMeasuredNumber(value, 1);
  return formatted ? `${formatted} bar` : null;
}

function formatKw(value: number | null, digits = 1): string | null {
  const formatted = formatMeasuredNumber(value, digits);
  return formatted ? `${formatted} kW` : null;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-[#383838]">{value}</dd>
    </div>
  );
}

export function MachineSummaryCard({ current, proposed }: MachineSummaryCardProps) {
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
}: {
  title: string;
  subtitle?: string;
  library: CurrentEquipmentDraft['selectedSpec'];
  source: CurrentEquipmentDraft['sourceBacked'];
}) {
  const airflow = effectiveRatedAirflow(library, source);
  const pressure = effectiveRatedPressure(library, source);
  const packageInput = effectivePackageInput(library, source);
  const motor = displayedMotorRatingKw(library, source);
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
          label="Rated airflow"
          value={formatAirflow(airflow.value) ?? 'Not available'}
        />
        <Row
          label="Rated pressure"
          value={formatPressure(pressure.value) ?? 'Not available'}
        />
        <Row
          label={PUBLISHED_PACKAGE_INPUT_LABEL}
          value={
            formatKw(packageInput.value) ??
            packageInputUnavailableCopy({
              hasLibrary: library !== null,
              hasSource: hasUsableSourceBacked(source),
            })
          }
        />
        {motor !== null && (
          <Row label={MOTOR_RATING_LABEL} value={formatKw(motor, 2) ?? 'Not available'} />
        )}
      </dl>
      {sourceNote && <p className="mt-1 text-xs text-slate-500">{sourceNote}</p>}
      {!published && sourceNote && (
        <p className="text-xs text-slate-500">These values are not published Machine Spec Library data.</p>
      )}
    </div>
  );
}
