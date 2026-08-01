import assert from 'node:assert/strict';

import {
  answerForState,
  answerFromInput,
  auditIntakeSectionViews,
  inputTextForAnswer,
  intakeChangeRows,
  outstandingEvidenceRows,
  mayApplyAuditIntakeSave,
  nextAuditIntakeSave,
  readAnswerAtPath,
  wiredInputRows,
  writeAnswerAtPath,
} from '../src/features/bouwa/auditIntakeState.ts';
import type {
  AuditFieldStatus,
  AuditFormField,
  AuditIntakeDocument,
  AuditIntakeFormModel,
  AuditReadinessAssessment,
  IntakeAnswer,
  ResolvedInput,
  ResolvedScientificInputs,
} from '../src/features/bouwa/auditIntakeTypes.ts';
import {
  arsWorkflowBasePath,
  arsWorkflowConnection,
  localWorkflowConnection,
  workflowHeaders,
  workflowUrl,
} from '../src/features/bouwa/workflowConnection.ts';

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

/* Wired Step 14 inputs are shown exactly as the backend resolved them */

function resolved<TValue>(
  fieldCode: string,
  value: TValue | null,
  provenance: string | null,
  reason: string,
): ResolvedInput<TValue> {
  return {
    fieldCode,
    value,
    confirmed: value !== null,
    provenance: provenance as ResolvedInput<TValue>['provenance'],
    reason,
  };
}

function machine(): ResolvedScientificInputs['existingMachine'] {
  return {
    dischargePressureBarG: resolved(
      'AUDIT.X.RATED_DISCHARGE_PRESSURE',
      7.5,
      'manufacturer_specification',
      'Rated discharge pressure is confirmed.',
    ),
    ratedFadM3PerMin: resolved('AUDIT.X.RATED_FAD', null, null, 'Not answered.'),
    flowReferenceBasis: resolved(
      'AUDIT.X.RATED_FLOW_REFERENCE_BASIS',
      'fad',
      'manufacturer_specification',
      'Basis is confirmed.',
    ),
    declaredPowerKw: resolved(
      'AUDIT.X.PACKAGE_INPUT_POWER',
      184,
      'user_input',
      'Package input power is confirmed.',
    ),
    powerBasis: 'measured_package_input',
    motorEfficiency: resolved(
      'AUDIT.X.MOTOR_EFFICIENCY',
      null,
      null,
      'Not required for this basis.',
    ),
    reviewRequired: false,
    electricalInput: {
      declaredPowerKw: 184,
      powerBasis: 'measured_package_input',
      motorEfficiency: null,
    },
  };
}

const wired: ResolvedScientificInputs = {
  annualOperatingHours: {
    ...resolved(
      'AUDIT.OPERATING.ANNUAL_HOURS',
      6000,
      'approved_assumption',
      'Annual operating hours are recorded as approved_assumption.',
    ),
    status: 'approved_assumption',
    approver: 'Named Approver',
    evidenceReference: null,
  },
  logger: {
    channelBasis: { flow: 'fad', pressure: 'unknown_requires_confirmation' },
    lowFlowCutOffM3PerMin: null,
  },
  measuredFlowReferenceBasis: resolved(
    'AUDIT.FLOW_SENSOR.FLOW_REFERENCE_BASIS',
    'free_air_delivery',
    'user_input',
    'Measured flow-reference basis is confirmed.',
  ),
  measuredPressureBasis: resolved(
    'AUDIT.PRESSURE_SENSOR.PRESSURE_BASIS',
    null,
    null,
    'Pressure basis is recorded as unknown and requires confirmation.',
  ),
  lowFlowCutOff: resolved(
    'AUDIT.FLOW_SENSOR.CONFIGURED_LOW_FLOW_CUTOFF',
    null,
    null,
    'Configured low-flow cut-off has not been answered.',
  ),
  existingMachine: machine(),
  proposedMachine: machine(),
  comparison: {
    existing: { dischargePressureBarG: 7.5, flowReferenceBasis: 'fad' },
    proposed: { dischargePressureBarG: 7.5, flowReferenceBasis: 'fad' },
  },
  representativePeriod: resolved(
    'AUDIT.OPERATING.REPRESENTATIVE_PERIOD',
    'representative_confirmed',
    'user_input',
    'Representative period is confirmed.',
  ),
  proposedPartLoadCurveRequired: true,
  proposedPartLoadCurvePointCount: 0,
  tariff: { confirmed: false, reasons: ['Supplier has not been answered.'] },
  measuredDemand: { annualOperatingHours: 6000 },
};

const rows = wiredInputRows(wired);
const rowFor = (label: string) => {
  const row = rows.find(entry => entry.label === label);
  assert.ok(row, `expected a wired row for ${label}`);
  return row;
};

assert.equal(rowFor('Annual operating hours').text, '6000 h/y');
assert.equal(
  rowFor('Annual operating hours').provenance,
  'Approved assumption',
);
assert.equal(rowFor('Annual operating hours').confirmed, true);

const cutOff = rowFor('Configured low-flow cut-off');
assert.equal(cutOff.confirmed, false);
assert.equal(cutOff.text, '', 'an unwired input must carry no value text');
assert.equal(cutOff.provenance, null);
assert.match(cutOff.reason, /has not been answered/);

const pressure = rowFor('Measured pressure basis');
assert.equal(pressure.confirmed, false);
assert.equal(pressure.text, '');

assert.equal(rowFor('Existing machine declared power').text, '184 kW');
assert.equal(
  rowFor('Existing machine declared power').provenance,
  'User input',
);

/* Outstanding evidence separates the answer's state from the document's */

const evidenceFormModel: AuditIntakeFormModel = {
  ...formModel,
  evidenceTypes: [
    { value: 'production_schedule', label: 'Production schedule' },
    { value: 'site_altitude_record', label: 'Site altitude record' },
  ],
  evidenceStatuses: [
    { value: 'requested', label: 'Requested' },
    { value: 'confirmed', label: 'Confirmed' },
  ],
};

const evidenceReadiness = {
  fieldStatuses: [
    status({
      code: 'AUDIT.OPERATING.REPRESENTATIVE_EVIDENCE',
      label: 'Production schedule reference',
    }),
  ],
  blockedOutputs: [
    {
      outputId: 'annualised_demand',
      label: 'Annualised demand',
      requiredStage: 'measured_audit_ready',
      blockingFieldCodes: [],
      reasons: ['Waiting on the schedule.'],
    },
  ],
  externalEvidenceBlockers: [
    {
      code: 'AUDIT.OPERATING.REPRESENTATIVE_EVIDENCE',
      label: 'Production schedule reference',
      whyItMatters: 'A year scaled from a week rests on it.',
      requiredEvidence: ['production_schedule'],
      dependentOutputs: ['annualised_demand'],
      responsiblePerson: 'Named Person',
      expectedConfirmationDate: '2026-09-30',
      fieldStatus: 'confirmed',
      evidenceId: 'ev-1',
      evidenceStatus: 'requested',
      notes: 'Requested from the plant manager.',
    },
    {
      code: 'AUDIT.SITE.ALTITUDE',
      label: 'Site altitude',
      whyItMatters: 'Air density falls with altitude.',
      requiredEvidence: ['site_altitude_record'],
      dependentOutputs: [],
      responsiblePerson: null,
      expectedConfirmationDate: null,
      fieldStatus: 'missing',
      evidenceId: null,
      evidenceStatus: null,
      notes: null,
    },
  ],
  unavailableDependencies: [],
} as unknown as AuditReadinessAssessment;

const outstanding = outstandingEvidenceRows(
  evidenceReadiness,
  evidenceFormModel,
);
assert.equal(outstanding.length, 2);
assert.deepEqual(
  outstanding.map(row => row.code),
  ['AUDIT.OPERATING.REPRESENTATIVE_EVIDENCE', 'AUDIT.SITE.ALTITUDE'],
  'the backend order is preserved',
);
assert.equal(
  outstanding[0].answerStatus,
  'Confirmed',
  'a confirmed answer resting on an unconfirmed document is still confirmed',
);
assert.equal(outstanding[0].documentStatus, 'Requested');
assert.deepEqual(outstanding[0].requiredDocuments, ['Production schedule']);
assert.deepEqual(outstanding[0].blockedOutputs, ['Annualised demand']);
assert.equal(outstanding[0].responsiblePerson, 'Named Person');
assert.equal(outstanding[0].expectedConfirmationDate, '2026-09-30');

assert.equal(outstanding[1].answerStatus, 'Not answered');
assert.equal(
  outstanding[1].documentStatus,
  'No document referenced',
  'an absent document must not read as a confirmed one',
);
assert.equal(outstanding[1].evidenceId, null);
assert.deepEqual(outstanding[1].blockedOutputs, []);

/* The change trail reads newest first, in the operator's own words */

const trail = intakeChangeRows(
  [
    {
      at: '2026-08-01T08:00:00.000Z',
      by: 'operator-a',
      source: 'parsed_logger_source',
      changedFieldCodes: ['AUDIT.OPERATING.REPRESENTATIVE_EVIDENCE'],
      changedEvidenceIds: [],
    },
    {
      at: '2026-08-01T09:00:00.000Z',
      by: null,
      source: 'operator_edit',
      changedFieldCodes: [],
      changedEvidenceIds: ['ev-1'],
    },
  ],
  evidenceReadiness,
);

assert.equal(trail.length, 2);
assert.equal(trail[0].at, '2026-08-01T09:00:00.000Z', 'newest first');
assert.equal(trail[0].by, 'Unattributed');
assert.equal(trail[0].source, 'Operator edit');
assert.deepEqual(trail[0].changes, ['Document ev-1']);
assert.equal(trail[1].source, 'Logger file parsed');
assert.deepEqual(trail[1].changes, ['Production schedule reference']);
assert.deepEqual(intakeChangeRows([], evidenceReadiness), []);

/* One workspace, two mounts: only the connection differs */

const localConnection = localWorkflowConnection({
  token: 'local-token',
  expiresAt: '2026-08-01T12:00:00.000Z',
  identity: { id: 'entry', displayName: 'Data Entry', role: 'data_entry_user' },
});
assert.equal(localConnection.basePath, '/api/bouwa-local');
assert.equal(localConnection.deployment, 'local_development');
assert.equal(
  workflowUrl(localConnection, '/intake/form'),
  '/api/bouwa-local/intake/form',
);

assert.equal(
  arsWorkflowBasePath('http://localhost:5000/'),
  'http://localhost:5000/api/bouwa/workflow',
  'a trailing slash must not double up',
);

const arsConnection = arsWorkflowConnection(
  arsWorkflowBasePath('http://localhost:5000'),
  'ars-token',
  {
    deployment: 'authenticated_ars_route',
    actor: {
      id: 'user-1',
      displayName: 'Thandi Approver',
      role: 'technical_approver',
    },
  },
);
assert.equal(
  workflowUrl(arsConnection, '/intake'),
  'http://localhost:5000/api/bouwa/workflow/intake',
);
assert.equal(
  arsConnection.actor.role,
  'technical_approver',
  'the role comes from the backend, never from the browser',
);
assert.deepEqual(
  workflowHeaders(arsConnection, { 'Content-Type': 'application/json' }),
  {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ars-token',
  },
);
assert.deepEqual(
  workflowHeaders(arsConnection, { Authorization: 'Bearer forged' }),
  { Authorization: 'Bearer ars-token' },
  'a caller cannot override the connection token',
);

process.stdout.write('Bouwa audit-intake state checks passed.\n');
