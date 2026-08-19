import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  PROPOSAL_DETAILED_SECTION_IDS,
  proposalNumericFigureText,
  proposalPdfContentContract,
  proposalReleaseState,
} from '../src/features/bouwa/wizard/proposalDocumentPresentation.ts';
import {
  commercialComponentBusinessProjection,
  commercialComponentCurrentValue,
  commercialScenarioBusinessProjection,
  commercialScenarioCurrentValue,
  equipmentGroupBusinessProjection,
  equipmentGroupCurrentValue,
  operatingSegmentBusinessProjection,
  operatingSegmentCurrentValue,
  recordOverride,
  sourceStatedValueBusinessProjection,
  sourceStatedValueCurrentValue,
  structuredRecordChanged,
  structuredRecordIsRemovable,
} from '../src/features/bouwa/wizard/recordProvenancePresentation.ts';
import type {
  AuditCommercialScenario,
  AuditEquipmentGroup,
  AuditOperatingProfileSegment,
  AuditRecurringCommercialCostComponent,
  SourceStatedValueRecord,
} from '../src/features/bouwa/auditIntakeTypes.ts';
import type {
  WizardProposalDetailedSection,
  WizardProposalDocument,
  WizardProposalNumericFigure,
} from '../src/features/bouwa/wizard/wizardTypes.ts';

const blocked: WizardProposalNumericFigure = {
  label: 'Five-year customer cost',
  value: null,
  unit: 'R/5-year',
  available: false,
  blockedReason: 'Annual escalation is not confirmed.',
  hypothetical: false,
  source: null,
};
assert.equal(
  proposalNumericFigureText(blocked),
  'Annual escalation is not confirmed.',
);
assert.ok(!/\b0(?:[.,]0+)?\b/.test(proposalNumericFigureText(blocked)));
assert.equal(
  proposalNumericFigureText({
    label: 'Independent average flow',
    value: 154.035,
    unit: 'm3/min',
    available: true,
    blockedReason: null,
    hypothetical: false,
    source: 'Accepted server calculation',
  }),
  '154,035 m3/min',
  'non-currency precision must keep 154.035 distinct from source-stated 154.04',
);

const sourceFigure: WizardProposalNumericFigure = {
  label:
    'Included-component additive sensitivity — not an all-in total customer cost',
  value: 375000,
  unit: 'R/month',
  available: true,
  blockedReason: null,
  hypothetical: true,
  source: 'Commercial offer, page 4',
};
const independentFigure: WizardProposalNumericFigure = {
  ...sourceFigure,
  label: 'All-in total customer cost',
  value: null,
  available: false,
  blockedReason: 'Customer electricity and maintenance remain unconfirmed.',
  hypothetical: false,
  source: 'Accepted server calculation',
};
const comparisonFigures: WizardProposalNumericFigure[] = [
  {
    ...sourceFigure,
    label: 'Fixed managed-service/equipment charge',
    value: 225962,
    hypothetical: false,
  },
  {
    ...sourceFigure,
    label: 'Per-m3 variable charge',
    value: 13375167.12,
  },
  {
    ...independentFigure,
    label: 'Customer electricity',
    blockedReason:
      'Unavailable; responsibility confirmation required. Excluded from included-component additive sensitivities.',
  },
  {
    ...independentFigure,
    label: 'Customer maintenance/repair',
    blockedReason:
      'Unavailable; responsibility confirmation required. Excluded from included-component additive sensitivities.',
  },
  independentFigure,
];

const detailedSections = PROPOSAL_DETAILED_SECTION_IDS.map(
  (id): WizardProposalDetailedSection => ({
    id,
    title:
      id === 'source_scenario'
        ? 'Source-stated scenarios and values'
        : id === 'independent_scenario'
          ? 'Actual scientific calculation'
          : id.replaceAll('_', ' '),
    figures:
      id === 'source_scenario'
        ? [sourceFigure]
        : id === 'independent_scenario'
          ? [independentFigure]
          : id === 'component_comparison'
            ? comparisonFigures
            : id === 'five_year'
              ? [blocked]
              : [],
    statements:
      id === 'discrepancies'
        ? ['Monthly amount: calculation_discrepancy. Material to contract review.']
        : [],
  }),
);

const document = {
  reference: 'BW-2026-0001',
  calculationSnapshotId: 'snapshot-immutable',
  calculationConfigurationSha256: 'c'.repeat(64),
  detailedSections,
  customerQuoteSafe: false,
  sensitivityNotice:
    'Any total marked hypothetical is an additive sensitivity only.',
  internalOnlyNotice:
    'INTERNAL ONLY — unverified source evidence is retained for benchmarking.',
} as WizardProposalDocument;

assert.deepEqual(
  detailedSections.map(section => section.id),
  PROPOSAL_DETAILED_SECTION_IDS,
  'every backend detailed proposal section has a frontend presentation contract',
);
assert.equal(proposalReleaseState(document).allowed, false);
assert.equal(proposalReleaseState(document).label, 'Internal only');

const pdfText = proposalPdfContentContract(document);
for (const required of [
  'snapshot-immutable',
  'c'.repeat(64),
  'INTERNAL ONLY — unverified source evidence is retained for benchmarking.',
  'Any total marked hypothetical is an additive sensitivity only.',
  'Hypothetical',
  'Commercial offer, page 4',
  'Annual escalation is not confirmed.',
  'Monthly amount: calculation_discrepancy. Material to contract review.',
  'Included-component additive sensitivity — not an all-in total customer cost',
  'Customer electricity',
  'Customer maintenance/repair',
  'All-in total customer cost',
])
  assert.ok(pdfText.includes(required), `PDF content must include: ${required}`);

const sourceStart = pdfText.indexOf('Source-stated scenarios and values');
const independentStart = pdfText.indexOf('Actual scientific calculation');
const sourceValue = pdfText.indexOf(
  'Included-component additive sensitivity — not an all-in total customer cost',
);
const independentValue = pdfText.indexOf('All-in total customer cost');
assert.ok(sourceStart >= 0 && independentStart > sourceStart);
assert.ok(sourceValue > sourceStart && sourceValue < independentStart);
assert.ok(independentValue > independentStart);
assert.notEqual(sourceFigure.source, independentFigure.source);
assert.ok(
  !/Source-stated scenarios[\s\S]*All-in total customer cost[\s\S]*Actual scientific calculation/.test(
    pdfText.join('\n'),
  ),
  'a source subtotal must not be presented as an all-in customer cost',
);

const provenance = {
  sourceValue: 375000,
  currentValue: 375000,
  sourceReference: 'Commercial offer, page 4',
  sourceFilename: 'offer.pdf',
  sourceSha256: 'a'.repeat(64),
  sourcePage: 4,
  sourceText: 'Monthly charge R375 000',
  evidenceIds: ['offer'],
  verificationStatus: 'verified' as const,
  overrideReason: null,
  actor: null,
  recordedAt: null,
};
const overridden = recordOverride(
  provenance,
  402500,
  'Reconciled against the signed schedule',
  'signed-schedule',
);
assert.equal(overridden.sourceValue, 375000, 'the displayed source value is immutable');
assert.equal(overridden.currentValue, 402500);
assert.equal(overridden.overrideReason, 'Reconciled against the signed schedule');
assert.deepEqual(overridden.evidenceIds, ['offer', 'signed-schedule']);
assert.throws(() => recordOverride(provenance, 402500, '', ''), /reason and evidence/);

const emptyProvenance = {
  ...provenance,
  sourceValue: null,
  currentValue: null,
  sourceReference: null,
  sourceFilename: null,
  sourceSha256: null,
  sourcePage: null,
  sourceText: null,
  evidenceIds: [],
};
assert.equal(structuredRecordIsRemovable({ provenance }), false);
assert.equal(structuredRecordIsRemovable({ provenance: emptyProvenance }), true);

const equipmentGroup: AuditEquipmentGroup = {
  groupId: 'selected-spec-existingMachine-record-1',
  role: 'existing',
  quantity: 1,
  manufacturer: 'Example',
  model: 'Exact 100',
  ratedFlowM3PerMin: 10,
  ratedPressureBarG: 8,
  machineProvenance: 'exact_library_match',
  specificationProvenance: 'exact_library_match',
  machineEvidenceIds: [],
  specificationEvidenceIds: [],
  exactLibraryMatch: true,
  provenance: { ...provenance, sourceValue: 'Exact 100', currentValue: 'Exact 100' },
};
const quantityOverride = { ...equipmentGroup, quantity: 2 };
const pressureOverride = { ...equipmentGroup, ratedPressureBarG: 9 };
assert.equal(equipmentGroupCurrentValue(quantityOverride), 'Exact 100');
assert.equal(
  structuredRecordChanged(
    equipmentGroup,
    quantityOverride,
    equipmentGroupBusinessProjection,
  ),
  true,
);
assert.equal(
  structuredRecordChanged(
    equipmentGroup,
    pressureOverride,
    equipmentGroupBusinessProjection,
  ),
  true,
);
assert.throws(
  () =>
    recordOverride(
      equipmentGroup.provenance,
      equipmentGroupCurrentValue(quantityOverride),
      '',
      '',
      true,
    ),
  /reason and evidence/,
);

const segment: AuditOperatingProfileSegment = {
  segmentId: 'day',
  label: 'Day',
  hoursPerDay: 24,
  flowBasis: 'flow_fraction',
  flowFraction: 0.8,
  measuredFlowM3PerMin: null,
  loadFraction: null,
  sourceReference: 'Schedule',
  confirmed: true,
  provenance: { ...provenance, sourceValue: 0.8, currentValue: 0.8 },
};
assert.equal(operatingSegmentCurrentValue(segment), 0.8);
assert.equal(
  structuredRecordChanged(
    segment,
    { ...segment, hoursPerDay: 20 },
    operatingSegmentBusinessProjection,
  ),
  true,
);

const component: AuditRecurringCommercialCostComponent = {
  componentId: 'service',
  label: 'Service',
  kind: 'fixed_service',
  payer: 'customer',
  responsibility: 'customer',
  amountRand: 1000,
  sourceReference: 'Offer',
  confirmed: true,
  provenance: { ...provenance, sourceValue: 1000, currentValue: 1000 },
};
assert.equal(commercialComponentCurrentValue(component), 1000);
assert.equal(
  structuredRecordChanged(
    component,
    { ...component, payer: 'shared' },
    commercialComponentBusinessProjection,
  ),
  true,
);

const scenario: AuditCommercialScenario = {
  scenarioId: 'source',
  label: 'Source offer',
  scenarioKind: 'source',
  equipmentGroupId: equipmentGroup.groupId,
  componentIds: ['service'],
  combinationStatus: 'confirmed_additive',
  contractTermMonths: 60,
  annualEscalationFraction: 0.05,
  baseYear: 2026,
  escalationBasis: 'annual_compound_from_base_year',
  roundingPolicy: 'unrounded_calculation_display_2dp',
  sourceStatedMonthlyTotalRand: 1000,
  sourceStatedFiveYearTotalRand: null,
  requiredComponentKinds: ['fixed_service'],
  daysPerMonth: 30,
  sourceReference: 'Offer',
  provenance: {
    ...provenance,
    sourceValue: 'Source offer',
    currentValue: 'Source offer',
  },
};
assert.equal(commercialScenarioCurrentValue(scenario), 'Source offer');
assert.equal(
  structuredRecordChanged(
    scenario,
    { ...scenario, annualEscalationFraction: 0.06 },
    commercialScenarioBusinessProjection,
  ),
  true,
);
assert.equal(
  structuredRecordChanged(
    scenario,
    { ...scenario, componentIds: ['service', 'electricity'] },
    commercialScenarioBusinessProjection,
  ),
  true,
);

const sourceRecord: SourceStatedValueRecord = {
  valueId: 'source-value',
  label: 'Monthly total',
  value: 1000,
  unit: 'R/month',
  provenance: { ...provenance, sourceValue: 1000, currentValue: 1000 },
};
assert.equal(sourceStatedValueCurrentValue(sourceRecord), 1000);
assert.equal(
  structuredRecordChanged(
    sourceRecord,
    { ...sourceRecord, value: 1200 },
    sourceStatedValueBusinessProjection,
  ),
  true,
);

const renderedView = readFileSync(
  new URL(
    '../src/features/bouwa/wizard/components/ProposalDocumentView.tsx',
    import.meta.url,
  ),
  'utf8',
);
assert.match(renderedView, /detailedSections\.map/);
assert.match(renderedView, /proposalNumericFigureText\(figure\)/);
assert.match(renderedView, /BaofnCalculatorComparison/);

const fleetEditor = readFileSync(
  new URL(
    '../src/features/bouwa/wizard/components/FleetGroupsEditor.tsx',
    import.meta.url,
  ),
  'utf8',
);
assert.doesNotMatch(fleetEditor, /patch\('exactLibraryMatch'/);
assert.match(fleetEditor, /exactLibraryMatch: false/);
assert.match(fleetEditor, /Source-backed records are retained/);

process.stdout.write('Bouwa benchmark presentation checks passed.\n');
