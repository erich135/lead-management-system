import assert from 'node:assert/strict';

import {
  canGoBack,
  clampPageIndex,
  draftReadinessLabel,
  evidenceGroups,
  fieldGroups,
  hasUnsavedWork,
  isFinalScreen,
  moveBack,
  moveForward,
  outstandingOnScreen,
  questionLocations,
  readinessLines,
  saveStateLabel,
  stepFieldViews,
  stepPages,
  unresolvedFields,
  WIZARD_FIELDS_PER_PAGE,
} from '../src/features/bouwa/wizard/wizardState.ts';
import {
  absenceCaution,
  machineEvidenceLines,
  machineEvidenceLink,
  sourceReference,
  specModelName,
} from '../src/features/bouwa/wizard/machineSelection.ts';
import type { WizardSpecRecord } from '../src/features/bouwa/wizard/wizardTypes.ts';
import { answerCitations } from '../src/features/bouwa/wizard/answerCitations.ts';
import {
  TARIFF_DEPENDENT_FIGURES,
  TARIFF_ROUTE_OPTIONS,
  nextCascadeStep,
  tariffDetailLines,
  tariffRateLines,
  tariffResultLine,
  tariffSnapshotLine,
} from '../src/features/bouwa/wizard/tariffSelection.ts';
import {
  CUSTOMER_SITE_SELECTOR_CODES,
  NO_FORMAL_SITE_RECORD,
  siteCandidates,
  siteOriginStatement,
} from '../src/features/bouwa/wizard/customerSiteSelection.ts';
import {
  answeredTextForCode,
  EQUIPMENT_TYPE_BY_SECTION,
  equipmentAnswersByCode,
  equipmentIntakeEntries,
} from '../src/features/bouwa/wizard/equipmentSelection.ts';
import {
  acceptedFormat,
  conceptForField,
  leadSentence,
  WIZARD_CONCEPTS,
} from '../src/features/bouwa/wizard/wizardHelp.ts';
import {
  investmentRunningTotal,
  PRICE_DEPENDENT_FIGURES,
  priceUnavailable,
  rands,
} from '../src/features/bouwa/wizard/investmentPresentation.ts';
import {
  finishActionLabel,
  reviewTriage,
} from '../src/features/bouwa/wizard/reviewTriage.ts';
import {
  placeFromPath,
  proposalPath,
} from '../src/features/bouwa/wizard/proposalRouting.ts';
import {
  addressBlock,
  documentStatusLine,
  investmentAmount,
  investmentRows,
  newVersionAction,
  longDate,
  proposalFilename,
} from '../src/features/bouwa/wizard/proposalDocumentPresentation.ts';
import {
  EVIDENCE_LEVEL_ORDER,
  EVIDENCE_LEVEL_SHORT,
  EVIDENCE_LEVEL_TONE,
  evidenceLevelSteps,
  nextLevelSentence,
  statementBody,
} from '../src/features/bouwa/wizard/evidenceLevelPresentation.ts';
import type {
  AuditFieldStatus,
  AuditFormField,
  AuditIntakeFormModel,
  AuditReadinessAssessment,
  IntakeAnswer,
} from '../src/features/bouwa/auditIntakeTypes.ts';
import type {
  WizardEquipment,
  WizardProposalDocument,
  WizardProposalDocumentVersion,
  WizardStep,
} from '../src/features/bouwa/wizard/wizardTypes.ts';

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
  true,
);

assert.deepEqual(
  views.map(view => view.field.code),
  ['AUDIT.TEST.C', 'AUDIT.TEST.A'],
  'the step keeps its own order and drops what no longer applies',
);
assert.equal(views[0].sourceDerived, true);
assert.equal(views[1].sourceDerived, false);

/* A source-derived question is only the file's to answer once a file was read. */

const periodStep = step({
  id: 'upload_audit',
  fieldCodes: ['AUDIT.PERIOD.START'],
  sourceDerivedFieldCodes: ['AUDIT.PERIOD.START'],
});
const periodModel = formModel({
  fields: [field({ code: 'AUDIT.PERIOD.START', path: 'identity.auditStartDate' })],
});
const periodReadiness = readiness({
  fieldStatuses: [status({ code: 'AUDIT.PERIOD.START', section: 'identity' })],
});

const beforeParse = stepFieldViews(periodStep, periodModel, periodReadiness, false);
assert.equal(
  beforeParse[0].sourceDerived,
  false,
  'the period may be entered before the record arrives',
);
assert.equal(
  outstandingOnScreen(beforeParse, () => null).length,
  1,
  'and while it can be entered, a blank one holds the step',
);

const afterParse = stepFieldViews(periodStep, periodModel, periodReadiness, true);
assert.equal(afterParse[0].sourceDerived, true);
assert.equal(
  outstandingOnScreen(afterParse, () => null).length,
  0,
  'a value only the file can state never holds a user on a screen',
);

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

/* Questions carry the heading of the section they belong to. */

const groupViews = stepFieldViews(
  step({ fieldCodes: ['AUDIT.T.ONE', 'AUDIT.T.TWO', 'AUDIT.I.ONE'] }),
  formModel({
    fields: [
      field({ code: 'AUDIT.T.ONE', path: 'tariff.one' }),
      field({ code: 'AUDIT.T.TWO', path: 'tariff.two' }),
      field({ code: 'AUDIT.I.ONE', path: 'investment.one' }),
    ],
  }),
  readiness({
    fieldStatuses: [
      status({ code: 'AUDIT.T.ONE', section: 'tariff' }),
      status({ code: 'AUDIT.T.TWO', section: 'tariff' }),
      status({ code: 'AUDIT.I.ONE', section: 'investment' }),
    ],
  }),
);
const sectionGroups = fieldGroups(groupViews, [
  { id: 'tariff', label: 'Electricity tariff' },
  { id: 'investment', label: 'Investment' },
]);
assert.equal(sectionGroups.length, 2);
assert.equal(sectionGroups[0].label, 'Electricity tariff');
assert.equal(sectionGroups[0].fields.length, 2);
assert.equal(sectionGroups[1].label, 'Investment');
assert.deepEqual(
  fieldGroups(groupViews, []).map(group => group.label),
  ['tariff', 'investment'],
  'a section with no stated label is named by its identifier rather than left blank',
);
assert.equal(fieldGroups([], []).length, 0);

/* Contextual help: the specific explanation wins over the general one. */

assert.equal(
  conceptForField('AUDIT.FLOW_SENSOR.FLOW_REFERENCE_BASIS')?.title,
  'Flow reference basis',
);
assert.equal(
  conceptForField('AUDIT.EXISTING_MACHINE.CONTROL_METHOD')?.title,
  'Control method',
);
assert.equal(
  conceptForField('AUDIT.PROPOSED_MACHINE.CONTROL_METHOD')?.title,
  'Why a VSD curve is required',
  'the proposed machine is where the part-load evidence is needed',
);
assert.equal(conceptForField('AUDIT.IDENTITY.CUSTOMER_NAME'), null);
for (const concept of WIZARD_CONCEPTS)
  assert.ok(
    concept.body.length > 80 && !/\bassume\b/i.test(concept.body),
    `${concept.title} explains rather than excuses`,
  );

/* ------------------------------------------------------------------ *
 * Every question says what it means, why it is asked, and what an
 * acceptable answer looks like
 *
 * The reason comes from the backend and is written for an engineer reading the
 * whole paragraph. What stays on the screen is its first clause; the rest waits
 * behind the question mark, and the accepted format sits beside the box.
 * ------------------------------------------------------------------ */

assert.equal(
  leadSentence(
    'The density correction is a function of ambient temperature as well as pressure; a winter morning and a summer afternoon are not the same intake condition.',
  ),
  'The density correction is a function of ambient temperature as well as pressure.',
  'the visible helper is one clause, not the whole engineering paragraph',
);
assert.equal(
  leadSentence('Fixes where the temperature was measured.'),
  'Fixes where the temperature was measured.',
  'a reason that is already one sentence is left exactly as written',
);
assert.equal(leadSentence('   '), '');

/* A number states its unit, and its limits where it has them, before a rep
   discovers them by being refused. */
assert.equal(
  acceptedFormat({
    code: 'AUDIT.SITE.AMBIENT_TEMPERATURE',
    valueKind: 'number',
    unit: 'K',
    entry: { unit: '°C', minimum: -50, maximum: 60 },
  }),
  'A number between -50 and 60, in °C',
);
assert.equal(
  acceptedFormat({
    code: 'AUDIT.FLOW_SENSOR.PIPE_DIAMETER_MM',
    valueKind: 'number',
    unit: 'mm',
    entry: null,
  }),
  'A number, in mm',
);
assert.equal(
  acceptedFormat({
    code: 'AUDIT.TARIFF.TARIFF_YEAR',
    valueKind: 'integer',
    unit: null,
    entry: null,
  }),
  'The tariff year the schedule was published for. For example 2026',
  'a written example beats the shape of the field where one exists',
);
assert.equal(
  acceptedFormat({
    code: 'AUDIT.IDENTITY.GPS_REFERENCE',
    valueKind: 'text',
    unit: null,
    entry: null,
  }),
  'Decimal degrees, latitude first. For example -26.204103, 28.047305',
);
assert.equal(
  acceptedFormat({
    code: 'AUDIT.TEMPERATURE_SENSOR.UNIT',
    valueKind: 'selection',
    unit: null,
    entry: null,
  }),
  'Choose one of the listed values',
);
assert.equal(
  acceptedFormat({
    code: 'AUDIT.IDENTITY.AUDIT_START_DATE',
    valueKind: 'date',
    unit: null,
    entry: null,
  }),
  'A calendar date, chosen from the picker',
);
assert.equal(
  acceptedFormat({
    code: 'AUDIT.IDENTITY.CUSTOMER_NAME',
    valueKind: 'text',
    unit: null,
    entry: null,
  }),
  null,
  'a name needs no format explaining to anybody',
);

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

/* ------------------------------------------------------------------ *
 * Citing a machine, and showing where each answer came from
 *
 * Which questions a library record answers is decided by the server and is
 * proved by the backend suite. What is checked here is the part the browser
 * still owns: how a source reads on the page, and whether a rep can tell a
 * manufacturer's figure from a rep's own.
 * ------------------------------------------------------------------ */

type SpecRecord = WizardSpecRecord;

/** A record holding nothing but the identity fields every record has. */
function bareRecord(overrides: Partial<SpecRecord> = {}): SpecRecord {
  return {
    recordId: 'record-1',
    recordVersion: 1,
    libraryKey: 'atlas-copco|ga55-125ap|v-none|p8.62',
    manufacturer: 'Atlas Copco',
    model: 'GA55-125AP',
    modelVariant: null,
    equipmentType: 'air_compressor',
    compressorType: null,
    controlMethod: null,
    ratedPressureBarG: null,
    ratedFadM3PerMin: null,
    flowReferenceBasis: null,
    packageInputPowerKw: null,
    motorShaftPowerKw: null,
    motorEfficiencyFraction: null,
    specificPowerKwPerM3PerMin: null,
    vsdMinimumFlowM3PerMin: null,
    vsdMaximumFlowM3PerMin: null,
    partLoadPoints: [],
    referenceAbsolutePressurePa: null,
    referenceTemperatureK: null,
    referenceHumidityBasis: null,
    referenceStandardDefinition: null,
    allowableAmbientMinimumC: null,
    allowableAmbientMaximumC: null,
    deratingTableStatus: 'unknown',
    source: {
      sourceType: 'cagi_verified_datasheet',
      sourceDocumentId: 'doc-1',
      sourceTitle: 'GA55 CAGI data sheet',
      sourceOrganisation: 'Atlas Copco',
      sourceVersion: null,
      sourceDate: null,
      sourcePageReference: null,
      sourceUrl: null,
      sourceFileName: null,
      sourceSha256: null,
    },
    summary: '9.06 m³/min · 8.6 bar(g)',
    absentPublishedValues: [],
    unsupportedOutputs: [],
    ...overrides,
  } as SpecRecord;
}

/* A source is cited by title and organisation, and a version is preferred to a
   date, because two sheets a month apart are told apart by their version. */
assert.equal(
  sourceReference(bareRecord()),
  'GA55 CAGI data sheet — Atlas Copco',
);
assert.equal(
  sourceReference(
    bareRecord({
      source: {
        ...bareRecord().source,
        sourceTitle: 'CAGI rotary directory',
        sourceOrganisation: 'Compressed Air and Gas Institute',
        sourceVersion: '8-23',
        sourceDate: '2023-08-01',
      },
    }),
  ),
  'CAGI rotary directory — Compressed Air and Gas Institute — version 8-23',
);

/* The variant is part of what the machine is called: the library files GA55
   and GA55 FF apart, and the wizard asks for one model. */
assert.equal(specModelName(bareRecord()), 'GA55-125AP');
assert.equal(
  specModelName(bareRecord({ modelVariant: 'FF' })),
  'GA55-125AP FF',
);

/* A thin record stays choosable, and says what choosing it will cost. */
assert.equal(absenceCaution(bareRecord()), null);
assert.equal(
  absenceCaution(
    bareRecord({
      absentPublishedValues: ['Package input power', 'Control method'],
    }),
  ),
  'Not published: Package input power, Control method.',
);

/* ------------------------------------------------------------------ *
 * The manufacturer evidence is shown, never asked for
 * ------------------------------------------------------------------ */

function snapshotOf(source: Partial<WizardSpecRecord['source']> = {}) {
  return {
    recordId: 'rec-1',
    recordVersion: 1,
    libraryKey: 'atlas-copco|ga55-125ap',
    contentFingerprint: 'abc',
    source: { ...bareRecord().source, ...source },
    values: {},
    takenAt: '2026-08-01T00:00:00.000Z',
    takenByUserId: 'user-1',
  } as unknown as Parameters<typeof machineEvidenceLines>[0];
}

/* The rep reads the document the figures actually came from, in the words a
   customer would recognise rather than the code the library files it under. */
assert.deepEqual(machineEvidenceLines(snapshotOf()), [
  { label: 'Source type', value: 'CAGI verified data sheet' },
  { label: 'Document', value: 'GA55 CAGI data sheet' },
  { label: 'Published by', value: 'Atlas Copco' },
  { label: 'Version or date', value: 'No version or date published' },
]);

/* A version identifies a sheet where a date cannot: two sheets a month apart
   carry the same year. The page is offered where the source gave one. */
assert.deepEqual(
  machineEvidenceLines(
    snapshotOf({ sourceVersion: '8-23', sourcePageReference: 'p. 4' }),
  ).slice(3),
  [
    { label: 'Version or date', value: 'Version 8-23' },
    { label: 'Page', value: 'p. 4' },
  ],
);

/* A directory line held only on disk has nowhere to send anybody, and a dead
   "View document" link is worse than none. */
assert.equal(machineEvidenceLink(snapshotOf()), null);
assert.equal(
  machineEvidenceLink(snapshotOf({ sourceUrl: 'https://example.org/ga55.pdf' })),
  'https://example.org/ga55.pdf',
);

/* ------------------------------------------------------------------ *
 * A question shows where its answer came from
 * ------------------------------------------------------------------ */

const provenanceStep = {
  id: 'proposed_solution',
  fieldCodes: [
    'AUDIT.PROPOSED_MACHINE.RATED_FAD',
    'AUDIT.PROPOSED_MACHINE.MOTOR_EFFICIENCY',
    'AUDIT.PROPOSED_MACHINE.RATED_PRESSURE',
  ],
  sourceDerivedFieldCodes: [],
} as unknown as Parameters<typeof stepFieldViews>[0];

const provenanceModel = {
  sections: [],
  fields: [
    {
      code: 'AUDIT.PROPOSED_MACHINE.RATED_FAD',
      path: 'proposedMachine.ratedFadM3PerMin',
      valueKind: 'number',
      unit: 'm³/min',
      options: [],
      permittedAnswerStates: ['answered'],
    },
    {
      code: 'AUDIT.PROPOSED_MACHINE.MOTOR_EFFICIENCY',
      path: 'proposedMachine.motorEfficiency',
      valueKind: 'number',
      unit: 'fraction',
      options: [],
      permittedAnswerStates: ['answered'],
    },
    {
      code: 'AUDIT.PROPOSED_MACHINE.RATED_PRESSURE',
      path: 'proposedMachine.ratedDischargePressureBarG',
      valueKind: 'number',
      unit: 'bar(g)',
      options: [],
      permittedAnswerStates: ['answered'],
    },
  ],
} as unknown as Parameters<typeof stepFieldViews>[1];

const provenanceReadiness = {
  fieldStatuses: provenanceModel.fields.map(field => ({
    code: field.code,
    applicable: true,
    status: 'confirmed',
    section: 'proposed_machine',
    label: field.code,
    whyItMatters: '',
    message: '',
  })),
} as unknown as Parameters<typeof stepFieldViews>[2];

const fromSource = {
  origin: 'populated_from_source' as const,
  sourceKind: 'machine_spec_library' as const,
  sourceLabel: 'GA55 CAGI data sheet — Atlas Copco',
  sourceRecordId: 'record-1',
  sourceRecordVersion: 1,
  sourceDocumentId: 'doc-1',
  sourceValue: 9.06,
  reason: null,
  byUserId: 'user-rep',
  byName: 'Rae Rep',
  at: '2026-08-01T09:00:00.000Z',
};

const provenanceViews = stepFieldViews(
  provenanceStep,
  provenanceModel,
  provenanceReadiness,
  false,
  {
    'proposedMachine.ratedFadM3PerMin': fromSource,
    'proposedMachine.motorEfficiency': {
      ...fromSource,
      origin: 'not_published_by_source',
      sourceValue: null,
    },
  },
);

const byPath = new Map(
  provenanceViews.map(view => [view.field.path, view.provenance]),
);

assert.equal(
  byPath.get('proposedMachine.ratedFadM3PerMin')?.origin,
  'populated_from_source',
  'a value the manufacturer published says so on the question itself',
);
assert.equal(
  byPath.get('proposedMachine.ratedFadM3PerMin')?.sourceValue,
  9.06,
  'the published figure travels with the question, so a change can show both',
);
assert.equal(
  byPath.get('proposedMachine.motorEfficiency')?.origin,
  'not_published_by_source',
  'a gap the manufacturer left is distinguished from one the rep left',
);
assert.equal(
  byPath.get('proposedMachine.ratedDischargePressureBarG'),
  null,
  'a question nobody cited a source for carries no provenance at all',
);

/* The site list offers what ARS evidences and nothing it does not. */

const sites = siteCandidates(
  { customerId: 'c1', customerName: 'Acme', address: ' 14 Mill Road ' },
  [
    { _id: 'm1', currentLocation: 'Plant 2' },
    { _id: 'm2', currentLocation: 'plant 2' },
    { _id: 'm3', currentLocation: '   ' },
    { _id: 'm4', currentLocation: '14 Mill Road' },
  ] as Parameters<typeof siteCandidates>[1],
);

assert.deepEqual(
  sites.map(site => [site.siteName, site.origin]),
  [
    ['14 Mill Road', 'customer_address'],
    ['Plant 2', 'machine_location'],
  ],
  'the address and each distinct machine location appear once each',
);
assert.equal(
  sites[1].address,
  null,
  'a machine location is a place name, not an address ARS has verified',
);
assert.deepEqual(
  siteCandidates(
    { customerId: 'c1', customerName: 'Acme', address: null },
    [] as Parameters<typeof siteCandidates>[1],
  ),
  [],
  'where ARS evidences no site, none is offered rather than one invented',
);

/* And the site record question is answered honestly rather than left blank. */

assert.equal(
  siteOriginStatement('customer_address'),
  'From the ARS customer address',
);
assert.equal(
  siteOriginStatement('machine_location'),
  'From a machine location on the ARS register',
);
assert.equal(
  siteOriginStatement('typed_for_this_proposal'),
  'Typed for this proposal',
);
assert.equal(NO_FORMAL_SITE_RECORD, 'No formal ARS site record');
assert.ok(
  CUSTOMER_SITE_SELECTOR_CODES.includes('AUDIT.IDENTITY.SITE_ID'),
  'the site record is settled by the picker, so it is never shown as a box for a rep to type an identifier into',
);

/* A catalogued instrument fills what the catalogue records about it. */

const sensorFields: AuditFormField[] = [
  field({ code: 'AUDIT.FLOW_SENSOR.MANUFACTURER', path: 'flowSensor.manufacturer' }),
  field({ code: 'AUDIT.FLOW_SENSOR.MODEL', path: 'flowSensor.model' }),
  field({ code: 'AUDIT.FLOW_SENSOR.SERIAL_NUMBER', path: 'flowSensor.serialNumber' }),
  field({
    code: 'AUDIT.FLOW_SENSOR.RANGE_MINIMUM',
    path: 'flowSensor.measuringRangeMinimumM3PerMin',
  }),
  field({
    code: 'AUDIT.FLOW_SENSOR.RANGE_MAXIMUM',
    path: 'flowSensor.measuringRangeMaximumM3PerMin',
  }),
  field({
    code: 'AUDIT.FLOW_SENSOR.CONFIGURED_LOW_FLOW_CUTOFF',
    path: 'flowSensor.configuredLowFlowCutOffM3PerMin',
  }),
  field({
    code: 'AUDIT.FLOW_SENSOR.FLOW_REFERENCE_BASIS',
    path: 'flowSensor.flowReferenceBasis',
  }),
  field({
    code: 'AUDIT.FLOW_SENSOR.INSTALLATION_POSITION',
    path: 'flowSensor.installationPosition',
  }),
];

function equipment(
  overrides: Partial<WizardEquipment>,
): WizardEquipment {
  return {
    equipmentId: 'eq-1',
    equipmentType: 'flow_sensor',
    manufacturer: 'CS Instruments',
    model: 'VA 570',
    serialNumber: 'CS-99120',
    hardwareVersion: null,
    softwareVersion: null,
    configurationVersion: null,
    measuringRange: { minimum: 0.2, maximum: 12, unit: 'm³/min' },
    referenceBasis: 'free_air_delivery',
    configuredLowFlowCutoffM3PerMin: 0.15,
    calibrationDate: '2026-02-11',
    calibrationCertificateReference: 'CAL-7781',
    evidenceReference: null,
    notes: null,
    isActive: true,
    ...overrides,
  };
}

const sensorEntries = new Map(
  equipmentIntakeEntries(equipment({}), sensorFields),
);

assert.equal(sensorEntries.get('flowSensor.manufacturer')?.value, 'CS Instruments');
assert.equal(sensorEntries.get('flowSensor.serialNumber')?.value, 'CS-99120');
assert.equal(
  sensorEntries.get('flowSensor.measuringRangeMaximumM3PerMin')?.value,
  12,
);
assert.equal(
  sensorEntries.get('flowSensor.configuredLowFlowCutOffM3PerMin')?.value,
  0.15,
);
assert.equal(
  sensorEntries.get('flowSensor.flowReferenceBasis')?.value,
  'free_air_delivery',
);
assert.equal(
  sensorEntries.has('flowSensor.installationPosition'),
  false,
  'where the instrument was fitted is a fact about the site visit, not the instrument',
);

/* A range in the wrong unit answers nothing rather than being converted. */

const barRange = new Map(
  equipmentIntakeEntries(
    equipment({ measuringRange: { minimum: 0, maximum: 16, unit: 'bar' } }),
    sensorFields,
  ),
);
assert.equal(
  barRange.has('flowSensor.measuringRangeMaximumM3PerMin'),
  false,
  'a pressure range states nothing about a flow range',
);
assert.equal(barRange.get('flowSensor.manufacturer')?.value, 'CS Instruments');

/* A logger answers under the logger codes, and has no flow basis to state. */

const loggerCodes = [
  ...equipmentAnswersByCode(
    equipment({ equipmentType: 'flow_logger', configurationVersion: 'cfg-4' }),
  ).keys(),
];
assert.ok(loggerCodes.includes('AUDIT.LOGGER.MANUFACTURER'));
assert.ok(loggerCodes.includes('AUDIT.LOGGER.CONFIGURATION_VERSION'));
assert.equal(
  loggerCodes.some(code => code.includes('FLOW_REFERENCE_BASIS')),
  false,
  'a logger is not the instrument that states the flow basis',
);
assert.equal(
  loggerCodes.some(code => code.includes('RANGE_')),
  false,
  'the catalogue states no unit a logger measures in',
);

/* Nothing empty is ever recorded as an answer. */

const sparse = equipmentAnswersByCode(
  equipment({
    serialNumber: '   ',
    calibrationDate: null,
    referenceBasis: null,
    configuredLowFlowCutoffM3PerMin: null,
  }),
);
assert.equal(sparse.has('AUDIT.FLOW_SENSOR.SERIAL_NUMBER'), false);
assert.equal(sparse.has('AUDIT.FLOW_SENSOR.CALIBRATION_DATE'), false);
assert.equal(sparse.has('AUDIT.FLOW_SENSOR.FLOW_REFERENCE_BASIS'), false);
assert.equal(
  sparse.has('AUDIT.FLOW_SENSOR.CONFIGURED_LOW_FLOW_CUTOFF'),
  false,
  'no configured cutoff is not a cutoff of zero',
);

/* A cutoff of zero is a stated cutoff and must survive. */

assert.equal(
  equipmentAnswersByCode(
    equipment({ configuredLowFlowCutoffM3PerMin: 0 }),
  ).get('AUDIT.FLOW_SENSOR.CONFIGURED_LOW_FLOW_CUTOFF'),
  0,
);

/* Only an outright answer marks a catalogue entry as the one in use. */

const sensorAnswers = new Map<string, IntakeAnswer<unknown>>([
  ['flowSensor.serialNumber', { state: 'answered', value: 'CS-99120', note: null }],
  [
    'flowSensor.model',
    { state: 'unknown_confirmation_required', value: null, note: null },
  ],
]);
const sensorAnswerAt = (path: string) => sensorAnswers.get(path) ?? null;

assert.equal(
  answeredTextForCode(
    sensorFields,
    'AUDIT.FLOW_SENSOR.SERIAL_NUMBER',
    sensorAnswerAt,
  ),
  'CS-99120',
);
assert.equal(
  answeredTextForCode(sensorFields, 'AUDIT.FLOW_SENSOR.MODEL', sensorAnswerAt),
  null,
  '"unknown" is a refusal to state a value, not a value',
);
assert.equal(
  answeredTextForCode(sensorFields, 'AUDIT.LOGGER.MODEL', sensorAnswerAt),
  null,
);

assert.equal(EQUIPMENT_TYPE_BY_SECTION.logger, 'flow_logger');
assert.equal(EQUIPMENT_TYPE_BY_SECTION.pressure_sensor, 'pressure_sensor');
assert.equal(EQUIPMENT_TYPE_BY_SECTION.identity, undefined);

/* ------------------------------------------------------------------ *
 * Advanced Technical Review states both figures
 *
 * A rep may restate a manufacturer's value, and the proposal has to be able to
 * show a reader what was published and what this proposal says instead. That is
 * the whole reason an override carries a reason and a name.
 * ------------------------------------------------------------------ */

const citationModel = {
  sections: [],
  fields: [
    {
      code: 'AUDIT.PROPOSED_MACHINE.RATED_FAD',
      path: 'proposedMachine.ratedFadM3PerMin',
      valueKind: 'number',
      unit: 'm³/min',
      options: [],
      permittedAnswerStates: ['answered'],
    },
    {
      code: 'AUDIT.PROPOSED_MACHINE.MOTOR_EFFICIENCY',
      path: 'proposedMachine.motorEfficiency',
      valueKind: 'number',
      unit: 'fraction',
      options: [],
      permittedAnswerStates: ['answered'],
    },
  ],
  outputs: [],
} as unknown as AuditIntakeFormModel;

const citationStatuses: AuditFieldStatus[] = [
  status({
    code: 'AUDIT.PROPOSED_MACHINE.RATED_FAD',
    label: 'Proposed rated free air delivery',
  }),
  status({
    code: 'AUDIT.PROPOSED_MACHINE.MOTOR_EFFICIENCY',
    label: 'Proposed motor efficiency',
  }),
];

const citationAnswers = new Map<string, IntakeAnswer<unknown>>([
  [
    'proposedMachine.ratedFadM3PerMin',
    { state: 'answered', value: 8.5, note: null },
  ],
  ['proposedMachine.motorEfficiency', { state: 'missing', value: null, note: null }],
]);
const citationAnswerAt = (path: string) => citationAnswers.get(path) ?? null;

const cited = answerCitations(citationModel, citationStatuses, citationAnswerAt, {
  'proposedMachine.ratedFadM3PerMin': {
    ...fromSource,
    origin: 'changed_for_this_proposal',
    sourceValue: 9.06,
    reason: 'Site altitude derating agreed with Atlas Copco',
  },
  'proposedMachine.motorEfficiency': {
    ...fromSource,
    origin: 'not_published_by_source',
    sourceValue: null,
  },
});

assert.equal(
  cited[0]?.code,
  'AUDIT.PROPOSED_MACHINE.RATED_FAD',
  'a restated value is met before an agreed one, because it is what a reviewer came for',
);
assert.equal(cited[0]?.label, 'Proposed rated free air delivery');
assert.equal(
  cited[0]?.provenance.sourceValue,
  9.06,
  'what the manufacturer published survives the change',
);
assert.equal(
  cited[0]?.proposalValue,
  '8.5',
  'and what this proposal says stands beside it',
);
assert.equal(
  cited[1]?.proposalValue,
  'Not answered',
  'a gap the source left is still a gap, and is not dressed up as a value',
);
assert.equal(
  answerCitations(citationModel, citationStatuses, citationAnswerAt, {}).length,
  0,
  'a proposal that cited nothing shows no citation table at all',
);

/* ------------------------------------------------------------------ *
 * The tariff cascade
 * ------------------------------------------------------------------ */

assert.equal(
  nextCascadeStep({}, {}),
  'supplier',
  'a rep is asked who bills the site before anything else',
);
assert.equal(
  nextCascadeStep(
    { supplier: 'Eskom' },
    { customerCategory: [{ value: 'Large power user', count: 12 }] },
  ),
  'voltageCategory',
  'a step with only one possible answer is not put to the user',
);
assert.equal(
  nextCascadeStep(
    { supplier: 'Eskom' },
    {
      customerCategory: [
        { value: 'Large power user', count: 12 },
        { value: 'Rural', count: 4 },
      ],
    },
  ),
  'customerCategory',
  'a step with a real choice is asked',
);
assert.equal(
  nextCascadeStep(
    {
      supplier: 'Eskom',
      customerCategory: 'Large power user',
      voltageCategory: '>=500V & <66kV',
      transmissionZone: '<=300 km',
    },
    {},
  ),
  null,
  'once the register is narrowed to its own terms there is nothing left to ask',
);

const tariffRecord = {
  recordId: 'megaflex-2026',
  tariffKey: 'eskom::megaflex',
  recordVersion: 1,
  status: 'active',
  supplier: 'Eskom',
  supplierType: 'national_utility',
  supplierTypeLabel: 'National utility',
  province: null,
  tariffName: 'Megaflex <=300 km <66kV',
  tariffCode: null,
  direction: 'supply',
  customerCategory: 'Large power user',
  voltageCategory: '>=500V & <66kV',
  transmissionZone: '<=300 km',
  energyChargeType: 'time_of_use',
  currency: 'ZAR',
  vatBasis: 'not_published',
  effectiveFrom: '2026-04-01',
  effectiveTo: '2027-04-01',
  tariffYearLabel: '2026/27',
  periods: [
    {
      periodStart: '2026-04-01',
      periodEnd: '2027-04-01',
      standardRateRandPerKwh: 1.4,
      peakRateRandPerKwh: null,
      offPeakRateRandPerKwh: null,
      fixedMonthlyChargeRand: null,
      demandChargeRand: null,
      demandChargeBaseUnit: null,
    },
  ],
  confirmationStatus: 'published_not_confirmed',
  source: {
    sourceType: 'retained_tariff_register',
    sourceDocumentId: 'register-1',
    sourceTitle: 'Retained tariff register',
    sourceOrganisation: 'Eskom',
    sourceUrl: null,
    sourceDate: null,
    sourceFileName: null,
    sourceSha256: null,
    sourceNotes: null,
  },
  summary: 'Eskom Megaflex · time of use',
  absentPublishedValues: [],
  unsupportedOutputs: [],
} as unknown as Parameters<typeof tariffDetailLines>[0];

assert.equal(
  tariffResultLine(tariffRecord),
  'Eskom · Megaflex <=300 km <66kV · <=300 km · 2026/27',
  'a tariff reads as its supplier, name, zone and determination year',
);

const tariffLines = new Map(
  tariffDetailLines(tariffRecord).map(line => [line.label, line.value]),
);
assert.equal(
  tariffLines.get('Tariff code'),
  'Not stated by the source',
  'a value the register did not print says so, rather than reading blank',
);
assert.equal(
  tariffLines.get('VAT basis'),
  'Not stated by the source — confirm from the bill',
  'a missing VAT basis is a question, not an assumption of excluding VAT',
);
assert.equal(tariffLines.get('Supply authority'), 'National utility');

const rateLines = tariffRateLines(tariffRecord.periods);
assert.equal(rateLines.length, 1, 'only the rates the source published appear');
assert.equal(rateLines[0]?.value, 'R 1.4000 / kWh');
assert.deepEqual(
  tariffRateLines([
    {
      periodStart: '2026-04-01',
      periodEnd: '2027-04-01',
      standardRateRandPerKwh: null,
      peakRateRandPerKwh: null,
      offPeakRateRandPerKwh: null,
      fixedMonthlyChargeRand: null,
      demandChargeRand: null,
      demandChargeBaseUnit: null,
    },
  ]),
  [],
  'a determination with no published rate shows none, rather than zero',
);

assert.equal(
  tariffSnapshotLine({
    values: {
      supplier: 'Eskom',
      tariffName: 'Megaflex <=300 km <66kV',
      tariffYearLabel: '2026/27',
      effectiveFrom: '2026-04-01',
      effectiveTo: '2027-04-01',
      periods: [],
    },
  } as unknown as Parameters<typeof tariffSnapshotLine>[0]),
  'Eskom · Megaflex <=300 km <66kV · 2026/27',
);

assert.deepEqual(
  TARIFF_DEPENDENT_FIGURES,
  [
    'Annual electricity cost',
    'Rand saving',
    'Simple payback',
    'Return on investment',
  ],
  'what a missing tariff costs the proposal is named in the customer’s language',
);
assert.equal(
  TARIFF_ROUTE_OPTIONS.filter(option => option.id === 'not_available_yet')
    .length,
  1,
  '"not available yet" is offered as a real answer rather than a dead end',
);

/* ------------------------------------------------------------------ *
 * The investment adds up on screen the way the backend adds it up
 * ------------------------------------------------------------------ */

function money(value: number | null): IntakeAnswer<unknown> {
  return value === null
    ? { state: 'unanswered', value: null, note: null }
    : { state: 'answered', value, note: null };
}

const pricedAnswers = new Map<string, IntakeAnswer<unknown>>([
  [
    'investment.pricingStatus',
    { state: 'answered', value: 'ars_quotation', note: null },
  ],
  ['investment.unitPriceRand', money(984810)],
  ['investment.quantity', money(2)],
  ['investment.installationRand', money(300000)],
  ['investment.electricalWorkRand', money(158240)],
  ['investment.buyBackRand', money(130000)],
]);
const pricedAnswerAt = (path: string) => pricedAnswers.get(path) ?? null;

const running = investmentRunningTotal(pricedAnswerAt);
assert.equal(
  running.equipmentSubtotalRand,
  1969620,
  'the equipment subtotal is the unit price taken the number of times it is bought',
);
assert.equal(
  running.additionalCostsRand,
  458240,
  'installation and electrical work are additions, not part of the machine price',
);
assert.equal(running.creditsRand, 130000, 'a buy-back comes off, never on');
assert.equal(
  running.netInitialInvestmentRand,
  2297860,
  'the running total matches what the backend schedule produces from the same figures',
);
assert.deepEqual(
  running.notIncluded,
  [
    'Piping and mechanical work',
    'Delivery',
    'Commissioning',
    'Refurbishment',
    'Other approved costs',
    'Discount',
  ],
  'a line left blank is reported as not included rather than counted as zero',
);
assert.equal(
  investmentRunningTotal(path =>
    path === 'investment.unitPriceRand' ? null : pricedAnswerAt(path),
  ).netInitialInvestmentRand,
  null,
  'no net investment is shown while the price of the thing itself is unknown',
);

assert.equal(priceUnavailable(pricedAnswerAt), false);
assert.equal(
  priceUnavailable(() => ({
    state: 'answered',
    value: 'price_not_available_yet',
    note: null,
  })),
  true,
  'a rep who has no price yet is recognised, so the panel can say what waits on it',
);
assert.equal(
  rands(2297860).replace(/[^\d]/g, ''),
  '2297860',
  'a rand figure is grouped for reading without losing or gaining a digit',
);
assert.ok(rands(2297860).startsWith('R'), 'money is shown as rands');
assert.equal(
  rands(null),
  'Not entered yet',
  'an unentered figure says so rather than reading as nothing owed',
);
assert.deepEqual(
  PRICE_DEPENDENT_FIGURES,
  ['Net investment', 'Simple payback', 'Return on investment'],
  'what an unpriced proposal cannot state is named plainly',
);

/* ------------------------------------------------------------------ *
 * The evidence level reads as a claim about evidence, never about accuracy
 * ------------------------------------------------------------------ */

function levelAssessment(
  level: 'preliminary' | 'engineering' | 'audit_backed' | 'commercially_complete',
  next: 'engineering' | 'audit_backed' | 'commercially_complete' | null,
  reasons: string[],
) {
  return {
    level,
    label: level,
    statement: 'Supplied by the server.',
    levels: EVIDENCE_LEVEL_ORDER.map(entry => ({
      level: entry,
      label: entry,
      met: EVIDENCE_LEVEL_ORDER.indexOf(entry) <= EVIDENCE_LEVEL_ORDER.indexOf(level),
      outstandingOutputs: [],
      blockingFieldCodes: [],
    })),
    nextLevel: next,
    nextLevelLabel: next,
    toReachNextLevel: reasons,
    blockingFieldCodesForNextLevel: [],
  } as Parameters<typeof nextLevelSentence>[0];
}

assert.equal(
  nextLevelSentence(
    levelAssessment('audit_backed', 'commercially_complete', [
      'Annual electricity cost: no confirmed tariff',
      'Simple payback: no price',
    ]),
  ),
  'To reach commercially_complete: no confirmed tariff, and 1 more like it.',
  'a rep is told the first thing standing in the way, and how many follow',
);
assert.equal(
  nextLevelSentence(
    levelAssessment('preliminary', 'engineering', [
      'Engineering comparison: Customer record has not been answered. Links this audit to the existing ARS customer record.',
      'Proposed-machine model: Customer record has not been answered. Links this audit to the existing ARS customer record.',
    ]),
  ),
  'To reach engineering: Customer record has not been answered.',
  'the guidance behind a question is left on the question, and one gap is counted once',
);
const named = {
  ...levelAssessment('preliminary', 'engineering', []),
  label: 'Preliminary',
  statement: 'Preliminary. It rests on what has been answered so far.',
};
assert.equal(
  statementBody(named),
  'It rests on what has been answered so far.',
  'the level is not named twice where a badge already carries it',
);
assert.equal(
  statementBody({ ...named, statement: 'It rests on what was answered.' }),
  'It rests on what was answered.',
  'a statement that does not open with the level is left as the server wrote it',
);
assert.equal(
  nextLevelSentence(levelAssessment('commercially_complete', null, [])),
  null,
  'a proposal at the top level is not nagged about a level above it',
);

for (const phrase of Object.values(EVIDENCE_LEVEL_SHORT))
  assert.ok(
    !/100 ?%|guarantee|exact/i.test(phrase),
    `"${phrase}" must not claim accuracy`,
  );
assert.equal(
  Object.keys(EVIDENCE_LEVEL_TONE).length,
  EVIDENCE_LEVEL_ORDER.length,
  'every level a proposal can hold has a way of being shown',
);

const strip = evidenceLevelSteps(
  levelAssessment('engineering', 'audit_backed', ['Annualised demand: nothing logged']),
);
assert.deepEqual(
  strip.map(entry => entry.held),
  [false, true, false, false],
  'the strip marks the level the proposal actually holds',
);

/* ------------------------------------------------------------------ *
 * The review page separates what a rep can do from what they cannot
 * ------------------------------------------------------------------ */

const triageSteps: WizardStep[] = [
  step({
    id: 'tariff_investment',
    title: 'Tariff and investment',
    fieldCodes: ['AUDIT.TARIFF.SUPPLIER', 'AUDIT.INVESTMENT.UNIT_PRICE'],
  }),
];
const triageModel = formModel({
  fields: [
    field({ code: 'AUDIT.TARIFF.SUPPLIER', path: 'tariff.supplier' }),
    field({
      code: 'AUDIT.INVESTMENT.UNIT_PRICE',
      path: 'investment.unitPriceRand',
    }),
  ],
  outputs: [
    { id: 'engineering_comparison', label: 'Engineering comparison' },
  ] as AuditIntakeFormModel['outputs'],
});
const triageReadiness = {
  ...readiness({
    fieldStatuses: [
      status({ code: 'AUDIT.TARIFF.SUPPLIER', section: 'tariff', label: 'Supplier' }),
      status({
        code: 'AUDIT.INVESTMENT.UNIT_PRICE',
        section: 'investment',
        label: 'Unit price',
      }),
    ],
  }),
  permittedOutputs: ['engineering_comparison'],
  blockedOutputs: [
    {
      outputId: 'measured_demand',
      label: 'Measured demand',
      requiredStage: 'measured_audit_ready',
      blockingFieldCodes: [],
      reasons: ['This is a manual proposal, so nothing was logged.'],
      applicableToProposalType: false,
    },
    {
      outputId: 'annual_electricity_cost',
      label: 'Annual electricity cost',
      requiredStage: 'commercial_proposal_ready',
      blockingFieldCodes: ['AUDIT.TARIFF.SUPPLIER'],
      reasons: ['Supplier has not been answered.'],
      applicableToProposalType: true,
    },
    {
      outputId: 'site_corrected_capacity',
      label: 'Site-corrected capacity',
      requiredStage: 'engineering_comparison_ready',
      blockingFieldCodes: ['AUDIT.SITE.ALTITUDE'],
      reasons: ['CALC-049 has no accepted production implementation.'],
      applicableToProposalType: true,
    },
  ],
} as unknown as Parameters<typeof reviewTriage>[0];

const triageLocations = questionLocations(
  triageSteps,
  triageModel,
  triageReadiness as unknown as AuditReadinessAssessment,
  false,
);
assert.equal(
  triageLocations.get('AUDIT.TARIFF.SUPPLIER')?.stepTitle,
  'Tariff and investment',
  'a question is located on the step that actually asks it',
);

const triaged = reviewTriage(
  triageReadiness,
  triageModel as unknown as Parameters<typeof reviewTriage>[1],
  triageLocations,
);

assert.deepEqual(
  triaged.notApplicable.map(entry => entry.outputId),
  ['measured_demand'],
  'a figure this kind of proposal never produces is not listed as a gap',
);
assert.deepEqual(
  triaged.outstanding.map(entry => entry.outputId),
  ['annual_electricity_cost'],
  'only a figure the rep can release from a question they can reach is outstanding',
);
assert.deepEqual(
  triaged.waiting.map(entry => entry.outputId),
  ['site_corrected_capacity'],
  'a figure waiting on a calculation nobody has accepted is not the rep’s to fix',
);
assert.match(
  triaged.outstanding[0]?.reason ?? '',
  /^One question stands/,
  'an outstanding figure says how far off it is, and lets the buttons name the questions',
);
assert.ok(
  !(triaged.outstanding[0]?.reason ?? '').includes('so results are not stored'),
  'the guidance for a question is not repeated beside the button that opens it',
);
assert.deepEqual(
  triaged.outstanding[0]?.fixes.map(fix => ({
    code: fix.code,
    stepId: fix.stepId,
    pageIndex: fix.pageIndex,
  })),
  [
    {
      code: 'AUDIT.TARIFF.SUPPLIER',
      stepId: 'tariff_investment',
      pageIndex: 0,
    },
  ],
  '"Fix now" points at the exact page the question is asked on',
);

assert.equal(
  finishActionLabel(triaged, true).label,
  'Preview proposal',
  'the last button says what it does',
);
assert.equal(
  finishActionLabel(triaged, false).label,
  'Save and close',
  'without a preview to open, the button does not promise one',
);
const nothingReleased = finishActionLabel(
  { available: [], outstanding: [], waiting: [], notApplicable: [] },
  true,
);
assert.equal(
  nothingReleased.label,
  'Preview proposal',
  'a proposal with no released figure is still a proposal a rep can show',
);
assert.match(
  nothingReleased.detail,
  /preliminary/i,
  'the rep is told what kind of document they are about to open',
);
assert.equal(
  finishActionLabel(triaged, false).detail,
  'Your answers are already saved.',
  'where no preview can be opened, the button promises nothing about one',
);

/* ------------------------------------------------------------------ *
 * The proposal as the customer reads it
 * ------------------------------------------------------------------ */

function proposalDocument(
  overrides: Partial<WizardProposalDocument> = {},
): WizardProposalDocument {
  return {
    reference: 'BW-2026-0001',
    version: 0,
    issuedAt: null,
    issuedByName: null,
    preparedByName: 'Erich Naude',
    preparedAt: '2026-08-02T10:00:00.000Z',
    proposalTypeLabel: 'Manual proposal',
    evidenceLevel: 'preliminary',
    evidenceLevelLabel: 'Preliminary',
    evidenceLevelStatement: 'Some of what this rests on is not yet confirmed.',
    preliminaryNotice: 'This document is preliminary.',
    customerName: 'Kloof Engineering',
    siteName: 'Kloof Works',
    siteAddress: '14 Vlei Road, Germiston',
    sections: [],
    figures: [],
    investment: {
      itemDescription: 'Atlas Copco GA55 VSD+',
      unitPriceRand: 400000,
      quantity: 2,
      equipmentSubtotalRand: 800000,
      lines: [],
      additionalCostsRand: 45000,
      creditsRand: 60000,
      netInitialInvestmentRand: 785000,
      priceStatement: 'Priced from an ARS quotation.',
    },
    evidence: [],
    assumptions: [],
    outstandingEvidence: [],
    limitations: [],
    contentFingerprint: 'a'.repeat(64),
    ...overrides,
  } as WizardProposalDocument;
}

assert.equal(
  proposalFilename(proposalDocument()),
  'BW-2026-0001_draft.pdf',
  'a proposal nobody has issued is not filed as though it were sent',
);
assert.equal(
  proposalFilename(proposalDocument({ version: 3 })),
  'BW-2026-0001_v3.pdf',
  'two versions in one folder can be told apart without opening either',
);

assert.deepEqual(
  addressBlock(proposalDocument({ siteName: null })),
  ['Kloof Engineering', '14 Vlei Road, Germiston'],
  'a site nobody named leaves no empty line on the letterhead',
);

const pricedTotals = investmentRows(
  proposalDocument({
    investment: {
      ...proposalDocument().investment,
      lines: [
        {
          label: 'Installation',
          amountRand: 45000,
          credit: false,
          notIncluded: false,
        },
        {
          label: 'Buy-back or trade-in credit',
          amountRand: 60000,
          credit: true,
          notIncluded: false,
        },
        {
          label: 'Piping and mechanical work',
          amountRand: null,
          credit: false,
          notIncluded: true,
        },
      ],
    },
  }),
);
assert.deepEqual(
  pricedTotals.map(row => row.label),
  [
    `Equipment (2 × ${rands(400000)})`,
    'Installation',
    'Buy-back or trade-in credit',
    'Net initial investment',
  ],
  'each cost and credit is named once, and the net follows them',
);
assert.ok(
  pricedTotals[2].amount.startsWith('−'),
  'a credit is shown as coming off the price, not added to it',
);
assert.equal(
  pricedTotals[3].amount,
  rands(785000),
  'the printed total is the figure the backend supplied, unchanged',
);
assert.equal(
  pricedTotals.filter(row => row.amount === rands(45000)).length,
  1,
  'a cost is never charged for twice by being listed and then subtotalled',
);
assert.deepEqual(
  investmentRows(proposalDocument()).map(row => row.label),
  [`Equipment (2 × ${rands(400000)})`, 'Net initial investment'],
  'a proposal with no extra costs prints the equipment and the net, nothing else',
);

const unpriced = investmentRows(
  proposalDocument({
    investment: {
      ...proposalDocument().investment,
      equipmentSubtotalRand: null,
      additionalCostsRand: null,
      creditsRand: null,
      netInitialInvestmentRand: null,
      priceStatement: 'No price has been obtained for this proposal yet.',
    },
  }),
);
assert.deepEqual(
  unpriced.map(row => row.amount),
  ['Not yet priced'],
  'an unpriced proposal says so rather than printing a total of nothing',
);

assert.equal(
  investmentAmount({
    label: 'Piping and mechanical work',
    amountRand: null,
    credit: false,
    notIncluded: true,
  }),
  'Not included',
  'a line nobody priced is never printed as zero rand',
);

assert.match(
  documentStatusLine(proposalDocument(), false),
  /no version .* has been generated/i,
  'a document with no version says so plainly',
);
assert.match(
  documentStatusLine(
    proposalDocument({ version: 2, issuedAt: '2026-08-01T08:00:00.000Z' }),
    true,
  ),
  /newer than that version/i,
  'a changed proposal warns that what is shown is ahead of the last version',
);

const firstIssue = newVersionAction(proposalDocument(), [], false);
assert.equal(firstIssue.label, 'Generate new version');
assert.equal(firstIssue.enabled, true);

const issuedVersion = {
  version: 1,
  issuedAt: '2026-08-01T08:00:00.000Z',
  issuedByUserId: 'user-1',
  issuedByName: 'Erich Naude',
  evidenceLevel: 'preliminary',
  contentFingerprint: 'a'.repeat(64),
  draftRevision: 4,
  pdf: null,
} as WizardProposalDocumentVersion;

const unchanged = newVersionAction(
  proposalDocument({ version: 1 }),
  [issuedVersion],
  false,
);
assert.equal(
  unchanged.enabled,
  false,
  'a second version that would say the same thing is not offered',
);
assert.match(
  unchanged.detail,
  /already says exactly this/i,
  'the rep is told why the button is not available rather than left guessing',
);
const changedSince = newVersionAction(
  proposalDocument({ version: 1 }),
  [issuedVersion],
  true,
);
assert.equal(
  changedSince.label,
  'Generate new version',
  'the button reads the same wherever a rep finds it',
);
assert.equal(changedSince.enabled, true);
assert.match(
  changedSince.detail,
  /version 2/,
  'the rep is told which version generating would produce',
);

/* ------------------------------------------------------------------ *
 * Where the preview lives
 *
 * The defect this covers: pressing Preview returned the rep to the Bouwa
 * main screen. A preview has to be a place with an address, so a refresh
 * lands back on it rather than on the list.
 * ------------------------------------------------------------------ */

assert.equal(
  proposalPath({ kind: 'preview', draftId: 'draft-7' }),
  '/bouwa/proposals/draft-7/preview',
  'the preview has an address of its own',
);
assert.equal(
  proposalPath({ kind: 'wizard', draftId: 'draft-7' }),
  '/bouwa/proposals/draft-7',
  'the proposal being worked on has an address of its own',
);
assert.deepEqual(
  placeFromPath('/bouwa/proposals/draft-7/preview'),
  { kind: 'preview', draftId: 'draft-7' },
  'refreshing on a preview comes back to that preview',
);
assert.deepEqual(
  placeFromPath('/bouwa/proposals/draft-7'),
  { kind: 'wizard', draftId: 'draft-7' },
  'refreshing inside a proposal comes back to that proposal',
);
assert.deepEqual(
  placeFromPath('/bouwa/proposals/draft-7/technical-review'),
  { kind: 'technical', draftId: 'draft-7' },
  'the technical review is reachable by address too',
);
assert.deepEqual(
  placeFromPath('/bouwa'),
  { kind: 'list' },
  'the module itself opens on the list',
);
assert.deepEqual(
  placeFromPath('/bouwa/proposals/'),
  { kind: 'list' },
  'an address naming no proposal is the list, not an error',
);
for (const place of [
  { kind: 'list' } as const,
  { kind: 'wizard', draftId: 'd' } as const,
  { kind: 'preview', draftId: 'd' } as const,
  { kind: 'technical', draftId: 'd' } as const,
  { kind: 'workspace', draftId: 'd' } as const,
])
  assert.deepEqual(
    placeFromPath(proposalPath(place)),
    place,
    'every place round-trips through its own address',
  );

/* ------------------------------------------------------------------ *
 * What a preliminary proposal still tells the customer
 * ------------------------------------------------------------------ */

const preliminary = proposalDocument({
  preliminaryNotice:
    'This is a preliminary proposal. Some of what it needs has not been confirmed.',
  assumptions: [
    {
      label: 'Running hours',
      statement:
        'Annual savings are calculated on 6 240 operating hours a year.',
    },
  ],
  outstandingEvidence: [
    {
      label: 'Annual operating hours',
      statement: 'The hours the machine runs decide every annual figure.',
      expectedBy: null,
    },
  ],
});
assert.match(
  preliminary.preliminaryNotice ?? '',
  /preliminary proposal/i,
  'a preliminary proposal names itself in words a customer reads',
);
assert.equal(
  preliminary.assumptions.length,
  1,
  'the assumptions the figures rest on travel with the document',
);
assert.equal(
  preliminary.outstandingEvidence.length,
  1,
  'what is still to be confirmed travels with the document',
);
assert.equal(
  proposalFilename(preliminary),
  'BW-2026-0001_draft.pdf',
  'a document with no version still downloads under a name that identifies it',
);

assert.equal(
  longDate('2026-08-02T10:00:00.000Z'),
  new Date('2026-08-02T10:00:00.000Z').toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
  'dates are written the way a South African reader writes them',
);

console.log('Bouwa guided-wizard state checks passed.');
