/**
 * Pure state helpers for the mandatory audit-intake form.
 *
 * Nothing here decides whether an answer is acceptable; the backend does that
 * and returns the readiness assessment. These functions only move answers in
 * and out of the intake document and arrange the backend's verdict for display.
 *
 * The one rule enforced locally is that a blank entry is never turned into a
 * value. An empty box stays unanswered, and text that is not a number stays a
 * draft rather than becoming one.
 */

import type {
  AuditFieldStatus,
  AuditFormField,
  AuditFormSection,
  AuditIntakeDocument,
  AuditIntakeFormModel,
  AuditReadinessAssessment,
  AuditReadinessStage,
  IntakeAnswer,
  IntakeAnswerState,
} from './auditIntakeTypes';

export const ANSWER_STATE_LABELS: Record<IntakeAnswerState, string> = {
  unanswered: 'Not answered yet',
  answered: 'Confirmed value',
  unknown_confirmation_required: 'Unknown — confirmation required',
  not_applicable: 'Not applicable',
  not_listed_add_new: 'Not listed — add new equipment',
};

export const FIELD_STATUS_LABELS: Record<string, string> = {
  missing: 'Not answered',
  answered: 'Answered',
  confirmed: 'Confirmed',
  unknown_confirmation_required: 'Unknown — confirmation required',
  not_applicable: 'Not applicable',
  not_listed_add_new: 'Not listed — add new equipment',
  invalid: 'Answer cannot be used',
  not_required: 'Not required',
};

export const READINESS_STAGE_ORDER: AuditReadinessStage[] = [
  'file_parsed',
  'measured_audit_ready',
  'engineering_comparison_ready',
  'commercial_proposal_ready',
];

export function readAnswerAtPath(
  intake: AuditIntakeDocument,
  path: string,
): IntakeAnswer<unknown> | null {
  let current: unknown = intake;
  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null) return null;
    current = (current as Record<string, unknown>)[segment];
  }
  if (typeof current !== 'object' || current === null) return null;
  const candidate = current as Record<string, unknown>;
  if (typeof candidate.state !== 'string') return null;
  return candidate as unknown as IntakeAnswer<unknown>;
}

export function writeAnswerAtPath(
  intake: AuditIntakeDocument,
  path: string,
  answer: IntakeAnswer<unknown>,
): AuditIntakeDocument {
  const segments = path.split('.');

  function replace(node: unknown, depth: number): unknown {
    if (depth === segments.length) return answer;
    if (typeof node !== 'object' || node === null)
      throw new Error(`The intake has no section at '${path}'.`);
    const key = segments[depth];
    const source = node as Record<string, unknown>;
    if (!(key in source))
      throw new Error(`The intake has no answer at '${path}'.`);
    return { ...source, [key]: replace(source[key], depth + 1) };
  }

  return replace(intake, 0) as AuditIntakeDocument;
}

/**
 * The answer a control should commit for the text an operator typed. A blank
 * box means the question is unanswered, never zero and never an empty value.
 * Text that cannot be read as the field's kind is rejected so the draft stays
 * visible instead of being stored as an answer.
 */
export function answerFromInput(
  field: AuditFormField,
  raw: string,
): { answer: IntakeAnswer<unknown> } | { problem: string } {
  const trimmed = raw.trim();
  if (trimmed === '')
    return { answer: { state: 'unanswered', value: null, note: null } };

  if (field.valueKind === 'number' || field.valueKind === 'integer') {
    if (!/^-?\d+(\.\d+)?$/.test(trimmed))
      return { problem: 'Enter a number. Leave the box empty if it is not known.' };
    const value = Number(trimmed);
    if (!Number.isFinite(value))
      return { problem: 'Enter a number. Leave the box empty if it is not known.' };
    if (field.valueKind === 'integer' && !Number.isInteger(value))
      return { problem: 'Enter a whole number.' };
    return { answer: { state: 'answered', value, note: null } };
  }

  if (field.valueKind === 'selection') {
    if (!field.options.some(option => option.value === trimmed))
      return { problem: 'Choose one of the listed values.' };
    return { answer: { state: 'answered', value: trimmed, note: null } };
  }

  return { answer: { state: 'answered', value: trimmed, note: null } };
}

/** The answer for a state that carries no value, such as an explicit unknown. */
export function answerForState(state: IntakeAnswerState): IntakeAnswer<unknown> {
  if (state === 'answered')
    throw new Error('A confirmed answer needs a value.');
  return { state, value: null, note: null };
}

/** The text a control should show for a stored answer. */
export function inputTextForAnswer(answer: IntakeAnswer<unknown> | null): string {
  if (answer === null) return '';
  if (answer.state !== 'answered') return '';
  if (answer.value === null) return '';
  if (typeof answer.value === 'number') return String(answer.value);
  if (typeof answer.value === 'string') return answer.value;
  return '';
}

export interface AuditIntakeFieldView {
  status: AuditFieldStatus;
  field: AuditFormField;
}

export interface AuditIntakeSectionView {
  section: AuditFormSection;
  fields: AuditIntakeFieldView[];
  outstandingCount: number;
  confirmedCount: number;
}

/**
 * Sections in the backend's order, carrying only the fields that currently
 * apply. A field the answers have made irrelevant is not shown, so nothing
 * demands an answer that would not be used.
 */
export function auditIntakeSectionViews(
  formModel: AuditIntakeFormModel,
  readiness: AuditReadinessAssessment,
): AuditIntakeSectionView[] {
  const fieldsByCode = new Map(formModel.fields.map(field => [field.code, field]));
  return formModel.sections.map(section => {
    const fields: AuditIntakeFieldView[] = [];
    for (const status of readiness.fieldStatuses) {
      if (status.section !== section.id) continue;
      if (!status.applicable) continue;
      const field = fieldsByCode.get(status.code);
      if (!field) continue;
      fields.push({ status, field });
    }
    return {
      section,
      fields,
      outstandingCount: fields.filter(entry => !entry.status.confirmed).length,
      confirmedCount: fields.filter(entry => entry.status.confirmed).length,
    };
  });
}

export interface AuditIntakeSaveIdentity {
  sequence: number;
  proposalRecordId: string;
  fingerprint: string;
}

export function auditIntakeFingerprint(intake: AuditIntakeDocument): string {
  return JSON.stringify(intake);
}

export function nextAuditIntakeSave(
  priorSequence: number,
  proposalRecordId: string,
  intake: AuditIntakeDocument,
): AuditIntakeSaveIdentity {
  return {
    sequence: priorSequence + 1,
    proposalRecordId,
    fingerprint: auditIntakeFingerprint(intake),
  };
}

/**
 * A save response may only replace what is on screen when it answers the newest
 * request and the operator has not typed since. Otherwise a slow response would
 * undo a keystroke.
 */
export function mayApplyAuditIntakeSave(
  active: AuditIntakeSaveIdentity,
  responseIdentity: AuditIntakeSaveIdentity,
  currentIntake: AuditIntakeDocument,
): boolean {
  return (
    active.sequence === responseIdentity.sequence &&
    active.proposalRecordId === responseIdentity.proposalRecordId &&
    active.fingerprint === responseIdentity.fingerprint &&
    auditIntakeFingerprint(currentIntake) === responseIdentity.fingerprint
  );
}
