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
  AuditIntakeDocument,
  IntakeAnswer,
  IntakeAnswerState,
} from '../../auditIntakeTypes';
import type { WizardFieldView } from '../wizardState';

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

export interface WizardAnswerFieldProps {
  view: WizardFieldView;
  intake: AuditIntakeDocument;
  disabled: boolean;
  /** The value the file stated, where this field was filled in from a parse. */
  lockedText?: string | null;
  onAnswer: (path: string, answer: IntakeAnswer<unknown>) => void;
}

export function WizardAnswerField({
  view,
  intake,
  disabled,
  lockedText,
  onAnswer,
}: WizardAnswerFieldProps) {
  const { field, status } = view;
  const stored = readAnswerAtPath(intake, field.path);
  const [draft, setDraft] = useState<string | null>(null);
  const [problem, setProblem] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);

  const text = draft ?? inputTextForAnswer(stored);
  const locked = view.sourceDerived || disabled;
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
        <p className="mt-1.5 rounded-md bg-slate-50 px-2.5 py-2 text-xs leading-relaxed text-slate-600">
          {status.whyItMatters}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {view.sourceDerived ? (
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

        {view.sourceDerived
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
