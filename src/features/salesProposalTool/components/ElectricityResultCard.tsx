import type { AirAndElectricityComparison } from '../types';
import {
  displayOrUnavailable,
  formatEstimatedKwh,
  formatEstimatedRand,
  formatMeasuredNumber,
} from '../formatMeasured';

interface ElectricityResultCardProps {
  comparison: AirAndElectricityComparison | null;
  onAddCurrentSpecSheet?: () => void;
  onAddProposedSpecSheet?: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-[#383838]">{value}</dd>
    </div>
  );
}

function volume(value: number | null | undefined): string {
  const formatted = formatMeasuredNumber(value, 0);
  return formatted ? `${formatted} m³` : 'Not available';
}

function days(value: number | null | undefined): string {
  const formatted = formatMeasuredNumber(value, 1);
  return formatted ? `${formatted} days` : 'Not available';
}

export function ElectricityResultCard({
  comparison,
  onAddCurrentSpecSheet,
  onAddProposedSpecSheet,
}: ElectricityResultCardProps) {
  if (!comparison) {
    return (
      <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
          Electricity
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          Estimated electricity will appear here once the Air Audit, published machine
          package-input/FAD data and electricity rate are available.
        </p>
      </section>
    );
  }

  const currentKwh = formatEstimatedKwh(comparison.current.estimatedAnnualKwh);
  const proposedKwh = formatEstimatedKwh(comparison.proposed.estimatedAnnualKwh);
  const currentCost = formatEstimatedRand(comparison.current.estimatedAnnualCostRand);
  const proposedCost = formatEstimatedRand(comparison.proposed.estimatedAnnualCostRand);
  const savingValue =
    comparison.electricity.outcome === 'increase'
      ? comparison.electricity.estimatedIncreaseRand
      : comparison.electricity.outcome === 'saving'
        ? comparison.electricity.estimatedSavingRand
        : null;
  const saving = formatEstimatedRand(savingValue);
  const showCurrentSpec =
    comparison.current.missingPackageInputNames.length > 0 && onAddCurrentSpecSheet;
  const showProposedSpec =
    comparison.proposed.missingPackageInputNames.length > 0 && onAddProposedSpecSheet;
  const configurationInvalidNote = comparison.notes.find((note) =>
    note.includes('does not meet the audited air requirement'),
  );
  const otherNotes = comparison.notes.filter((note) => note !== configurationInvalidNote);

  return (
    <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
        Electricity
      </h2>

      <div className="mt-4">
        <h3 className="text-sm font-bold text-[#383838]">Current</h3>
        {comparison.current.unavailableReason && (
          <p className="mt-2 text-sm text-slate-600">{comparison.current.unavailableReason}</p>
        )}
        <dl className="mt-2">
          <Row
            label={comparison.copy.currentEnergy}
            value={displayOrUnavailable(currentKwh)}
          />
          <Row
            label={comparison.copy.currentCost}
            value={displayOrUnavailable(currentCost)}
          />
        </dl>
        {showCurrentSpec && (
          <button
            type="button"
            className="mt-2 text-xs font-medium text-[#0969a9] underline"
            onClick={onAddCurrentSpecSheet}
          >
            Add from specification sheet
          </button>
        )}
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-bold text-[#383838]">Proposed</h3>
        {comparison.proposed.unavailableReason && (
          <p className="mt-2 text-sm text-slate-600">{comparison.proposed.unavailableReason}</p>
        )}
        <dl className="mt-2">
          <Row
            label={comparison.copy.proposedEnergy}
            value={displayOrUnavailable(proposedKwh)}
          />
          <Row
            label={comparison.copy.proposedCost}
            value={displayOrUnavailable(proposedCost)}
          />
        </dl>
        {showProposedSpec && (
          <button
            type="button"
            className="mt-2 text-xs font-medium text-[#0969a9] underline"
            onClick={onAddProposedSpecSheet}
          >
            Add from specification sheet
          </button>
        )}
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-bold text-[#383838]">{comparison.copy.saving}</h3>
        {configurationInvalidNote && (
          <p className="mt-2 text-sm text-amber-800">{configurationInvalidNote}</p>
        )}
        <p className="mt-2 text-lg font-bold text-[#383838]">
          {saving ?? 'Not available'}
        </p>
      </div>

      <p className="mt-4 text-sm text-slate-600">{comparison.basisExplanation}</p>
      <p className="mt-2 text-sm text-slate-600">{comparison.futureCostDisclaimer}</p>
      {otherNotes.map((note) => (
        <p key={note} className="mt-2 text-xs text-slate-500">
          {note}
        </p>
      ))}

      <details className="mt-4 text-sm text-slate-600">
        <summary className="cursor-pointer font-medium text-[#383838]">
          How was this calculated?
        </summary>
        <dl className="mt-3">
          <Row
            label="Audit duration"
            value={days(comparison.breakdown.auditDurationDays)}
          />
          <Row
            label="Measured delivered air"
            value={volume(comparison.breakdown.measuredDeliveredAirM3)}
          />
          <Row
            label="Annualised air volume"
            value={volume(comparison.breakdown.annualisedAirVolumeM3)}
          />
          <Row
            label="Current published package-input/FAD basis"
            value={comparison.breakdown.currentPackageInputFad ?? 'Not available'}
          />
          <Row
            label="Proposed published package-input/FAD basis"
            value={comparison.breakdown.proposedPackageInputFad ?? 'Not available'}
          />
          <Row
            label="Electricity rate"
            value={comparison.breakdown.electricityRate ?? 'Not available'}
          />
          <Row
            label="Estimated current kWh"
            value={displayOrUnavailable(formatEstimatedKwh(comparison.breakdown.estimatedCurrentKwh))}
          />
          <Row
            label="Estimated proposed kWh"
            value={displayOrUnavailable(formatEstimatedKwh(comparison.breakdown.estimatedProposedKwh))}
          />
        </dl>
      </details>
    </section>
  );
}
