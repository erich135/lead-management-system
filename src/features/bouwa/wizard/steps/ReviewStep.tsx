/**
 * The last step: what this proposal can say today, and what it cannot.
 *
 * The page used to list every blocked output in one column. On a manual
 * proposal that put "no logger export has been parsed" beside "the tariff has
 * not been confirmed", as though a rep had forgotten to do both. One of them
 * was never going to happen: a manual proposal has no logger.
 *
 * Three lists now, and the difference between them is who has to act. What is
 * available. What this proposal still has to answer — each with the question
 * named and a way to go straight to it. What is waiting on somebody else, or on
 * a calculation ARS has not accepted yet. Anything the proposal type never
 * produces is stated once, as not applicable, and is not a gap.
 *
 * The detailed technical account — every field code, every reason, provenance,
 * uncertainty, the change trail — is one click away in Advanced Technical
 * Review, which is where somebody goes to audit the work rather than to do it.
 */

import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  Microscope,
  MinusCircle,
} from 'lucide-react';

import type {
  AuditIntakeFormModel,
  AuditReadinessAssessment,
} from '../../auditIntakeTypes';
import { EvidenceLevelBadge } from '../components/EvidenceLevelBadge';
import { WizardEvidenceGroups } from '../components/WizardEvidenceGroups';
import { WizardReadinessPanel } from '../components/WizardReadinessSummary';
import { reviewTriage, type ReviewFix } from '../reviewTriage';
import { questionLocations } from '../wizardState';
import type {
  WizardEvidenceLevelAssessment,
  WizardStep,
} from '../wizardTypes';

export interface ReviewStepProps {
  readiness: AuditReadinessAssessment;
  evidenceLevel: WizardEvidenceLevelAssessment;
  formModel: AuditIntakeFormModel;
  steps: WizardStep[];
  fileParsed: boolean;
  onOpenTechnicalReview: () => void;
  /** Takes the user to the question that would release a figure. */
  onFixNow: (stepId: string, pageIndex: number) => void;
  /** Opens the proposal as the customer would read it. */
  onPreview?: () => void;
}

export function ReviewStep({
  readiness,
  evidenceLevel,
  formModel,
  steps,
  fileParsed,
  onOpenTechnicalReview,
  onFixNow,
  onPreview,
}: ReviewStepProps) {
  const triage = reviewTriage(
    readiness,
    formModel,
    questionLocations(steps, formModel, readiness, fileParsed),
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            What this proposal rests on
          </h3>
          <EvidenceLevelBadge assessment={evidenceLevel} />
          {/* A rep can read the proposal at any point. A preliminary document
              is still a document: it says on its face what it rests on and
              what it cannot state, which is more use in a conversation than
              being told to come back when everything is confirmed. */}
          {onPreview !== undefined && (
            <button
              type="button"
              onClick={onPreview}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-ars-primary px-3 py-1.5 text-sm font-medium text-ars-primary hover:bg-blue-50"
            >
              <FileText className="h-4 w-4" />
              Preview proposal
            </button>
          )}
        </section>

        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Available now
          </h3>
          {triage.available.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">
              Nothing can be released yet.
            </p>
          ) : (
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
          )}
        </section>

        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Still to answer on this proposal
          </h3>
          {triage.outstanding.length === 0 ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
              Nothing. Every question this proposal needs has been answered.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {triage.outstanding.map(blocker => (
                <li
                  key={blocker.outputId}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                >
                  <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                    {blocker.label}
                  </p>
                  <p className="mt-0.5 text-slate-600">{blocker.reason}</p>
                  <ul className="mt-1.5 flex flex-wrap gap-1">
                    {blocker.fixes.slice(0, 3).map(fix => (
                      <li key={fix.code}>
                        <FixNowButton fix={fix} onFixNow={onFixNow} />
                      </li>
                    ))}
                    {blocker.fixes.length > 3 ? (
                      <li className="self-center text-[11px] text-slate-500">
                        and {blocker.fixes.length - 3} more
                      </li>
                    ) : null}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="space-y-3">
        {triage.waiting.length === 0 ? null : (
          <section>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Waiting on something outside this form
            </h3>
            <ul className="space-y-1.5">
              {triage.waiting.map(blocker => (
                <li
                  key={blocker.outputId}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs"
                >
                  <p className="flex items-center gap-1.5 text-sm font-medium text-amber-900">
                    <Clock className="h-3.5 w-3.5" />
                    {blocker.label}
                  </p>
                  <p className="mt-0.5 text-amber-800">{blocker.reason}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {triage.notApplicable.length === 0 ? null : (
          <section>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Not applicable to this proposal
            </h3>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <ul className="space-y-1">
                {triage.notApplicable.map(output => (
                  <li
                    key={output.outputId}
                    className="flex items-start gap-1.5 text-xs text-slate-600"
                  >
                    <MinusCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>
                      <span className="font-medium text-slate-700">
                        {output.label}
                      </span>{' '}
                      — not applicable
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11px] text-slate-500">
                {triage.notApplicable[0]?.reason}
              </p>
            </div>
          </section>
        )}

        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Readiness
          </h3>
          <WizardReadinessPanel readiness={readiness} />
        </section>

        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Outstanding evidence
          </h3>
          <WizardEvidenceGroups readiness={readiness} formModel={formModel} />
        </section>

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
              Field codes, every readiness reason, provenance, uncertainty, source
              hash and the change trail.
            </span>
          </span>
          <span className="text-xs font-medium text-ars-primary">Open</span>
        </button>
      </div>
    </div>
  );
}

function FixNowButton({
  fix,
  onFixNow,
}: {
  fix: ReviewFix;
  onFixNow: (stepId: string, pageIndex: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onFixNow(fix.stepId, fix.pageIndex)}
      title={`${fix.label} — on ${fix.stepTitle}`}
      className="inline-flex items-center gap-1 rounded-full border border-ars-primary bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-ars-primary hover:bg-blue-100"
    >
      {fix.label}
      <ArrowRight className="h-3 w-3" />
    </button>
  );
}
