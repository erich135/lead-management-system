export type ProposalMode = 'logger_analysis' | 'site_survey' | 'preliminary_no_measured_data';
export type InputNature = 'measured' | 'documented' | 'manual' | 'estimate' | 'assumption' | 'unknown';
export type SourceType =
  | 'logger_upload'
  | 'bouwa_technician_measurement'
  | 'site_measurement'
  | 'customer_document'
  | 'customer_verbal'
  | 'manufacturer_document'
  | 'calibration_certificate'
  | 'questionnaire'
  | 'site_interview'
  | 'engineering_judgement'
  | 'commercial_source'
  | 'user_entry'
  | 'not_provided';
export type EvidenceStatus = 'attached' | 'requested' | 'unavailable' | 'not_applicable';
export type EvidenceCategory =
  | 'customer_document'
  | 'manufacturer_document'
  | 'calibration_certificate'
  | 'technician_measurement'
  | 'site_photograph'
  | 'other_supporting_document';
export type ValueVerificationType =
  | 'technician_measurement_reviewed'
  | 'manufacturer_documentation_confirms_value'
  | 'customer_statement_recorded_unverified'
  | 'engineering_estimate_approved_for_provisional_use';
export type FieldValueVerificationStatus =
  | 'verified'
  | 'provisional_use'
  | 'recorded_unverified'
  | 'unverified';
export type ConfidenceStatus = 'confirmed' | 'supported' | 'provisional' | 'unknown';
export type ApprovalStatus =
  | 'not_required'
  | 'draft'
  | 'submitted'
  | 'technically_approved'
  | 'commercially_approved'
  | 'rejected';
export type ValidationStatus =
  | 'valid'
  | 'provisional'
  | 'contradictory'
  | 'missing'
  | 'not_applicable'
  | 'blocked_pending_evidence';
export type SettingsPackageStatus =
  | 'draft'
  | 'submitted_for_technical_review'
  | 'technically_approved'
  | 'commercially_approved'
  | 'rejected'
  | 'superseded';
export type ProposalRole =
  | 'data_entry_user'
  | 'commercial_preparer'
  | 'technical_reviewer'
  | 'technical_approver'
  | 'commercial_approver';
export type WorkflowAction =
  | 'save_draft'
  | 'submit_for_technical_review'
  | 'return_for_correction'
  | 'reject'
  | 'approve_technically'
  | 'approve_commercially'
  | 'supersede'
  | 'create_settings_version'
  | 'acknowledge_provisional_input';

export interface ProposalField {
  id: string;
  section: string;
  name: string;
  description: string;
  questionnaireReference: string;
  value: unknown;
  unit: string;
  nature: InputNature;
  source: {
    type: SourceType;
    person: string;
    date: string;
    documentReference: string;
  };
  notes: string;
  evidenceStatus: EvidenceStatus;
  confidenceStatus: ConfidenceStatus;
  approval: {
    status: ApprovalStatus;
    reviewer: string;
    date: string;
    reason: string;
  };
  calculationEffect: string;
  validationStatus: ValidationStatus;
  valueVerificationStatus: FieldValueVerificationStatus;
  requiredForOutputs: string[];
  requiredEvidence: string[];
  provisionalAcknowledgement: {
    recordId: string;
    proposalRecordId: string;
    proposalId: string;
    fieldId: string;
    settingsVersion: number;
    contentHash: string;
    acknowledged: boolean;
    by: string;
    role: ProposalRole | '';
    date: string;
    reason: string;
    material: boolean;
  } | null;
}

export interface WorkflowEvent {
  sequence: number;
  action: WorkflowAction | 'created' | 'imported_unverified_history';
  actor: string;
  role: ProposalRole | '';
  at: string;
  fromStatus: SettingsPackageStatus | null;
  toStatus: SettingsPackageStatus;
  reason: string;
  version: number;
  proposalRecordId: string;
  proposalId: string;
  fieldId: string | null;
  recordId: string | null;
  contentHash: string;
}

export interface AnalysisAttestationLink {
  analysisId: string;
  proposalRecordId: string;
  proposalId: string;
  settingsVersion: number;
  sourceFilename: string;
  sourceSha256: string;
  resultHash: string;
  parserProfile: string;
  parserVersion: string;
  analysedAt: string;
}

export interface EvidenceRecordLink {
  evidenceId: string;
  proposalRecordId: string;
  proposalId: string;
  fieldIds: string[];
  filename: string;
  sha256: string;
  sizeBytes: number;
  mimeType: string;
  category: EvidenceCategory;
  uploadedAt: string;
  uploaderId: string;
  uploaderDisplayName: string;
  notes: string;
  physicalFileStatement: string;
}

export interface ValueVerificationLink {
  verificationId: string;
  proposalRecordId: string;
  fieldId: string;
  settingsVersion: number;
  proposalContentHash: string;
  fieldValueHash: string;
  unit: string;
  evidenceRecordIds: string[];
  verificationType: ValueVerificationType;
  verifierId: string;
  verifierDisplayName: string;
  verifierRole: ProposalRole;
  verifiedAt: string;
  result: 'verified' | 'recorded_unverified' | 'rejected';
  notes: string;
  status: 'active' | 'superseded' | 'revoked';
  statusReason: string;
  statusChangedAt: string;
}

export interface ImportedHistory {
  trustStatus: 'unverified_transport_history';
  importedProposalRecordId: string;
  importedStatus: SettingsPackageStatus;
  importedContentHash: string;
  importedAuditTrail: WorkflowEvent[];
  importedAnalysisLink: AnalysisAttestationLink | null;
  importedEvidenceLinks: EvidenceRecordLink[];
  importedValueVerificationLinks: ValueVerificationLink[];
  importedAt: string;
  statement: string;
  priorImportedHistory: ImportedHistory | null;
}

export interface ProposalPackage {
  schemaVersion: 'bouwa-proposal-package-2';
  proposalRecordId: string;
  recordRevision: number;
  parentSettingsVersion: number | null;
  parentContentHash: string | null;
  proposalId: string;
  proposalName: string;
  siteName: string;
  customerName: string;
  mode: ProposalMode;
  settingsVersion: number;
  settingsVersionLabel: string;
  contentHash: string;
  status: SettingsPackageStatus;
  createdAt: string;
  createdBy: string;
  supersedesVersion: number | null;
  analysisLink: AnalysisAttestationLink | null;
  evidenceLinks: EvidenceRecordLink[];
  valueVerificationLinks: ValueVerificationLink[];
  inputs: ProposalField[];
  engineeringSettings: ProposalField[];
  auditTrail: WorkflowEvent[];
  importedHistory: ImportedHistory | null;
}

export interface ReadinessItem {
  id: string;
  severity: 'hard' | 'soft';
  title: string;
  explanation: string;
  affectedOutputs: string[];
  actions: Array<{
    label: string;
    fieldId: string;
    action: 'edit_field' | 'acknowledge_provisional' | 'review_evidence';
  }>;
}

export interface ProposalOutput {
  id: string;
  name: string;
  description: string;
  nature: InputNature;
  source: string;
  basis: string;
  status: 'available' | 'available_with_caveat' | 'unavailable';
  reason: string;
  confidenceCategory: string;
}

export interface ProposalEvaluation {
  package: ProposalPackage;
  dirty: boolean;
  versionLabel: string;
  savedContentHash: string;
  workingContentHash: string;
  progress: {
    resolved: number;
    total: number;
    percent: number;
    hardBlockers: number;
    softWarnings: number;
  };
  readiness: ReadinessItem[];
  outputs: ProposalOutput[];
  confidence: {
    modelVersion: string;
    score: number;
    label: 'High' | 'Moderate' | 'Preliminary' | 'Low';
    categories: Array<{
      id: string;
      label: string;
      score: number;
      weight: number;
      explanation: string;
    }>;
    disclaimer: string;
  };
  reportText: string | null;
  draftReportText: string | null;
  exportJson: string | null;
}

export interface ProposalFieldUpdate {
  id: string;
  name: string;
  description: string;
  questionnaireReference: string;
  value: unknown;
  unit: string;
  source: ProposalField['source'];
  notes: string;
}

export interface LocalIdentity {
  id: string;
  displayName: string;
  role: ProposalRole;
}

export interface LocalSession {
  token: string;
  expiresAt: string;
  identity: LocalIdentity;
}
