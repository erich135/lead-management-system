/**
 * The last step: calculate, compare, and generate the proposal.
 *
 * Sales workflow: show the result first, then the comparison, then only the
 * issues that apply to this proposal type. Technical records stay available
 * without sitting in front of a preliminary customer comparison.
 */

import { CheckCircle2, FileText, AlertTriangle, Microscope } from 'lucide-react';

import type {
  AuditIntakeFormModel,
  AuditReadinessAssessment,
  ClaimAssessmentInput,
} from '../../auditIntakeTypes';
import { ClaimAssessmentEditor } from '../components/ClaimAssessmentEditor';
import { EvidenceLevelBadge } from '../components/EvidenceLevelBadge';
import { BaofnCalculatorComparison } from '../components/BaofnCalculatorComparison';
import { proposalOutcomeCopy, firstOutstandingFieldLabel, reviewTriage } from '../reviewTriage';
import { questionLocations } from '../wizardState';
import type {
  WizardEvidenceLevelAssessment,
  WizardCalculationSnapshot,
  WizardStep,
} from '../wizardTypes';

export interface ReviewStepProps {
  readiness: AuditReadinessAssessment;
  evidenceLevel: WizardEvidenceLevelAssessment;
  formModel: AuditIntakeFormModel;
  steps: WizardStep[];
  fileParsed: boolean;
  onOpenTechnicalReview: () => void;
  onFixNow: (stepId: string, pageIndex: number) => void;
  onPreview?: () => void;
  snapshot: WizardCalculationSnapshot;
  claims: ClaimAssessmentInput[];
  disabled: boolean;
  onClaimsChange: (claims: ClaimAssessmentInput[]) => void;
  salesOutstandingCount?: number;
  salesOutstandingCodes?: readonly string[];
}

export function ReviewStep({
  readiness,
  evidenceLevel,
  formModel,
  steps,
  fileParsed,
  onOpenTechnicalReview,
  onFixNow: _onFixNow,
  onPreview,
  snapshot,
  claims,
  disabled,
  onClaimsChange,
  salesOutstandingCount = 0,
  salesOutstandingCodes = [],
}: ReviewStepProps) {
  const triage = reviewTriage(
    readiness,
    formModel,
    questionLocations(steps, formModel, readiness, fileParsed),
  );
  const firstOutstanding = firstOutstandingFieldLabel(
    readiness,
    salesOutstandingCodes,
  );
  const outcome = proposalOutcomeCopy(
    evidenceLevel,
    salesOutstandingCount,
    firstOutstanding,
  );
  const currentCoreGaps = salesOutstandingCodes.map(code => ({
    code,
    label:
      readiness.fieldStatuses.find(status => status.code === code)?.label ??
      code,
  }));
  const comparison = snapshot.sourceCalculatorComparison;
  const blockers =
    comparison?.rows.filter(
      row =>
        row.clientFacing &&
        (row.finding === 'impossible' || row.finding === 'unusable'),
    ) ?? [];

  return (
    <div className="space-y-4">
      <section
        data-testid="proposal-outcome"
        className="rounded-xl border border-slate-200 bg-white p-3"
      >
        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {outcome.heading}
        </h3>
        <EvidenceLevelBadge
          assessment={evidenceLevel}
          currentReady={outcome.currentReady}
        />
        <dl className="mt-3 grid gap-2 text-sm">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Current result
            </dt>
            <dd className="text-slate-800">{outcome.readyNow}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Can generate now
            </dt>
            <dd className="text-slate-800">{outcome.canGenerate}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {outcome.nextActionLabel}
            </dt>
            <dd className="text-slate-700">
              {outcome.nextImprovement ??
                'No further evidence level is available on this proposal path.'}
            </dd>
          </div>
        </dl>
        {onPreview !== undefined && (
          <button
            type="button"
            onClick={onPreview}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-ars-primary px-3 py-1.5 text-sm font-medium text-ars-primary hover:bg-blue-50"
          >
            <FileText className="h-4 w-4" />
            {outcome.previewLabel}
          </button>
        )}
      </section>

      <BaofnCalculatorComparison comparison={comparison} />

      {currentCoreGaps.length > 0 ? (
        <section data-testid="proposal-current-blockers">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-rose-700">
            Needed for this proposal
          </h3>
          <ul className="space-y-1.5">
            {currentCoreGaps.map(item => (
              <li
                key={item.code}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900"
              >
                <p className="font-medium">{item.label}</p>
                <p className="mt-0.5">Required to finish the preliminary proposal.</p>
              </li>
            ))}
          </ul>
        </section>
      ) : triage.outstanding.length > 0 ? (
        <section data-testid="proposal-current-blockers">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-rose-700">
            Needed for this proposal
          </h3>
          <ul className="space-y-1.5">
            {triage.outstanding.map(item => (
              <li
                key={item.outputId}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900"
              >
                <p className="font-medium">{item.label}</p>
                <p className="mt-0.5">{item.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {outcome.currentReady && triage.raisesLevel.length > 0 && (
        <section data-testid="proposal-higher-grade">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Would raise the proposal level
          </h3>
          <p className="mb-1.5 text-xs text-slate-500">
            Does not block the document you can generate now.
          </p>
          <ul className="space-y-1">
            {triage.raisesLevel.slice(0, 4).map(item => (
              <li
                key={item.outputId}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
              >
                <p className="font-medium">{item.label}</p>
                <p className="mt-0.5 text-slate-600">{item.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {blockers.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            These supplied values cannot be used
          </h3>
          <ul className="space-y-1.5">
            {blockers.map(row => (
              <li
                key={row.item}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs"
              >
                <p className="flex items-center gap-1.5 text-sm font-medium text-rose-900">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {row.item}
                </p>
                <p className="mt-0.5 text-rose-800">{row.remark}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {triage.available.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Available on this proposal
          </h3>
          <ul className="flex flex-wrap gap-1.5">
            {triage.available.map(output => (
              <li
                key={output.outputId}
                className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {output.label}
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="rounded-xl border border-slate-200 bg-white px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">
          Technical records (optional)
        </summary>
        <div className="mt-3 space-y-3">
          <ClaimAssessmentEditor
            claims={claims}
            disabled={disabled}
            onChange={onClaimsChange}
          />
          <button
            type="button"
            onClick={onOpenTechnicalReview}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-left hover:bg-slate-50"
          >
            <span>
              <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <Microscope className="h-4 w-4 text-ars-primary" />
                Advanced Technical Review
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Field codes, source records and the change trail.
              </span>
            </span>
            <span className="text-xs font-medium text-ars-primary">Open</span>
          </button>
        </div>
      </details>
    </div>
  );
}
