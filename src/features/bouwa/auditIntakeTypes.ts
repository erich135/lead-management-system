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
  requiredEvidence: AuditEvidenceType[];
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
  requiredEvidence: AuditEvidenceType[];
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
  requiredEvidence: AuditEvidenceType[];
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

export type AuditEvidenceType =
  | 'logger_export'
  | 'logger_configuration_record'
  | 'flow_sensor_configuration'
  | 'flow_sensor_calibration_certificate'
  | 'pressure_sensor_calibration_certificate'
  | 'existing_machine_datasheet'
  | 'existing_machine_nameplate_photograph'
  | 'proposed_machine_datasheet'
  | 'proposed_machine_part_load_curve'
  | 'manufacturer_derating_table'
  | 'site_altitude_record'
  | 'operating_hours_confirmation'
  | 'production_schedule'
  | 'electricity_bill'
  | 'supply_agreement'
  | 'tariff_schedule'
  | 'commercial_contract'
  | 'maintenance_records'
  | 'numeric_guarantee_conditions'
  | 'exact_machine_performance'
  | 'other_supporting_document';

export interface AuditEvidenceReference {
  id: string;
  evidenceType: AuditEvidenceType;
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

export type AuditMachineSpecProvenance =
  | 'exact_manufacturer_document'
  | 'exact_library_match'
  | 'customer_supplied'
  | 'source_document'
  | 'nearest_model_reference_only'
  | 'unconfirmed';

export type AuditOperatingProfileFlowBasis =
  | 'flow_fraction'
  | 'measured_flow_m3_per_min';

export type AuditCommercialResponsibility =
  | 'customer'
  | 'provider'
  | 'shared'
  | 'confirmation_required';

export type CommercialComponentKind =
  | 'fixed_service'
  | 'variable_volume'
  | 'customer_electricity'
  | 'customer_maintenance';

export type CommercialPayer = 'customer' | 'provider' | 'shared';
export type CommercialScenarioKind = 'source' | 'independent';
export type ChargeCombinationStatus =
  | 'confirmed_additive'
  | 'confirmed_alternative'
  | 'unconfirmed_stacking';
export type CommercialEscalationBasis = 'annual_compound_from_base_year';
export type CommercialRoundingPolicy = 'unrounded_calculation_display_2dp';
export type SourceVerificationStatus =
  | 'verified'
  | 'unverified_internal_only'
  | 'confirmation_required';

export interface ProvenanceActor {
  actorId: string;
  actorName: string;
}

/** The source value is immutable; an override is carried separately as currentValue. */
export interface RecordValueProvenance<TValue = unknown> {
  sourceValue: TValue | null;
  currentValue: TValue | null;
  sourceReference: string | null;
  sourceFilename: string | null;
  sourceSha256: string | null;
  sourcePage: number | null;
  sourceText: string | null;
  evidenceIds: string[];
  verificationStatus: SourceVerificationStatus;
  overrideReason: string | null;
  actor: ProvenanceActor | null;
  recordedAt: string | null;
}

export interface SourceStatedValueRecord {
  valueId: string;
  label: string;
  value: number | string;
  unit: string;
  provenance: RecordValueProvenance<number | string>;
}

export interface AuditEquipmentGroup {
  groupId: string;
  role: 'existing' | 'proposed';
  quantity: number;
  manufacturer: string;
  model: string;
  ratedFlowM3PerMin: number | null;
  ratedPressureBarG: number | null;
  machineProvenance: AuditMachineSpecProvenance;
  specificationProvenance: AuditMachineSpecProvenance;
  machineEvidenceIds: string[];
  specificationEvidenceIds: string[];
  exactLibraryMatch: boolean;
  provenance: RecordValueProvenance;
}

export interface AuditOperatingProfileSegment {
  segmentId: string;
  label: string;
  hoursPerDay: number;
  flowBasis: AuditOperatingProfileFlowBasis;
  flowFraction: number | null;
  measuredFlowM3PerMin: number | null;
  loadFraction: number | null;
  sourceReference: string;
  confirmed: boolean;
  provenance: RecordValueProvenance;
}

export interface AuditRecurringCommercialCostComponent {
  componentId: string;
  label: string;
  kind: CommercialComponentKind;
  payer: CommercialPayer;
  responsibility: AuditCommercialResponsibility;
  amountRand: number | null;
  sourceReference: string;
  confirmed: boolean;
  provenance: RecordValueProvenance;
}

export interface AuditCommercialScenario {
  scenarioId: string;
  label: string;
  scenarioKind: CommercialScenarioKind;
  equipmentGroupId: string;
  componentIds: string[];
  combinationStatus: ChargeCombinationStatus;
  contractTermMonths: number | null;
  annualEscalationFraction: number | null;
  baseYear: number;
  escalationBasis: CommercialEscalationBasis;
  roundingPolicy: CommercialRoundingPolicy;
  sourceStatedMonthlyTotalRand: number | null;
  sourceStatedFiveYearTotalRand: number | null;
  requiredComponentKinds: CommercialComponentKind[];
  daysPerMonth: number;
  sourceReference: string;
  provenance: RecordValueProvenance;
}

export type ClaimAssessmentStatus =
  | 'supported'
  | 'reproducible'
  | 'not_independently_reproducible'
  | 'unsupported_by_supplied_evidence'
  | 'calculation_discrepancy'
  | 'unit_discrepancy'
  | 'confirmation_required';
export type ClaimReviewStatus = 'pending_review' | 'reviewed' | 'approved';

export interface ClaimSourceExcerpt {
  sourceFilename: string;
  sourceSha256: string;
  page: number | null;
  text: string;
}

export interface ClaimIndependentResult {
  value: number | null;
  unit: string | null;
  calculationId: string | null;
  explanation: string;
}

export interface ClaimAssessmentInput {
  claimId: string;
  claim: string;
  source: ClaimSourceExcerpt;
  evidenceIds: string[];
  independentResult: ClaimIndependentResult | null;
  sourceValue: number | null;
  sourceUnit: string | null;
  materiality: string;
  status: ClaimAssessmentStatus;
  reviewerStatus: ClaimReviewStatus;
  reviewerName: string | null;
  reviewerNotes: string | null;
}

export interface AuditMethod {
  proposalType: IntakeAnswer<'air_audit' | 'manual'>;
  manualBasis: IntakeAnswer<
    | 'site_survey'
    | 'customer_supplied_information'
    | 'manufacturer_information'
    | 'preliminary_estimate'
  >;
}

export interface AuditIdentity {
  customerId: IntakeAnswer<string>;
  customerName: IntakeAnswer<string>;
  siteId: IntakeAnswer<string>;
  siteName: IntakeAnswer<string>;
  physicalAddress: IntakeAnswer<string>;
  municipality: IntakeAnswer<string>;
  gpsReference: IntakeAnswer<string>;
  gpsSource: IntakeAnswer<
    | 'ars_customer_address'
    | 'ars_machine_location'
    | 'map_lookup'
    | 'user_supplied'
    | 'verified_survey'
  >;
  auditStartDate: IntakeAnswer<string>;
  auditEndDate: IntakeAnswer<string>;
  sourceLoggerFilename: IntakeAnswer<string>;
  sourceLoggerSha256: IntakeAnswer<string>;
  auditPeriodCondition: IntakeAnswer<
    | 'representative_normal_operation'
    | 'representative_with_stated_exceptions'
    | 'short_record_estimate'
    | 'abnormal_operation'
  >;
  operatingConditionNotes: IntakeAnswer<string>;
  technicalConfirmerName: IntakeAnswer<string>;
}

export interface AuditLoggerDetails {
  manufacturer: IntakeAnswer<string>;
  model: IntakeAnswer<string>;
  serialNumber: IntakeAnswer<string>;
  hardwareVersion: IntakeAnswer<string>;
  softwareVersion: IntakeAnswer<string>;
  exportFormatIdentity: IntakeAnswer<string>;
  configurationVersion: IntakeAnswer<string>;
}

type AuditInstallationPosition =
  | 'compressor_discharge'
  | 'after_dryer'
  | 'main_header'
  | 'branch_line'
  | 'receiver_outlet'
  | 'other';
type AuditFlowReferenceBasis =
  | 'actual_volumetric'
  | 'standard_volumetric'
  | 'free_air_delivery'
  | 'delivered_downstream'
  | 'mass_flow'
  | 'other_manufacturer_defined';

export interface AuditFlowSensor {
  manufacturer: IntakeAnswer<string>;
  model: IntakeAnswer<string>;
  serialNumber: IntakeAnswer<string>;
  pipeDiameterMm: IntakeAnswer<number>;
  installationPosition: IntakeAnswer<AuditInstallationPosition>;
  installationPositionDescription: IntakeAnswer<string>;
  measuringUnit: IntakeAnswer<'m3_per_min' | 'm3_per_h' | 'l_per_min' | 'cfm'>;
  measuringRangeMinimumM3PerMin: IntakeAnswer<number>;
  measuringRangeMaximumM3PerMin: IntakeAnswer<number>;
  lowestUsableFlowM3PerMin: IntakeAnswer<number>;
  configuredLowFlowCutOffM3PerMin: IntakeAnswer<number>;
  flowReferenceBasis: IntakeAnswer<AuditFlowReferenceBasis>;
  referenceAbsolutePressurePa: IntakeAnswer<number>;
  referenceTemperatureK: IntakeAnswer<number>;
  referenceHumidityBasis: IntakeAnswer<
    'dry_zero_percent_rh' | 'stated_relative_humidity' | 'saturated'
  >;
  referenceRelativeHumidityPercent: IntakeAnswer<number>;
  referenceStandardDefinition: IntakeAnswer<string>;
  calibrationDate: IntakeAnswer<string>;
  calibrationCertificateReference: IntakeAnswer<string>;
  configurationEvidenceReference: IntakeAnswer<string>;
}

export interface AuditPressureSensor {
  usage: IntakeAnswer<'used' | 'not_used'>;
  manufacturer: IntakeAnswer<string>;
  model: IntakeAnswer<string>;
  serialNumber: IntakeAnswer<string>;
  installationPosition: IntakeAnswer<AuditInstallationPosition>;
  installationPositionDescription: IntakeAnswer<string>;
  measuringRangeMinimumBar: IntakeAnswer<number>;
  measuringRangeMaximumBar: IntakeAnswer<number>;
  pressureBasis: IntakeAnswer<'gauge' | 'absolute' | 'differential'>;
  differentialHighPoint: IntakeAnswer<string>;
  differentialLowPoint: IntakeAnswer<string>;
  calibrationDate: IntakeAnswer<string>;
  calibrationCertificateReference: IntakeAnswer<string>;
}

export interface AuditTemperatureSensor {
  usage: IntakeAnswer<'used' | 'not_used'>;
  manufacturer: IntakeAnswer<string>;
  model: IntakeAnswer<string>;
  measuredQuantity: IntakeAnswer<
    'ambient_air' | 'compressed_air_discharge' | 'cooling_water' | 'other'
  >;
  location: IntakeAnswer<string>;
  unit: IntakeAnswer<'celsius' | 'kelvin' | 'fahrenheit'>;
  correctionUse: IntakeAnswer<'used_in_corrections' | 'not_used_in_corrections'>;
}

type AuditMachineType =
  | 'rotary_screw_oil_injected'
  | 'rotary_screw_oil_free'
  | 'reciprocating'
  | 'centrifugal'
  | 'scroll'
  | 'other';
type AuditControlMethod =
  | 'fixed_speed_load_unload'
  | 'fixed_speed_modulation'
  | 'variable_speed_drive'
  | 'sequenced_multiple_machines'
  | 'other';
type AuditPowerBasis =
  | 'measured_package_electrical_input'
  | 'measured_motor_electrical_input'
  | 'shaft_output'
  | 'motor_nameplate_rating'
  | 'manufacturer_package_input';

export interface AuditExistingMachine {
  selectionMode: IntakeAnswer<'existing_catalog_machine' | 'new_equipment'>;
  arsMachineId: IntakeAnswer<string>;
  manufacturer: IntakeAnswer<string>;
  model: IntakeAnswer<string>;
  serialNumber: IntakeAnswer<string>;
  machineType: IntakeAnswer<AuditMachineType>;
  controlMethod: IntakeAnswer<AuditControlMethod>;
  ratedDischargePressureBarG: IntakeAnswer<number>;
  ratedFadM3PerMin: IntakeAnswer<number>;
  ratedFlowReferenceBasis: IntakeAnswer<AuditFlowReferenceBasis>;
  packageInputPowerKw: IntakeAnswer<number>;
  motorNameplatePowerKw: IntakeAnswer<number>;
  powerBasis: IntakeAnswer<AuditPowerBasis>;
  motorEfficiency: IntakeAnswer<number>;
  loadedFraction: IntakeAnswer<number>;
  unloadedInputPowerKw: IntakeAnswer<number>;
  manufacturerEvidenceReference: IntakeAnswer<string>;
}

export interface AuditPartLoadPoint {
  flowM3PerMin: number;
  packageInputPowerKw: number;
}

export interface AuditProposedMachine {
  selectionMode: IntakeAnswer<'existing_catalog_machine' | 'new_equipment'>;
  arsMachineId: IntakeAnswer<string>;
  manufacturer: IntakeAnswer<string>;
  model: IntakeAnswer<string>;
  machineType: IntakeAnswer<AuditMachineType>;
  controlMethod: IntakeAnswer<AuditControlMethod>;
  ratedDischargePressureBarG: IntakeAnswer<number>;
  ratedFadM3PerMin: IntakeAnswer<number>;
  ratedFlowReferenceBasis: IntakeAnswer<AuditFlowReferenceBasis>;
  packageInputPowerKw: IntakeAnswer<number>;
  specificPowerKwPerM3PerMin: IntakeAnswer<number>;
  powerBasis: IntakeAnswer<AuditPowerBasis>;
  motorEfficiency: IntakeAnswer<number>;
  vsdMinimumFlowM3PerMin: IntakeAnswer<number>;
  vsdMaximumFlowM3PerMin: IntakeAnswer<number>;
  partLoadCurvePoints: AuditPartLoadPoint[];
  partLoadCurveEvidenceReference: IntakeAnswer<string>;
  manufacturerSource: IntakeAnswer<string>;
}

export interface AuditOperatingConditions {
  annualOperatingHours: IntakeAnswer<number>;
  annualOperatingHoursStatus: IntakeAnswer<
    | 'confirmed_by_customer'
    | 'signed_operating_hours_declaration'
    | 'confirmed_from_production_schedule'
    | 'machine_hour_meter_reading'
    | 'service_or_maintenance_records'
    | 'runtime_report_scada_bms_plc'
    | 'electricity_or_production_records'
    | 'site_survey_notes'
    | 'approved_assumption'
    | 'other_specified'
    | 'evidence_not_yet_available'
  >;
  annualOperatingHoursEvidenceReference: IntakeAnswer<string>;
  annualOperatingHoursOtherBasis: IntakeAnswer<string>;
  annualOperatingHoursConfirmedBy: IntakeAnswer<string>;
  annualOperatingHoursConfirmedOn: IntakeAnswer<string>;
  annualOperatingHoursEvidenceNotes: IntakeAnswer<string>;
  annualOperatingHoursApprover: IntakeAnswer<string>;
  operatingDaysPerWeek: IntakeAnswer<number>;
  shiftsPerDay: IntakeAnswer<number>;
  representativePeriodStatus: IntakeAnswer<
    'representative_confirmed' | 'approved_assumption' | 'not_representative'
  >;
  representativePeriodBasis: IntakeAnswer<
    | 'measured_record_four_weeks_or_more'
    | 'documented_production_schedule'
    | 'customer_statement'
  >;
  representativePeriodEvidenceReference: IntakeAnswer<string>;
  representativePeriodApprover: IntakeAnswer<string>;
}

export interface AuditSiteConditions {
  altitudeM: IntakeAnswer<number>;
  altitudeSource: IntakeAnswer<
    | 'surveyed_site_record'
    | 'gps_measurement'
    | 'published_map_reference'
    | 'measured_site_barometric_pressure'
  >;
  measuredAtmosphericPressurePa: IntakeAnswer<number>;
  ambientTemperatureK: IntakeAnswer<number>;
  manufacturerDeratingAvailability: IntakeAnswer<
    | 'manufacturer_table_held'
    | 'manufacturer_table_requested'
    | 'manufacturer_table_unavailable'
  >;
  manufacturerDeratingReference: IntakeAnswer<string>;
}

export interface AuditTariffInputs {
  supplier: IntakeAnswer<string>;
  supplyAuthority: IntakeAnswer<string>;
  tariffName: IntakeAnswer<string>;
  customerCategory: IntakeAnswer<string>;
  voltageCategory: IntakeAnswer<string>;
  transmissionZone: IntakeAnswer<string>;
  vatBasis: IntakeAnswer<'excluding_vat' | 'including_vat'>;
  effectiveDate: IntakeAnswer<string>;
  tariffYear: IntakeAnswer<string>;
  billEvidenceReference: IntakeAnswer<string>;
  suppliedEnergyRateRandPerKwh: IntakeAnswer<number>;
}

export interface AuditInvestment {
  itemDescription: IntakeAnswer<string>;
  pricingStatus: IntakeAnswer<
    | 'ars_quotation'
    | 'approved_price_list'
    | 'approved_budget_price'
    | 'price_not_available_yet'
  >;
  priceSourceReference: IntakeAnswer<string>;
  unitPriceRand: IntakeAnswer<number>;
  quantity: IntakeAnswer<number>;
  installationRand: IntakeAnswer<number>;
  electricalWorkRand: IntakeAnswer<number>;
  pipingWorkRand: IntakeAnswer<number>;
  deliveryRand: IntakeAnswer<number>;
  commissioningRand: IntakeAnswer<number>;
  buyBackRand: IntakeAnswer<number>;
  discountRand: IntakeAnswer<number>;
  refurbishmentRand: IntakeAnswer<number>;
  otherCostsRand: IntakeAnswer<number>;
}

export interface AuditIntakeDocument {
  intakeSchemaVersion: 'bouwa-audit-intake-1.0.0';
  method: AuditMethod;
  identity: AuditIdentity;
  logger: AuditLoggerDetails;
  flowSensor: AuditFlowSensor;
  pressureSensor: AuditPressureSensor;
  temperatureSensor: AuditTemperatureSensor;
  existingMachine: AuditExistingMachine;
  proposedMachine: AuditProposedMachine;
  operatingConditions: AuditOperatingConditions;
  siteConditions: AuditSiteConditions;
  tariff: AuditTariffInputs;
  investment: AuditInvestment;
  equipmentGroups: AuditEquipmentGroup[];
  operatingProfileSegments: AuditOperatingProfileSegment[];
  recurringCommercialCostComponents: AuditRecurringCommercialCostComponent[];
  commercialScenarios: AuditCommercialScenario[];
  sourceStatedValues: SourceStatedValueRecord[];
  claimAssessments: ClaimAssessmentInput[];
  evidence: AuditEvidenceReference[];
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
