/**
 * Sales Request permission names used for feature gating.
 */
export const SALES_REQUEST_PERMISSIONS = {
  CREATE: 'sales_requests.create',
  READ: 'sales_requests.read',
  UPDATE: 'sales_requests.update',
  SUBMIT: 'sales_requests.submit',
  REVIEW: 'sales_requests.review',
} as const;

export type SalesRequestPermissionName =
  (typeof SALES_REQUEST_PERMISSIONS)[keyof typeof SALES_REQUEST_PERMISSIONS];

/**
 * Human-readable labels for each request type.
 */
export const SALES_REQUEST_TYPE_LABELS: Record<string, string> = {
  rfc: 'Request For Costing (RFC)',
  loan: 'Loan Request',
  rental: 'Rental Request',
  loan_rental: 'Loan & Rental Request',
  rfc_new_service_level: 'New Service Level Agreement',
  general_visit: 'General Visit',
};

/**
 * Human-readable labels for each request status.
 */
export const SALES_REQUEST_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending Approval',
  approved: 'Approved',
  declined: 'Rejected',
};

/**
 * Returns true when a pending General Visit may show Accept without creating a job.
 * The backend still enforces this — hiding the button is not sufficient.
 */
export function canShowAcceptWithoutJob(request: {
  requestType?: string;
  status?: string;
}): boolean {
  return request.requestType === 'general_visit' && request.status === 'pending';
}

/**
 * Returns true when the request was accepted without creating a job.
 */
export function isAcceptedWithoutJob(request: {
  acceptedWithoutJob?: boolean;
  approvalOutcome?: string;
}): boolean {
  return request.acceptedWithoutJob === true || request.approvalOutcome === 'accepted_no_job';
}

/**
 * History / detail outcome: Approved (job), Accepted — no job created, or Rejected.
 */
export function getSalesRequestOutcomeLabel(request: {
  status?: string;
  acceptedWithoutJob?: boolean;
  approvalOutcome?: string;
  approvedJob?: unknown;
}): string {
  if (request.status === 'declined') return 'Rejected';
  if (request.status === 'pending') return 'Pending Approval';
  if (request.status === 'draft') return 'Draft';
  if (request.status === 'approved') {
    if (isAcceptedWithoutJob(request)) {
      return 'Accepted — no job created';
    }
    return 'Approved';
  }
  return request.status || 'Unknown';
}

/**
 * Job number from a populated or id-only approvedJob reference.
 */
export function getApprovedJobNumber(approvedJob?: string | { jobNumber?: string } | null): string | null {
  if (!approvedJob || typeof approvedJob === 'string') return null;
  return approvedJob.jobNumber || null;
}
