/**
 * Readiness, said once.
 *
 * Four lines, in the order the work actually happens, each stating either that
 * the stage is ready or how many answers it is still waiting for. The complete
 * ordered reason list is not shown here; it is in Advanced Technical Review.
 *
 * A stage that does not apply to the proposal type says so in the backend's own
 * words rather than showing a count of questions that will never be asked.
 */

import { CheckCircle2, CircleDashed, MinusCircle } from 'lucide-react';

import type { AuditReadinessAssessment } from '../../auditIntakeTypes';
import { readinessLines } from '../wizardState';

export function WizardReadinessStrip({
  readiness,
}: {
  readiness: AuditReadinessAssessment;
}) {
  const lines = readinessLines(readiness);
  return (
    <dl
      data-testid="wizard-readiness-strip"
      className="grid grid-cols-2 gap-x-4 gap-y-1 lg:grid-cols-4"
    >
      {lines.map(line => (
        <div key={line.stage} className="flex items-center gap-1.5 text-xs">
          {!line.applicable ? (
            <MinusCircle className="h-3.5 w-3.5 shrink-0 text-slate-300" />
          ) : line.ready ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          ) : (
            <CircleDashed className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          )}
          <dt className="text-slate-500">{line.label}:</dt>
          <dd
            className={
              !line.applicable
                ? 'truncate text-slate-400'
                : line.ready
                  ? 'font-medium text-emerald-700'
                  : 'font-medium text-amber-700'
            }
            title={line.state}
          >
            {!line.applicable ? 'Not applicable' : line.state}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function WizardReadinessPanel({
  readiness,
}: {
  readiness: AuditReadinessAssessment;
}) {
  const lines = readinessLines(readiness);
  return (
    <div className="space-y-2">
      {lines.map(line => (
        <div
          key={line.stage}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h4 className="text-sm font-semibold text-slate-800">{line.label}</h4>
            <span
              className={`text-xs font-medium ${
                !line.applicable
                  ? 'text-slate-400'
                  : line.ready
                    ? 'text-emerald-700'
                    : 'text-amber-700'
              }`}
            >
              {line.state}
            </span>
          </div>
          {line.nextActions.length === 0 || !line.applicable ? null : (
            <p className="mt-1 text-xs text-slate-600">
              Next: {line.nextActions.join(' · ')}
              {line.outstandingCount > line.nextActions.length
                ? ` and ${line.outstandingCount - line.nextActions.length} more`
                : ''}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
