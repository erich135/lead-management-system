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
  AuditIntakeHistoryEntry,
  AuditReadinessAssessment,
  AuditReadinessStage,
  IntakeAnswer,
  IntakeAnswerState,
  ResolvedInput,
  ResolvedScientificInputs,
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

export const PROVENANCE_LABELS: Record<string, string> = {
  exact_mathematics: 'Exact mathematics',
  established_engineering: 'Established engineering',
  manufacturer_specification: 'Manufacturer specification',
  approved_assumption: 'Approved assumption',
  business_input: 'Business input',
  user_input: 'User input',
};

export interface WiredInputRow {
  label: string;
  /** The resolved value as text, or an empty string when nothing was wired. */
  text: string;
  provenance: string | null;
  confirmed: boolean;
  reason: string;
}

function wiredText(value: unknown, unit: string): string {
  if (value === null || value === undefined) return '';
  if (unit === '') return String(value);
  return `${String(value)} ${unit}`;
}

function wiredRow(
  label: string,
  input: ResolvedInput<unknown>,
  unit = '',
): WiredInputRow {
  return {
    label,
    text: wiredText(input.value, unit),
    provenance:
      input.provenance === null
        ? null
        : (PROVENANCE_LABELS[input.provenance] ?? input.provenance),
    confirmed: input.confirmed,
    reason: input.reason,
  };
}

/**
 * What the backend would actually calculate with, in the backend's own words.
 * Showing this beside the answers is the only way an operator can tell a
 * confirmed answer that reached the model from one that was rejected on the way.
 */
export function wiredInputRows(
  inputs: ResolvedScientificInputs,
): WiredInputRow[] {
  return [
    wiredRow('Annual operating hours', inputs.annualOperatingHours, 'h/y'),
    wiredRow('Measured flow-reference basis', inputs.measuredFlowReferenceBasis),
    wiredRow('Measured pressure basis', inputs.measuredPressureBasis),
    wiredRow('Configured low-flow cut-off', inputs.lowFlowCutOff, 'm³/min'),
    wiredRow(
      'Existing machine discharge pressure',
      inputs.existingMachine.dischargePressureBarG,
      'bar(g)',
    ),
    wiredRow(
      'Existing machine declared power',
      inputs.existingMachine.declaredPowerKw,
      'kW',
    ),
    wiredRow(
      'Proposed machine discharge pressure',
      inputs.proposedMachine.dischargePressureBarG,
      'bar(g)',
    ),
    wiredRow(
      'Proposed machine declared power',
      inputs.proposedMachine.declaredPowerKw,
      'kW',
    ),
    wiredRow('Representative period', inputs.representativePeriod),
  ];
}

export interface OutstandingEvidenceRow {
  code: string;
  label: string;
  whyItMatters: string;
  /** The state of the answer, which is not the state of the document. */
  answerStatus: string;
  documentStatus: string;
  requiredDocuments: string[];
  blockedOutputs: string[];
  responsiblePerson: string | null;
  expectedConfirmationDate: string | null;
  notes: string | null;
  /** Null where no document of an accepted type has been referenced yet. */
  evidenceId: string | null;
}

/**
 * The outstanding-evidence list, in the backend's order. The document status is
 * kept separate from the answer status because a confirmed answer resting on a
 * document nobody has produced is the case this workflow exists to expose.
 */
export function outstandingEvidenceRows(
  readiness: AuditReadinessAssessment,
  formModel: AuditIntakeFormModel,
): OutstandingEvidenceRow[] {
  const documentLabel = new Map(
    formModel.evidenceTypes.map(option => [option.value, option.label]),
  );
  const statusLabel = new Map(
    formModel.evidenceStatuses.map(option => [option.value, option.label]),
  );
  const outputLabel = new Map(
    readiness.blockedOutputs.map(output => [output.outputId, output.label]),
  );
  return readiness.externalEvidenceBlockers.map(blocker => ({
    code: blocker.code,
    label: blocker.label,
    whyItMatters: blocker.whyItMatters,
    answerStatus: FIELD_STATUS_LABELS[blocker.fieldStatus] ?? blocker.fieldStatus,
    documentStatus:
      blocker.evidenceStatus === null
        ? 'No document referenced'
        : (statusLabel.get(blocker.evidenceStatus) ?? blocker.evidenceStatus),
    requiredDocuments: blocker.requiredEvidence.map(
      type => documentLabel.get(type) ?? type,
    ),
    blockedOutputs: blocker.dependentOutputs.map(
      outputId => outputLabel.get(outputId) ?? outputId,
    ),
    responsiblePerson: blocker.responsiblePerson,
    expectedConfirmationDate: blocker.expectedConfirmationDate,
    notes: blocker.notes,
    evidenceId: blocker.evidenceId,
  }));
}

export interface IntakeChangeRow {
  at: string;
  by: string;
  source: string;
  changes: string[];
}

const HISTORY_SOURCE_LABELS: Record<string, string> = {
  operator_edit: 'Operator edit',
  parsed_logger_source: 'Logger file parsed',
};

/**
 * The change trail, newest first, with field codes resolved to the labels the
 * operator saw when answering them.
 */
export function intakeChangeRows(
  history: readonly AuditIntakeHistoryEntry[],
  readiness: AuditReadinessAssessment,
): IntakeChangeRow[] {
  const fieldLabel = new Map(
    readiness.fieldStatuses.map(status => [status.code, status.label]),
  );
  return [...history].reverse().map(entry => ({
    at: entry.at,
    by: entry.by === null ? 'Unattributed' : entry.by,
    source: HISTORY_SOURCE_LABELS[entry.source] ?? entry.source,
    changes: [
      ...entry.changedFieldCodes.map(code => fieldLabel.get(code) ?? code),
      ...entry.changedEvidenceIds.map(id => `Document ${id}`),
    ],
  }));
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
