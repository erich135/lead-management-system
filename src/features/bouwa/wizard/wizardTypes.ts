/**
 * The guided-wizard contracts, as the backend states them.
 *
 * Nothing here is a second opinion. The step sequence, the readiness assessment
 * and the answers all arrive from /api/bouwa/wizard; these types only describe
 * what arrives so the screens can be written against it.
 */

import type {
  AuditIntakeDocument,
  AuditIntakeHistoryEntry,
  AuditEvidenceType,
  AuditReadinessAssessment,
  AuditReadinessStage,
  ClaimAssessmentInput,
  CommercialComponentKind,
  CommercialPayer,
  CommercialScenarioKind,
  SourceStatedValueRecord,
} from '../auditIntakeTypes';

export type WizardProposalType = 'air_audit' | 'manual';

export type WizardManualBasis =
  | 'site_survey'
  | 'customer_supplied_information'
  | 'manufacturer_information'
  | 'preliminary_estimate';

export type WizardStepId =
  | 'proposal_type'
  | 'customer_site'
  | 'upload_audit'
  | 'manual_basis'
  | 'logger_sensors'
  | 'existing_system'
  | 'proposed_solution'
  | 'operating_profile'
  | 'tariff_investment'
  | 'review';

export interface WizardStep {
  id: WizardStepId;
  title: string;
  purpose: string;
  proposalTypes: WizardProposalType[];
  sections: string[];
  fieldCodes: string[];
  sourceDerivedFieldCodes: string[];
}

export interface WizardCustomerLink {
  customerId: string | null;
  customerName: string | null;
  siteId: string | null;
  siteName: string | null;
}

export interface WizardSourceFile {
  storageId: string;
  filename: string;
  contentType: string;
  byteSize: number;
  sha256: string;
  uploadedAt: string;
  uploadedBy: string | null;
  version: number;
  supersededStorageIds: string[];
}

export interface WizardAttachment {
  attachmentId: string;
  storageId: string;
  evidenceId: string | null;
  evidenceType: AuditEvidenceType | null;
  filename: string;
  contentType: string;
  byteSize: number;
  sha256: string;
  uploadedAt: string;
  uploadedByUserId: string | null;
  uploadedByName: string | null;
  supersededByAttachmentId: string | null;
  supersededAt: string | null;
}

export type WizardEvidenceLevel =
  | 'preliminary'
  | 'engineering'
  | 'audit_backed'
  | 'commercially_complete';

export interface WizardEvidenceLevelRequirement {
  level: WizardEvidenceLevel;
  label: string;
  met: boolean;
  outstandingOutputs: { outputId: string; label: string; reasons: string[] }[];
  blockingFieldCodes: string[];
}

/** What the proposal rests on. Decided by the server, never by the rep. */
export interface WizardEvidenceLevelAssessment {
  level: WizardEvidenceLevel;
  label: string;
  statement: string;
  levels: WizardEvidenceLevelRequirement[];
  nextLevel: WizardEvidenceLevel | null;
  nextLevelLabel: string | null;
  toReachNextLevel: string[];
  blockingFieldCodesForNextLevel: string[];
}

export interface WizardReadinessSummary {
  stage: AuditReadinessStage | null;
  stageLabel: string;
  evidenceLevel: WizardEvidenceLevel;
  evidenceLevelLabel: string;
  permittedOutputCount: number;
  blockedOutputCount: number;
  outstandingQuestionCount: number;
  outstandingQuestionCodes?: string[];
  outstandingEvidenceCount: number;
  evaluatedAt: string;
}

/**
 * Where one answer came from.
 *
 * The origin is the distinction a rep needs and the form alone cannot show: a
 * blank because Atlas Copco published nothing reads exactly like a blank
 * because nobody has got to it yet, and only one of those is the rep's problem.
 */
export type WizardAnswerOrigin =
  | 'populated_from_source'
  | 'not_published_by_source'
  | 'changed_for_this_proposal';

export type WizardAnswerSourceKind =
  | 'machine_spec_library'
  | 'ars_machine_register'
  | 'ars_customer_record'
  | 'tariff_library'
  | 'logger_source_file';

export const ANSWER_ORIGIN_LABELS: Record<WizardAnswerOrigin, string> = {
  populated_from_source: 'Populated from source',
  not_published_by_source: 'Not published by source',
  changed_for_this_proposal: 'Changed for this proposal',
};

export const ANSWER_SOURCE_KIND_LABELS: Record<WizardAnswerSourceKind, string> = {
  machine_spec_library: 'Machine Specification Library',
  ars_machine_register: 'ARS machine register',
  ars_customer_record: 'ARS customer record',
  tariff_library: 'Tariff library',
  logger_source_file: 'Uploaded logger file',
};

export interface WizardAnswerProvenance {
  origin: WizardAnswerOrigin;
  sourceKind: WizardAnswerSourceKind;
  sourceLabel: string;
  sourceRecordId: string | null;
  sourceRecordVersion: number | null;
  sourceDocumentId: string | null;
  /** What the source stated, kept whatever the proposal now says. */
  sourceValue: unknown;
  reason: string | null;
  byUserId: string | null;
  byName: string | null;
  at: string;
}

export type WizardMachineRole = 'existingMachine' | 'proposedMachine';

export interface WizardSpecSnapshotValues {
  manufacturer: string;
  model: string;
  modelVariant: string | null;
  equipmentType: string;
  compressorType: string | null;
  controlMethod: string | null;
  ratedPressureBarG: number | null;
  ratedFadM3PerMin: number | null;
  flowReferenceBasis: string | null;
  packageInputPowerKw: number | null;
  motorShaftPowerKw: number | null;
  motorEfficiencyFraction: number | null;
  specificPowerKwPerM3PerMin: number | null;
  vsdMinimumFlowM3PerMin: number | null;
  vsdMaximumFlowM3PerMin: number | null;
  partLoadPoints: WizardSpecPartLoadPoint[];
  referenceAbsolutePressurePa: number | null;
  referenceTemperatureK: number | null;
  referenceHumidityBasis: string | null;
  referenceStandardDefinition: string | null;
  allowableAmbientMinimumC: number | null;
  allowableAmbientMaximumC: number | null;
  deratingTableStatus: string;
}

export interface WizardSpecOverride {
  field: keyof WizardSpecSnapshotValues;
  sourceValue: unknown;
  proposalValue: unknown;
  reason: string;
  byUserId: string;
  byName: string;
  at: string;
}

/** The library record a proposal quotes, exactly as it read when chosen. */
export interface WizardSpecSnapshot {
  recordId: string;
  recordVersion: number;
  libraryKey: string;
  contentFingerprint: string;
  source: WizardSpecSource;
  values: WizardSpecSnapshotValues;
  overrides: WizardSpecOverride[];
  takenAt: string;
  takenByUserId: string;
}

export interface WizardMachineSelections {
  existingMachine: WizardSpecSnapshot | null;
  proposedMachine: WizardSpecSnapshot | null;
  installedMachine: {
    machineId: string;
    label: string;
    selectedAt: string;
    selectedByUserId: string;
  } | null;
}

export interface WizardMachineSelectionResult extends WizardDraftView {
  /** Intake paths the chosen source answered. */
  populated: string[];
  /** Intake paths the chosen source was consulted for and left unanswered. */
  notPublished: string[];
}

export interface WizardSpecValueChange {
  field: string;
  quotedValue: unknown;
  latestValue: unknown;
}

export interface WizardMachineComparisonResult {
  role: WizardMachineRole;
  held: boolean;
  latest: WizardSpecRecord | null;
  explanation?: string;
  comparison: {
    upToDate: boolean;
    quotedVersion: number;
    latestVersion: number;
    changes: WizardSpecValueChange[];
    conflictingOverrides: string[];
    quotedSource: string;
    latestSource: string;
    locallyAnswered: string[];
  } | null;
}

/* ------------------------------------------------------------------ *
 * The tariff library
 * ------------------------------------------------------------------ */

export type WizardTariffRoute =
  | 'customer_bill_supplied'
  | 'previously_confirmed_for_customer'
  | 'searched_tariff_library'
  | 'not_available_yet';

export type WizardTariffFacetField =
  | 'supplier'
  | 'customerCategory'
  | 'voltageCategory'
  | 'transmissionZone'
  | 'province';

export interface WizardTariffFacetValue {
  value: string;
  count: number;
}

export interface WizardTariffSource {
  sourceType: string;
  sourceDocumentId: string;
  sourceTitle: string;
  sourceOrganisation: string;
  sourceUrl: string | null;
  sourceDate: string | null;
  sourceFileName: string | null;
  sourceSha256: string | null;
  sourceNotes: string | null;
}

export interface WizardTariffPeriod {
  periodStart: string;
  periodEnd: string;
  standardRateRandPerKwh: number | null;
  peakRateRandPerKwh: number | null;
  offPeakRateRandPerKwh: number | null;
  fixedMonthlyChargeRand: number | null;
  demandChargeRand: number | null;
  demandChargeBaseUnit: string | null;
  [field: string]: unknown;
}

export interface WizardTariffRecord {
  recordId: string;
  tariffKey: string;
  recordVersion: number;
  status: 'active' | 'superseded';
  supplier: string;
  supplierType: string;
  supplierTypeLabel: string;
  province: string | null;
  tariffName: string;
  tariffCode: string | null;
  direction: string;
  customerCategory: string | null;
  voltageCategory: string | null;
  transmissionZone: string | null;
  energyChargeType: string;
  currency: string;
  vatBasis: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  tariffYearLabel: string;
  periods: WizardTariffPeriod[];
  confirmationStatus: string;
  source: WizardTariffSource;
  summary: string;
  absentPublishedValues: string[];
  unsupportedOutputs: string[];
}

export interface WizardTariffSnapshot {
  recordId: string;
  recordVersion: number;
  tariffKey: string;
  contentFingerprint: string;
  source: WizardTariffSource;
  values: {
    supplier: string;
    tariffName: string;
    tariffYearLabel: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    periods: WizardTariffPeriod[];
    [field: string]: unknown;
  };
  route: WizardTariffRoute;
  evidenceReference: string | null;
  takenAt: string;
  takenByUserId: string;
}

export interface WizardTariffSelection {
  route: WizardTariffRoute | null;
  snapshot: WizardTariffSnapshot | null;
}

export interface WizardTariffSelectionResult extends WizardDraftView {
  populated: string[];
  notPublished: string[];
}

export interface WizardTariffComparisonResult {
  held: boolean;
  latest: WizardTariffRecord | null;
  comparison: {
    recordId: string;
    quotedVersion: number;
    latestVersion: number;
    unchanged: boolean;
    changes: { field: string; quotedValue: unknown; latestValue: unknown }[];
    quotedSource: string;
    latestSource: string;
  } | null;
}

/** A price ARS quoted this customer before, offered rather than applied. */
export interface WizardPriceSuggestion {
  draftId: string;
  reference: string;
  quotedAt: string;
  quotedByName: string | null;
  itemDescription: string | null;
  unitPriceRand: number;
  quantity: number | null;
  machineLabel: string | null;
  specRecordId: string | null;
  sourceLabel: string;
}

/* ------------------------------------------------------------------ *
 * The proposal document itself
 * ------------------------------------------------------------------ */

export interface WizardProposalLine {
  label: string;
  value: string;
  source: string | null;
}

export interface WizardProposalSection {
  id: string;
  title: string;
  lines: WizardProposalLine[];
}

/** A headline figure, and where the proposal may not state it, why not. */
export interface WizardProposalFigure {
  label: string;
  available: boolean;
  unavailableReason: string | null;
}

export type ScientificCalculationStatus =
  | 'complete'
  | 'requires_review'
  | 'unavailable'
  | 'invalid_input';

export type ScientificCalculationProvenance =
  | 'exact_mathematics'
  | 'established_engineering'
  | 'manufacturer_specification'
  | 'approved_assumption'
  | 'business_input'
  | 'user_input';

export type ScientificUncertainty =
  | 'measured'
  | 'derived_exact'
  | 'derived_manufacturer'
  | 'estimated'
  | 'estimated_from_short_record'
  | 'unavailable';

export type ScientificCalculationId =
  | 'CALC-007' | 'CALC-008' | 'CALC-021' | 'CALC-023' | 'CALC-025'
  | 'CALC-030' | 'CALC-031' | 'CALC-032' | 'CALC-033' | 'CALC-034'
  | 'CALC-035' | 'CALC-036' | 'CALC-041' | 'CALC-042' | 'CALC-043'
  | 'CALC-045' | 'CALC-046' | 'CALC-047' | 'CALC-051' | 'CALC-052'
  | 'CALC-053' | 'CALC-056' | 'CALC-058' | 'CALC-059' | 'CALC-060'
  | 'CALC-061' | 'CALC-062' | 'CALC-063' | 'CALC-067' | 'CALC-068'
  | 'CALC-069' | 'CALC-070' | 'CALC-071' | 'CALC-072' | 'CALC-073';

export interface WizardScientificCalculationResult {
  value: number | null;
  unit: string;
  status: ScientificCalculationStatus;
  provenance: ScientificCalculationProvenance;
  uncertainty: ScientificUncertainty;
  calculationId: ScientificCalculationId;
  numericUncertainty: {
    plusMinus: number;
    unit: string;
    basis: 'counter_quantisation';
  } | null;
  messages: string[];
}

export interface WizardOperatingProfileResult {
  perUnitDailyVolumeM3: WizardScientificCalculationResult;
  fleetDailyVolumeM3: WizardScientificCalculationResult;
  fleetMonthlyVolumeM3: WizardScientificCalculationResult;
  fleetAverageFlowM3PerMin24h: WizardScientificCalculationResult;
  totalProfileHoursPerDay: number | null;
  segmentFlowBases: {
    segmentId: string;
    basis: 'flow_fraction' | 'measured_flow_m3_per_min';
    resolvedFlowM3PerMin: number | null;
  }[];
}

export interface WizardCommercialComponentResult {
  componentId: string;
  label: string;
  kind: CommercialComponentKind;
  payer: CommercialPayer;
  responsibility: 'customer' | 'provider' | 'shared' | 'confirmation_required';
  inputAmountRand: number | null;
  inputUnit: 'R/month' | 'R/m3';
  monthlyCostRand: WizardScientificCalculationResult;
}

export interface WizardCommercialScenarioResult {
  scenarioId: string;
  scenarioKind: CommercialScenarioKind;
  combinationStatus:
    | 'confirmed_additive'
    | 'confirmed_alternative'
    | 'unconfirmed_stacking';
  finalChargeConfirmed: boolean;
  baseYear: number;
  escalationBasis: 'annual_compound_from_base_year';
  roundingPolicy: 'unrounded_calculation_display_2dp';
  contractTermMonths: number | null;
  annualEscalationFraction: number | null;
  sourceStatedMonthlyTotalRand: number | null;
  sourceStatedFiveYearTotalRand: number | null;
  sourceTotalReconciliation: {
    monthly:
      | 'not_supplied'
      | 'matches_within_rounding'
      | 'calculation_discrepancy'
      | 'confirmation_required';
    fiveYear:
      | 'not_supplied'
      | 'matches_within_rounding'
      | 'calculation_discrepancy'
      | 'confirmation_required';
    monthlyDifferenceRand: number | null;
    fiveYearDifferenceRand: number | null;
  };
  components: WizardCommercialComponentResult[];
  totalMonthlyCustomerCostRand: WizardScientificCalculationResult;
  fiveYearSchedule: {
    year: number;
    annualCustomerCostRand: WizardScientificCalculationResult;
  }[];
  blockers: string[];
}

export interface WizardClaimAssessment extends ClaimAssessmentInput {
  customerStatementPermitted: boolean;
  blockers: string[];
}

export type WizardSourceCalculatorFinding =
  | 'matched'
  | 'close_match'
  | 'differs'
  | 'accepted_preliminary'
  | 'accepted_datasheet'
  | 'estimated'
  | 'indicative'
  | 'conflict'
  | 'unsupported_at_8_bar'
  | 'not_supported'
  | 'impossible'
  | 'unusable';

export interface WizardSourceCalculatorComparisonRow {
  item: string;
  baofnClaim: string;
  bouwaResult: string;
  difference?: string;
  finding: WizardSourceCalculatorFinding;
  remark: string;
  usedInFinalCalculation: boolean;
  clientFacing: boolean;
}

export type WizardCostDifferenceKind = 'saving' | 'increase' | 'unchanged';

export interface WizardExistingPerformanceScenarioResult {
  id: 'good' | 'typical' | 'older';
  percent: number;
  label: string;
  estimatedExistingFlowM3PerMin: number;
  existingRatedKw: number;
  existingAnnualKwh: number;
  existingAnnualCostRand: number;
  proposedTechnicalKw: number;
  proposedAnnualKwh: number;
  proposedAnnualCostRand: number;
  annualDifferenceRand: number;
  fiveYearDifferenceRand: number;
  electricityDifferencePercent: number;
  costDifferenceKind: WizardCostDifferenceKind;
}

export interface WizardExistingPerformanceSensitivity {
  nameplateFlowM3PerMin: number;
  existingRatedKw: number;
  technicalProposedQuantity: number;
  technicalProposedKw: number;
  commercialProposedQuantity: number | null;
  commercialProposedKw: number | null;
  defaultPercent: number;
  factorMeaning: string;
  customerExplanation: string;
  estimateDisclaimer: string;
  technicalVsCommercialStatement: string;
  correctedSavingEstablished?: boolean;
  correctedSavingReason?: string;
  scenarios: WizardExistingPerformanceScenarioResult[];
}

export interface WizardIllustrativeListedPowerScenario {
  label: string;
  existingListedKw: number | null;
  proposedListedKw: number | null;
  classification: string;
  limitation: string;
  annualDifferenceRand: number | null;
  fiveYearDifferenceRand: number | null;
  electricityDifferencePercent: number | null;
}

export interface WizardSalesSavingsComparison {
  claimedText: string | null;
  claimedPercentMin: number | null;
  claimedPercentMax: number | null;
  bouwaSavingPercent: number | null;
  differencePercentagePoints: number | null;
  estimatedAnnualSavingRand: number | null;
  estimatedFiveYearSavingRand: number | null;
  costDifferenceKind?: WizardCostDifferenceKind | null;
  annualDifferenceLabel?: string;
  fiveYearDifferenceLabel?: string;
  performanceSensitivity?: WizardExistingPerformanceSensitivity | null;
  bouwaAssessment?: string;
  correctedSavingEstablished?: boolean;
  illustrativeListedPower?: WizardIllustrativeListedPowerScenario | null;
  finding: string;
}

export interface WizardCagiReferenceRow {
  model: string;
  pressurePsig: number;
  pressureBarApprox: number;
  maxFadAcfm: number;
  maxFadM3PerMin: number;
  totalInputKw: number | null;
  motorHp: string;
  control: string;
  notes: string;
}

export interface WizardCagiTechnicalReferenceExhibit {
  heading: 'CAGI technical reference';
  notSerialMatched: string;
  statements: string[];
  rows: WizardCagiReferenceRow[];
}

export interface WizardSourceCalculatorComparison {
  heading: 'BAOFN Source Claims vs Bouwa Calculator Results';
  selectedWorkingRateRandPerM3: number;
  rows: WizardSourceCalculatorComparisonRow[];
  savingsComparison?: WizardSalesSavingsComparison;
  performanceSensitivity?: WizardExistingPerformanceSensitivity | null;
  cagiReference?: WizardCagiTechnicalReferenceExhibit | null;
}

export interface WizardCalculationSnapshot {
  schemaVersion: 'bouwa-calculation-snapshot-1.2.0' | 'bouwa-calculation-snapshot-1.3.0';
  snapshotId: string;
  draftRevision: number;
  generatedAt: string;
  configurationSha256: string;
  sourceHashes: string[];
  calculationIds: string[];
  units: string[];
  status: 'complete' | 'requires_review' | 'blocked';
  uncertainty: string[];
  operatingProfiles: {
    equipmentGroupId: string;
    quantity: number;
    manufacturer: string;
    model: string;
    calculation: WizardOperatingProfileResult;
  }[];
  commercialScenarios: WizardCommercialScenarioResult[];
  scenarioDeltas: {
    fromScenarioId: string;
    toScenarioId: string;
    monthlyCustomerCostDeltaRand: WizardScientificCalculationResult;
    fiveYearCustomerCostDeltaRand: WizardScientificCalculationResult;
  }[];
  claimAssessments: WizardClaimAssessment[];
  sourceStatedValues: SourceStatedValueRecord[];
  sourceCalculatorComparison?: WizardSourceCalculatorComparison;
  blockers: string[];
}

export interface WizardProposalNumericFigure {
  label: string;
  value: number | null;
  unit: string;
  available: boolean;
  blockedReason: string | null;
  hypothetical: boolean;
  source: string | null;
}

export type WizardProposalDetailedSectionId =
  | 'customer_site'
  | 'evidence'
  | 'fleet_spec_condition'
  | 'logger_manual_basis'
  | 'electricity_tariff'
  | 'existing_vs_proposed'
  | 'existing_performance_sensitivity'
  | 'cagi_reference'
  | 'existing_energy_cost'
  | 'proposed_energy_cost'
  | 'proposed_scope'
  | 'source_scenario'
  | 'independent_scenario'
  | 'component_comparison'
  | 'five_year'
  | 'savings_roi'
  | 'assumptions'
  | 'missing_evidence'
  | 'discrepancies'
  | 'professional_conclusion';

export interface WizardProposalDetailedSection {
  id: WizardProposalDetailedSectionId;
  title: string;
  figures: WizardProposalNumericFigure[];
  statements: string[];
}

export interface WizardProposalInvestmentLine {
  label: string;
  amountRand: number | null;
  credit: boolean;
  notIncluded: boolean;
}

export interface WizardProposalEvidenceEntry {
  title: string;
  organisation: string | null;
  reference: string | null;
  date: string | null;
  status: string;
}

export interface WizardProposalDocument {
  reference: string;
  version: number;
  issuedAt: string | null;
  issuedByName: string | null;
  preparedByName: string;
  preparedAt: string;
  calculationSnapshotId: string;
  calculationConfigurationSha256: string;
  calculationSnapshot: WizardCalculationSnapshot;
  proposalTypeLabel: string;
  evidenceLevel: WizardEvidenceLevel;
  evidenceLevelLabel: string;
  evidenceLevelStatement: string;
  preliminaryNotice: string | null;
  customerName: string;
  siteName: string | null;
  siteAddress: string | null;
  siteGps: string | null;
  siteLocationRemark: string | null;
  sections: WizardProposalSection[];
  detailedSections: WizardProposalDetailedSection[];
  figures: WizardProposalFigure[];
  investment: {
    itemDescription: string | null;
    unitPriceRand: number | null;
    quantity: number | null;
    equipmentSubtotalRand: number | null;
    lines: WizardProposalInvestmentLine[];
    additionalCostsRand: number | null;
    creditsRand: number | null;
    netInitialInvestmentRand: number | null;
    priceStatement: string;
  };
  evidence: WizardProposalEvidenceEntry[];
  /** What the stated figures take to be true without having proved it. */
  assumptions: WizardProposalAssumption[];
  /** What is still to be supplied, and by when where that is recorded. */
  outstandingEvidence: WizardProposalOutstandingEvidence[];
  limitations: string[];
  customerQuoteSafe: boolean;
  sensitivityNotice: string | null;
  internalOnlyNotice: string | null;
  sourceCalculatorComparison?: WizardSourceCalculatorComparison;
  contentFingerprint: string;
}

export interface WizardProposalAssumption {
  label: string;
  statement: string;
}

export interface WizardProposalOutstandingEvidence {
  label: string;
  statement: string;
  expectedBy: string | null;
}

/** The rendered file kept for a version, where one has been kept. */
export interface WizardProposalDocumentPdf {
  storageId: string;
  filename: string;
  byteLength: number;
  sha256: string;
  storedAt: string;
}

/** A document that was issued. The content is rebuilt, never read back. */
export interface WizardProposalDocumentVersion {
  version: number;
  issuedAt: string;
  issuedByUserId: string;
  issuedByName: string;
  evidenceLevel: WizardEvidenceLevel;
  contentFingerprint: string;
  draftRevision: number;
  calculationSnapshotId: string;
  calculationConfigurationSha256: string;
  calculationSnapshot?: WizardCalculationSnapshot | null;
  customerReleasePermitted?: boolean;
  pdf: WizardProposalDocumentPdf | null;
}

export interface WizardProposalDocumentView {
  draftId: string;
  revision: number;
  document: WizardProposalDocument;
  versions: WizardProposalDocumentVersion[];
  /** True where the last issued version no longer matches the answers. */
  stale: boolean;
}

export interface WizardDraft {
  draftId: string;
  schemaVersion: 'bouwa-wizard-draft-1.0.0';
  reference: string;
  proposalType: WizardProposalType;
  manualBasis: WizardManualBasis | null;
  ownerUserId: string;
  ownerName: string;
  customer: WizardCustomerLink;
  currentStepId: WizardStepId;
  currentPageIndex: number;
  completedStepIds: WizardStepId[];
  intake: AuditIntakeDocument;
  intakeHistory: AuditIntakeHistoryEntry[];
  /** Where each answered value came from, keyed by the answer's intake path. */
  answerProvenance: Record<string, WizardAnswerProvenance>;
  machineSelections: WizardMachineSelections;
  tariffSelection: WizardTariffSelection;
  documentVersions: WizardProposalDocumentVersion[];
  calculationSnapshot: WizardCalculationSnapshot;
  fileParsed: boolean;
  sourceFile: WizardSourceFile | null;
  attachments: WizardAttachment[];
  analysis: unknown | null;
  readinessSummary: WizardReadinessSummary;
  status: 'draft' | 'archived';
  revision: number;
  createdAt: string;
  createdByUserId: string;
  updatedAt: string;
  lastSavedByUserId: string | null;
  lastSavedByName: string | null;
  archivedAt: string | null;
  archivedReason: string | null;
}

/** A value read from the uploaded file, shown in place of a question. */
export interface WizardSourceFact {
  id: string;
  label: string;
  value: string;
  sourceLabel: string;
  unavailable: boolean;
}

export interface WizardDraftView {
  draft: WizardDraft;
  readiness: AuditReadinessAssessment;
  evidenceLevel: WizardEvidenceLevelAssessment;
  sourceFacts: WizardSourceFact[];
  steps: WizardStep[];
  stepPosition: number;
  stepTotal: number;
  assessedAt: string;
  mayEdit?: boolean;
  /** Present on an upload response only. */
  analysis?: unknown;
}

export interface WizardDraftSummary {
  draftId: string;
  reference: string;
  proposalType: WizardProposalType;
  manualBasis: WizardManualBasis | null;
  customer: WizardCustomerLink;
  currentStepId: WizardStepId;
  currentStepTitle: string;
  stepPosition: number;
  stepTotal: number;
  readinessSummary: WizardReadinessSummary;
  ownerName: string;
  ownerUserId: string;
  status: 'draft' | 'archived';
  sourceFilename: string | null;
  attachedDocumentCount: number;
  /** The newest generated proposal document, or zero where none has been. */
  documentVersion: number;
  /** True where a rendered PDF is held and can be handed over as it stands. */
  hasDocumentPdf: boolean;
  updatedAt: string;
  lastSavedByName: string | null;
  revision: number;
  mayEdit: boolean;
}

/**
 * A save refused because the stored draft moved on. The current view travels
 * with it so the user can be shown what is now stored rather than a dead end.
 */
export interface WizardConflict {
  message: string;
  expectedRevision: number;
  actualRevision: number;
  current: WizardDraftView | null;
}

/* The instruments an audit is measured with. */

export type WizardEquipmentType =
  | 'flow_logger'
  | 'flow_sensor'
  | 'pressure_sensor'
  | 'temperature_sensor';

export interface WizardEquipmentRange {
  minimum: number;
  maximum: number;
  unit: string;
}

export interface WizardEquipment {
  equipmentId: string;
  equipmentType: WizardEquipmentType;
  manufacturer: string;
  model: string;
  serialNumber: string | null;
  hardwareVersion: string | null;
  softwareVersion: string | null;
  configurationVersion: string | null;
  measuringRange: WizardEquipmentRange | null;
  referenceBasis: string | null;
  configuredLowFlowCutoffM3PerMin: number | null;
  calibrationDate: string | null;
  calibrationCertificateReference: string | null;
  evidenceReference: string | null;
  notes: string | null;
  isActive: boolean;
}

/** What the catalogue says an instrument of this type may state. */
export interface WizardEquipmentTypeOption {
  id: WizardEquipmentType;
  label: string;
  permittedBases: string[];
}

/* ------------------------------------------------------------------ *
 * The machine specification library
 * ------------------------------------------------------------------ */

export type WizardSpecEquipmentType =
  | 'air_compressor'
  | 'air_dryer'
  | 'air_receiver'
  | 'filtration'
  | 'drain'
  | 'reference_drawing'
  | 'other';

export type WizardSpecSourceType =
  | 'cagi_verified_datasheet'
  | 'cagi_directory'
  | 'oem_datasheet'
  | 'iso_1217_certificate'
  | 'ars_curated_register'
  | 'customer_document';

export interface WizardSpecSource {
  sourceType: WizardSpecSourceType;
  sourceDocumentId: string;
  sourceTitle: string;
  sourceOrganisation: string | null;
  sourceVersion: string | null;
  sourceDate: string | null;
  sourcePageReference: string | null;
  sourceUrl: string | null;
  sourceFileName: string | null;
  sourceSha256: string | null;
}

export interface WizardSpecPartLoadPoint {
  flowM3PerMin: number;
  packageInputPowerKw: number;
}

/**
 * One document's statement about one machine. Every rating is nullable
 * because a null is what the library says when the source printed nothing,
 * and that is a different thing from a zero.
 */
export interface WizardSpecRecord {
  recordId: string;
  recordVersion: number;
  libraryKey: string;
  manufacturer: string;
  model: string;
  modelVariant: string | null;
  equipmentType: WizardSpecEquipmentType;
  compressorType: string | null;
  controlMethod: string | null;
  ratedPressureBarG: number | null;
  ratedFadM3PerMin: number | null;
  flowReferenceBasis: string | null;
  packageInputPowerKw: number | null;
  motorShaftPowerKw: number | null;
  motorEfficiencyFraction: number | null;
  specificPowerKwPerM3PerMin: number | null;
  vsdMinimumFlowM3PerMin: number | null;
  vsdMaximumFlowM3PerMin: number | null;
  partLoadPoints: WizardSpecPartLoadPoint[];
  referenceAbsolutePressurePa: number | null;
  referenceTemperatureK: number | null;
  referenceHumidityBasis: string | null;
  referenceStandardDefinition: string | null;
  allowableAmbientMinimumC: number | null;
  allowableAmbientMaximumC: number | null;
  deratingTableStatus: string;
  source: WizardSpecSource;
  summary: string;
  /** Values this record's source never published. */
  absentPublishedValues: string[];
  /** Outputs this record on its own cannot support. */
  unsupportedOutputs: string[];
}

export type WizardSpecMatchOutcome =
  | 'exact'
  | 'candidates_require_confirmation'
  | 'no_match';

export interface WizardSpecCandidate extends WizardSpecRecord {
  /** What separates this candidate from the others offered beside it. */
  distinguishedBy: string[];
}

export interface WizardSpecMatch {
  outcome: WizardSpecMatchOutcome;
  explanation: string;
  record: WizardSpecRecord | null;
  candidates: WizardSpecCandidate[];
}

/** A machine ARS already holds on its register, without its internal identifier shown. */
export interface WizardInstalledMachine {
  machineId: string;
  manufacturer: string;
  model: string;
  machineType: string | null;
  serialNumber: string | null;
  assetNumber: string | null;
  location: string | null;
  ownership: string | null;
  label: string;
}

export const PROPOSAL_TYPE_LABELS: Record<WizardProposalType, string> = {
  air_audit: 'Air Audit Proposal',
  manual: 'Manual Proposal',
};

export const MANUAL_BASIS_LABELS: Record<WizardManualBasis, string> = {
  site_survey: 'Site survey',
  customer_supplied_information: 'Customer-supplied information',
  manufacturer_information: 'Manufacturer information',
  preliminary_estimate: 'Preliminary estimate',
};
