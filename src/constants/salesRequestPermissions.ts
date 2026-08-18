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
