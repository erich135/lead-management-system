/**
 * Backend-aligned audit-intake contracts.
 *
 * The intake document itself is deliberately not mirrored field by field. The
 * backend serves a form model that states where every answer lives, so a second
 * hand-written copy of 122 field paths here could only drift. Answers are read
 * and written by path against the shape below.
 */

export type IntakeAnswerState =
  | 'unanswered'
  | 'answered'
  | 'unknown_confirmation_required'
  | 'not_applicable'
  | 'not_listed_add_new';

export interface IntakeAnswer<TValue> {
  state: IntakeAnswerState;
  value: TValue | null;
  note: string | null;
}

export type AuditFieldStatusCode =
  | 'missing'
  | 'answered'
  | 'confirmed'
  | 'unknown_confirmation_required'
  | 'not_applicable'
  | 'not_listed_add_new'
  | 'invalid'
  | 'not_required';

export type AuditReadinessStage =
  | 'file_parsed'
  | 'measured_audit_ready'
  | 'engineering_comparison_ready'
  | 'commercial_proposal_ready';

export type AuditIntakeSection =
  | 'identity'
  | 'logger'
  | 'flow_sensor'
  | 'pressure_sensor'
  | 'temperature_sensor'
  | 'existing_machine'
  | 'proposed_machine'
  | 'operating_conditions'
  | 'tariff'
  | 'investment';

export type AuditOutputId =
  | 'raw_observations'
  | 'data_quality'
  | 'measured_demand'
  | 'volume_balance'
  | 'flow_statistics'
  | 'pressure_observations'
  | 'coverage_and_provenance'
  | 'annualised_demand'
  | 'existing_machine_energy_model'
  | 'proposed_machine_energy_model'
  | 'engineering_comparison'
  | 'annual_electricity_cost'
  | 'monetary_saving'
  | 'net_investment'
  | 'simple_payback'
  | 'simple_roi';

export interface AuditFieldStatus {
  code: string;
  section: AuditIntakeSection;
  label: string;
  whyItMatters: string;
  status: AuditFieldStatusCode;
  applicable: boolean;
  resolved: boolean;
  confirmed: boolean;
  resolvedForStage: AuditReadinessStage | null;
  confirmedForStage: AuditReadinessStage | null;
  dependentOutputs: AuditOutputId[];
  requiredEvidence: string[];
  message: string;
}

export interface AuditStageEligibility {
  stage: AuditReadinessStage;
  label: string;
  eligible: boolean;
  blockingFieldCodes: string[];
  reasons: string[];
}

export interface AuditBlockedOutput {
  outputId: AuditOutputId;
  label: string;
  requiredStage: AuditReadinessStage;
  blockingFieldCodes: string[];
  reasons: string[];
}

export interface AuditExternalEvidenceBlocker {
  code: string;
  label: string;
  whyItMatters: string;
  requiredEvidence: string[];
  dependentOutputs: AuditOutputId[];
  responsiblePerson: string | null;
  expectedConfirmationDate: string | null;
}

export interface AuditComparisonCheck {
  id: string;
  status: string;
  message: string;
}

export interface AuditLikeForLikeComparison {
  eligible: boolean;
  checks: AuditComparisonCheck[];
  blockedOutputs: string[];
}

export interface AuditReadinessAssessment {
  intakeSchemaVersion: string;
  stage: AuditReadinessStage | null;
  stageLabel: string;
  stageEligibility: AuditStageEligibility[];
  missingFieldCodes: string[];
  confirmationRequiredCodes: string[];
  invalidFieldCodes: string[];
  fieldStatuses: AuditFieldStatus[];
  messages: string[];
  permittedOutputs: AuditOutputId[];
  blockedOutputs: AuditBlockedOutput[];
  comparison: AuditLikeForLikeComparison;
  annualOperatingHours: number | null;
  externalEvidenceBlockers: AuditExternalEvidenceBlocker[];
}

export type AuditEvidenceConfirmationStatus =
  | 'confirmed'
  | 'provided_pending_review'
  | 'requested'
  | 'unavailable'
  | 'not_applicable';

export interface AuditEvidenceReference {
  id: string;
  evidenceType: string;
  filename: string | null;
  documentReference: string | null;
  sourceOrganisation: string | null;
  documentDate: string | null;
  version: string | null;
  confirmationStatus: AuditEvidenceConfirmationStatus;
  notes: string | null;
  sourceUrl: string | null;
  responsiblePerson: string | null;
  expectedConfirmationDate: string | null;
}

export interface AuditIntakeDocument {
  intakeSchemaVersion: string;
  evidence: AuditEvidenceReference[];
  [section: string]: unknown;
}

export interface AuditIntakeState {
  proposalRecordId: string;
  fileParsed: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  intake: AuditIntakeDocument;
  readiness: AuditReadinessAssessment;
}

export type AuditFieldValueKind =
  | 'text'
  | 'long_text'
  | 'number'
  | 'integer'
  | 'date'
  | 'sha256'
  | 'selection';

export interface AuditSelectionOption {
  value: string;
  label: string;
}

export interface AuditFormField {
  code: string;
  path: string;
  valueKind: AuditFieldValueKind;
  unit: string | null;
  options: AuditSelectionOption[];
  permittedAnswerStates: IntakeAnswerState[];
}

export interface AuditFormSection {
  id: AuditIntakeSection;
  label: string;
  description: string;
}

export interface AuditIntakeFormModel {
  intakeSchemaVersion: string;
  sections: AuditFormSection[];
  fields: AuditFormField[];
  evidenceTypes: AuditSelectionOption[];
  evidenceStatuses: AuditSelectionOption[];
}
