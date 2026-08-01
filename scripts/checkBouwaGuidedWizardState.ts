import assert from 'node:assert/strict';

import {
  canGoBack,
  clampPageIndex,
  draftReadinessLabel,
  evidenceGroups,
  hasUnsavedWork,
  isFinalScreen,
  moveBack,
  moveForward,
  outstandingOnScreen,
  readinessLines,
  saveStateLabel,
  stepFieldViews,
  stepPages,
  unresolvedFields,
  WIZARD_FIELDS_PER_PAGE,
} from '../src/features/bouwa/wizard/wizardState.ts';
import type {
  AuditFieldStatus,
  AuditFormField,
  AuditIntakeFormModel,
  AuditReadinessAssessment,
  IntakeAnswer,
} from '../src/features/bouwa/auditIntakeTypes.ts';
import type { WizardStep } from '../src/features/bouwa/wizard/wizardTypes.ts';

function answer(state: IntakeAnswer<unknown>['state']): IntakeAnswer<unknown> {
  return { state, value: null, note: null };
}

function status(overrides: Partial<AuditFieldStatus>): AuditFieldStatus {
  return {
    code: 'AUDIT.TEST.ONE',
    section: 'logger',
    label: 'Logger manufacturer',
    whyItMatters: 'The record must be traceable to a known instrument.',
    status: 'missing',
    applicable: true,
    resolved: false,
    confirmed: false,
    resolvedForStage: null,
    confirmedForStage: null,
    dependentOutputs: [],
    requiredEvidence: [],
    message: 'Not answered.',
    ...overrides,
  };
}

function field(overrides: Partial<AuditFormField>): AuditFormField {
  return {
    code: 'AUDIT.TEST.ONE',
    path: 'logger.manufacturer',
    valueKind: 'text',
    unit: null,
    options: [],
    permittedAnswerStates: ['answered', 'unknown_confirmation_required'],
    ...overrides,
  };
}

function readiness(
  overrides: Partial<AuditReadinessAssessment>,
): AuditReadinessAssessment {
  return {
    intakeSchemaVersion: 'bouwa-audit-intake-1',
    stage: null,
    stageLabel: 'Nothing released yet',
    stageEligibility: [],
    missingFieldCodes: [],
    confirmationRequiredCodes: [],
    invalidFieldCodes: [],
    fieldStatuses: [],
    messages: [],
    permittedOutputs: [],
    blockedOutputs: [],
    comparison: { eligible: false, checks: [], blockedOutputs: [] },
    annualOperatingHours: null,
    externalEvidenceBlockers: [],
    unavailableDependencies: [],
    ...overrides,
  };
}

function formModel(
  overrides: Partial<AuditIntakeFormModel>,
): AuditIntakeFormModel {
  return {
    intakeSchemaVersion: 'bouwa-audit-intake-1',
    sections: [],
    fields: [],
    evidenceTypes: [],
    evidenceStatuses: [],
    outputs: [],
    ...overrides,
  };
}

function step(overrides: Partial<WizardStep>): WizardStep {
  return {
    id: 'logger_sensors',
    title: 'Logger and sensors',
    purpose: 'The instrument that produced the record.',
    proposalTypes: ['air_audit'],
    sections: ['logger'],
    fieldCodes: [],
    sourceDerivedFieldCodes: [],
    ...overrides,
  };
}

/* A step asks the questions the backend still applies, in the step's order. */

const threeFields = ['A', 'B', 'C'].map(suffix =>
  field({ code: `AUDIT.TEST.${suffix}`, path: `logger.f${suffix}` }),
);

const views = stepFieldViews(
  step({
    fieldCodes: ['AUDIT.TEST.C', 'AUDIT.TEST.A', 'AUDIT.TEST.B', 'AUDIT.TEST.GONE'],
    sourceDerivedFieldCodes: ['AUDIT.TEST.C'],
  }),
  formModel({ fields: threeFields }),
  readiness({
    fieldStatuses: [
      status({ code: 'AUDIT.TEST.A' }),
      status({ code: 'AUDIT.TEST.B', applicable: false }),
      status({ code: 'AUDIT.TEST.C' }),
    ],
  }),
);

assert.deepEqual(
  views.map(view => view.field.code),
  ['AUDIT.TEST.C', 'AUDIT.TEST.A'],
  'the step keeps its own order and drops what no longer applies',
);
assert.equal(views[0].sourceDerived, true);
assert.equal(views[1].sourceDerived, false);

/* A step longer than a screen is paged, never lengthened. */

const many = Array.from({ length: 12 }, (_, index) =>
  field({ code: `AUDIT.MANY.${index}`, path: `logger.m${index}` }),
);
const manyViews = stepFieldViews(
  step({ fieldCodes: many.map(entry => entry.code) }),
  formModel({ fields: many }),
  readiness({
    fieldStatuses: many.map(entry => status({ code: entry.code })),
  }),
);
const pages = stepPages(manyViews);
assert.equal(pages.length, Math.ceil(12 / WIZARD_FIELDS_PER_PAGE));
assert.equal(pages[0].fields.length, WIZARD_FIELDS_PER_PAGE);
assert.equal(
  pages.reduce((count, page) => count + page.fields.length, 0),
  12,
  'no question is lost when a step is paged',
);
assert.equal(stepPages([]).length, 1, 'a step with nothing to ask still has a screen');

assert.equal(clampPageIndex(-1, 3), 0);
assert.equal(clampPageIndex(9, 3), 2);
assert.equal(clampPageIndex(1, 3), 1);
assert.equal(clampPageIndex(0, 1), 0);

/* Leaving a screen: explicit answers release it, blanks and rejects hold it. */

const guardFields = stepFieldViews(
  step({
    fieldCodes: ['AUDIT.G.BLANK', 'AUDIT.G.TYPED', 'AUDIT.G.UNKNOWN', 'AUDIT.G.BAD'],
  }),
  formModel({
    fields: [
      field({ code: 'AUDIT.G.BLANK', path: 'logger.blank' }),
      field({ code: 'AUDIT.G.TYPED', path: 'logger.typed' }),
      field({ code: 'AUDIT.G.UNKNOWN', path: 'logger.unknown' }),
      field({ code: 'AUDIT.G.BAD', path: 'logger.bad' }),
    ],
  }),
  readiness({
    fieldStatuses: [
      status({ code: 'AUDIT.G.BLANK', status: 'missing' }),
      status({ code: 'AUDIT.G.TYPED', status: 'missing' }),
      status({
        code: 'AUDIT.G.UNKNOWN',
        status: 'unknown_confirmation_required',
      }),
      status({ code: 'AUDIT.G.BAD', status: 'invalid' }),
    ],
  }),
);

const onScreenAnswers = new Map([
  ['logger.blank', answer('unanswered').state],
  ['logger.typed', answer('answered').state],
  ['logger.unknown', answer('unknown_confirmation_required').state],
  ['logger.bad', answer('answered').state],
]);
const answerStateAt = (path: string) => onScreenAnswers.get(path) ?? null;

assert.deepEqual(
  unresolvedFields(guardFields).map(entry => entry.field.code),
  ['AUDIT.G.BLANK', 'AUDIT.G.TYPED', 'AUDIT.G.BAD'],
  'the last assessment counts a just-typed answer as still missing',
);
assert.deepEqual(
  outstandingOnScreen(guardFields, answerStateAt).map(entry => entry.field.code),
  ['AUDIT.G.BLANK', 'AUDIT.G.BAD'],
  'an answer given on screen releases the step; a rejected value never does',
);

/* An explicit unknown is an answer, and it does not release what depends on it. */

const unknownOnly = guardFields.filter(
  entry => entry.field.code === 'AUDIT.G.UNKNOWN',
);
assert.equal(outstandingOnScreen(unknownOnly, answerStateAt).length, 0);
assert.equal(
  outstandingOnScreen(guardFields, () => null).length,
  3,
  'with nothing answered on screen the last assessment stands',
);

/* Readiness is four lines, and says when a stage does not apply at all. */

const lines = readinessLines(
  readiness({
    fieldStatuses: [
      status({ code: 'AUDIT.E.ONE', label: 'Annual operating hours' }),
      status({ code: 'AUDIT.E.TWO', label: 'Electricity tariff' }),
    ],
    stageEligibility: [
      {
        stage: 'file_parsed',
        label: 'File parsed',
        eligible: false,
        applicable: false,
        blockingFieldCodes: [],
        reasons: ['This proposal was not created from a logger record.'],
      },
      {
        stage: 'measured_audit_ready',
        label: 'Measured audit',
        eligible: false,
        applicable: false,
        blockingFieldCodes: [],
        reasons: ['This proposal was not created from a logger record.'],
      },
      {
        stage: 'engineering_comparison_ready',
        label: 'Engineering comparison',
        eligible: true,
        applicable: true,
        blockingFieldCodes: [],
        reasons: [],
      },
      {
        stage: 'commercial_proposal_ready',
        label: 'Commercial proposal',
        eligible: false,
        applicable: true,
        blockingFieldCodes: ['AUDIT.E.ONE', 'AUDIT.E.TWO'],
        reasons: ['Two answers outstanding.'],
      },
    ],
  }),
);

assert.equal(lines.length, 4);
assert.equal(lines[0].applicable, false);
assert.equal(lines[0].state, 'This proposal was not created from a logger record.');
assert.equal(lines[2].state, 'Ready');
assert.equal(lines[2].ready, true);
assert.equal(lines[3].state, '2 items required');
assert.deepEqual(lines[3].nextActions, [
  'Annual operating hours',
  'Electricity tariff',
]);
assert.equal(
  lines[1].ready,
  false,
  'a stage that does not apply is never reported as ready',
);

/* Evidence is grouped and counted rather than listed one card at a time. */

const groups = evidenceGroups(
  readiness({
    fieldStatuses: [
      status({ code: 'AUDIT.FLOW_SENSOR.CALIBRATION_CERTIFICATE', section: 'flow_sensor' }),
      status({ code: 'AUDIT.LOGGER.CONFIGURATION_VERSION', section: 'logger' }),
      status({ code: 'AUDIT.TARIFF.BILL_EVIDENCE', section: 'tariff' }),
    ],
    blockedOutputs: [
      {
        outputId: 'annual_electricity_cost',
        label: 'Annual electricity cost',
        requiredStage: 'commercial_proposal_ready',
        blockingFieldCodes: [],
        reasons: [],
      },
    ],
    externalEvidenceBlockers: [
      {
        code: 'AUDIT.FLOW_SENSOR.CALIBRATION_CERTIFICATE',
        label: 'Flow-sensor calibration certificate',
        whyItMatters: 'An uncalibrated sensor states no traceable flow.',
        requiredEvidence: ['flow_sensor_calibration_certificate'],
        dependentOutputs: ['measured_demand'],
        responsiblePerson: null,
        expectedConfirmationDate: null,
        fieldStatus: 'missing',
        evidenceId: null,
        evidenceStatus: null,
        notes: null,
      },
      {
        code: 'AUDIT.LOGGER.CONFIGURATION_VERSION',
        label: 'Logger configuration record',
        whyItMatters: 'The configuration decides what the readings mean.',
        requiredEvidence: ['logger_configuration_record'],
        dependentOutputs: ['measured_demand'],
        responsiblePerson: 'Site engineer',
        expectedConfirmationDate: '2026-08-14',
        fieldStatus: 'missing',
        evidenceId: null,
        evidenceStatus: 'requested',
        notes: null,
      },
      {
        code: 'AUDIT.TARIFF.BILL_EVIDENCE',
        label: 'Electricity bill',
        whyItMatters: 'Cost cannot be stated without the tariff actually billed.',
        requiredEvidence: ['electricity_bill'],
        dependentOutputs: ['annual_electricity_cost'],
        responsiblePerson: null,
        expectedConfirmationDate: null,
        fieldStatus: 'missing',
        evidenceId: null,
        evidenceStatus: null,
        notes: null,
      },
    ],
  }),
  formModel({
    evidenceTypes: [
      { value: 'electricity_bill', label: 'Electricity bill' },
      { value: 'logger_configuration_record', label: 'Logger configuration record' },
      {
        value: 'flow_sensor_calibration_certificate',
        label: 'Flow-sensor calibration certificate',
      },
    ],
    evidenceStatuses: [{ value: 'requested', label: 'Requested' }],
  }),
);

assert.deepEqual(
  groups.map(group => [group.id, group.outstanding]),
  [
    ['logger_and_sensors', 2],
    ['tariff', 1],
  ],
  'sensor and logger documents belong to one group, in the stated order',
);
assert.equal(groups[0].items[1].documentStatus, 'Requested');
assert.equal(groups[0].items[0].documentStatus, 'No document referenced');
assert.deepEqual(groups[1].items[0].blockedOutputs, ['Annual electricity cost']);
assert.equal(
  evidenceGroups(readiness({}), formModel({})).length,
  0,
  'nothing outstanding means no groups at all',
);

/* The footer walks pages first, then steps. */

assert.deepEqual(
  moveForward({ stepIndex: 1, stepCount: 9, pageIndex: 0, pageCount: 3 }),
  { stepIndex: 1, pageIndex: 1 },
);
assert.deepEqual(
  moveForward({ stepIndex: 1, stepCount: 9, pageIndex: 2, pageCount: 3 }),
  { stepIndex: 2, pageIndex: 0 },
);
assert.equal(
  moveForward({ stepIndex: 8, stepCount: 9, pageIndex: 0, pageCount: 1 }),
  null,
  'there is nowhere forward from the last screen of the last step',
);
assert.deepEqual(
  moveBack({ stepIndex: 2, stepCount: 9, pageIndex: 0, pageCount: 2 }, 4),
  { stepIndex: 1, pageIndex: 3 },
  'going back a step lands on the last page of that step',
);
assert.deepEqual(
  moveBack({ stepIndex: 2, stepCount: 9, pageIndex: 1, pageCount: 2 }, 4),
  { stepIndex: 2, pageIndex: 0 },
);
assert.equal(
  moveBack({ stepIndex: 0, stepCount: 9, pageIndex: 0, pageCount: 1 }, 1),
  null,
);
assert.equal(
  canGoBack({ stepIndex: 0, stepCount: 9, pageIndex: 0, pageCount: 2 }),
  false,
);
assert.equal(
  canGoBack({ stepIndex: 0, stepCount: 9, pageIndex: 1, pageCount: 2 }),
  true,
);
assert.equal(
  isFinalScreen({ stepIndex: 8, stepCount: 9, pageIndex: 1, pageCount: 2 }),
  true,
);
assert.equal(
  isFinalScreen({ stepIndex: 8, stepCount: 9, pageIndex: 0, pageCount: 2 }),
  false,
);

/* The save indicator warns only where leaving would lose work. */

assert.equal(saveStateLabel({ kind: 'clean' }), 'All changes saved');
assert.equal(saveStateLabel({ kind: 'saving' }), 'Saving…');
assert.equal(saveStateLabel({ kind: 'failed', message: 'x' }), 'Save failed — retry');
assert.match(saveStateLabel({ kind: 'saved', at: '2026-08-01T12:36:00.000Z' }), /^Saved /);

assert.equal(hasUnsavedWork({ kind: 'clean' }), false);
assert.equal(
  hasUnsavedWork({ kind: 'saved', at: '2026-08-01T12:36:00.000Z' }),
  false,
  'a successful autosave must not leave a warning behind',
);
assert.equal(hasUnsavedWork({ kind: 'dirty' }), true);
assert.equal(hasUnsavedWork({ kind: 'failed', message: 'x' }), true);
assert.equal(hasUnsavedWork({ kind: 'saving' }), true);

/* A saved draft is never called complete. */

assert.equal(
  draftReadinessLabel({
    readinessSummary: { stageLabel: 'Measured audit ready', outstandingQuestionCount: 0 },
  }),
  'Measured audit ready',
);
assert.equal(
  draftReadinessLabel({
    readinessSummary: { stageLabel: 'File parsed', outstandingQuestionCount: 7 },
  }),
  'File parsed · 7 outstanding',
);

console.log('Bouwa guided-wizard state checks passed.');
