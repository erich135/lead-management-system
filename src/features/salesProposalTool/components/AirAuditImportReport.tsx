import type { SalesProposalAirAudit } from '../types';

function hoursLabel(seconds: number | null | undefined): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null;
  const hours = Math.round((seconds / 3600) * 10) / 10;
  return `${hours} hours`;
}

/** Shows facts already stored on the audit. It does not add a coverage calculation. */
export function AirAuditImportReport({ audit }: { audit: SalesProposalAirAudit | null }) {
  if (!audit) return null;
  const usable = hoursLabel(audit.validMeasurementDurationSeconds);
  const rejected =
    typeof audit.rowCount === 'number' && typeof audit.validRowCount === 'number'
      ? audit.rowCount - audit.validRowCount
      : null;
  return (
    <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-4 text-sm text-[#383838]">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">What the file contained</p>
      <ul className="mt-2 space-y-1">
        <li>File: {audit.sourceFileName}</li>
        <li>
          Recording period: {audit.periodStart ?? 'not recorded'} to {audit.periodEnd ?? 'not recorded'}
        </li>
        {usable && <li>Usable measurements: {usable}</li>}
        <li>Accepted readings: {audit.validRowCount}</li>
        {rejected !== null && rejected > 0 && (
          <li>
            {rejected} readings were not usable and are excluded. This does not by itself show why they
            were invalid.
          </li>
        )}
      </ul>
    </div>
  );
}
