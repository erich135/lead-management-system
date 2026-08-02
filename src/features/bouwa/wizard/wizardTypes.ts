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

export interface WizardReadinessSummary {
  stage: AuditReadinessStage | null;
  stageLabel: string;
  permittedOutputCount: number;
  blockedOutputCount: number;
  outstandingQuestionCount: number;
  outstandingEvidenceCount: number;
  evaluatedAt: string;
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
