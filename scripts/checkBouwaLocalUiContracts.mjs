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

// Prose in a comment is not code, so comments are removed before any check that
// looks for arithmetic.
const withoutComments = source =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

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
  page.indexOf('const confidenceLabels'),
  page.indexOf('export function BouwaLoggerLocalApp'),
);
if (!measuredDemandUi)
  throw new Error('The measured-demand presentation block is missing.');

// How a figure is worded is a pure decision and lives outside the screen, so
// the Step 15 rules can be asserted directly against it.
const presentationLabel = 'measured-figure presentation';
const presentation = read('src/features/bouwa/measuredFigurePresentation.ts');

requireText(page, 'analysis.measuredDemand', 'rendered measured-demand response');
requireText(page, '<MeasuredDemandSection', 'measured-demand section');

for (const nullCheck of [
  'value !== null && Number.isFinite(value)',
  'metadata.numericUncertainty === null',
])
  requireText(presentation, nullCheck, `${presentationLabel} explicit null check`);
for (const nullCheck of [
  'measuredDemand.lowFlowCutOffM3PerMin === null',
  'peak === null',
])
  requireText(measuredDemandUi, nullCheck, `${measuredDemandUiLabel} explicit null check`);

requireText(
  presentation,
  "export const MEASURED_DEMAND_UNAVAILABLE_LABEL = 'Unavailable';",
  `${presentationLabel} unavailable label`,
);
requireText(
  presentation,
  'MEASURED_DEMAND_UNAVAILABLE_LABEL',
  `${presentationLabel} unavailable rendering`,
);
requireText(
  presentation,
  'reason: available ? null : metadata.reason',
  `${presentationLabel} backend reason`,
);
requireText(
  presentation,
  'minimumFractionDigits: digits',
  `${presentationLabel} valid-zero formatting`,
);
requireText(measuredDemandUi, 'describeFigure(value, metadata, digits)', `${measuredDemandUiLabel} backend-worded figure`);
requireText(measuredDemandUi, 'figure.reason', `${measuredDemandUiLabel} backend reason`);
requireText(measuredDemandUi, 'metadata.reason', `${measuredDemandUiLabel} technical-table reason`);
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
  for (const [source, label] of [
    [measuredDemandUi, measuredDemandUiLabel],
    [presentation, presentationLabel],
  ])
    forbidText(source, truthinessTrap, `${label} valid-zero preservation`);

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
requireText(
  presentation,
  'PROVENANCE_LABELS[metadata.provenance]',
  `${presentationLabel} provenance label`,
);
requireText(
  presentation,
  'UNCERTAINTY_LABELS[metadata.uncertainty]',
  `${presentationLabel} uncertainty label`,
);
requireText(presentation, 'metadata.calculationId', `${presentationLabel} calculation identifier`);
// Every class the backend can send must have a word on screen, and rank 7 is
// not one the released contract can carry.
for (const provenanceClass of [
  'exact_mathematics',
  'established_engineering',
  'manufacturer_specification',
  'approved_assumption',
  'business_input',
  'user_input',
])
  requireText(presentation, `${provenanceClass}:`, `${presentationLabel} provenance vocabulary`);
for (const uncertaintyClass of [
  'measured',
  'derived_exact',
  'derived_manufacturer',
  'estimated',
  'estimated_from_short_record',
  'unavailable',
])
  requireText(presentation, `${uncertaintyClass}:`, `${presentationLabel} uncertainty vocabulary`);
forbidText(presentation, 'comparison_evidence', `${presentationLabel} released provenance`);
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
    withoutComments(measuredDemandUi),
    formulaToken,
    `${measuredDemandUiLabel} frontend scientific formula`,
  );

const intakeLabel = 'mandatory audit intake';

requireText(page, '<BouwaAuditIntakePanel', intakeLabel);
requireText(page, 'parsedSourceToken', `${intakeLabel} reload after a parse`);

for (const contract of [
  "'/intake/form'",
  "'/intake'",
  'workflowUrl(connection',
  'workflowHeaders(',
  'onSessionExpired()',
  'mayApplyAuditIntakeSave',
  'nextAuditIntakeSave',
])
  requireText(intakePanel, contract, `${intakeLabel} service contract`);

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
// option lists, its own stage rules, or any scientific arithmetic.
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

// The same workspace serves the development service and the authenticated ARS
// module. Only the connection differs, and the acting role must come from the
// backend: a role derived in the browser would offer transitions the accepted
// role matrix then refuses.
const connectionLabel = 'workflow connection';
const workflowConnection = read('src/features/bouwa/workflowConnection.ts');
const authenticatedPage = read(
  'src/features/bouwa/pages/BouwaAirAuditWorkflowPage.tsx',
);
const moduleShell = read('src/features/bouwa/pages/BouwaModuleShell.tsx');

requireText(
  workflowConnection,
  "LOCAL_WORKFLOW_BASE_PATH = '/api/bouwa-local'",
  `${connectionLabel} development mount`,
);
requireText(
  workflowConnection,
  "/api/bouwa/workflow",
  `${connectionLabel} authenticated mount`,
);
for (const forbidden of ['bouwa.approveFormula', 'technical_approver'])
  forbidText(
    withoutComments(workflowConnection),
    forbidden,
    `${connectionLabel} role authority`,
  );
for (const forbidden of [
  'bouwa.approveFormula',
  'technical_approver',
  'data_entry_user',
])
  forbidText(
    withoutComments(authenticatedPage),
    forbidden,
    'authenticated workflow page role authority',
  );

requireText(
  authenticatedPage,
  '/session',
  'authenticated workflow page backend-resolved actor',
);
requireText(
  authenticatedPage,
  'getAuthToken()',
  'authenticated workflow page ARS token',
);
requireText(
  authenticatedPage,
  '<BouwaLoggerLocalApp connection={connection} />',
  'authenticated workflow page reuses the accepted workspace',
);
// The detailed workspace is still the only place the engineering interface
// comes from, but it is no longer the module's default screen. The guided
// wizard is what a user lands on, and the workspace is reached from inside a
// proposal as Advanced Technical Review.
const guidedPage = read(
  'src/features/bouwa/wizard/BouwaGuidedProposalPage.tsx',
);
requireText(
  moduleShell,
  '<BouwaGuidedProposalPage />',
  'authenticated Bouwa module default workflow',
);
requireText(
  guidedPage,
  '<BouwaAirAuditWorkflowPage />',
  'Advanced Technical Review reuses the accepted workspace',
);
for (const forbidden of ['<BouwaAirAuditWorkflowPage />', '<BouwaNewProposalWizard />'])
  forbidText(
    withoutComments(moduleShell),
    forbidden,
    'Bouwa module single active workflow',
  );
requireText(
  page,
  'connection.actor.displayName',
  'workspace actor from the connection',
);
forbidText(
  withoutComments(page),
  'session.identity',
  'workspace local-only identity',
);

// The proposal builder used to run a second scientific pipeline in the browser.
// The accepted backend is the only calculation authority, so the builder may
// hold inputs and historical evidence, and nothing else. These checks fail if a
// replaced calculation finds its way back onto the screen.
const wizardLabel = 'proposal builder backend authority';
const wizard = read(
  'src/features/bouwa/components/BouwaNewProposalWizard.tsx',
);
const wizardCode = withoutComments(wizard);
const proposalInputs = read(
  'src/features/bouwa/calculations/proposalCalculationState.ts',
);
const proposalInputsCode = withoutComments(proposalInputs);
const resultAuthority = read(
  'src/features/bouwa/components/BouwaResultAuthority.tsx',
);

// The orchestrator that produced savings, payback and return in the browser.
for (const retired of [
  'calculateProposal',
  'ProposalCalculationResults',
  'calcFirstPrinciplesAnnualCost',
  'calcFirstPrinciplesSavings',
  'calcFirstPrinciplesPerformance',
  'resolveEffectiveInputPower',
  'applyFirstPrinciplesSiteCorrection',
  'applyApprovedFadLoss',
  'calcRoi',
]) {
  forbidText(wizardCode, retired, `${wizardLabel} retired calculation`);
  forbidText(
    proposalInputsCode,
    retired,
    'proposal input model retired calculation',
  );
}

// The engines themselves survive as comparison evidence. The input model must
// simply stop importing them.
for (const engine of [
  './altitudeCorrection',
  './compressorPerformance',
  './energyCostEngine',
  './roiEngine',
  './tariffEngine',
]) {
  const importedAtRuntime = new RegExp(
    `^import\\s+(?!type\\b)[^;]*from '${engine.replace('.', '\\.')}'`,
    'm',
  );
  if (importedAtRuntime.test(proposalInputsCode))
    throw new Error(
      `The proposal input model must not import the ${engine} engine at runtime.`,
    );
}

// Retained as required comparison evidence by section O.3. Altitude correction
// stays here too: CALC-049 has no accepted implementation, so the frontend
// version remains legacy evidence and must not drive a customer result.
for (const evidence of [
  'src/features/bouwa/calculations/validationEngine.ts',
  'src/features/bouwa/calculations/altitudeCorrection.ts',
  'src/features/bouwa/calculations/compressorPerformance.ts',
  'src/features/bouwa/calculations/energyCostEngine.ts',
  'src/features/bouwa/calculations/roiEngine.ts',
  'src/features/bouwa/calculations/tariffEngine.ts',
  'src/features/bouwa/calculations/ingrainReferenceScenario.ts',
  'src/features/bouwa/calculations/elementSixReferenceScenario.ts',
])
  if (!fs.existsSync(path.join(root, evidence)))
    throw new Error(`Comparison evidence ${evidence} must be retained.`);

// The draft optimiser applied a 14% VSD credit with no accepted derivation.
if (
  fs.existsSync(
    path.join(root, 'src/features/bouwa/calculations/optimiserEngine.ts'),
  )
)
  throw new Error(
    'The draft optimiser engine and its unsupported VSD credit must stay retired.',
  );

// The workbook PDF is retired rather than deleted, so the guard is that nothing
// calls it.
requireText(wizard, 'function generateProposalPDF(', `${wizardLabel} PDF`);
if (/generateProposalPDF\s*\(/.test(wizardCode.replace(/function generateProposalPDF\s*\(/, '')))
  throw new Error(
    'The workbook PDF generator must not be called: it publishes savings and a VSD credit the backend never released.',
  );

// Every step that used to print a result now says where results come from.
requireText(wizard, '<BackendOwnedOutputs', `${wizardLabel} notice`);
requireText(
  wizard,
  '<HistoricalWorkbookEvidence',
  `${wizardLabel} evidence banner`,
);
requireText(
  resultAuthority,
  'Produced by the accepted backend, not by this screen',
  'backend authority notice wording',
);
requireText(
  resultAuthority,
  'Historical workbook figures — comparison evidence only',
  'workbook evidence banner wording',
);
for (const arithmetic of [' * ', ' / ', ' - ', 'toFixed'])
  forbidText(
    withoutComments(resultAuthority),
    arithmetic,
    'backend authority notice arithmetic',
  );

process.stdout.write('Bouwa local UI contracts passed.\n');
