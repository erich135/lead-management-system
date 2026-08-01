/**
 * The last step: what this proposal can release today, and what it cannot.
 *
 * Two lists, both from the backend. An available output is available because
 * every answer it rests on is confirmed. A blocked output names the reason it
 * is blocked, in the backend's words, and nothing here softens that: an output
 * is never shown as nearly ready, and a figure is never shown with a caveat.
 *
 * The detailed technical account — every field code, every reason, provenance,
 * uncertainty, the change trail — is not on this screen. It is one click away
 * in Advanced Technical Review, which is where somebody goes to audit the work
 * rather than to do it.
 */

import { CheckCircle2, Lock, Microscope } from 'lucide-react';

import type {
  AuditIntakeFormModel,
  AuditReadinessAssessment,
} from '../../auditIntakeTypes';
import { WizardEvidenceGroups } from '../components/WizardEvidenceGroups';
import { WizardReadinessPanel } from '../components/WizardReadinessSummary';

export interface ReviewStepProps {
  readiness: AuditReadinessAssessment;
  formModel: AuditIntakeFormModel;
  onOpenTechnicalReview: () => void;
}

export function ReviewStep({
  readiness,
  formModel,
  onOpenTechnicalReview,
}: ReviewStepProps) {
  const outputLabel = new Map(
    formModel.outputs.map(output => [output.id, output.label]),
  );
  const permitted = readiness.permittedOutputs.map(
    id => outputLabel.get(id) ?? id,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Readiness
          </h3>
          <WizardReadinessPanel readiness={readiness} />
        </section>

        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Available now
          </h3>
          {permitted.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">
              Nothing can be released yet.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {permitted.map(label => (
                <li
                  key={label}
                  className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {label}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Blocked until the answers arrive
          </h3>
          <ul className="space-y-1.5">
            {readiness.blockedOutputs.slice(0, 6).map(output => (
              <li
                key={output.outputId}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  {output.label}
                </p>
                <p className="mt-0.5 text-slate-600">
                  {output.reasons[0] ?? 'Waiting on outstanding answers.'}
                </p>
              </li>
            ))}
            {readiness.blockedOutputs.length > 6 ? (
              <li className="px-1 text-xs text-slate-500">
                and {readiness.blockedOutputs.length - 6} more, listed in full in
                Advanced Technical Review
              </li>
            ) : null}
          </ul>
        </section>
      </div>

      <div className="space-y-3">
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
