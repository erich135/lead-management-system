/**
 * One question, asked the way an ordinary user can answer it.
 *
 * The control is chosen from the backend's own description of the field, so a
 * finite scientific category is always a list rather than a text box, and a
 * measured quantity always carries its unit. The field code is not shown here;
 * it belongs in Advanced Technical Review, where somebody is looking for it.
 *
 * Every question can be answered "Unknown". That is a real answer, recorded as
 * such, and it keeps the outputs that depend on it blocked. It is offered
 * because the alternative — a user inventing a plausible number to get past a
 * screen — is the failure this workflow exists to prevent.
 */

import { useState } from 'react';
import { HelpCircle, Lock } from 'lucide-react';

import {
  answerForState,
  answerFromInput,
  inputTextForAnswer,
  readAnswerAtPath,
} from '../../auditIntakeState';
import type {
  AuditFormField,
  AuditIntakeDocument,
  IntakeAnswer,
  IntakeAnswerState,
} from '../../auditIntakeTypes';
import { conceptForField } from '../wizardHelp';
import type { WizardFieldView } from '../wizardState';
import { ANSWER_ORIGIN_LABELS } from '../wizardTypes';

const STATE_BUTTON_LABELS: Partial<Record<IntakeAnswerState, string>> = {
  unknown_confirmation_required: 'Unknown',
  not_applicable: 'Not applicable',
  not_listed_add_new: 'Not listed',
};

const STATUS_TONE: Record<string, string> = {
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  answered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  missing: 'bg-slate-50 text-slate-500 border-slate-200',
  unknown_confirmation_required: 'bg-amber-50 text-amber-800 border-amber-200',
  not_applicable: 'bg-slate-50 text-slate-500 border-slate-200',
  not_listed_add_new: 'bg-amber-50 text-amber-800 border-amber-200',
  invalid: 'bg-rose-50 text-rose-700 border-rose-200',
  not_required: 'bg-slate-50 text-slate-400 border-slate-200',
};

const STATUS_TEXT: Record<string, string> = {
  confirmed: 'Confirmed',
  answered: 'Answered',
  missing: 'Not answered',
  unknown_confirmation_required: 'Unknown',
  not_applicable: 'Not applicable',
  not_listed_add_new: 'Not listed',
  invalid: 'Cannot be used',
  not_required: 'Not required',
};

/** A value as a person reads it, rather than as the intake stores it. */
function describeValue(field: AuditFormField, value: unknown): string {
  if (value === null || value === undefined) return 'Not published';
  if (Array.isArray(value))
    return `${value.length} point${value.length === 1 ? '' : 's'}`;
  if (field.valueKind === 'selection') {
    const option = field.options.find(entry => entry.value === value);
    return option?.label ?? String(value);
  }
  return String(value);
}

export interface WizardAnswerFieldProps {
  view: WizardFieldView;
  intake: AuditIntakeDocument;
  disabled: boolean;
  /** The value the file stated, where this field was filled in from a parse. */
  lockedText?: string | null;
  onAnswer: (path: string, answer: IntakeAnswer<unknown>) => void;
  /**
   * Restates a value a source published. Absent where the screen has no way to
   * record a reason, in which case a source-backed value is simply shown.
   */
  onOverride?: (path: string, answer: unknown, reason: string) => void;
  onRestore?: (path: string) => void;
}

export function WizardAnswerField({
  view,
  intake,
  disabled,
  lockedText,
  onAnswer,
  onOverride,
  onRestore,
}: WizardAnswerFieldProps) {
  const { field, status, provenance } = view;
  const stored = readAnswerAtPath(intake, field.path);
  const [draft, setDraft] = useState<string | null>(null);
  const [problem, setProblem] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const [reason, setReason] = useState('');

  const text = draft ?? inputTextForAnswer(stored);
  /**
   * A value a source published is shown rather than offered for typing. Not
   * because a rep is untrusted, but because a figure quietly typed over a
   * manufacturer's is indistinguishable afterwards from the manufacturer's own,
   * and the proposal has to be able to tell a reader which it is.
   */
  const fromSource =
    provenance !== null &&
    (provenance.origin === 'populated_from_source' ||
      provenance.origin === 'changed_for_this_proposal') &&
    onOverride !== undefined;
  const locked = view.sourceDerived || disabled;
  const concept = conceptForField(field.code);
  const controlId = `wizard-field-${field.code.replace(/[^A-Za-z0-9]/g, '-')}`;

  function commitText(raw: string) {
    const outcome = answerFromInput(field, raw);
    if ('problem' in outcome) {
      setProblem(outcome.problem);
      return;
    }
    setProblem('');
    setDraft(null);
    onAnswer(field.path, outcome.answer);
  }

  function chooseState(state: IntakeAnswerState) {
    setProblem('');
    setDraft(null);
    onAnswer(field.path, answerForState(state));
  }

  const stateButtons = field.permittedAnswerStates.filter(
    state => state in STATE_BUTTON_LABELS,
  );

  return (
    <div
      data-testid="wizard-field"
      data-field-code={field.code}
      data-answer-state={stored?.state ?? 'unanswered'}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"
    >
      <div className="flex items-start justify-between gap-3">
        <label
          htmlFor={controlId}
          className="text-sm font-medium leading-snug text-slate-800"
        >
          {status.label}
          {field.unit === null ? null : (
            <span className="ml-1 font-normal text-slate-500">({field.unit})</span>
          )}
        </label>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
              STATUS_TONE[status.status] ?? STATUS_TONE.missing
            }`}
          >
            {STATUS_TEXT[status.status] ?? status.status}
          </span>
          <button
            type="button"
            aria-label={`Why ${status.label} is asked`}
            aria-expanded={helpOpen}
            onClick={() => setHelpOpen(open => !open)}
            className="text-slate-400 hover:text-slate-700"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {helpOpen ? (
        <div className="mt-1.5 space-y-1.5 rounded-md bg-slate-50 px-2.5 py-2 text-xs leading-relaxed text-slate-600">
          <p>{status.whyItMatters}</p>
          {concept === null ? null : (
            <p>
              <span className="font-medium text-slate-700">{concept.title}. </span>
              {concept.body}
            </p>
          )}
        </div>
      ) : null}

      {provenance === null ? null : (
        <div
          data-testid="wizard-field-provenance"
          data-origin={provenance.origin}
          className={`mt-1.5 rounded-md px-2.5 py-1.5 text-[11px] leading-relaxed ${
            provenance.origin === 'changed_for_this_proposal'
              ? 'bg-amber-50 text-amber-900'
              : 'bg-slate-50 text-slate-600'
          }`}
        >
          <span className="font-medium">
            {ANSWER_ORIGIN_LABELS[provenance.origin]}
          </span>
          {' — '}
          {provenance.sourceLabel}
          {provenance.sourceRecordVersion === null
            ? null
            : ` (record version ${provenance.sourceRecordVersion})`}
          {provenance.origin === 'changed_for_this_proposal' ? (
            <span className="mt-0.5 block">
              Published value {describeValue(field, provenance.sourceValue)}.
              {provenance.reason === null ? null : ` ${provenance.reason}.`}
              {provenance.byName === null ? null : ` ${provenance.byName}.`}
            </span>
          ) : null}
          {provenance.origin === 'not_published_by_source' ? (
            <span className="mt-0.5 block">
              This source states nothing for this field, so it remains a question.
            </span>
          ) : null}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {fromSource ? (
          <>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700">
              <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="font-mono text-xs">
                {inputTextForAnswer(stored) || '—'}
              </span>
            </p>
            {disabled || changing ? null : (
              <button
                type="button"
                onClick={() => {
                  setDraft(inputTextForAnswer(stored));
                  setReason('');
                  setChanging(true);
                }}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Change for this proposal
              </button>
            )}
            {provenance?.origin === 'changed_for_this_proposal' &&
            !disabled &&
            !changing &&
            onRestore !== undefined ? (
              <button
                type="button"
                onClick={() => onRestore(field.path)}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Restore published value
              </button>
            ) : null}
          </>
        ) : view.sourceDerived ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700">
            <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="font-mono text-xs">
              {lockedText ?? inputTextForAnswer(stored) ?? '—'}
            </span>
            <span className="text-[11px] text-slate-500">
              Detected from the uploaded file
            </span>
          </p>
        ) : field.valueKind === 'selection' ? (
          <select
            id={controlId}
            disabled={locked}
            value={text}
            onChange={event => commitText(event.target.value)}
            className="min-w-[16rem] flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm disabled:bg-slate-100"
          >
            <option value="">Choose…</option>
            {field.options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={controlId}
            disabled={locked}
            type={
              field.valueKind === 'date'
                ? 'date'
                : field.valueKind === 'number' || field.valueKind === 'integer'
                  ? 'text'
                  : 'text'
            }
            inputMode={
              field.valueKind === 'number' || field.valueKind === 'integer'
                ? 'decimal'
                : undefined
            }
            value={text}
            placeholder={field.unit === null ? '' : field.unit}
            onChange={event => setDraft(event.target.value)}
            onBlur={event => commitText(event.target.value)}
            className="min-w-[16rem] flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm disabled:bg-slate-100"
          />
        )}

        {view.sourceDerived || fromSource
          ? null
          : stateButtons.map(state => {
              const active = stored?.state === state;
              return (
                <button
                  key={state}
                  type="button"
                  disabled={locked}
                  onClick={() => chooseState(state)}
                  className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                    active
                      ? 'border-amber-300 bg-amber-100 text-amber-900'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {STATE_BUTTON_LABELS[state]}
                </button>
              );
            })}
      </div>

      {changing && onOverride !== undefined ? (
        <div
          data-testid="wizard-field-override"
          className="mt-2 space-y-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2"
        >
          <p className="text-[11px] leading-relaxed text-amber-900">
            The published value stays on the proposal beside yours, and both
            appear in Advanced Technical Review. A reason is required.
          </p>
          {field.valueKind === 'selection' ? (
            <select
              value={draft ?? ''}
              onChange={event => setDraft(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
            >
              <option value="">Choose…</option>
              {field.options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={draft ?? ''}
              placeholder={field.unit ?? ''}
              onChange={event => setDraft(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
            />
          )}
          <input
            value={reason}
            placeholder="Why this proposal states something else"
            onChange={event => setReason(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={reason.trim() === ''}
              onClick={() => {
                const outcome = answerFromInput(field, draft ?? '');
                if ('problem' in outcome) {
                  setProblem(outcome.problem);
                  return;
                }
                setProblem('');
                setChanging(false);
                setDraft(null);
                onOverride(field.path, outcome.answer.value, reason.trim());
              }}
              className="rounded-md bg-amber-600 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Record this change
            </button>
            <button
              type="button"
              onClick={() => {
                setChanging(false);
                setDraft(null);
                setProblem('');
              }}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {problem === '' ? null : (
        <p className="mt-1.5 text-xs text-rose-600">{problem}</p>
      )}
      {problem === '' && status.status === 'invalid' ? (
        <p className="mt-1.5 text-xs text-rose-600">{status.message}</p>
      ) : null}
      {stored?.state === 'unknown_confirmation_required' ? (
        <p className="mt-1.5 text-xs text-amber-700">
          Recorded as unknown. Anything that depends on it stays blocked until it is
          confirmed.
        </p>
      ) : null}
    </div>
  );
}
