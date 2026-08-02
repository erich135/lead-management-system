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
  readinessLines,
  saveStateLabel,
  stepFieldViews,
  stepPages,
  unresolvedFields,
  WIZARD_FIELDS_PER_PAGE,
} from '../src/features/bouwa/wizard/wizardState.ts';
import {
  existingMachineEntries,
  installedMachineEntries,
  proposedMachineEntries,
  specLibraryEntries,
  specLibraryPartLoadPoints,
} from '../src/features/bouwa/wizard/machineSelection.ts';
import { siteCandidates } from '../src/features/bouwa/wizard/customerSiteSelection.ts';
import {
  answeredTextForCode,
  EQUIPMENT_TYPE_BY_SECTION,
  equipmentAnswersByCode,
  equipmentIntakeEntries,
} from '../src/features/bouwa/wizard/equipmentSelection.ts';
import {
  conceptForField,
  WIZARD_CONCEPTS,
} from '../src/features/bouwa/wizard/wizardHelp.ts';
import type {
  AuditFieldStatus,
  AuditFormField,
  AuditIntakeFormModel,
  AuditReadinessAssessment,
  IntakeAnswer,
} from '../src/features/bouwa/auditIntakeTypes.ts';
import type {
  WizardEquipment,
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

/* A machine selection fills what the source states, and nothing else. */

const existing = new Map(
  existingMachineEntries({
    _id: 'machine-1',
    make: ' Atlas Copco ',
    model: 'GA 30',
    serialNumber: 'API-664321',
    currentLocation: 'Plant 2',
  } as Parameters<typeof existingMachineEntries>[0]),
);

assert.equal(existing.get('existingMachine.manufacturer')?.value, 'Atlas Copco');
assert.equal(existing.get('existingMachine.model')?.value, 'GA 30');
assert.equal(existing.get('existingMachine.serialNumber')?.value, 'API-664321');
assert.equal(existing.get('existingMachine.arsMachineId')?.value, 'machine-1');
assert.equal(
  existing.get('existingMachine.selectionMode')?.value,
  'existing_catalog_machine',
);
for (const invented of [
  'existingMachine.ratedFadM3PerMin',
  'existingMachine.packageInputPowerKw',
  'existingMachine.powerBasis',
  'existingMachine.controlMethod',
]) {
  assert.equal(
    existing.has(invented),
    false,
    `the ARS register does not state ${invented} and must not fill it`,
  );
}

const proposed = new Map(
  proposedMachineEntries({
    _id: 'spec-1',
    manufacturer: 'Kaeser',
    modelName: 'ASD 40',
    ratedCapacityM3Min: 4.1,
    packageInputKw: 22.5,
    motorKw: 22,
    speedControl: 'VSD',
  } as Parameters<typeof proposedMachineEntries>[0]),
);

assert.equal(proposed.get('proposedMachine.ratedFadM3PerMin')?.value, 4.1);
assert.equal(
  proposed.get('proposedMachine.packageInputPowerKw')?.value,
  22.5,
  'the published package figure is preferred over the motor rating',
);
assert.equal(
  proposed.get('proposedMachine.powerBasis')?.value,
  'manufacturer_package_input',
);
assert.equal(
  proposed.get('proposedMachine.controlMethod')?.value,
  'variable_speed_drive',
);
assert.equal(
  proposed.has('proposedMachine.flowReferenceBasis'),
  false,
  'the spec library does not state the flow basis, so it stays a question',
);

/* Where only a motor rating exists, the basis says so rather than claiming a
   package measurement. */
const motorOnly = new Map(
  proposedMachineEntries({
    _id: 'spec-2',
    manufacturer: 'Kaeser',
    motorKw: 30,
  } as Parameters<typeof proposedMachineEntries>[0]),
);
assert.equal(motorOnly.get('proposedMachine.packageInputPowerKw')?.value, 30);
assert.equal(
  motorOnly.get('proposedMachine.powerBasis')?.value,
  'motor_nameplate_rating',
);

/* A fixed-speed library entry does not say whether it modulates or unloads,
   and those are different machines to model. */
const fixedSpeed = new Map(
  proposedMachineEntries({
    _id: 'spec-3',
    manufacturer: 'Kaeser',
    speedControl: 'FIXED_SPEED',
  } as Parameters<typeof proposedMachineEntries>[0]),
);
assert.equal(fixedSpeed.has('proposedMachine.controlMethod'), false);

/* ------------------------------------------------------------------ *
 * The specification library fills what its source published, and stops
 * ------------------------------------------------------------------ */

type SpecRecord = Parameters<typeof specLibraryEntries>[0];

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

const fullSheet = new Map(
  specLibraryEntries(
    bareRecord({
      compressorType: 'rotary_screw_oil_injected',
      controlMethod: 'variable_speed_drive',
      ratedPressureBarG: 8.6,
      ratedFadM3PerMin: 9.06,
      flowReferenceBasis: 'free_air_delivery',
      packageInputPowerKw: 55,
      motorShaftPowerKw: 52,
      motorEfficiencyFraction: 0.94,
      specificPowerKwPerM3PerMin: 6.07,
      vsdMinimumFlowM3PerMin: 2.1,
      vsdMaximumFlowM3PerMin: 9.06,
    }),
    'proposedMachine',
  ),
);

assert.equal(fullSheet.get('proposedMachine.manufacturer')?.value, 'Atlas Copco');
assert.equal(fullSheet.get('proposedMachine.model')?.value, 'GA55-125AP');
assert.equal(
  fullSheet.get('proposedMachine.ratedDischargePressureBarG')?.value,
  8.6,
);
assert.equal(fullSheet.get('proposedMachine.ratedFadM3PerMin')?.value, 9.06);
assert.equal(
  fullSheet.get('proposedMachine.ratedFlowReferenceBasis')?.value,
  'free_air_delivery',
  'where the source states the basis it is carried across rather than re-asked',
);
assert.equal(fullSheet.get('proposedMachine.motorEfficiency')?.value, 0.94);
assert.equal(
  fullSheet.get('proposedMachine.specificPowerKwPerM3PerMin')?.value,
  6.07,
);
assert.equal(fullSheet.get('proposedMachine.vsdMinimumFlowM3PerMin')?.value, 2.1);
assert.equal(
  fullSheet.get('proposedMachine.powerBasis')?.value,
  'manufacturer_package_input',
  'a published package figure is recorded as a package figure',
);
assert.equal(
  fullSheet.get('proposedMachine.manufacturerSource')?.value,
  'GA55 CAGI data sheet — Atlas Copco',
  'the source is cited automatically rather than retyped',
);

/* A directory line publishes four values. It must fill four, not twelve. */
const directoryLine = new Map(
  specLibraryEntries(
    bareRecord({
      ratedPressureBarG: 8.6,
      ratedFadM3PerMin: 9.06,
      source: {
        ...bareRecord().source,
        sourceType: 'cagi_directory',
        sourceTitle: 'CAGI rotary directory',
        sourceOrganisation: 'Compressed Air and Gas Institute',
        sourceVersion: '8-23',
      },
    }),
    'proposedMachine',
  ),
);

assert.equal(directoryLine.get('proposedMachine.ratedFadM3PerMin')?.value, 9.06);
for (const unpublished of [
  'proposedMachine.controlMethod',
  'proposedMachine.machineType',
  'proposedMachine.ratedFlowReferenceBasis',
  'proposedMachine.packageInputPowerKw',
  'proposedMachine.powerBasis',
  'proposedMachine.motorEfficiency',
  'proposedMachine.specificPowerKwPerM3PerMin',
]) {
  assert.equal(
    directoryLine.has(unpublished),
    false,
    `the directory does not publish ${unpublished} and must leave it a question`,
  );
}
assert.equal(
  directoryLine.get('proposedMachine.manufacturerSource')?.value,
  'CAGI rotary directory — Compressed Air and Gas Institute — version 8-23',
);

/* Where only a shaft rating exists the basis says so rather than claiming a
   package measurement, because the two are not interchangeable in the model. */
const shaftOnly = new Map(
  specLibraryEntries(
    bareRecord({ motorShaftPowerKw: 30 }),
    'proposedMachine',
  ),
);
assert.equal(shaftOnly.get('proposedMachine.packageInputPowerKw')?.value, 30);
assert.equal(
  shaftOnly.get('proposedMachine.powerBasis')?.value,
  'motor_nameplate_rating',
);

/* The variant is part of what the machine is called. */
assert.equal(
  new Map(
    specLibraryEntries(
      bareRecord({ modelVariant: 'FF' }),
      'proposedMachine',
    ),
  ).get('proposedMachine.model')?.value,
  'GA55-125AP FF',
);

/* The same record fills the installed machine, with the fields that only an
   installed machine has. */
const asInstalled = new Map(
  specLibraryEntries(
    bareRecord({ packageInputPowerKw: 55, motorShaftPowerKw: 52 }),
    'existingMachine',
  ),
);
assert.equal(asInstalled.get('existingMachine.motorNameplatePowerKw')?.value, 52);
assert.equal(
  asInstalled.get('existingMachine.manufacturerEvidenceReference')?.value,
  'GA55 CAGI data sheet — Atlas Copco',
);
assert.equal(
  asInstalled.has('existingMachine.specificPowerKwPerM3PerMin'),
  false,
  'the installed machine has no specific-power field to fill',
);

/* A part-load curve is carried only where the source published one. */
assert.deepEqual(specLibraryPartLoadPoints(bareRecord()), []);
assert.deepEqual(
  specLibraryPartLoadPoints(
    bareRecord({
      partLoadPoints: [{ flowM3PerMin: 4.5, packageInputPowerKw: 31 }],
    }),
  ),
  [{ flowM3PerMin: 4.5, packageInputPowerKw: 31 }],
);

/* The ARS register states identity, never performance. */
const installed = new Map(
  installedMachineEntries({
    machineId: 'ars-machine-7',
    manufacturer: ' Atlas Copco ',
    model: 'GA55-125AP',
    machineType: 'Compressor',
    serialNumber: ' API-660-123 ',
    assetNumber: 'A-1001',
    location: 'Plant 1',
    ownership: 'customer',
    label: 'Atlas Copco GA55-125AP · serial API-660-123 · Plant 1',
  }),
);
assert.equal(installed.get('existingMachine.manufacturer')?.value, 'Atlas Copco');
assert.equal(installed.get('existingMachine.serialNumber')?.value, 'API-660-123');
assert.equal(installed.get('existingMachine.arsMachineId')?.value, 'ars-machine-7');
for (const invented of [
  'existingMachine.ratedFadM3PerMin',
  'existingMachine.packageInputPowerKw',
  'existingMachine.controlMethod',
  'existingMachine.machineType',
]) {
  assert.equal(
    installed.has(invented),
    false,
    `the ARS register does not state ${invented} and must not fill it`,
  );
}

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

console.log('Bouwa guided-wizard state checks passed.');
