/**
 * Pure arrangement for the guided wizard.
 *
 * Nothing here decides whether an answer is acceptable, which questions apply,
 * or what an output is blocked on. The backend states all of that. These
 * functions only decide what fits on a screen, what a footer may do next, and
 * how the backend's verdict is grouped for someone who is not an engineer.
 *
 * The one judgement made locally is the page split. A step with thirty applicable
 * questions cannot be shown at 1366 x 768 without scrolling, so a step is paged
 * into short cards. The page is part of the saved position, so resuming returns
 * to the questions the user was actually looking at.
 */

import type {
  AuditFieldStatus,
  AuditFormField,
  AuditIntakeFormModel,
  AuditIntakeSection,
  AuditReadinessAssessment,
  AuditReadinessStage,
  IntakeAnswerState,
} from '../auditIntakeTypes';
import type { WizardDraft, WizardSourceFact, WizardStep } from './wizardTypes';

/**
 * Questions per card. Chosen so a card and its footer fit 1366 x 768, where a
 * question that carries a note under it is about ninety pixels tall.
 */
export const WIZARD_FIELDS_PER_PAGE = 4;

export interface WizardFieldView {
  status: AuditFieldStatus;
  field: AuditFormField;
  /** True where the value came from the uploaded file and may not be typed over. */
  sourceDerived: boolean;
}

export interface WizardPage {
  index: number;
  fields: WizardFieldView[];
}

/**
 * The questions a step shows, in the step's own order, limited to those the
 * backend still considers applicable. A question the answers have made
 * irrelevant is never asked.
 *
 * A source-derived question is only locked once a file has actually been read.
 * The audit period may be entered before the record arrives; from the moment
 * one is parsed, the file's own dates stand and the box stops being a box.
 */
export function stepFieldViews(
  step: WizardStep,
  formModel: AuditIntakeFormModel,
  readiness: AuditReadinessAssessment,
  fileParsed = false,
): WizardFieldView[] {
  const fieldsByCode = new Map(formModel.fields.map(entry => [entry.code, entry]));
  const statusByCode = new Map(
    readiness.fieldStatuses.map(status => [status.code, status]),
  );
  const sourceDerived = new Set(
    fileParsed ? step.sourceDerivedFieldCodes : [],
  );
  const views: WizardFieldView[] = [];
  for (const code of step.fieldCodes) {
    const status = statusByCode.get(code);
    const field = fieldsByCode.get(code);
    if (!status || !field) continue;
    if (!status.applicable) continue;
    views.push({ status, field, sourceDerived: sourceDerived.has(code) });
  }
  return views;
}

/** The step's questions split into cards that fit one screen. */
export function stepPages(fields: WizardFieldView[]): WizardPage[] {
  if (fields.length === 0) return [{ index: 0, fields: [] }];
  const pages: WizardPage[] = [];
  for (let start = 0; start < fields.length; start += WIZARD_FIELDS_PER_PAGE)
    pages.push({
      index: pages.length,
      fields: fields.slice(start, start + WIZARD_FIELDS_PER_PAGE),
    });
  return pages;
}

export interface WizardFieldGroup {
  section: AuditIntakeSection;
  label: string;
  fields: WizardFieldView[];
}

/**
 * The questions on a screen under the heading they belong to, in the order they
 * were asked. "Unit price" and "Quantity" mean nothing on their own; under
 * "Electricity tariff" they mean what they say. Consecutive runs are kept
 * separate rather than gathered, so the heading always describes the questions
 * directly beneath it.
 */
export function fieldGroups(
  fields: WizardFieldView[],
  sections: readonly { id: AuditIntakeSection; label: string }[],
): WizardFieldGroup[] {
  const labels = new Map(sections.map(section => [section.id, section.label]));
  const groups: WizardFieldGroup[] = [];
  for (const field of fields) {
    const section = field.status.section;
    const last = groups[groups.length - 1];
    if (last !== undefined && last.section === section) last.fields.push(field);
    else
      groups.push({
        section,
        label: labels.get(section) ?? section,
        fields: [field],
      });
  }
  return groups;
}

export function clampPageIndex(index: number, pageCount: number): number {
  if (!Number.isInteger(index) || index < 0) return 0;
  if (index >= pageCount) return Math.max(0, pageCount - 1);
  return index;
}

/**
 * A question that has not been answered one way or another. A blank box is not
 * an answer, and neither is a value the backend could not use, so both hold the
 * step. Choosing "Unknown" is an answer and releases the step while keeping the
 * outputs that depend on it blocked.
 */
export function unresolvedFields(fields: WizardFieldView[]): WizardFieldView[] {
  return fields.filter(
    entry => entry.status.status === 'missing' || entry.status.status === 'invalid',
  );
}

/**
 * The questions holding the screen, allowing for answers given since the last
 * assessment. A question just answered on screen no longer holds the step, even
 * though the readiness that arrived with the last save still calls it missing.
 * A value the backend rejected always holds the step, because saving it again
 * would not make it usable.
 */
export function outstandingOnScreen(
  fields: WizardFieldView[],
  answerStateAt: (path: string) => IntakeAnswerState | null,
): WizardFieldView[] {
  return fields.filter(entry => {
    // A locked value is the file's to state. It can never hold a user's step,
    // because there is nothing they could do about it on this screen.
    if (entry.sourceDerived) return false;
    if (entry.status.status === 'invalid') return true;
    if (entry.status.status !== 'missing') return false;
    const state = answerStateAt(entry.field.path);
    return state === null || state === 'unanswered';
  });
}

export interface StepProgress {
  /** Questions on the step the backend still applies. */
  total: number;
  /** Questions answered, confirmed, marked unknown, or set aside. */
  settled: number;
  outstanding: number;
}

export function stepProgress(fields: WizardFieldView[]): StepProgress {
  const outstanding = unresolvedFields(fields).length;
  return {
    total: fields.length,
    settled: fields.length - outstanding,
    outstanding,
  };
}

/* Readiness, said once and said plainly. */

export const WIZARD_STAGE_ORDER: AuditReadinessStage[] = [
  'file_parsed',
  'measured_audit_ready',
  'engineering_comparison_ready',
  'commercial_proposal_ready',
];

export const WIZARD_STAGE_LABELS: Record<AuditReadinessStage, string> = {
  file_parsed: 'File analysis',
  measured_audit_ready: 'Measured audit',
  engineering_comparison_ready: 'Engineering comparison',
  commercial_proposal_ready: 'Commercial proposal',
};

export interface ReadinessLine {
  stage: AuditReadinessStage;
  label: string;
  /** "Ready", "3 items required", or the reason the stage does not apply. */
  state: string;
  ready: boolean;
  applicable: boolean;
  outstandingCount: number;
  /** The first few things to do, not the full list. */
  nextActions: string[];
}

/**
 * The four-line readiness summary the ordinary workflow shows. The complete
 * ordered reason list is not thrown away; it stays in Advanced Technical Review,
 * where a reader is looking for it.
 */
export function readinessLines(
  readiness: AuditReadinessAssessment,
): ReadinessLine[] {
  const labelByCode = new Map(
    readiness.fieldStatuses.map(status => [status.code, status.label]),
  );
  return WIZARD_STAGE_ORDER.map(stage => {
    const eligibility = readiness.stageEligibility.find(
      entry => entry.stage === stage,
    );
    if (eligibility === undefined)
      return {
        stage,
        label: WIZARD_STAGE_LABELS[stage],
        state: 'Not assessed',
        ready: false,
        applicable: false,
        outstandingCount: 0,
        nextActions: [],
      };
    const applicable = eligibility.applicable !== false;
    const outstandingCount = eligibility.blockingFieldCodes.length;
    const nextActions = eligibility.blockingFieldCodes
      .slice(0, 3)
      .map(code => labelByCode.get(code) ?? code);
    const state = !applicable
      ? (eligibility.reasons[0] ?? 'Does not apply to this proposal')
      : eligibility.eligible
        ? 'Ready'
        : outstandingCount === 1
          ? '1 item required'
          : `${outstandingCount} items required`;
    return {
      stage,
      label: WIZARD_STAGE_LABELS[stage],
      state,
      ready: applicable && eligibility.eligible,
      applicable,
      outstandingCount,
      nextActions,
    };
  });
}

/* Evidence, grouped rather than listed one card at a time. */

export const EVIDENCE_GROUP_TITLES: Record<string, string> = {
  logger_and_sensors: 'Logger and sensor evidence',
  existing_machine: 'Existing machine documents',
  proposed_machine: 'Proposed machine documents',
  operating: 'Operating confirmation',
  tariff: 'Tariff documents',
  site_conditions: 'Site-condition evidence',
  investment: 'Investment evidence',
  proposal: 'Proposal information',
};

const GROUP_BY_SECTION: Record<AuditIntakeSection, string> = {
  identity: 'proposal',
  logger: 'logger_and_sensors',
  flow_sensor: 'logger_and_sensors',
  pressure_sensor: 'logger_and_sensors',
  temperature_sensor: 'logger_and_sensors',
  existing_machine: 'existing_machine',
  proposed_machine: 'proposed_machine',
  operating_conditions: 'operating',
  site_conditions: 'site_conditions',
  tariff: 'tariff',
  investment: 'investment',
};

export const EVIDENCE_GROUP_ORDER = [
  'logger_and_sensors',
  'existing_machine',
  'proposed_machine',
  'operating',
  'tariff',
  'site_conditions',
  'investment',
  'proposal',
];

export interface EvidenceItem {
  code: string;
  label: string;
  whyItMatters: string;
  requiredDocuments: string[];
  blockedOutputs: string[];
  documentStatus: string;
  responsiblePerson: string | null;
  expectedConfirmationDate: string | null;
  notes: string | null;
}

export interface EvidenceGroup {
  id: string;
  title: string;
  outstanding: number;
  items: EvidenceItem[];
}

export function evidenceGroups(
  readiness: AuditReadinessAssessment,
  formModel: AuditIntakeFormModel,
): EvidenceGroup[] {
  const sectionByCode = new Map(
    readiness.fieldStatuses.map(status => [status.code, status.section]),
  );
  const documentLabel = new Map(
    formModel.evidenceTypes.map(option => [option.value, option.label]),
  );
  const statusLabel = new Map(
    formModel.evidenceStatuses.map(option => [option.value, option.label]),
  );
  const outputLabel = new Map(
    readiness.blockedOutputs.map(output => [output.outputId, output.label]),
  );
  const grouped = new Map<string, EvidenceItem[]>();
  for (const blocker of readiness.externalEvidenceBlockers) {
    const section = sectionByCode.get(blocker.code);
    const groupId =
      section === undefined ? 'proposal' : (GROUP_BY_SECTION[section] ?? 'proposal');
    const items = grouped.get(groupId) ?? [];
    items.push({
      code: blocker.code,
      label: blocker.label,
      whyItMatters: blocker.whyItMatters,
      requiredDocuments: blocker.requiredEvidence.map(
        type => documentLabel.get(type) ?? type,
      ),
      blockedOutputs: blocker.dependentOutputs.map(
        output => outputLabel.get(output) ?? output,
      ),
      documentStatus:
        blocker.evidenceStatus === null
          ? 'No document referenced'
          : (statusLabel.get(blocker.evidenceStatus) ?? blocker.evidenceStatus),
      responsiblePerson: blocker.responsiblePerson,
      expectedConfirmationDate: blocker.expectedConfirmationDate,
      notes: blocker.notes,
    });
    grouped.set(groupId, items);
  }
  return EVIDENCE_GROUP_ORDER.filter(id => grouped.has(id)).map(id => ({
    id,
    title: EVIDENCE_GROUP_TITLES[id] ?? id,
    outstanding: (grouped.get(id) ?? []).length,
    items: grouped.get(id) ?? [],
  }));
}

/* Saving. */

export type WizardSaveState =
  | { kind: 'clean' }
  | { kind: 'dirty' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: string }
  | { kind: 'failed'; message: string }
  | { kind: 'conflict'; message: string };

export function saveStateLabel(state: WizardSaveState): string {
  switch (state.kind) {
    case 'clean':
      return 'All changes saved';
    case 'dirty':
      return 'Unsaved changes';
    case 'saving':
      return 'Saving…';
    case 'saved':
      return `Saved ${formatSavedAt(state.at)}`;
    case 'failed':
      return 'Save failed — retry';
    case 'conflict':
      return 'This proposal was changed elsewhere';
  }
}

/** True only where leaving now would genuinely lose work. */
export function hasUnsavedWork(state: WizardSaveState): boolean {
  return state.kind === 'dirty' || state.kind === 'failed' || state.kind === 'saving';
}

export function formatSavedAt(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return 'just now';
  return at.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateOnly(iso: string | null): string {
  if (iso === null) return '—';
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '—';
  return at.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/* What the footer may do. */

export interface WizardPosition {
  stepIndex: number;
  stepCount: number;
  pageIndex: number;
  pageCount: number;
}

export function canGoBack(position: WizardPosition): boolean {
  return position.pageIndex > 0 || position.stepIndex > 0;
}

export function isFinalScreen(position: WizardPosition): boolean {
  return (
    position.stepIndex === position.stepCount - 1 &&
    position.pageIndex === position.pageCount - 1
  );
}

export interface WizardMove {
  stepIndex: number;
  pageIndex: number;
}

/**
 * Where "Continue" goes. Pages of the current step are walked first, then the
 * next step's first page. The page count of the next step is not known here, so
 * a step change always lands on its first page.
 */
export function moveForward(position: WizardPosition): WizardMove | null {
  if (position.pageIndex + 1 < position.pageCount)
    return { stepIndex: position.stepIndex, pageIndex: position.pageIndex + 1 };
  if (position.stepIndex + 1 < position.stepCount)
    return { stepIndex: position.stepIndex + 1, pageIndex: 0 };
  return null;
}

/**
 * Where "Back" goes. Moving back a step lands on that step's last page, which
 * the caller supplies because only it knows how the previous step paginates.
 */
export function moveBack(
  position: WizardPosition,
  previousStepPageCount: number,
): WizardMove | null {
  if (position.pageIndex > 0)
    return { stepIndex: position.stepIndex, pageIndex: position.pageIndex - 1 };
  if (position.stepIndex > 0)
    return {
      stepIndex: position.stepIndex - 1,
      pageIndex: Math.max(0, previousStepPageCount - 1),
    };
  return null;
}

/* Draft list presentation. */

export function draftStepLabel(
  summaryStepTitle: string,
  position: number,
  total: number,
): string {
  return `Step ${position} of ${total} — ${summaryStepTitle}`;
}

/** The single line a list row shows for readiness. */
export function draftReadinessLabel(draft: {
  readinessSummary: {
    stageLabel: string;
    outstandingQuestionCount: number;
  };
}): string {
  const outstanding = draft.readinessSummary.outstandingQuestionCount;
  if (outstanding === 0) return draft.readinessSummary.stageLabel;
  return `${draft.readinessSummary.stageLabel} · ${outstanding} outstanding`;
}

/* Source-derived presentation. */

export function sourceFactById(
  facts: readonly WizardSourceFact[],
  id: string,
): WizardSourceFact | null {
  return facts.find(fact => fact.id === id) ?? null;
}

export function draftTitle(draft: WizardDraft): string {
  const customer = draft.customer.customerName;
  if (customer === null || customer.trim() === '') return draft.reference;
  return `${draft.reference} — ${customer}`;
}
