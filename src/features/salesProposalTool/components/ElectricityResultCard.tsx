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
  hoursAreEstimated?: boolean | null;
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

function moneyPrecise(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'Not available';
  return `R ${value.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function CostBreakdownTable({
  breakdown,
}: {
  breakdown: NonNullable<AirAndElectricityComparison['breakdown']['costBreakdown']>;
}) {
  const showRows = breakdown.rows.some((row) => row.productionDays != null);
  return (
    <div className="mt-4 overflow-x-auto">
      {showRows && (
        <>
          <p className="text-xs font-medium text-[#383838]">
            Electricity cost by season and day type
          </p>
          <table className="mt-2 w-full min-w-[36rem] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-1.5 pr-2 font-medium">Period</th>
                <th className="py-1.5 px-2 font-medium text-right">Production days</th>
                <th className="py-1.5 px-2 font-medium text-right">Daily current</th>
                <th className="py-1.5 px-2 font-medium text-right">Daily proposed</th>
                <th className="py-1.5 px-2 font-medium text-right">Annual current</th>
                <th className="py-1.5 pl-2 font-medium text-right">Annual proposed</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.rows.map((row) => (
                <tr key={row.key} className="border-b border-slate-100">
                  <td className="py-1.5 pr-2 text-[#383838]">{row.label}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums">
                    {row.productionDays == null
                      ? 'Not available'
                      : formatMeasuredNumber(row.productionDays, 1) ?? 'Not available'}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums">
                    {moneyPrecise(row.dailyCurrentCostRand)}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums">
                    {moneyPrecise(row.dailyProposedCostRand)}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums">
                    {displayOrUnavailable(formatEstimatedRand(row.annualCurrentCostRand))}
                  </td>
                  <td className="py-1.5 pl-2 text-right tabular-nums">
                    {displayOrUnavailable(formatEstimatedRand(row.annualProposedCostRand))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <dl className="mt-3">
        <Row
          label="Annual electricity totals before VSD allowance"
          value={`${displayOrUnavailable(formatEstimatedRand(breakdown.currentAnnualBeforeVsdRand))} / ${displayOrUnavailable(formatEstimatedRand(breakdown.proposedAnnualBeforeVsdRand))}`}
        />
        <Row
          label={breakdown.vsdAllowanceLabel ?? 'ARS VSD allowance — 14%'}
          value={
            breakdown.vsdApplicable
              ? `${displayOrUnavailable(formatEstimatedRand(breakdown.currentVsdAllowanceRand ?? 0))} / ${displayOrUnavailable(formatEstimatedRand(breakdown.proposedVsdAllowanceRand ?? breakdown.vsdAllowanceRand))}`
              : 'Not applicable'
          }
        />
        <Row
          label="Adjusted annual totals"
          value={`${displayOrUnavailable(formatEstimatedRand(breakdown.currentAnnualAdjustedRand))} / ${displayOrUnavailable(formatEstimatedRand(breakdown.proposedAnnualAdjustedRand))}`}
        />
        <Row
          label="Final annual electricity saving"
          value={displayOrUnavailable(formatEstimatedRand(breakdown.annualSavingAfterVsdRand))}
        />
      </dl>
      {breakdown.vsdNote && (
        <p className="mt-2 text-xs text-slate-500">{breakdown.vsdNote}</p>
      )}
    </div>
  );
}

export function ElectricityResultCard({
  comparison,
  onAddCurrentSpecSheet,
  onAddProposedSpecSheet,
  hoursAreEstimated = null,
}: ElectricityResultCardProps) {
  if (!comparison) {
    return (
      <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
          Electricity
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          Estimated electricity will appear here once published machine package-input/FAD
          data, the stated operating assumptions or a measured Air Audit, and the electricity
          rate are available.
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
    note.includes('does not meet the air requirement'),
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
      {hoursAreEstimated && comparison.operating?.annualOperatingHours != null && (
        <p className="mt-2 text-sm text-slate-600">
          Annual operating hours used in this comparison are an estimate
          ({formatMeasuredNumber(comparison.operating.annualOperatingHours, 0)} hours).
        </p>
      )}
      {comparison.electricity.suppliedAmountReferenceNote && (
        <p className="mt-2 text-sm text-slate-600">
          {comparison.electricity.suppliedCurrentAmount != null
            ? `Known compressor electricity amount supplied: ${
                formatEstimatedRand(comparison.electricity.suppliedCurrentAmount) ??
                'Not available'
              } ${
                comparison.electricity.suppliedCurrentPeriod === 'annual'
                  ? 'per year'
                  : 'per month'
              }. `
            : null}
          {comparison.electricity.suppliedAmountReferenceNote}
        </p>
      )}
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
          {comparison.air && (
            <>
              <Row
                label="Audit duration"
                value={days(comparison.breakdown.auditDurationDays)}
              />
              <Row
                label="Measured delivered air"
                value={volume(comparison.breakdown.measuredDeliveredAirM3)}
              />
            </>
          )}
          <Row
            label={comparison.air ? 'Annualised air volume' : 'Estimated annual delivered air'}
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
            label="Average electricity tariff"
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
        {comparison.breakdown.costBreakdown && (
          <CostBreakdownTable breakdown={comparison.breakdown.costBreakdown} />
        )}
      </details>
    </section>
  );
}
