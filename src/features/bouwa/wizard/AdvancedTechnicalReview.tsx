/**
 * Advanced Technical Review — everything the wizard deliberately does not say.
 *
 * The guided workflow shows a user the next thing to do. This screen shows an
 * engineer the whole assessment of the same proposal: field codes, every
 * ordered reason, the stage eligibility, the source hash, the evidence register
 * and the change trail. Nothing here is recomputed in the browser — it is the
 * backend's assessment of this draft, printed in full.
 *
 * It scrolls, and it is meant to. It is reached from inside a proposal and
 * never sits above or below the workflow, so there remains one active way to
 * fill a proposal in and one separate way to inspect it.
 */

import { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';

import { readAnswerAtPath } from '../auditIntakeState';
import type { AuditFieldStatus, AuditIntakeFormModel } from '../auditIntakeTypes';
import {
  answerCitations,
  citedValue,
  type AnswerCitation,
} from './answerCitations';
import { formatSavedAt } from './wizardState';
import {
  ANSWER_ORIGIN_LABELS,
  ANSWER_SOURCE_KIND_LABELS,
  MANUAL_BASIS_LABELS,
  PROPOSAL_TYPE_LABELS,
  type WizardDraftView,
} from './wizardTypes';

const STATUS_LABELS: Record<string, string> = {
  answered: 'Answered',
  unknown_confirmation_required: 'Unknown — confirmation required',
  not_applicable: 'Not applicable',
  missing: 'Not answered',
  invalid: 'Invalid',
};

function Section({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
      >
        <span>
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            {open ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
            {title}
          </span>
          <span className="mt-0.5 block pl-6 text-xs text-slate-500">
            {subtitle}
          </span>
        </span>
      </button>
      {open ? <div className="border-t border-slate-100 p-4">{children}</div> : null}
    </section>
  );
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
      {rows.map(([term, value]) => (
        <div key={term} className="flex gap-2">
          <dt className="shrink-0 text-slate-500">{term}</dt>
          <dd className="break-all font-mono text-slate-800">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function CitationRow({ entry }: { entry: AnswerCitation }) {
  const { provenance } = entry;
  const changed = provenance.origin === 'changed_for_this_proposal';
  return (
    <li
      className="px-3 py-2 text-xs"
      data-testid="bouwa-review-provenance-row"
      data-origin={provenance.origin}
      data-path={entry.path}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-mono text-[11px] text-slate-500">{entry.code}</span>
        <span className={changed ? 'text-amber-800' : 'text-slate-600'}>
          {ANSWER_ORIGIN_LABELS[provenance.origin]}
        </span>
      </div>
      <p className="mt-0.5 text-slate-800">{entry.label}</p>
      <dl className="mt-1 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="shrink-0 text-slate-500">Source stated</dt>
          <dd className="break-all font-mono text-slate-800">
            {citedValue(provenance.sourceValue)}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-slate-500">This proposal</dt>
          <dd
            className={`break-all font-mono ${changed ? 'text-amber-900' : 'text-slate-800'}`}
          >
            {entry.proposalValue}
          </dd>
        </div>
      </dl>
      <p className="mt-1 text-slate-600">
        {ANSWER_SOURCE_KIND_LABELS[provenance.sourceKind]} — {provenance.sourceLabel}
        {provenance.sourceRecordVersion === null
          ? ''
          : ` (record version ${provenance.sourceRecordVersion})`}
        {provenance.sourceDocumentId === null
          ? ''
          : ` · ${provenance.sourceDocumentId}`}
      </p>
      {changed ? (
        <p className="mt-0.5 text-amber-900">
          {provenance.reason ?? 'No reason recorded'} —{' '}
          {provenance.byName ?? 'unknown user'}, {formatSavedAt(provenance.at)}
        </p>
      ) : null}
    </li>
  );
}

function FieldRow({ field }: { field: AuditFieldStatus }) {
  return (
    <li className="px-3 py-2 text-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-mono text-[11px] text-slate-500">{field.code}</span>
        <span
          className={
            field.status === 'answered'
              ? 'text-emerald-700'
              : field.status === 'not_applicable'
                ? 'text-slate-500'
                : 'text-amber-800'
          }
        >
          {STATUS_LABELS[field.status] ?? field.status}
          {field.applicable ? '' : ' · not applicable to this proposal type'}
        </span>
      </div>
      <p className="mt-0.5 text-slate-800">{field.label}</p>
      <p className="mt-0.5 text-slate-600">{field.message}</p>
      {field.dependentOutputs.length === 0 ? null : (
        <p className="mt-0.5 text-slate-500">
          Outputs depending on it: {field.dependentOutputs.join(', ')}
        </p>
      )}
      {field.requiredEvidence.length === 0 ? null : (
        <p className="mt-0.5 text-slate-500">
          Evidence required: {field.requiredEvidence.join(', ')}
        </p>
      )}
    </li>
  );
}

export function AdvancedTechnicalReview({
  view,
  formModel,
  onBack,
  onOpenLegacyWorkspace,
}: {
  view: WizardDraftView;
  formModel: AuditIntakeFormModel;
  onBack: () => void;
  onOpenLegacyWorkspace: () => void;
}) {
  const { draft, readiness, sourceFacts } = view;
  const [allFields, setAllFields] = useState(false);
  const citations = answerCitations(
    formModel,
    readiness.fieldStatuses,
    path => readAnswerAtPath(draft.intake, path),
    draft.answerProvenance,
  );
  const fields = allFields
    ? readiness.fieldStatuses
    : readiness.fieldStatuses.filter(
        field => field.applicable && field.status !== 'answered',
      );
  const outputLabel = (id: string) =>
    formModel.outputs.find(output => output.id === id)?.label ?? id;

  return (
    <div data-testid="bouwa-technical-review" className="space-y-3 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ars-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to the proposal
        </button>
        <button
          type="button"
          onClick={onOpenLegacyWorkspace}
          className="text-xs font-medium text-slate-500 underline underline-offset-2 hover:text-slate-700"
        >
          Open the standalone air-audit workspace
        </button>
      </div>

      <header className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-900">
          Advanced Technical Review — {draft.reference}
        </h2>
        <p className="mt-0.5 text-xs text-slate-600">
          The backend's complete assessment of this proposal. This screen scrolls;
          the guided workflow does not. Nothing here is calculated in the browser.
        </p>
        <div className="mt-2">
          <Facts
            rows={[
              ['Proposal type', PROPOSAL_TYPE_LABELS[draft.proposalType]],
              [
                'Basis',
                draft.manualBasis === null
                  ? 'Untouched logger export'
                  : MANUAL_BASIS_LABELS[draft.manualBasis],
              ],
              ['Draft ID', draft.draftId],
              ['Revision', String(draft.revision)],
              ['Intake schema', readiness.intakeSchemaVersion],
              ['Assessed at', formatSavedAt(view.assessedAt)],
              ['Stage reached', readiness.stageLabel],
              ['Last saved', formatSavedAt(draft.updatedAt)],
            ]}
          />
        </div>
      </header>

      <Section
        title="Stage eligibility"
        subtitle="Each stage, whether it applies to this proposal type, and what holds it back."
        defaultOpen
      >
        <ul className="space-y-2">
          {readiness.stageEligibility.map(stage => (
            <li
              key={stage.stage}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-slate-800">
                  {stage.label}
                </span>
                <span
                  className={
                    !stage.applicable
                      ? 'text-slate-500'
                      : stage.eligible
                        ? 'text-emerald-700'
                        : 'text-amber-800'
                  }
                >
                  {!stage.applicable
                    ? 'Not applicable to this proposal type'
                    : stage.eligible
                      ? 'Eligible'
                      : 'Not eligible'}
                </span>
              </div>
              <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                {stage.stage}
              </p>
              {stage.reasons.length === 0 ? null : (
                <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-slate-600">
                  {stage.reasons.map((reason, index) => (
                    <li key={`${index}-${reason}`}>{reason}</li>
                  ))}
                </ol>
              )}
              {stage.blockingFieldCodes.length === 0 ? null : (
                <p className="mt-1 break-all font-mono text-[11px] text-slate-500">
                  {stage.blockingFieldCodes.join('  ')}
                </p>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title={`Outputs — ${readiness.permittedOutputs.length} permitted, ${readiness.blockedOutputs.length} blocked`}
        subtitle="Every output the module can produce, and the complete ordered reasons for each refusal."
        defaultOpen
      >
        {readiness.permittedOutputs.length === 0 ? null : (
          <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            <p className="font-medium">Permitted</p>
            <ul className="mt-1 space-y-0.5">
              {readiness.permittedOutputs.map(id => (
                <li key={id}>
                  {outputLabel(id)}{' '}
                  <span className="font-mono text-[11px] text-emerald-700">{id}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <ul className="space-y-2">
          {readiness.blockedOutputs.map(output => (
            <li
              key={output.outputId}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-slate-800">
                  {output.label}
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  {output.outputId} · requires {output.requiredStage}
                </span>
              </div>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-slate-600">
                {output.reasons.map((reason, index) => (
                  <li key={`${index}-${reason}`}>{reason}</li>
                ))}
              </ol>
              {output.blockingFieldCodes.length === 0 ? null : (
                <p className="mt-1 break-all font-mono text-[11px] text-slate-500">
                  {output.blockingFieldCodes.join('  ')}
                </p>
              )}
            </li>
          ))}
        </ul>
        {readiness.unavailableDependencies.length === 0 ? null : (
          <div className="mt-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs">
            <p className="font-medium text-slate-800">
              Gaps no document can close
            </p>
            <ul className="mt-1 space-y-1">
              {readiness.unavailableDependencies.map(dependency => (
                <li key={dependency.code}>
                  <span className="font-mono text-[11px] text-slate-500">
                    {dependency.code}
                  </span>{' '}
                  {dependency.label} — {dependency.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section
        title="Like-for-like comparison"
        subtitle="Whether the existing and proposed figures are stated on bases that may be compared at all."
      >
        <p className="text-xs text-slate-700">
          {readiness.comparison.eligible
            ? 'The stated bases are comparable.'
            : 'The comparison is refused. The figures are not stated on comparable bases.'}
        </p>
        <ul className="mt-2 space-y-1 text-xs">
          {readiness.comparison.checks.map(check => (
            <li
              key={check.reasonCode}
              className="rounded border border-slate-200 px-2 py-1.5"
            >
              <span className="font-mono text-[11px] text-slate-500">
                {check.field} · {check.reasonCode}
              </span>
              <p className="text-slate-700">{check.message}</p>
              <p className="text-[11px] text-slate-500">
                Existing {check.existingValue ?? 'not stated'} · proposed{' '}
                {check.proposedValue ?? 'not stated'}
                {check.unit === null ? '' : ` ${check.unit}`}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      {draft.sourceFile === null && sourceFacts.length === 0 ? null : (
        <Section
          title="Source identity"
          subtitle="What the untouched export is, and what it stated. The hash is recorded, never typed."
          defaultOpen
        >
          {draft.sourceFile === null ? null : (
            <Facts
              rows={[
                ['Filename', draft.sourceFile.filename],
                ['SHA-256', draft.sourceFile.sha256],
                ['Content type', draft.sourceFile.contentType],
                ['Bytes', draft.sourceFile.byteSize.toLocaleString('en-ZA')],
                ['Uploaded', formatSavedAt(draft.sourceFile.uploadedAt)],
                ['Version', String(draft.sourceFile.version)],
                [
                  'Superseded uploads',
                  draft.sourceFile.supersededStorageIds.length === 0
                    ? 'None'
                    : draft.sourceFile.supersededStorageIds.join(', '),
                ],
              ]}
            />
          )}
          {sourceFacts.length === 0 ? null : (
            <ul className="mt-3 space-y-1 text-xs">
              {sourceFacts.map(fact => (
                <li key={fact.id} className="flex flex-wrap gap-x-2">
                  <span className="text-slate-500">{fact.label}:</span>
                  <span
                    className={
                      fact.unavailable ? 'text-amber-800' : 'text-slate-800'
                    }
                  >
                    {fact.value}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {fact.sourceLabel}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {citations.length === 0 ? null : (
        <Section
          title={`Where each answer came from — ${citations.length} cited`}
          subtitle="Every answer a source filled in, what that source stated, and what this proposal says instead."
          defaultOpen={citations.some(
            entry => entry.provenance.origin === 'changed_for_this_proposal',
          )}
        >
          <ul
            data-testid="bouwa-review-provenance"
            className="divide-y divide-slate-100 rounded-lg border border-slate-200"
          >
            {citations.map(entry => (
              <CitationRow key={entry.path} entry={entry} />
            ))}
          </ul>
        </Section>
      )}

      <Section
        title={`Field statuses — ${readiness.fieldStatuses.length} fields`}
        subtitle="Every question the readiness contract knows about, by its backend code."
      >
        <label className="mb-2 flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={allFields}
            onChange={event => setAllFields(event.target.checked)}
            className="h-3.5 w-3.5"
          />
          Show answered and inapplicable fields as well
        </label>
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {fields.map(field => (
            <FieldRow key={field.code} field={field} />
          ))}
        </ul>
      </Section>

      <Section
        title={`Evidence register — ${draft.intake.evidence.length} recorded, ${draft.attachments.length} files attached`}
        subtitle="What was supplied, by whom, and in what state it was accepted."
      >
        {draft.intake.evidence.length === 0 ? (
          <p className="text-xs text-slate-600">No evidence has been recorded.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {draft.intake.evidence.map(item => (
              <li key={item.id} className="rounded border border-slate-200 px-2 py-1.5">
                <span className="font-mono text-[11px] text-slate-500">
                  {item.id} · {item.evidenceType} · {item.confirmationStatus}
                </span>
                <p className="text-slate-700">
                  {item.filename ?? item.documentReference ?? 'No document named'}
                  {item.sourceOrganisation ? ` — ${item.sourceOrganisation}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
        {draft.attachments.length === 0 ? null : (
          <ul className="mt-2 space-y-1 text-xs">
            {draft.attachments.map(attachment => (
              <li
                key={attachment.attachmentId}
                className="rounded border border-slate-200 px-2 py-1.5"
              >
                <p className="text-slate-700">{attachment.filename}</p>
                <p className="break-all font-mono text-[11px] text-slate-500">
                  {attachment.sha256}
                </p>
                <p className="text-[11px] text-slate-500">
                  {formatSavedAt(attachment.uploadedAt)}
                  {attachment.uploadedByName ? ` · ${attachment.uploadedByName}` : ''}
                  {attachment.supersededByAttachmentId ? ' · superseded' : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title={`Change trail — ${draft.intakeHistory.length} entries`}
        subtitle="Every change to the answers, in the order the backend recorded them."
      >
        {draft.intakeHistory.length === 0 ? (
          <p className="text-xs text-slate-600">Nothing has been changed yet.</p>
        ) : (
          <ol className="space-y-1 text-xs">
            {[...draft.intakeHistory].reverse().map((entry, index) => (
              <li
                key={`${entry.at}-${index}`}
                className="rounded border border-slate-200 px-2 py-1.5"
              >
                <p className="text-slate-700">
                  {formatSavedAt(entry.at)} · {entry.source}
                  {entry.by ? ` · ${entry.by}` : ''}
                </p>
                {entry.changedFieldCodes.length === 0 ? null : (
                  <p className="mt-0.5 break-all font-mono text-[11px] text-slate-500">
                    {entry.changedFieldCodes.join('  ')}
                  </p>
                )}
                {entry.changedEvidenceIds.length === 0 ? null : (
                  <p className="mt-0.5 break-all font-mono text-[11px] text-slate-500">
                    evidence: {entry.changedEvidenceIds.join('  ')}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}

export default AdvancedTechnicalReview;
