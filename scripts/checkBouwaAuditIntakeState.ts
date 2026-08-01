import assert from 'node:assert/strict';

import {
  answerForState,
  answerFromInput,
  auditIntakeSectionViews,
  inputTextForAnswer,
  mayApplyAuditIntakeSave,
  nextAuditIntakeSave,
  readAnswerAtPath,
  writeAnswerAtPath,
} from '../src/features/bouwa/auditIntakeState.ts';
import type {
  AuditFieldStatus,
  AuditFormField,
  AuditIntakeDocument,
  AuditIntakeFormModel,
  AuditReadinessAssessment,
  IntakeAnswer,
} from '../src/features/bouwa/auditIntakeTypes.ts';

function unanswered(): IntakeAnswer<unknown> {
  return { state: 'unanswered', value: null, note: null };
}

function intake(): AuditIntakeDocument {
  return {
    intakeSchemaVersion: 'bouwa-audit-intake-1',
    evidence: [],
    identity: { customerName: unanswered() },
    flowSensor: {
      flowReferenceBasis: unanswered(),
      configuredLowFlowCutOffM3PerMin: unanswered(),
    },
    investment: { quantity: unanswered() },
  } as unknown as AuditIntakeDocument;
}

function field(overrides: Partial<AuditFormField>): AuditFormField {
  return {
    code: 'AUDIT.TEST.FIELD',
    path: 'identity.customerName',
    valueKind: 'text',
    unit: null,
    options: [],
    permittedAnswerStates: ['answered', 'unknown_confirmation_required'],
    ...overrides,
  };
}

/* Reading and writing answers by path */

const blank = intake();
assert.equal(readAnswerAtPath(blank, 'identity.customerName')?.state, 'unanswered');
assert.equal(readAnswerAtPath(blank, 'identity.nothingHere'), null);
assert.equal(readAnswerAtPath(blank, 'nowhere.at.all'), null);

const written = writeAnswerAtPath(blank, 'identity.customerName', {
  state: 'answered',
  value: 'Test Customer',
  note: null,
});
assert.equal(readAnswerAtPath(written, 'identity.customerName')?.value, 'Test Customer');
assert.equal(
  readAnswerAtPath(blank, 'identity.customerName')?.value,
  null,
  'writing an answer must not mutate the supplied intake',
);
assert.throws(
  () => writeAnswerAtPath(blank, 'identity.doesNotExist', unanswered()),
  /no answer at/,
);

/* A blank entry is never turned into a value */

const numberField = field({
  path: 'flowSensor.configuredLowFlowCutOffM3PerMin',
  valueKind: 'number',
});
assert.deepEqual(answerFromInput(numberField, ''), { answer: unanswered() });
assert.deepEqual(answerFromInput(numberField, '   '), { answer: unanswered() });
assert.deepEqual(answerFromInput(numberField, '0'), {
  answer: { state: 'answered', value: 0, note: null },
});
assert.deepEqual(answerFromInput(numberField, '0.35'), {
  answer: { state: 'answered', value: 0.35, note: null },
});
assert.ok('problem' in answerFromInput(numberField, 'standard'));
assert.ok('problem' in answerFromInput(numberField, '5%'));
assert.ok('problem' in answerFromInput(numberField, 'NaN'));
assert.ok('problem' in answerFromInput(numberField, 'Infinity'));
assert.ok('problem' in answerFromInput(numberField, '1e400'));

const integerField = field({ path: 'investment.quantity', valueKind: 'integer' });
assert.deepEqual(answerFromInput(integerField, '2'), {
  answer: { state: 'answered', value: 2, note: null },
});
assert.ok('problem' in answerFromInput(integerField, '2.5'));

/* A selection may only take a listed value */

const selectionField = field({
  path: 'flowSensor.flowReferenceBasis',
  valueKind: 'selection',
  options: [
    { value: 'actual_volumetric', label: 'Actual volumetric' },
    { value: 'free_air_delivery', label: 'FAD' },
  ],
});
assert.deepEqual(answerFromInput(selectionField, 'free_air_delivery'), {
  answer: { state: 'answered', value: 'free_air_delivery', note: null },
});
assert.ok('problem' in answerFromInput(selectionField, 'whatever_i_like'));
assert.deepEqual(answerFromInput(selectionField, ''), { answer: unanswered() });

/* Explicit non-value states never carry a value */

for (const state of [
  'unknown_confirmation_required',
  'not_applicable',
  'not_listed_add_new',
] as const)
  assert.deepEqual(answerForState(state), { state, value: null, note: null });
assert.throws(() => answerForState('answered'), /needs a value/);

/* A valid zero must display as zero, and an unknown must display as empty */

assert.equal(
  inputTextForAnswer({ state: 'answered', value: 0, note: null }),
  '0',
);
assert.equal(
  inputTextForAnswer({ state: 'unknown_confirmation_required', value: null, note: null }),
  '',
);
assert.equal(inputTextForAnswer(null), '');

/* Sections follow the backend, and a field that does not apply is not shown */

const formModel: AuditIntakeFormModel = {
  intakeSchemaVersion: 'bouwa-audit-intake-1',
  sections: [
    { id: 'identity', label: 'Customer', description: 'Who was measured.' },
    { id: 'flow_sensor', label: 'Flow sensor', description: 'How flow was measured.' },
  ],
  fields: [
    field({ code: 'A', path: 'identity.customerName' }),
    field({ code: 'B', path: 'flowSensor.flowReferenceBasis' }),
    field({ code: 'C', path: 'flowSensor.configuredLowFlowCutOffM3PerMin' }),
  ],
  evidenceTypes: [],
  evidenceStatuses: [],
};

function status(overrides: Partial<AuditFieldStatus>): AuditFieldStatus {
  return {
    code: 'A',
    section: 'identity',
    label: 'Customer',
    whyItMatters: 'Links the audit to a customer.',
    status: 'missing',
    applicable: true,
    resolved: false,
    confirmed: false,
    resolvedForStage: 'measured_audit_ready',
    confirmedForStage: 'measured_audit_ready',
    dependentOutputs: [],
    requiredEvidence: [],
    message: 'Customer has not been answered.',
    ...overrides,
  };
}

const readiness = {
  fieldStatuses: [
    status({ code: 'A', confirmed: true, status: 'confirmed' }),
    status({ code: 'B', section: 'flow_sensor' }),
    status({ code: 'C', section: 'flow_sensor', applicable: false }),
  ],
} as unknown as AuditReadinessAssessment;

const views = auditIntakeSectionViews(formModel, readiness);
assert.deepEqual(
  views.map(view => view.section.id),
  ['identity', 'flow_sensor'],
);
assert.deepEqual(views[1].fields.map(entry => entry.field.code), ['B']);
assert.equal(views[0].confirmedCount, 1);
assert.equal(views[0].outstandingCount, 0);
assert.equal(views[1].outstandingCount, 1);

/* A slow save may never undo a newer keystroke */

const first = nextAuditIntakeSave(0, 'proposal_a', blank);
const edited = writeAnswerAtPath(blank, 'identity.customerName', {
  state: 'answered',
  value: 'Typed after the request left',
  note: null,
});
const second = nextAuditIntakeSave(first.sequence, 'proposal_a', edited);
assert.equal(mayApplyAuditIntakeSave(second, first, edited), false);
assert.equal(mayApplyAuditIntakeSave(second, second, edited), true);
assert.equal(mayApplyAuditIntakeSave(second, second, blank), false);
assert.equal(
  mayApplyAuditIntakeSave(second, { ...second, proposalRecordId: 'proposal_b' }, edited),
  false,
);

process.stdout.write('Bouwa audit-intake state checks passed.\n');
