import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = relativePath =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

const page = read('src/features/bouwa/pages/BouwaLoggerLocalApp.tsx');
const workspace = read(
  'src/features/bouwa/components/ProposalReadinessWorkspace.tsx',
);
const modeSelector = read(
  'src/features/bouwa/components/proposal/ProposalModeSelector.tsx',
);
const fieldEditor = read(
  'src/features/bouwa/components/proposal/ProposalFieldEditor.tsx',
);
const login = read('src/features/bouwa/components/LocalIdentityLogin.tsx');
const loggerLocalTypes = read('src/features/bouwa/loggerLocalTypes.ts');
const intakePanel = read(
  'src/features/bouwa/components/BouwaAuditIntakePanel.tsx',
);
const intakeState = read('src/features/bouwa/auditIntakeState.ts');

function requireText(source, text, label) {
  if (!source.includes(text))
    throw new Error(`${label} contract is missing '${text}'.`);
}

function forbidText(source, text, label) {
  if (source.includes(text))
    throw new Error(`${label} contract must not contain '${text}'.`);
}

requireText(
  page,
  '20 * 1024 * 1024',
  'CSV fallback capability',
);
requireText(page, 'maximumCsvBytes', 'API-provided CSV capability');
requireText(page, 'MiB', 'binary CSV size label');
if (page.includes('50 MB') || page.includes('50MB'))
  throw new Error('The obsolete 50 MB CSV limit must not appear.');

for (const [source, label] of [
  [page, 'logger summary tabs'],
  [workspace, 'proposal workspace tabs'],
  [modeSelector, 'proposal mode tabs'],
]) {
  for (const contract of [
    'role="tablist"',
    'role="tab"',
    'role="tabpanel"',
    'aria-selected',
    'aria-controls',
    'tabIndex',
    'onKeyDown',
    'ArrowLeft',
    'ArrowRight',
  ])
    requireText(source, contract, label);
}

requireText(login, 'aria-live="assertive"', 'login errors');
requireText(page, 'aria-live="assertive"', 'parser errors');
requireText(workspace, "role={error ? 'alert' : 'status'}", 'workflow errors');
requireText(fieldEditor, 'setExpanded(true)', 'Fix-now expansion');
requireText(fieldEditor, '?.focus()', 'Fix-now focus');
requireText(fieldEditor, 'focusRequestToken', 'repeat Fix-now request token');
requireText(fieldEditor, 'data-proposal-editable', 'Fix-now editable control target');
requireText(workspace, 'AbortController', 'stale evaluation cancellation');
requireText(workspace, 'mayApplyEvaluation', 'evaluation sequence guard');
requireText(workspace, 'Proposal record ID · server owned', 'record identity display');
requireText(page, 'X-Bouwa-Proposal-Record-Id', 'analysis record binding');
if (
  fieldEditor.indexOf('setExpanded(true)') >
  fieldEditor.indexOf('?.focus()')
)
  throw new Error('Fix now must expand a field before focusing it.');

const measuredDemandContract = loggerLocalTypes.slice(
  loggerLocalTypes.indexOf('export type ScientificCalculationProvenance'),
  loggerLocalTypes.indexOf('export interface BouwaLocalAnalysis'),
);
if (!measuredDemandContract)
  throw new Error('The measured-demand contract block is missing.');

const measuredDemandLabel = 'measured-demand response';

requireText(
  loggerLocalTypes,
  'measuredDemand: MeasuredDemandProfile;',
  'mandatory measuredDemand',
);
forbidText(loggerLocalTypes, 'measuredDemand?:', 'mandatory measuredDemand');

for (const declaration of [
  'source: ScientificSourceReference;',
  'supportedDurationSeconds: number;',
  'deliveredVolumeM3: number;',
  'meteredVolumeM3: number | null;',
  'volumeBalanceClosure: number | null;',
  'meanFlowM3PerMin: number | null;',
  'flowP50M3PerMin: number | null;',
  'flowP90M3PerMin: number | null;',
  'peakMeanFlowM3PerMin: Array<{ windowMinutes: number; value: number }>;',
  'flowingDurationSeconds: number;',
  'nonFlowingDurationSeconds: number;',
  'flowingFraction: number | null;',
  'meanFlowWhileFlowingM3PerMin: number | null;',
  'meanPressureBarG: number | null;',
  'meanPressureWhileFlowingBarG: number | null;',
  'lowFlowCutOffM3PerMin: number | null;',
  'lowFlowCutOffStatus: LowFlowCutOffStatus;',
  "reportedZeroFlowLabel: 'below cut-off';",
  'runtimeFigureMetadata: RuntimeFigureMetadata;',
  'observedMinimumNonZeroFlowM3PerMin: number | null;',
  'annualisationFactor: number | null;',
  'recordDurationDays: number;',
  "confidence: 'measured' | 'estimated_from_short_record' | 'insufficient';",
  'figureMetadata: MeasuredDemandFigureMetadata;',
])
  requireText(measuredDemandContract, declaration, measuredDemandLabel);

if (/\?\s*:/.test(measuredDemandContract))
  throw new Error(
    'No measured-demand field may be optional; a backend null must stay null.',
  );
if (measuredDemandContract.includes('undefined'))
  throw new Error(
    'A measured-demand null must not be represented as undefined.',
  );

for (const provenance of [
  'exact_mathematics',
  'established_engineering',
  'manufacturer_specification',
  'approved_assumption',
  'business_input',
  'user_input',
])
  requireText(
    measuredDemandContract,
    `| '${provenance}'`,
    'scientific provenance union',
  );
forbidText(
  loggerLocalTypes,
  'comparison_evidence',
  'production scientific provenance',
);

for (const uncertainty of [
  'measured',
  'derived_exact',
  'derived_manufacturer',
  'estimated',
  'estimated_from_short_record',
  'unavailable',
])
  requireText(
    measuredDemandContract,
    `| '${uncertainty}'`,
    'K-08 uncertainty union',
  );

for (const calculationId of [
  '007', '008', '021', '023', '025', '030', '031', '032', '033', '034',
  '035', '036', '041', '042', '043', '045', '046', '047', '051', '052',
  '053', '056', '058', '059', '060', '061', '062', '063', '067',
])
  requireText(
    measuredDemandContract,
    `| 'CALC-${calculationId}'`,
    'calculation identifier union',
  );

for (const declaration of [
  'unit: string;',
  'provenance: ScientificCalculationProvenance;',
  'uncertainty: ScientificUncertainty;',
  'calculationId: ScientificCalculationId;',
  'numericUncertainty: ScientificNumericUncertainty | null;',
  'reason: string;',
  'sourceFilename: string;',
  'sourceSha256: string;',
  "basis: 'counter_quantisation';",
  "export type LowFlowCutOffStatus = 'cut_off_unconfirmed' | 'cut_off_confirmed';",
  'status: LowFlowCutOffStatus;',
  "unit: 's' | 'fraction' | 'm3/min';",
  'annualisationFactor: ScientificFigureMetadata;',
])
  requireText(measuredDemandContract, declaration, measuredDemandLabel);

const commercialOutputs = [
  'annualEnergy',
  'electricityCost',
  'tariffRate',
  'touCost',
  'savings',
  'percentageSaving',
  'energySaving',
  'costSaving',
  'netInvestment',
  'payback',
  'roiPercent',
  'siteCorrection',
  'altitudeCorrection',
  'proposedMachine',
];

for (const commercialOutput of commercialOutputs)
  forbidText(loggerLocalTypes, commercialOutput, 'blocked commercial output');

const measuredDemandUiLabel = 'measured-demand screen';
const measuredDemandUi = page.slice(
  page.indexOf('const MEASURED_DEMAND_UNAVAILABLE_LABEL'),
  page.indexOf('export function BouwaLoggerLocalApp'),
);
if (!measuredDemandUi)
  throw new Error('The measured-demand presentation block is missing.');

requireText(page, 'analysis.measuredDemand', 'rendered measured-demand response');
requireText(page, '<MeasuredDemandSection', 'measured-demand section');

for (const nullCheck of [
  'value === null',
  'measuredDemand.lowFlowCutOffM3PerMin === null',
  'metadata.numericUncertainty === null',
  'peak === null',
])
  requireText(measuredDemandUi, nullCheck, `${measuredDemandUiLabel} explicit null check`);

requireText(
  measuredDemandUi,
  "const MEASURED_DEMAND_UNAVAILABLE_LABEL = 'Unavailable';",
  `${measuredDemandUiLabel} unavailable label`,
);
requireText(
  measuredDemandUi,
  'MEASURED_DEMAND_UNAVAILABLE_LABEL',
  `${measuredDemandUiLabel} unavailable rendering`,
);
requireText(measuredDemandUi, 'metadata.reason', `${measuredDemandUiLabel} backend reason`);
requireText(measuredDemandUi, 'cutOff.reason', `${measuredDemandUiLabel} cut-off reason`);
requireText(
  measuredDemandUi,
  'runtimeFigureMetadata.flowingDurationSeconds.reason',
  `${measuredDemandUiLabel} runtime classification reason`,
);
requireText(
  measuredDemandUi,
  'figures.peakMeanFlowM3PerMin.reason',
  `${measuredDemandUiLabel} peak rolling-mean reason`,
);
requireText(
  measuredDemandUi,
  'minimumFractionDigits: digits',
  `${measuredDemandUiLabel} valid-zero formatting`,
);

for (const truthinessTrap of [
  'value ? ',
  'value ?\n',
  '!value',
  'value || ',
  'value && ',
  '|| 0',
  '?? 0',
  'Boolean(',
  "'—'",
  "'-'",
  'parseFloat(',
])
  forbidText(
    measuredDemandUi,
    truthinessTrap,
    `${measuredDemandUiLabel} valid-zero preservation`,
  );

requireText(measuredDemandUi, "'Cutoff confirmed'", `${measuredDemandUiLabel} confirmed cut-off state`);
requireText(measuredDemandUi, "'Cutoff not confirmed'", `${measuredDemandUiLabel} unconfirmed cut-off state`);
requireText(
  measuredDemandUi,
  "measuredDemand.lowFlowCutOffStatus === 'cut_off_confirmed'",
  `${measuredDemandUiLabel} cut-off status source`,
);
requireText(
  measuredDemandUi,
  'label="Configured low-flow cut-off"',
  `${measuredDemandUiLabel} configured cut-off figure`,
);
requireText(
  measuredDemandUi,
  'label="Observed minimum positive flow"',
  `${measuredDemandUiLabel} observed minimum figure`,
);
requireText(
  measuredDemandUi,
  'value={measuredDemand.lowFlowCutOffM3PerMin}',
  `${measuredDemandUiLabel} configured cut-off value`,
);
requireText(
  measuredDemandUi,
  'value={measuredDemand.observedMinimumNonZeroFlowM3PerMin}',
  `${measuredDemandUiLabel} observed minimum value`,
);
requireText(
  measuredDemandUi,
  'measuredDemand.reportedZeroFlowLabel',
  `${measuredDemandUiLabel} reported-zero label`,
);

requireText(
  measuredDemandUi,
  'value={measuredDemand.annualisationFactor}',
  `${measuredDemandUiLabel} annualisation figure`,
);
for (const annualAssumption of [
  '8760',
  '8,760',
  '8784',
  'annualOperatingHours',
  'annualHours',
  'operatingHours',
])
  forbidText(
    measuredDemandUi,
    annualAssumption,
    `${measuredDemandUiLabel} annual-hours assumption`,
  );

requireText(
  measuredDemandUi,
  'measuredDemand.source.sourceFilename',
  `${measuredDemandUiLabel} source filename`,
);
requireText(
  measuredDemandUi,
  'measuredDemand.source.sourceSha256',
  `${measuredDemandUiLabel} source SHA-256`,
);
requireText(measuredDemandUi, 'metadata.provenance', `${measuredDemandUiLabel} provenance`);
requireText(measuredDemandUi, 'metadata.uncertainty', `${measuredDemandUiLabel} uncertainty`);
requireText(measuredDemandUi, 'provenanceLabels[metadata.provenance]', `${measuredDemandUiLabel} provenance label`);
requireText(measuredDemandUi, 'uncertaintyLabels[metadata.uncertainty]', `${measuredDemandUiLabel} uncertainty label`);
requireText(measuredDemandUi, 'metadata.calculationId', `${measuredDemandUiLabel} calculation identifier`);
requireText(
  measuredDemandUi,
  'MeasuredDemandTechnicalTable',
  `${measuredDemandUiLabel} technical details`,
);

for (const commercialOutput of [...commercialOutputs, 'kWh', 'tariff', 'Payback', 'ROI'])
  forbidText(measuredDemandUi, commercialOutput, `${measuredDemandUiLabel} blocked commercial output`);

for (const formulaToken of [
  'Math.',
  ' * ',
  ' / ',
  ' - ',
  '.reduce(',
  'toFixed(',
  'SECONDS_PER',
  'annualise',
])
  forbidText(
    measuredDemandUi,
    formulaToken,
    `${measuredDemandUiLabel} frontend scientific formula`,
  );

const intakeLabel = 'mandatory audit intake';

requireText(page, '<BouwaAuditIntakePanel', intakeLabel);
requireText(page, 'parsedSourceToken', `${intakeLabel} reload after a parse`);

for (const contract of [
  '/api/bouwa-local/intake/form',
  '/api/bouwa-local/intake',
  'Authorization: `Bearer ${session.token}`',
  'onSessionExpired()',
  'mayApplyAuditIntakeSave',
  'nextAuditIntakeSave',
])
  requireText(intakePanel, contract, `${intakeLabel} local service contract`);

for (const answerState of [
  'unknown_confirmation_required',
  'not_applicable',
  'not_listed_add_new',
])
  requireText(
    intakeState,
    `${answerState}:`,
    `${intakeLabel} controlled answer state`,
  );

requireText(
  intakePanel,
  'field.permittedAnswerStates.map',
  `${intakeLabel} backend-supplied answer states`,
);
requireText(
  intakePanel,
  'field.options.map',
  `${intakeLabel} backend-supplied option list`,
);
requireText(
  intakePanel,
  'readiness.blockedOutputs.map',
  `${intakeLabel} blocked outputs`,
);
requireText(
  intakePanel,
  'output.reasons',
  `${intakeLabel} blocked-output reasons`,
);
requireText(
  intakePanel,
  'readiness.stageEligibility.map',
  `${intakeLabel} stage eligibility`,
);
requireText(
  intakePanel,
  'readiness.externalEvidenceBlockers',
  `${intakeLabel} outstanding evidence`,
);
requireText(intakePanel, 'status.message', `${intakeLabel} backend field message`);
requireText(
  intakePanel,
  'status.whyItMatters',
  `${intakeLabel} reason a field is required`,
);
requireText(
  intakePanel,
  'status.dependentOutputs',
  `${intakeLabel} outputs a field blocks`,
);
requireText(
  intakePanel,
  'SERVER_OWNED_FIELD_CODES',
  `${intakeLabel} server-owned provenance`,
);

// Step 14. The panel shows what the backend resolved, never what the answers
// look like as though they had been resolved.
requireText(
  intakePanel,
  'state.scientificInputs',
  `${intakeLabel} wired scientific inputs`,
);
requireText(
  intakePanel,
  'wiredInputRows(inputs)',
  `${intakeLabel} wired input rows`,
);
requireText(
  intakePanel,
  'row.confirmed ? row.text',
  `${intakeLabel} unwired input withheld`,
);
requireText(intakePanel, 'row.reason', `${intakeLabel} unwired input reason`);
requireText(
  intakeState,
  'input.confirmed',
  `${intakeLabel} backend confirmation of a wired input`,
);
for (const wiredContract of [
  'inputs.annualOperatingHours',
  'inputs.measuredFlowReferenceBasis',
  'inputs.measuredPressureBasis',
  'inputs.lowFlowCutOff',
  'inputs.representativePeriod',
])
  requireText(intakeState, wiredContract, `${intakeLabel} Step 14 input`);

// Evidence that has not arrived. The answer's state and the document's state
// are reported separately, and a dependency the form cannot close says so.
const evidenceLabel = 'blocked evidence workflow';

requireText(intakePanel, 'OutstandingEvidenceWorkspace', evidenceLabel);
requireText(intakePanel, 'IntakeChangeTrail', evidenceLabel);
requireText(
  intakePanel,
  'readiness.unavailableDependencies.map',
  `${evidenceLabel} unavailable dependency`,
);
requireText(
  intakePanel,
  'Completing this form will not release it',
  `${evidenceLabel} honest unavailable dependency`,
);
requireText(
  intakePanel,
  "confirmationStatus: 'requested'",
  `${evidenceLabel} tracked document starts unconfirmed`,
);
for (const evidenceContract of [
  'row.answerStatus',
  'row.documentStatus',
  'row.requiredDocuments',
  'row.blockedOutputs',
  'row.responsiblePerson',
  'row.expectedConfirmationDate',
])
  requireText(intakePanel, evidenceContract, `${evidenceLabel} field`);
for (const stateContract of [
  'outstandingEvidenceRows',
  'intakeChangeRows',
  'No document referenced',
  'blocker.evidenceStatus',
  'blocker.fieldStatus',
])
  requireText(intakeState, stateContract, `${evidenceLabel} state helper`);

// A document that has merely been referenced must never be presented as one
// that has been confirmed.
forbidText(
  intakePanel,
  "confirmationStatus: 'confirmed'",
  `${evidenceLabel} client-confirmed document`,
);

// The intake form describes controlled answers. It must never carry its own
// option lists, its own stage rules, or any scientific arithmetic. Prose in a
// comment is not code, so comments are removed before the arithmetic checks.
const withoutComments = source =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const intakePanelCode = withoutComments(intakePanel);
const intakeStateCode = withoutComments(intakeState);

for (const forbidden of [
  'free_air_delivery',
  'standard_volumetric',
  'measured_package_electrical_input',
  'variable_speed_drive',
  'representative_normal_operation',
  '8760',
  '8784',
  'Math.',
  ' * ',
  ' / ',
  'toFixed(',
  '?? 0',
  '|| 0',
])
  forbidText(intakePanelCode, forbidden, `${intakeLabel} backend authority`);

for (const forbidden of [
  '8760',
  '8784',
  'Math.',
  ' * ',
  ' / ',
  'toFixed(',
  '?? 0',
  '|| 0',
])
  forbidText(intakeStateCode, forbidden, `${intakeLabel} state authority`);

process.stdout.write('Bouwa local UI contracts passed.\n');
