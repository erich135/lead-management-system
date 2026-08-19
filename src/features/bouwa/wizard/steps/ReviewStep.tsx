/**
 * The last step: calculate, compare, and generate the proposal.
 *
 * Sales workflow: input data → calculate → compare → show result → generate.
 * Technical records stay available, but they do not sit in front of a
 * preliminary customer comparison.
 */

import { CheckCircle2, FileText, AlertTriangle, Microscope } from 'lucide-react';

import type {
  AuditIntakeFormModel,
  AuditReadinessAssessment,
  ClaimAssessmentInput,
} from '../../auditIntakeTypes';
import { ClaimAssessmentEditor } from '../components/ClaimAssessmentEditor';
import { BaofnCalculatorComparison } from '../components/BaofnCalculatorComparison';
import { reviewTriage } from '../reviewTriage';
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
}

export function ReviewStep({
  readiness,
  evidenceLevel: _evidenceLevel,
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
}: ReviewStepProps) {
  const triage = reviewTriage(
    readiness,
    formModel,
    questionLocations(steps, formModel, readiness, fileParsed),
  );
  const comparison = snapshot.sourceCalculatorComparison;
  const blockers =
    comparison?.rows.filter(
      row =>
        row.clientFacing &&
        (row.finding === 'impossible' || row.finding === 'unusable'),
    ) ?? [];

  return (
    <div className="space-y-4">
      <BaofnCalculatorComparison comparison={comparison} />

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Result
        </h3>
        <p className="text-sm text-slate-700">
          Preliminary estimate based on supplied customer, site and machine
          information. Source values are accepted unless they conflict with the
          supplied technical specification.
        </p>
        {onPreview !== undefined && (
          <button
            type="button"
            onClick={onPreview}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-ars-primary px-3 py-1.5 text-sm font-medium text-ars-primary hover:bg-blue-50"
          >
            <FileText className="h-4 w-4" />
            Preview / generate proposal
          </button>
        )}
      </section>

      {blockers.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Calculation cannot use these values
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
            Available now
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
                Field codes, provenance and the change trail.
              </span>
            </span>
            <span className="text-xs font-medium text-ars-primary">Open</span>
          </button>
        </div>
      </details>
    </div>
  );
}
