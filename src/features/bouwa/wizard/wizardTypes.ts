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
  AuditReadinessAssessment,
  AuditReadinessStage,
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
  evidenceType: string | null;
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

/** The library record a proposal quotes, exactly as it read when chosen. */
export interface WizardSpecSnapshot {
  recordId: string;
  recordVersion: number;
  libraryKey: string;
  contentFingerprint: string;
  source: WizardSpecSource;
  values: Record<string, unknown>;
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
  proposalTypeLabel: string;
  evidenceLevel: WizardEvidenceLevel;
  evidenceLevelLabel: string;
  evidenceLevelStatement: string;
  preliminaryNotice: string | null;
  customerName: string;
  siteName: string | null;
  siteAddress: string | null;
  sections: WizardProposalSection[];
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
  limitations: string[];
  contentFingerprint: string;
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
  schemaVersion: string;
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

export interface WizardSpecSource {
  sourceType: string;
  sourceDocumentId: string;
  sourceTitle: string;
  sourceOrganisation: string;
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
