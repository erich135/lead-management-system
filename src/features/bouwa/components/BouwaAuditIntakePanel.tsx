import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  HelpCircle,
  Lock,
  Plus,
  Trash2,
} from 'lucide-react';

import {
  ANSWER_STATE_LABELS,
  FIELD_STATUS_LABELS,
  answerForState,
  answerFromInput,
  auditIntakeSectionViews,
  inputTextForAnswer,
  mayApplyAuditIntakeSave,
  nextAuditIntakeSave,
  readAnswerAtPath,
  writeAnswerAtPath,
  type AuditIntakeFieldView,
  type AuditIntakeSaveIdentity,
} from '../auditIntakeState';
import type {
  AuditEvidenceReference,
  AuditFormField,
  AuditIntakeDocument,
  AuditIntakeFormModel,
  AuditIntakeState,
  AuditReadinessAssessment,
  IntakeAnswerState,
} from '../auditIntakeTypes';
import type { LocalSession } from '../proposalLocalTypes';

const SAVE_DEBOUNCE_MS = 400;

/**
 * Provenance the local service writes from the parsed bytes. Showing it is
 * useful; letting it be retyped would break the link to the analysed file.
 */
const SERVER_OWNED_FIELD_CODES = [
  'AUDIT.IDENTITY.SOURCE_LOGGER_FILENAME',
  'AUDIT.IDENTITY.SOURCE_LOGGER_SHA256',
];

interface BouwaAuditIntakePanelProps {
  session: LocalSession;
  proposalRecordId: string;
  /** Changes whenever a new logger export has been parsed. */
  parsedSourceToken: string | null;
  onSessionExpired: () => void;
  onReadinessChange?: (readiness: AuditReadinessAssessment | null) => void;
}

async function intakeRequest<T>(
  url: string,
  session: LocalSession,
  onSessionExpired: () => void,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${session.token}`,
    },
  });
  const payload = (await response.json()) as T | { error?: string };
  if (response.status === 401) onSessionExpired();
  if (!response.ok)
    throw new Error(
      'error' in (payload as { error?: string })
        ? ((payload as { error?: string }).error ??
          'The local audit-intake service rejected the request.')
        : 'The local audit-intake service rejected the request.',
    );
  return payload as T;
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'confirmed'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'invalid'
        ? 'bg-rose-50 text-rose-700'
        : status === 'missing'
          ? 'bg-slate-100 text-slate-600'
          : 'bg-amber-50 text-amber-700';
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${tone}`}
    >
      {FIELD_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function ValueControl({
  field,
  text,
  disabled,
  onCommit,
}: {
  field: AuditFormField;
  text: string;
  disabled: boolean;
  onCommit: (raw: string) => void;
}) {
  const [draft, setDraft] = useState(text);
  useEffect(() => {
    setDraft(text);
  }, [text]);
  const controlClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100 disabled:text-slate-500';

  if (field.valueKind === 'selection')
    return (
      <select
        className={controlClass}
        value={draft}
        disabled={disabled}
        aria-label={`${field.code} value`}
        onChange={event => {
          setDraft(event.target.value);
          onCommit(event.target.value);
        }}
      >
        <option value="">Choose a value</option>
        {field.options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );

  if (field.valueKind === 'long_text')
    return (
      <textarea
        className={controlClass}
        rows={2}
        value={draft}
        disabled={disabled}
        aria-label={`${field.code} value`}
        onChange={event => setDraft(event.target.value)}
        onBlur={() => onCommit(draft)}
      />
    );

  return (
    <input
      className={controlClass}
      type={field.valueKind === 'date' ? 'date' : 'text'}
      inputMode={
        field.valueKind === 'number' || field.valueKind === 'integer'
          ? 'decimal'
          : undefined
      }
      value={draft}
      disabled={disabled}
      aria-label={`${field.code} value`}
      onChange={event => setDraft(event.target.value)}
      onBlur={() => onCommit(draft)}
    />
  );
}

function IntakeFieldRow({
  view,
  intake,
  problem,
  locked,
  valueIntended,
  onAnswerState,
  onValue,
}: {
  view: AuditIntakeFieldView;
  intake: AuditIntakeDocument;
  problem: string | undefined;
  locked: boolean;
  valueIntended: boolean;
  onAnswerState: (field: AuditFormField, state: IntakeAnswerState) => void;
  onValue: (field: AuditFormField, raw: string) => void;
}) {
  const { field, status } = view;
  const answer = readAnswerAtPath(intake, field.path);
  const answerState: IntakeAnswerState = answer ? answer.state : 'unanswered';
  const showValue = answerState === 'answered' || valueIntended;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{status.label}</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            {status.whyItMatters}
          </p>
        </div>
        <StatusBadge status={status.status} />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-medium text-slate-600">
          How this is answered
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
            value={showValue ? 'answered' : answerState}
            disabled={locked}
            aria-label={`${field.code} answer state`}
            onChange={event =>
              onAnswerState(field, event.target.value as IntakeAnswerState)
            }
          >
            <option value="unanswered">
              {ANSWER_STATE_LABELS.unanswered}
            </option>
            {field.permittedAnswerStates.map(state => (
              <option key={state} value={state}>
                {ANSWER_STATE_LABELS[state]}
              </option>
            ))}
          </select>
        </label>
        {showValue && (
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            Value{field.unit === null ? '' : ` (${field.unit})`}
            <ValueControl
              field={field}
              text={inputTextForAnswer(answer)}
              disabled={locked}
              onCommit={raw => onValue(field, raw)}
            />
          </label>
        )}
      </div>

      {problem !== undefined && (
        <p className="mt-2 text-xs font-semibold text-rose-700" role="alert">
          {problem}
        </p>
      )}
      {!status.confirmed && (
        <p className="mt-2 text-xs leading-5 text-slate-600">
          {status.message}
        </p>
      )}
      {!status.confirmed && status.dependentOutputs.length > 0 && (
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
          Blocks: {status.dependentOutputs.join(', ')}
        </p>
      )}
      <p className="mt-1 font-mono text-[10px] text-slate-400">{status.code}</p>
    </div>
  );
}

function ReadinessSummary({
  readiness,
  fileParsed,
}: {
  readiness: AuditReadinessAssessment;
  fileParsed: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-blue-50 p-2 text-ars-primary">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Readiness review
          </h3>
          <p className="mt-0.5 text-sm leading-6 text-slate-500">
            The backend decides which stage this audit has reached and which
            outputs it may release. Missing information blocks only the outputs
            that depend on it.
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-900">
        Current stage: {readiness.stageLabel}
      </p>
      {!fileParsed && (
        <p className="mt-1 text-xs leading-5 text-slate-600">
          No supported raw export has been parsed yet.
        </p>
      )}

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {readiness.stageEligibility.map(stage => (
          <div
            key={stage.stage}
            className={`rounded-xl border p-4 ${
              stage.eligible
                ? 'border-emerald-200 bg-emerald-50/60'
                : 'border-slate-200 bg-white'
            }`}
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              {stage.eligible ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <Lock className="h-4 w-4 text-slate-400" />
              )}
              {stage.label}
            </p>
            {!stage.eligible && (
              <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
                {stage.reasons.slice(0, 4).map(reason => (
                  <li key={reason}>{reason}</li>
                ))}
                {stage.reasons.length > 4 && (
                  <li className="font-semibold text-slate-500">
                    {stage.reasons.length - 4} further outstanding item(s).
                  </li>
                )}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Outputs available now
          </p>
          {readiness.permittedOutputs.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">
              No output is available yet.
            </p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {readiness.permittedOutputs.map(output => (
                <li
                  key={output}
                  className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                >
                  {output}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Outputs blocked
          </p>
          <ul className="mt-2 space-y-2">
            {readiness.blockedOutputs.map(output => (
              <li
                key={output.outputId}
                className="rounded-xl border border-amber-200 bg-amber-50/60 p-3"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {output.label}
                </p>
                <ul className="mt-1 space-y-1 text-xs leading-5 text-slate-700">
                  {output.reasons.slice(0, 3).map(reason => (
                    <li key={reason}>{reason}</li>
                  ))}
                  {output.reasons.length > 3 && (
                    <li className="font-semibold text-slate-500">
                      {output.reasons.length - 3} further reason(s).
                    </li>
                  )}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {readiness.externalEvidenceBlockers.length > 0 && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" /> Evidence still required
          </p>
          <ul className="mt-2 space-y-2 text-xs leading-5 text-amber-900">
            {readiness.externalEvidenceBlockers.map(blocker => (
              <li key={blocker.code}>
                <span className="font-semibold">{blocker.label}</span> —{' '}
                {blocker.whyItMatters} Required document:{' '}
                {blocker.requiredEvidence.join(', ')}.
                {blocker.responsiblePerson === null
                  ? ''
                  : ` Responsible: ${blocker.responsiblePerson}.`}
                {blocker.expectedConfirmationDate === null
                  ? ''
                  : ` Expected: ${blocker.expectedConfirmationDate}.`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function EvidencePanel({
  formModel,
  evidence,
  locked,
  onChange,
}: {
  formModel: AuditIntakeFormModel;
  evidence: AuditEvidenceReference[];
  locked: boolean;
  onChange: (next: AuditEvidenceReference[]) => void;
}) {
  const controlClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100';
  function update(index: number, patch: Partial<AuditEvidenceReference>) {
    onChange(
      evidence.map((entry, position) =>
        position === index ? { ...entry, ...patch } : entry,
      ),
    );
  }
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">
        Evidence and confirmation
      </h3>
      <p className="mt-0.5 text-sm leading-6 text-slate-500">
        Reference the documents behind the answers. A document that has only
        been requested keeps its dependent outputs blocked until it is
        confirmed.
      </p>
      <div className="mt-4 space-y-3">
        {evidence.map((entry, index) => (
          <div
            key={entry.id}
            className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2"
          >
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Document type
              <select
                className={controlClass}
                value={entry.evidenceType}
                disabled={locked}
                onChange={event =>
                  update(index, { evidenceType: event.target.value })
                }
              >
                {formModel.evidenceTypes.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Confirmation status
              <select
                className={controlClass}
                value={entry.confirmationStatus}
                disabled={locked}
                onChange={event =>
                  update(index, {
                    confirmationStatus: event.target
                      .value as AuditEvidenceReference['confirmationStatus'],
                  })
                }
              >
                {formModel.evidenceStatuses.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Document reference
              <input
                className={controlClass}
                value={entry.documentReference ?? ''}
                disabled={locked}
                onChange={event =>
                  update(index, {
                    documentReference:
                      event.target.value.trim() === ''
                        ? null
                        : event.target.value,
                  })
                }
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Source organisation
              <input
                className={controlClass}
                value={entry.sourceOrganisation ?? ''}
                disabled={locked}
                onChange={event =>
                  update(index, {
                    sourceOrganisation:
                      event.target.value.trim() === ''
                        ? null
                        : event.target.value,
                  })
                }
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Responsible person
              <input
                className={controlClass}
                value={entry.responsiblePerson ?? ''}
                disabled={locked}
                onChange={event =>
                  update(index, {
                    responsiblePerson:
                      event.target.value.trim() === ''
                        ? null
                        : event.target.value,
                  })
                }
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Expected confirmation date
              <input
                className={controlClass}
                type="date"
                value={entry.expectedConfirmationDate ?? ''}
                disabled={locked}
                onChange={event =>
                  update(index, {
                    expectedConfirmationDate:
                      event.target.value.trim() === ''
                        ? null
                        : event.target.value,
                  })
                }
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="button"
                disabled={locked}
                onClick={() =>
                  onChange(evidence.filter((_, position) => position !== index))
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={locked}
        onClick={() =>
          onChange([
            ...evidence,
            {
              id: `evidence-${evidence.length + 1}-${Date.now()}`,
              evidenceType:
                formModel.evidenceTypes[0]?.value ?? 'other_supporting_document',
              filename: null,
              documentReference: null,
              sourceOrganisation: null,
              documentDate: null,
              version: null,
              confirmationStatus: 'requested',
              notes: null,
              sourceUrl: null,
              responsiblePerson: null,
              expectedConfirmationDate: null,
            },
          ])
        }
        className="mt-4 inline-flex items-center gap-1 rounded-lg bg-ars-primary px-3 py-2 text-xs font-semibold text-white"
      >
        <Plus className="h-3.5 w-3.5" /> Add a document reference
      </button>
    </section>
  );
}

export function BouwaAuditIntakePanel({
  session,
  proposalRecordId,
  parsedSourceToken,
  onSessionExpired,
  onReadinessChange,
}: BouwaAuditIntakePanelProps) {
  const [formModel, setFormModel] = useState<AuditIntakeFormModel | null>(null);
  const [state, setState] = useState<AuditIntakeState | null>(null);
  const [intake, setIntake] = useState<AuditIntakeDocument | null>(null);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [valueIntent, setValueIntent] = useState<Record<string, boolean>>({});
  const [openSection, setOpenSection] = useState<string | null>('identity');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const activeSave = useRef<AuditIntakeSaveIdentity>({
    sequence: 0,
    proposalRecordId,
    fingerprint: '',
  });
  const loadedFingerprint = useRef<string>('');

  const applyState = useCallback(
    (next: AuditIntakeState) => {
      setState(next);
      setIntake(next.intake);
      loadedFingerprint.current = JSON.stringify(next.intake);
      if (onReadinessChange) onReadinessChange(next.readiness);
    },
    [onReadinessChange],
  );

  useEffect(() => {
    let current = true;
    intakeRequest<AuditIntakeFormModel>(
      '/api/bouwa-local/intake/form',
      session,
      onSessionExpired,
    )
      .then(value => {
        if (current) setFormModel(value);
      })
      .catch((reason: unknown) => {
        if (current)
          setError(
            reason instanceof Error
              ? reason.message
              : 'The audit-intake form could not be loaded.',
          );
      });
    return () => {
      current = false;
    };
  }, [onSessionExpired, session]);

  useEffect(() => {
    let current = true;
    intakeRequest<AuditIntakeState>(
      `/api/bouwa-local/intake?proposalRecordId=${encodeURIComponent(proposalRecordId)}`,
      session,
      onSessionExpired,
    )
      .then(value => {
        if (current) applyState(value);
      })
      .catch((reason: unknown) => {
        if (current)
          setError(
            reason instanceof Error
              ? reason.message
              : 'The audit intake could not be loaded.',
          );
      });
    return () => {
      current = false;
    };
  }, [applyState, onSessionExpired, parsedSourceToken, proposalRecordId, session]);

  useEffect(() => {
    if (intake === null) return;
    const fingerprint = JSON.stringify(intake);
    if (fingerprint === loadedFingerprint.current) return;
    const identity = nextAuditIntakeSave(
      activeSave.current.sequence,
      proposalRecordId,
      intake,
    );
    activeSave.current = identity;
    const timer = setTimeout(() => {
      setSaving(true);
      intakeRequest<AuditIntakeState>(
        '/api/bouwa-local/intake',
        session,
        onSessionExpired,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposalRecordId, intake }),
        },
      )
        .then(value => {
          if (
            !mayApplyAuditIntakeSave(activeSave.current, identity, intake)
          )
            return;
          setState(value);
          loadedFingerprint.current = JSON.stringify(value.intake);
          setIntake(value.intake);
          setError('');
          if (onReadinessChange) onReadinessChange(value.readiness);
        })
        .catch((reason: unknown) => {
          setError(
            reason instanceof Error
              ? reason.message
              : 'The audit intake could not be saved.',
          );
        })
        .finally(() => setSaving(false));
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [intake, onReadinessChange, onSessionExpired, proposalRecordId, session]);

  const sectionViews = useMemo(() => {
    if (!formModel || !state) return [];
    return auditIntakeSectionViews(formModel, state.readiness);
  }, [formModel, state]);

  function clearProblem(code: string) {
    setProblems(current => {
      if (!(code in current)) return current;
      const next = { ...current };
      delete next[code];
      return next;
    });
  }

  function commitAnswerState(field: AuditFormField, next: IntakeAnswerState) {
    if (intake === null) return;
    clearProblem(field.code);
    if (next === 'answered') {
      setValueIntent(current => ({ ...current, [field.code]: true }));
      return;
    }
    setValueIntent(current => ({ ...current, [field.code]: false }));
    const answer =
      next === 'unanswered'
        ? { state: 'unanswered' as const, value: null, note: null }
        : answerForState(next);
    setIntake(writeAnswerAtPath(intake, field.path, answer));
  }

  function commitValue(field: AuditFormField, raw: string) {
    if (intake === null) return;
    const result = answerFromInput(field, raw);
    if ('problem' in result) {
      setProblems(current => ({ ...current, [field.code]: result.problem }));
      return;
    }
    clearProblem(field.code);
    setIntake(writeAnswerAtPath(intake, field.path, result.answer));
  }

  if (error !== '' && state === null)
    return (
      <section
        className="rounded-2xl border border-rose-200 bg-rose-50 p-6"
        role="alert"
        aria-live="assertive"
      >
        <p className="text-sm font-semibold text-rose-900">{error}</p>
      </section>
    );

  if (!formModel || !state || intake === null)
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Loading the mandatory audit intake…
      </section>
    );

  const evidence = Array.isArray(intake.evidence) ? intake.evidence : [];

  return (
    <div className="space-y-6" data-bouwa-audit-intake>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-blue-50 p-2 text-ars-primary">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Mandatory audit intake
              </h3>
              <p className="mt-0.5 text-sm leading-6 text-slate-500">
                Every question must carry an explicit answer. Where a fact is
                not known, record it as unknown rather than leaving it blank —
                the dependent outputs stay blocked either way, but a blank
                answer hides which ones.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
            {saving ? 'Saving…' : 'Saved on the local service'}
          </span>
        </div>
        {error !== '' && (
          <p
            className="mt-3 text-sm font-semibold text-rose-700"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </p>
        )}
      </section>

      {sectionViews.map(view => {
        const open = openSection === view.section.id;
        return (
          <section
            key={view.section.id}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenSection(open ? null : view.section.id)}
              className="flex w-full flex-wrap items-center justify-between gap-3 p-6 text-left"
            >
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {view.section.label}
                </h3>
                <p className="mt-0.5 text-sm leading-6 text-slate-500">
                  {view.section.description}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  view.outstandingCount === 0
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {view.confirmedCount} confirmed · {view.outstandingCount}{' '}
                outstanding
              </span>
            </button>
            {open && (
              <div className="grid gap-3 border-t border-slate-100 p-6 lg:grid-cols-2">
                {view.fields.map(fieldView => (
                  <IntakeFieldRow
                    key={fieldView.field.code}
                    view={fieldView}
                    intake={intake}
                    problem={problems[fieldView.field.code]}
                    locked={SERVER_OWNED_FIELD_CODES.includes(
                      fieldView.field.code,
                    )}
                    valueIntended={
                      valueIntent[fieldView.field.code] === true
                    }
                    onAnswerState={commitAnswerState}
                    onValue={commitValue}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      <EvidencePanel
        formModel={formModel}
        evidence={evidence}
        locked={false}
        onChange={next => setIntake({ ...intake, evidence: next })}
      />

      <ReadinessSummary
        readiness={state.readiness}
        fileParsed={state.fileParsed}
      />
    </div>
  );
}
