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

export interface AuditIntakeHistoryEntry {
  at: string;
  by: string | null;
  source: 'operator_edit' | 'parsed_logger_source';
  changedFieldCodes: string[];
  changedEvidenceIds: string[];
}

export type AuditIntakeSection =
  | 'identity'
  | 'logger'
  | 'flow_sensor'
  | 'pressure_sensor'
  | 'temperature_sensor'
  | 'existing_machine'
  | 'proposed_machine'
  | 'operating_conditions'
  | 'site_conditions'
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
  | 'site_corrected_capacity'
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
  /** False where the proposal type has no such stage, as a manual proposal has no measurement. */
  applicable: boolean;
  blockingFieldCodes: string[];
  reasons: string[];
}

export interface AuditBlockedOutput {
  outputId: AuditOutputId;
  label: string;
  requiredStage: AuditReadinessStage;
  blockingFieldCodes: string[];
  reasons: string[];
  /** False where this kind of proposal never produces the output at all. */
  applicableToProposalType: boolean;
}

export interface AuditExternalEvidenceBlocker {
  code: string;
  label: string;
  whyItMatters: string;
  requiredEvidence: string[];
  dependentOutputs: AuditOutputId[];
  responsiblePerson: string | null;
  expectedConfirmationDate: string | null;
  fieldStatus: AuditFieldStatusCode;
  evidenceId: string | null;
  evidenceStatus: AuditEvidenceConfirmationStatus | null;
  notes: string | null;
}

/**
 * A gap the form cannot close, because the calculation that would consume the
 * evidence does not exist yet. Presented apart from the ordinary blockers so
 * an operator does not keep hunting for a document that would change nothing.
 */
export interface AuditUnavailableDependency {
  code: string;
  label: string;
  reason: string;
  blockedOutputs: AuditOutputId[];
  requiredEvidence: string[];
  intakeFieldCodes: string[];
  clearableByIntake: false;
}

/**
 * One basis the two machines are compared on. The backend names the field and
 * the reason code; there is no opaque identifier, and there was never one to
 * read.
 */
export interface AuditComparisonCheck {
  field: string;
  status: string;
  unit: string | null;
  existingValue: number | string | null;
  proposedValue: number | string | null;
  reasonCode: string;
  message: string;
}

export interface AuditLikeForLikeComparison {
  status: string;
  eligible: boolean;
  checks: AuditComparisonCheck[];
  reasonCodes: string[];
  messages: string[];
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
  unavailableDependencies: AuditUnavailableDependency[];
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

export type ScientificProvenance =
  | 'exact_mathematics'
  | 'established_engineering'
  | 'manufacturer_specification'
  | 'approved_assumption'
  | 'business_input'
  | 'user_input';

/**
 * One Step 14 input as the backend resolved it. `value` is null whenever
 * `confirmed` is false, so the panel never has to decide for itself whether a
 * figure may be shown as wired.
 */
export interface ResolvedInput<TValue> {
  fieldCode: string;
  value: TValue | null;
  confirmed: boolean;
  provenance: ScientificProvenance | null;
  reason: string;
}

export interface ResolvedAnnualOperatingHours extends ResolvedInput<number> {
  status: string | null;
  approver: string | null;
  evidenceReference: string | null;
}

export interface ResolvedMachineComparisonBasis {
  dischargePressureBarG: number | null;
  flowReferenceBasis: string | null;
}

export interface ResolvedMachineInputs {
  dischargePressureBarG: ResolvedInput<number>;
  ratedFadM3PerMin: ResolvedInput<number>;
  flowReferenceBasis: ResolvedInput<string>;
  declaredPowerKw: ResolvedInput<number>;
  powerBasis: string;
  motorEfficiency: ResolvedInput<number>;
  reviewRequired: boolean;
  electricalInput: {
    declaredPowerKw: number | null;
    powerBasis: string;
    motorEfficiency: number | null;
  };
}

export interface ResolvedScientificInputs {
  annualOperatingHours: ResolvedAnnualOperatingHours;
  logger: {
    channelBasis: { flow: string; pressure: string };
    lowFlowCutOffM3PerMin: number | null;
  };
  measuredFlowReferenceBasis: ResolvedInput<string>;
  measuredPressureBasis: ResolvedInput<string>;
  lowFlowCutOff: ResolvedInput<number>;
  existingMachine: ResolvedMachineInputs;
  proposedMachine: ResolvedMachineInputs;
  comparison: {
    existing: ResolvedMachineComparisonBasis;
    proposed: ResolvedMachineComparisonBasis;
  };
  representativePeriod: ResolvedInput<string>;
  proposedPartLoadCurveRequired: boolean;
  proposedPartLoadCurvePointCount: number;
  tariff: { confirmed: boolean; reasons: string[] };
  measuredDemand: { annualOperatingHours: number | null };
}

export interface AuditIntakeState {
  proposalRecordId: string;
  fileParsed: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  intake: AuditIntakeDocument;
  readiness: AuditReadinessAssessment;
  scientificInputs: ResolvedScientificInputs;
  history: AuditIntakeHistoryEntry[];
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

/**
 * How a person enters a value the intake stores in another unit.
 *
 * Nobody reads a thermometer in kelvin and nobody writes a motor efficiency as
 * 0.92, so the backend states the unit to ask for and the conversion between
 * the two. The browser does the arithmetic to keep the box responsive; the
 * backend does it again and refuses a value that could only have arrived
 * unconverted, so a mistake here cannot reach the energy model.
 */
export type AuditEntryConversion = 'celsius_to_kelvin' | 'percent_to_fraction';

export interface AuditFieldEntry {
  unit: string;
  conversion: AuditEntryConversion;
  minimum: number;
  maximum: number;
  decimals: number;
}

export interface AuditFormField {
  code: string;
  path: string;
  valueKind: AuditFieldValueKind;
  unit: string | null;
  entry: AuditFieldEntry | null;
  options: AuditSelectionOption[];
  permittedAnswerStates: IntakeAnswerState[];
}

export interface AuditFormSection {
  id: AuditIntakeSection;
  label: string;
  description: string;
}

export interface AuditOutputDefinition {
  id: AuditOutputId;
  label: string;
  requiredStage: AuditReadinessStage;
}

export interface AuditIntakeFormModel {
  intakeSchemaVersion: string;
  sections: AuditFormSection[];
  fields: AuditFormField[];
  evidenceTypes: AuditSelectionOption[];
  evidenceStatuses: AuditSelectionOption[];
  outputs: AuditOutputDefinition[];
}
