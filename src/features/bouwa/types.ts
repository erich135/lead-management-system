/**
 * Local types for the Bouwa frontend module.
 *
 * Phase 4C-2: shell types only.
 * Phase 4C-4: API entity types added.
 *
 * SAFETY: Create/update payload types deliberately exclude any field that
 * could promote a draft or resource to a customer-visible / customer-safe
 * state (customerQuoteSafe, status: "customer_ready", etc.).
 */

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** MongoDB ObjectId as a string. */
export type BouwaId = string;

/** ISO 8601 datetime string. */
export type ISODateString = string;

// ---------------------------------------------------------------------------
// Machine Specs
// ---------------------------------------------------------------------------

/** Category of the compressor spec. */
export type BouwaMachineSpecCategory = 'BOUWA' | 'COMPETITOR' | 'EXISTING_REFERENCE';

/** Speed-control technology. */
export type BouwaMachineSpecSpeedControl = 'FIXED_SPEED' | 'VSD' | 'VARIABLE_SPEED' | 'UNKNOWN';

/** Internal review workflow status (Phase 4D-8a). */
export type BouwaMachineSpecInternalReviewStatus =
  | 'needs_internal_review'
  | 'reviewed_ok'
  | 'needs_supplier_confirmation'
  | 'rejected_internal';

/**
 * BouwaMachineSpec — matches the backend BouwaMachineSpec MongoDB document.
 *
 * approvalStatus is a read-only field.  The value "approved_customer" may be
 * returned by the backend but is NEVER sent in any frontend create/update payload.
 */
export interface BouwaMachineSpec {
  _id: BouwaId;
  specCategory?: BouwaMachineSpecCategory;
  manufacturer?: string;
  brand?: string;
  modelName?: string;
  series?: string;
  variant?: string;
  modelCode?: string;
  compressorType?: string;
  oilType?: string;
  speedControl?: BouwaMachineSpecSpeedControl;
  ratedPressureBar?: number;
  ratedPressurePsi?: number;
  ratedCapacityCfm?: number;
  ratedCapacityM3Min?: number;
  ratedCapacityM3Hour?: number;
  packageInputKw?: number;
  motorKw?: number;
  specificPowerKwPer100Cfm?: number;
  specificPowerKwPerM3Min?: number;
  coolingType?: string;
  testStandard?: string;
  cagiVerified?: boolean;
  iso1217Reference?: string;
  /** 0–1 confidence score from source verification. */
  sourceConfidence?: number;
  /** Read-only display field — do not send in payloads. */
  approvalStatus?: string;
  notes?: string;
  // Phase 4D-8a: internal review fields
  dryerCapacityM3Min?: number;
  dewPointC?: number;
  internalReviewStatus?: BouwaMachineSpecInternalReviewStatus;
  internalReviewNotes?: string;
  duplicateReviewRequired?: boolean;
  duplicateReviewGroupKey?: string;
  criticalMissingFields?: string[];
  sourceImportPhase?: string;
  isArchived?: boolean;
  createdBy?: BouwaId;
  updatedBy?: BouwaId;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
  /** Forward-compat index for any additional backend fields. */
  [key: string]: unknown;
}

export interface CreateBouwaMachineSpecPayload {
  specCategory?: BouwaMachineSpecCategory;
  manufacturer?: string;
  brand?: string;
  modelName?: string;
  series?: string;
  variant?: string;
  modelCode?: string;
  compressorType?: string;
  oilType?: string;
  speedControl?: BouwaMachineSpecSpeedControl;
  ratedPressureBar?: number;
  ratedCapacityM3Min?: number;
  packageInputKw?: number;
  motorKw?: number;
  sourceConfidence?: number;
  testStandard?: string;
  notes?: string;
}

export type UpdateBouwaMachineSpecPayload = Partial<CreateBouwaMachineSpecPayload>;

/**
 * Payload for the PATCH /machine-specs/:id/internal-review endpoint.
 * Only internal review fields — never includes approvalStatus, approvedBy, etc.
 */
export interface UpdateBouwaMachineSpecInternalReviewPayload {
  ratedPressureBar?: number;
  ratedCapacityM3Min?: number;
  packageInputKw?: number;
  motorKw?: number;
  dryerCapacityM3Min?: number;
  dewPointC?: number;
  internalReviewStatus?: BouwaMachineSpecInternalReviewStatus;
  internalReviewNotes?: string;
}

// ---------------------------------------------------------------------------
// Tariff Tables
// ---------------------------------------------------------------------------

export type BouwaTariffProviderType = 'ESKOM' | 'MUNICIPAL' | 'CUSTOMER_SPECIFIC' | 'OTHER';
export type BouwaTariffCategory = 'LDS' | 'HDS' | 'MIXED' | 'UNKNOWN';
export type BouwaTariffTimeBand = 'PEAK' | 'STANDARD' | 'OFF_PEAK';

/** A single time-of-use rate band within a tariff table. */
export interface BouwaTariffRate {
  season?: string;
  dayType?: string;
  timeBand?: BouwaTariffTimeBand;
  ratePerKwh?: number;
  currency?: string;
  demandChargeRandPerKva?: number;
}

/**
 * BouwaTariffTable — matches the backend BouwaTariffTable MongoDB document.
 *
 * approvalStatus is a read-only field. "approved_customer" may be returned
 * by the backend but is NEVER sent in any frontend create/update payload.
 */
export interface BouwaTariffTable {
  _id: BouwaId;
  tariffName?: string;
  providerName?: string;
  providerType?: BouwaTariffProviderType;
  tariffCode?: string;
  tariffCategory?: BouwaTariffCategory;
  effectiveFrom?: ISODateString;
  effectiveTo?: ISODateString;
  rates?: BouwaTariffRate[];
  vatIncluded?: boolean;
  sourceType?: string;
  sourceReference?: string;
  /** Read-only display field — do not send in payloads. */
  approvalStatus?: string;
  notes?: string;
  isArchived?: boolean;
  createdBy?: BouwaId;
  updatedBy?: BouwaId;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
  [key: string]: unknown;
}

export interface CreateBouwaTariffTablePayload {
  tariffName?: string;
  providerName?: string;
  providerType?: BouwaTariffProviderType;
  tariffCode?: string;
  tariffCategory?: BouwaTariffCategory;
  effectiveFrom?: ISODateString;
  effectiveTo?: ISODateString;
  vatIncluded?: boolean;
  sourceType?: string;
  sourceReference?: string;
  notes?: string;
}

export type UpdateBouwaTariffTablePayload = Partial<CreateBouwaTariffTablePayload>;

// ---------------------------------------------------------------------------
// Audit Sessions
// ---------------------------------------------------------------------------

/**
 * Audit session status — matches backend BouwaAuditSession.status enum.
 * Does NOT include customer_ready.
 */
export type BouwaAuditSessionStatus =
  | 'draft'
  | 'ready_for_internal_review'
  | 'blocked'
  | 'archived';

export type BouwaAuditMode =
  | 'NONE'
  | 'MANUAL_CAPTURE'
  | 'EXCEL_IMPORT'
  | 'LOGGER_IMPORT'
  | 'FULL_AIR_AUDIT';

export interface BouwaAuditSession {
  _id: BouwaId;
  /** Raw ObjectId reference to Customer document. */
  customer?: BouwaId;
  /** Legacy / populated alias — kept for backwards compat. */
  customerId?: BouwaId;
  customerName?: string;
  siteName?: string;
  siteLocation?: string;
  /** Legacy alias — kept for backwards compat. */
  siteAddress?: string;
  branch?: BouwaId;
  salesLead?: BouwaId;
  existingMachine?: BouwaId;
  existingMachineSpec?: BouwaId;
  proposedMachineSpec?: BouwaId;
  tariffTable?: BouwaId;
  auditMode?: BouwaAuditMode;
  auditPeriodStart?: ISODateString;
  auditPeriodEnd?: ISODateString;
  siteConditions?: {
    altitude?: number;
    altitudeUnit?: string;
    ambientTemperature?: number;
    operatingPressureBar?: number;
  };
  productionSchedule?: {
    weekdays?: number;
    saturdays?: number;
    sundays?: number;
    publicHolidays?: number;
    shutdownDays?: number;
    notes?: string;
  };
  auditSummary?: {
    measuredFlowM3Min?: number;
    measuredPressureBar?: number;
    measuredPowerKw?: number;
    loadPercentage?: number;
    unloadPercentage?: number;
    notes?: string;
  };
  status?: BouwaAuditSessionStatus;
  blockers?: string[];
  warnings?: string[];
  evidenceFiles?: BouwaId[];
  /** Legacy field — kept for backwards compat. */
  auditorId?: BouwaId;
  auditorName?: string;
  auditDate?: ISODateString;
  completedAt?: ISODateString;
  notes?: string;
  isArchived?: boolean;
  createdBy?: BouwaId;
  updatedBy?: BouwaId;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
  [key: string]: unknown;
}

export interface CreateBouwaAuditSessionPayload {
  customerId?: BouwaId;
  customerName?: string;
  siteAddress?: string;
  auditDate?: ISODateString;
  notes?: string;
}

export type UpdateBouwaAuditSessionPayload = Partial<
  CreateBouwaAuditSessionPayload & { status?: BouwaAuditSessionStatus }
>;

// ---------------------------------------------------------------------------
// Proposal Drafts
// ---------------------------------------------------------------------------

/**
 * Proposal status values — matches backend IBouwaProposalDraft.status.
 * Values such as 'customer_ready' may be returned by the backend as
 * read-only display values but are NEVER sent in frontend payloads.
 */
export type BouwaProposalStatus =
  | 'draft'
  | 'internal_review'
  | 'customer_blocked'
  | 'customer_ready'
  | 'exported'
  | 'archived'
  // Legacy aliases kept for backwards compat with Phase 4C-4 scaffolding
  | 'in_review'
  | 'approved_internal';

/**
 * Readiness summary sub-document — mirrors backend IBouwaReadinessSummary.
 * All fields are read-only display values.
 */
export interface BouwaReadinessSummary {
  readyForInternalCalculation?: boolean;
  readyForDraftCustomerPreview?: boolean;
  readyForFinalCustomerProposal?: boolean;
  totalBlockers?: number;
  totalWarnings?: number;
  blockerKeys?: string[];
  warningKeys?: string[];
  lastEvaluatedAt?: ISODateString;
}

export interface BouwaProposalDraft {
  _id: BouwaId;
  /** Proposal number — from backend IBouwaProposalDraft.proposalNumber. */
  proposalNumber?: string;
  /** Backend primary customer reference. */
  customer?: BouwaId;
  /** Legacy alias — kept for backwards compat. */
  customerId?: BouwaId;
  customerName?: string;
  branch?: BouwaId;
  salesLead?: BouwaId;
  /** Backend primary audit session reference. */
  auditSession?: BouwaId;
  /** Legacy alias — kept for backwards compat. */
  auditSessionId?: BouwaId;
  /** Workflow mode — SPECIFICATION or AIR_AUDIT. */
  proposalMode?: 'SPECIFICATION' | 'AIR_AUDIT';
  status?: BouwaProposalStatus;
  /** Read-only safety flag — never set to true in frontend payloads. */
  customerQuoteSafe?: boolean;
  readinessSummary?: BouwaReadinessSummary;
  blockers?: string[];
  warnings?: string[];
  totalSavingsKwh?: number;
  totalSavingsRand?: number;
  paybackPeriodMonths?: number;
  approvedBy?: BouwaId;
  approvedAt?: ISODateString;
  /** Legacy field — kept for backwards compat. */
  title?: string;
  notes?: string;
  isArchived?: boolean;
  createdBy?: BouwaId;
  updatedBy?: BouwaId;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
  [key: string]: unknown;
}

export interface CreateBouwaProposalDraftPayload {
  title?: string;
  customerId?: BouwaId;
  customerName?: string;
  auditSessionId?: BouwaId;
  notes?: string;
  /** Status is intentionally restricted to internal states only. */
  status?: Exclude<BouwaProposalStatus, 'archived'>;
}

export type UpdateBouwaProposalDraftPayload = Partial<
  Omit<CreateBouwaProposalDraftPayload, 'status'> & {
    status?: BouwaProposalStatus;
    totalSavingsKwh?: number;
    totalSavingsRand?: number;
    paybackPeriodMonths?: number;
  }
>;

// ---------------------------------------------------------------------------
// Formula Approvals
// ---------------------------------------------------------------------------

/**
 * Backend currentStatus values for formula approvals.
 * 'VERIFIED_CUSTOMER_SAFE' may be returned by the backend as a read-only
 * display value but is NEVER sent in frontend payloads.
 */
export type BouwaFormulaCurrentStatus =
  | 'EXTRACTED_FROM_WORKBOOK'
  | 'NEEDS_MANUAL_CONFIRMATION'
  | 'VERIFIED_INTERNAL_ONLY'
  | 'VERIFIED_CUSTOMER_SAFE'
  | 'REJECTED';

/**
 * Legacy status type — kept for backwards compat with Phase 4C-4 scaffolding.
 */
export type BouwaFormulaApprovalStatus =
  | 'pending'
  | 'under_review'
  | 'approved_internal'
  | 'rejected'
  | 'archived';

export interface BouwaFormulaApproval {
  _id: BouwaId;
  /** Backend primary key for this formula. */
  calculationKey?: string;
  /** Legacy field alias — kept for backwards compat. */
  formulaKey?: string;
  formulaName?: string;
  formulaVersion?: string;
  formulaText?: string;
  description?: string;
  /** Backend primary status field — use this for display. */
  currentStatus?: BouwaFormulaCurrentStatus;
  /** Legacy status alias — kept for backwards compat. */
  status?: BouwaFormulaApprovalStatus;
  /** Read-only safety flag — never set to true in frontend payloads. */
  customerQuoteSafe?: boolean;
  approvedBy?: BouwaId;
  approvedAt?: ISODateString;
  approvalNotes?: string;
  rejectionReason?: string;
  /** Backend: sourceWorkbook (was workbookName in spec). */
  sourceWorkbook?: string;
  /** Backend: sourceSheet (was sheetName in spec). */
  sourceSheet?: string;
  /** Backend: sourceCell (was cellReference in spec). */
  sourceCell?: string;
  testCaseReferences?: string[];
  blockers?: string[];
  warnings?: string[];
  /** Legacy version field — kept for backwards compat. */
  version?: string;
  notes?: string;
  isArchived?: boolean;
  createdBy?: BouwaId;
  updatedBy?: BouwaId;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
  [key: string]: unknown;
}

export interface CreateBouwaFormulaApprovalPayload {
  formulaKey?: string;
  description?: string;
  version?: string;
  notes?: string;
}

export type UpdateBouwaFormulaApprovalPayload = Partial<
  CreateBouwaFormulaApprovalPayload & { status?: BouwaFormulaApprovalStatus }
>;

// ---------------------------------------------------------------------------
// Assumptions
// ---------------------------------------------------------------------------

/** Scope of an assumption — matches backend IBouwaAssumption.scope enum. */
export type BouwaAssumptionScope =
  | 'GLOBAL'
  | 'SITE'
  | 'PROPOSAL'
  | 'MACHINE_SPEC'
  | 'TARIFF';

/** Confidence level — matches backend CalculationConfidence enum. */
export type BouwaAssumptionConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export interface BouwaAssumption {
  _id: BouwaId;
  /** Scope of this assumption — from backend IBouwaAssumption.scope. */
  scope?: BouwaAssumptionScope;
  /** Assumption key — primary identifier. */
  key?: string;
  /** Human-readable label. */
  label?: string;
  description?: string;
  value?: number | string | boolean;
  unit?: string;
  appliesTo?: string;
  sourceType?: string;
  sourceReference?: string;
  /** Confidence level — from backend CalculationConfidence. */
  confidence?: BouwaAssumptionConfidence;
  approvalStatus?: string;
  approvedBy?: BouwaId;
  approvedAt?: ISODateString;
  validFrom?: ISODateString;
  validTo?: ISODateString;
  /** Legacy field — kept for backwards compat. */
  category?: string;
  /** Legacy field — kept for backwards compat. */
  isApproved?: boolean;
  notes?: string;
  isArchived?: boolean;
  createdBy?: BouwaId;
  updatedBy?: BouwaId;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
  [key: string]: unknown;
}

export interface CreateBouwaAssumptionPayload {
  key?: string;
  label?: string;
  description?: string;
  value?: number | string | boolean;
  unit?: string;
  category?: string;
  notes?: string;
}

export type UpdateBouwaAssumptionPayload = Partial<
  CreateBouwaAssumptionPayload & { isApproved?: boolean }
>;

// ---------------------------------------------------------------------------
// Evidence Files
// ---------------------------------------------------------------------------

export type BouwaEvidenceEntityType =
  | 'MACHINE_SPEC'
  | 'TARIFF'
  | 'AUDIT_SESSION'
  | 'PROPOSAL'
  | 'FORMULA_APPROVAL'
  | 'ASSUMPTION'
  | 'OTHER';

export type BouwaEvidenceApprovalStatus =
  | 'draft'
  | 'pending_review'
  | 'approved_internal'
  | 'rejected'
  | 'archived';

export type BouwaStorageProvider = 'S3' | 'LOCAL' | 'EXTERNAL_URL' | 'UNKNOWN';

export interface BouwaEvidenceFile {
  _id: BouwaId;
  entityType?: BouwaEvidenceEntityType;
  entityId?: BouwaId;
  /** Legacy field — kept for backwards compat. */
  auditSessionId?: BouwaId;
  fileName?: string;
  originalFileName?: string;
  mimeType?: string;
  /** Backend field name — use this. */
  sizeBytes?: number;
  /** Legacy alias — kept for backwards compat. */
  fileSizeBytes?: number;
  storageProvider?: BouwaStorageProvider;
  s3Bucket?: string;
  s3Key?: string;
  externalUrl?: string;
  sourceType?: string;
  uploadedBy?: BouwaId;
  uploadedAt?: ISODateString;
  /** Read-only display field — do not send in payloads. */
  approvalStatus?: BouwaEvidenceApprovalStatus;
  approvedBy?: BouwaId;
  approvedAt?: ISODateString;
  /** Legacy field — kept for backwards compat. */
  category?: string;
  description?: string;
  /** Legacy field — kept for backwards compat. */
  storageKey?: string;
  notes?: string;
  isArchived?: boolean;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
  [key: string]: unknown;
}

export interface CreateBouwaEvidenceFileMetadataPayload {
  auditSessionId?: BouwaId;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  category?: string;
  description?: string;
  storageKey?: string;
}

export type UpdateBouwaEvidenceFileMetadataPayload = Partial<
  Pick<CreateBouwaEvidenceFileMetadataPayload, 'category' | 'description'>
>;

// ---------------------------------------------------------------------------
// Report Templates
// ---------------------------------------------------------------------------

export type BouwaReportTemplateStatus =
  | 'draft'
  | 'pending_review'
  | 'approved_internal'
  | 'approved_customer'
  | 'rejected'
  | 'archived'
  // Legacy alias kept for backwards compat
  | 'under_review';

/** Template type — matches backend IBouwaReportTemplate.templateType enum. */
export type BouwaReportTemplateType =
  | 'CUSTOMER_PROPOSAL'
  | 'INTERNAL_CALCULATION_PACK'
  | 'AUDIT_REPORT'
  | 'OTHER';

/** A single section within a report template — mirrors backend IBouwaReportSection. */
export interface BouwaReportSection {
  sectionKey?: string;
  title?: string;
  order?: number;
  isRequired?: boolean;
  isCustomerVisible?: boolean;
  contentTemplate?: string;
  status?: string;
}

export interface BouwaReportTemplate {
  _id: BouwaId;
  /** Backend primary name field — use this for display. */
  templateName?: string;
  /** Template type enum. */
  templateType?: BouwaReportTemplateType;
  /** Legacy name field — kept for backwards compat. */
  name?: string;
  version?: string;
  sections?: BouwaReportSection[];
  approvalStatus?: BouwaReportTemplateStatus;
  /** Read-only safety flag — never set to true in frontend payloads. */
  customerQuoteSafe?: boolean;
  approvedBy?: BouwaId;
  approvedAt?: ISODateString;
  description?: string;
  /** Legacy status field — kept for backwards compat. */
  status?: BouwaReportTemplateStatus;
  /** Legacy fields — kept for backwards compat. */
  templateKey?: string;
  isDefault?: boolean;
  notes?: string;
  isArchived?: boolean;
  createdBy?: BouwaId;
  updatedBy?: BouwaId;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
  [key: string]: unknown;
}

export interface CreateBouwaReportTemplatePayload {
  name?: string;
  version?: string;
  description?: string;
  templateKey?: string;
  notes?: string;
}

export type UpdateBouwaReportTemplatePayload = Partial<
  CreateBouwaReportTemplatePayload & { status?: BouwaReportTemplateStatus }
>;

/** Readiness state for each Bouwa sub-module area. */
export type BouwaPhaseStatus =
  | 'pending'    // not yet started / awaiting approval
  | 'in_review'  // under internal review
  | 'approved'   // approved and ready
  | 'disabled';  // explicitly disabled / not available to end users

/** Data for a single Bouwa phase card shown in the shell. */
export interface BouwaShellCard {
  /** Short display title. */
  title: string;
  /** One-sentence description. */
  description: string;
  /** Current readiness status. */
  status: BouwaPhaseStatus;
  /** Optional icon name (from lucide-react) — resolved by the component. */
  iconKey?: string;
}

/** Requirements that must be met before the Bouwa module is accessible. */
export interface BouwaAccessRequirement {
  /** Backend feature-flag key that must be enabled. */
  featureFlag: string;
  /** Permission string the user must hold. */
  viewPermission: string;
  /** Human-readable reason why the module may be unavailable. */
  unavailableReason?: string;
}
