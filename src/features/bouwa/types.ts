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

/** Internal-only audit session status — does NOT include customer_ready. */
export type BouwaAuditSessionStatus =
  | 'draft'
  | 'in_progress'
  | 'internal_review'
  | 'approved_internal'
  | 'archived';

export interface BouwaAuditSession {
  _id: BouwaId;
  customerId?: BouwaId;
  customerName?: string;
  siteAddress?: string;
  auditorId?: BouwaId;
  auditorName?: string;
  status?: BouwaAuditSessionStatus;
  auditDate?: ISODateString;
  completedAt?: ISODateString;
  notes?: string;
  isArchived?: boolean;
  createdBy?: BouwaId;
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
 * Internal-only proposal status.
 * DELIBERATELY excludes "customer_ready" — that requires a dedicated
 * approval endpoint (Phase 4B-5+).
 */
export type BouwaProposalStatus =
  | 'draft'
  | 'in_review'
  | 'approved_internal'
  | 'archived';

export interface BouwaProposalDraft {
  _id: BouwaId;
  title?: string;
  customerId?: BouwaId;
  customerName?: string;
  auditSessionId?: BouwaId;
  status?: BouwaProposalStatus;
  totalSavingsKwh?: number;
  totalSavingsRand?: number;
  paybackPeriodMonths?: number;
  notes?: string;
  isArchived?: boolean;
  createdBy?: BouwaId;
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

export type BouwaFormulaApprovalStatus =
  | 'pending'
  | 'under_review'
  | 'approved_internal'
  | 'rejected'
  | 'archived';

export interface BouwaFormulaApproval {
  _id: BouwaId;
  formulaKey?: string;
  description?: string;
  version?: string;
  approvedBy?: BouwaId;
  approvedAt?: ISODateString;
  status?: BouwaFormulaApprovalStatus;
  notes?: string;
  isArchived?: boolean;
  createdBy?: BouwaId;
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

export interface BouwaAssumption {
  _id: BouwaId;
  key?: string;
  label?: string;
  description?: string;
  value?: number | string | boolean;
  unit?: string;
  category?: string;
  isApproved?: boolean;
  approvedBy?: BouwaId;
  approvedAt?: ISODateString;
  notes?: string;
  isArchived?: boolean;
  createdBy?: BouwaId;
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

export interface BouwaEvidenceFile {
  _id: BouwaId;
  auditSessionId?: BouwaId;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  category?: string;              // e.g. "leak_survey" | "load_profile" | "measurement"
  description?: string;
  uploadedBy?: BouwaId;
  storageKey?: string;            // backend storage path/key
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
  | 'under_review'
  | 'approved_internal'
  | 'archived';

export interface BouwaReportTemplate {
  _id: BouwaId;
  name?: string;
  version?: string;
  description?: string;
  status?: BouwaReportTemplateStatus;
  templateKey?: string;
  isDefault?: boolean;
  approvedBy?: BouwaId;
  approvedAt?: ISODateString;
  notes?: string;
  isArchived?: boolean;
  createdBy?: BouwaId;
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
