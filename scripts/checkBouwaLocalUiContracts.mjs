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

for (const commercialOutput of [
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
])
  forbidText(loggerLocalTypes, commercialOutput, 'blocked commercial output');

process.stdout.write('Bouwa local UI contracts passed.\n');
