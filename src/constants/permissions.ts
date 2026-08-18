/**
 * Frontend permission string constants.
 *
 * These match the permission strings defined in the backend permission catalog
 * (ars-app-backend/src/models/Permission.ts and seed scripts).
 *
 * Usage:
 *   import { PERMISSIONS } from '../constants/permissions';
 *   hasPermission(PERMISSIONS.REPORTS.READ)
 *
 * Phase 4C-1: constants declared here for type-safety. Existing hardcoded
 * strings in components have NOT been replaced in this phase — that refactor
 * is deferred. New Bouwa UI code MUST use BOUWA_PERMISSIONS instead of
 * raw string literals.
 */

// ---------------------------------------------------------------------------
// Existing app permission groups
// ---------------------------------------------------------------------------

export const JOBS = {
  READ:   'jobs.read',
  CREATE: 'jobs.create',
  UPDATE: 'jobs.update',
  DELETE: 'jobs.delete',
} as const;

export const SALES_LEADS = {
  READ:    'sales_leads.read',
  CREATE:  'sales_leads.create',
  UPDATE:  'sales_leads.update',
  DELETE:  'sales_leads.delete',
  ASSIGN:  'sales_leads.assign',
  CONVERT: 'sales_leads.convert',
} as const;

export const MACHINES = {
  READ:           'machines.read',
  CREATE:         'machines.create',
  UPDATE:         'machines.update',
  DELETE:         'machines.delete',
  VERIFY_READINGS: 'machines.verifyReadings',
} as const;

export const REPORTS = {
  READ: 'reports.read',
} as const;

export const JOB_CARD_TEMPLATES = {
  READ:   'job_card_templates.read',
  CREATE: 'job_card_templates.create',
  UPDATE: 'job_card_templates.update',
  DELETE: 'job_card_templates.delete',
} as const;

export const JOB_CARD_SUBMISSIONS = {
  READ:   'job_card_submissions.read',
  CREATE: 'job_card_submissions.create',
  UPDATE: 'job_card_submissions.update',
  DELETE: 'job_card_submissions.delete',
} as const;

export const LOCATION_TRACKING = {
  VIEW: 'location_tracking.view',
} as const;

export const APPOINTMENTS = {
  CREATE: 'appointments.create',
  READ:   'appointments.read',
  UPDATE: 'appointments.update',
  DELETE: 'appointments.delete',
} as const;

export const ANALYTICS = {
  READ: 'analytics.read',
} as const;

export const USERS = {
  READ:   'users.read',
  CREATE: 'users.create',
  UPDATE: 'users.update',
  DELETE: 'users.delete',
} as const;

export const ROLES = {
  READ:   'roles.read',
  CREATE: 'roles.create',
  UPDATE: 'roles.update',
  DELETE: 'roles.delete',
} as const;

export const PERMISSIONS_CATALOG = {
  READ:   'permissions.read',
  UPDATE: 'permissions.update',
} as const;

export const ACTIVITIES = {
  READ: 'activities.read',
} as const;

export const IMPORTS = {
  CREATE: 'imports.create',
  READ:   'imports.read',
} as const;

export const CUSTOMERS = {
  READ:   'customers.read',
  CREATE: 'customers.create',
  UPDATE: 'customers.update',
  DELETE: 'customers.delete',
} as const;

export const REFERENCE = {
  READ:   'reference.read',
  UPDATE: 'reference.update',
} as const;

export const FEATURES = {
  READ:   'features.read',
  UPDATE: 'features.update',
} as const;

// ---------------------------------------------------------------------------
// Bouwa module permission group
// Matches: ars-app-backend/src/constants/bouwaPermissions.ts
// ---------------------------------------------------------------------------

export const BOUWA_PERMISSIONS = {
  VIEW:                      'bouwa.view',
  CREATE_PROPOSAL:           'bouwa.createProposal',
  EDIT_PROPOSAL:             'bouwa.editProposal',
  ARCHIVE_PROPOSAL:          'bouwa.archiveProposal',
  MANAGE_MACHINE_SPECS:      'bouwa.manageMachineSpecs',
  MANAGE_TARIFFS:            'bouwa.manageTariffs',
  MANAGE_ASSUMPTIONS:        'bouwa.manageAssumptions',
  VIEW_INTERNAL_CALCULATIONS: 'bouwa.viewInternalCalculations',
  APPROVE_FORMULA:           'bouwa.approveFormula',
  APPROVE_ASSUMPTION:        'bouwa.approveAssumption',
  MANAGE_EVIDENCE:           'bouwa.manageEvidence',
  MANAGE_REPORT_TEMPLATES:   'bouwa.manageReportTemplates',
  EXPORT_CUSTOMER_PROPOSAL:  'bouwa.exportCustomerProposal',
  ADMIN:                     'bouwa.admin',
} as const;

/** Flat array of all Bouwa permission strings — useful for seed/role assignment. */
export const ALL_BOUWA_PERMISSIONS = Object.values(BOUWA_PERMISSIONS) as string[];

// ---------------------------------------------------------------------------
// Aggregated map for cross-module lookups
// ---------------------------------------------------------------------------

export const PERMISSIONS = {
  JOBS,
  SALES_LEADS,
  MACHINES,
  REPORTS,
  JOB_CARD_TEMPLATES,
  JOB_CARD_SUBMISSIONS,
  LOCATION_TRACKING,
  APPOINTMENTS,
  ANALYTICS,
  USERS,
  ROLES,
  PERMISSIONS_CATALOG,
  ACTIVITIES,
  IMPORTS,
  CUSTOMERS,
  REFERENCE,
  FEATURES,
  BOUWA: BOUWA_PERMISSIONS,
} as const;

export default PERMISSIONS;
