/**
 * API service for communicating with the ARS backend.
 * Handles authentication, request/response formatting, and error handling.
 */

import { resolveApiBaseUrl } from './resolveApiBaseUrl';

// Re-export types from types/index.ts for convenience
export type {
  SalesLead,
  SalesLeadStatus,
  SalesLeadSource,
  SalesLeadPriority,
  SalesLeadWithDetails,
  Appointment,
  CanvassingPlan,
  CanvassingPlanStatus,
} from '../types';
import {
  buildCanonicalMachineHistoryEndpoint,
  type MachineHistoryIdentity,
  type MachineHistorySection,
} from './machineActivityHistory';
import { canonicalMachineOptions } from './canonicalMachines';
import {
  classifyApiFailure,
  createMachineResolutionSnapshot,
  machineResolutionStatusForFailure,
  rsrUploadAttemptHeaders,
  type ApiFailureKind,
  type MachineResolutionEntry,
  type MachineResolutionSnapshot,
  type RSRUploadAttempt,
} from './machineAssociationSafety';
import { permittedMetadataPayload } from './machineRsrMetadataEdit';

export {
  EDITABLE_MACHINE_RSR_FIELDS,
  type EditableMachineRSRField,
  type MachineRSRMetadataUpdate,
} from './machineRsrMetadataEdit';
import type { MachineRSRMetadataUpdate } from './machineRsrMetadataEdit';

/**
 * Hostname-aware API origin so LAN IP pages call the same host (not localhost).
 */
function apiBase(): string {
  return resolveApiBaseUrl();
}

/**
 * API response wrapper type.
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    stack?: string;
  };
  message?: string;
}

/** Narrow typed error surface for machine resolution and RSR retry callers. */
export class ApiRequestError extends Error {
  readonly kind: ApiFailureKind;
  readonly status?: number;

  constructor(message: string, options: { kind: ApiFailureKind; status?: number }) {
    super(message);
    this.name = 'ApiRequestError';
    this.kind = options.kind;
    this.status = options.status;
  }
}

/**
 * Login response data.
 */
export interface LoginResponse {
  user: BackendUser;
  token: string;
}

/**
 * Backend user structure matching the API response.
 */
export interface BackendUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: {
    _id: string;
    name: string;
    description?: string;
    isActive: boolean;
  };
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  passwordSet: boolean;
  emailVerified: boolean;
  emailVerifiedAt?: string;
  isSuperAdmin?: boolean;
  adminCode?: {
    _id: string;
    code: string;
    description?: string;
  } | string;
  repCode?: {
    _id: string;
    code: string;
    description?: string;
  } | string;
  repCodes?: {
    _id: string;
    code: string;
    description?: string;
  }[];
  adminCodes?: {
    _id: string;
    code: string;
    description?: string;
  }[];
  technician?: {
    _id: string;
    name: string;
  } | string;
  branches?: {
    _id: string;
    name: string;
    code?: string;
  }[] | string[];
  cellPhone?: string;
  locationTrackingEnabled?: boolean;
}

/**
 * Login credentials.
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Stores the authentication token in localStorage.
 * 
 * @param token - JWT token to store
 */
export function setAuthToken(token: string): void {
  localStorage.setItem('authToken', token);
}

/**
 * Retrieves the authentication token from localStorage.
 * 
 * @returns {string | null} The stored token or null if not found
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

/**
 * Removes the authentication token from localStorage.
 */
export function removeAuthToken(): void {
  localStorage.removeItem('authToken');
}

export interface BouwaPilotAccessState {
  featureKey?: 'bouwa';
  /** @deprecated Informational stub; not an access condition. */
  featureEnabled?: boolean;
  isSuperAdmin: boolean;
  authenticated?: boolean;
  allowed: boolean;
  reason: 'allowed' | 'super_admin_required' | 'feature_flag_absent' | 'feature_flag_disabled';
  accessMode?: 'role_only';
}

export async function getBouwaPilotAccessState(): Promise<BouwaPilotAccessState> {
  return apiRequest<BouwaPilotAccessState>('/api/bouwa-pilot-access');
}

/**
 * Makes an authenticated API request.
 * Automatically includes the authorization token in headers.
 * 
 * @param endpoint - API endpoint (e.g., '/api/users')
 * @param options - Fetch options (method, body, etc.)
 * @returns {Promise<T>} Parsed response data
 * @throws {Error} If the request fails
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const url = `${apiBase()}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      // Include cookies so development session cookies work on localhost and LAN.
      credentials: 'include',
    });
  } catch (error) {
    throw new ApiRequestError(
      error instanceof Error && error.message ? error.message : 'Network request failed',
      { kind: 'transient' },
    );
  }

  // Try to parse JSON response
  let data: ApiResponse<T>;
  try {
    const text = await response.text();
    if (!text) {
      // Empty response
      data = { success: false };
    } else {
      data = JSON.parse(text);
    }
  } catch (parseError) {
    // If JSON parsing fails, create a generic error response based on status
    const errorMessage = response.status === 401 
      ? 'Invalid credentials' 
      : response.status === 403
      ? 'Access forbidden'
      : response.status === 500 
      ? 'Server error occurred' 
      : `Request failed with status ${response.status}`;
    
    data = {
      success: false,
      error: {
        message: errorMessage,
      },
    };
  }

  // Check if request was successful
  if (!response.ok || !data.success) {
    const errorMessage = data.error?.message || data.message || 'An error occurred';
    throw new ApiRequestError(errorMessage, {
      kind: response.ok ? 'malformed' : classifyApiFailure({ status: response.status }),
      status: response.status,
    });
  }

  // If there's a data property, return it; otherwise return the response (for message-only responses)
  if (data.data !== undefined) {
    return data.data as T;
  }
  
  // For responses that don't have a data property (e.g., { success: true, message: "..." })
  // Return the relevant parts of the response
  const { success, ...rest } = data;
  return rest as T;
}

/**
 * Authenticates a user with email and password.
 * 
 * @param credentials - Login credentials
 * @returns {Promise<LoginResponse>} User data and JWT token
 * @throws {Error} If authentication fails
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  // Store token for future requests
  if (response.token) {
    setAuthToken(response.token);
  }

  return response;
}

/**
 * Logs out the current user.
 * 
 * @returns {Promise<void>}
 * @throws {Error} If logout fails
 */
export async function logout(): Promise<void> {
  try {
    await apiRequest('/api/auth/logout', {
      method: 'POST',
    });
  } catch (error) {
    // Even if the API call fails, clear local token
    console.error('Logout API error:', error);
  } finally {
    removeAuthToken();
  }
}

/**
 * Gets the current authenticated user.
 * 
 * @returns {Promise<BackendUser>} Current user data
 * @throws {Error} If the request fails or user is not authenticated
 */
export async function getCurrentUser(): Promise<BackendUser> {
  return apiRequest<{ user: BackendUser }>('/api/auth/me').then((data) => data.user);
}

/**
 * Changes the current user's password.
 * 
 * @param currentPassword - Current password
 * @param newPassword - New password
 * @returns {Promise<void>}
 * @throws {Error} If password change fails
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await apiRequest('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });
}

/**
 * Verifies an invitation token.
 * Used to check if a token is valid before showing the password setup form.
 * 
 * @param token - Invitation token from email link
 * @returns {Promise<{ user: { email: string; firstName?: string; lastName?: string } }>}
 * @throws {Error} If token verification fails
 */
export async function verifyInvitationToken(token: string): Promise<{ user: { email: string; firstName?: string; lastName?: string } }> {
  return apiRequest(`/api/auth/verify-invitation-token?token=${encodeURIComponent(token)}`);
}

/**
 * Requests a password reset email.
 * Sends a password reset link to the user's email address.
 * 
 * @param email - User's email address
 * @returns {Promise<{ message: string }>} Success message
 * @throws {Error} If the request fails
 */
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Resets the user's password using a reset token.
 * 
 * @param token - Password reset token from email link
 * @param newPassword - New password to set
 * @returns {Promise<{ message: string }>} Success message
 * @throws {Error} If the reset fails
 */
export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}

/**
 * Verifies if a password reset token is valid.
 * Used to check if a token is valid before showing the password reset form.
 * 
 * @param token - Password reset token from email link
 * @returns {Promise<{ message: string }>} Success message if token is valid
 * @throws {Error} If token verification fails
 */
export async function verifyResetToken(token: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
}

/**
 * Sets a password for a user using an invitation token.
 * 
 * @param token - Invitation token from email link
 * @param password - New password to set
 * @returns {Promise<{ success: boolean; message: string }>}
 * @throws {Error} If password setting fails
 */
export async function setPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
  return apiRequest('/api/auth/set-password', {
    method: 'POST',
    body: JSON.stringify({
      token,
      password,
    }),
  });
}

/**
 * Job-related API functions.
 */

export interface Job {
  _id: string;
  jobNumber: string;
  status?: {
    _id: string;
    name: string;
    sortOrder?: number;
  };
  statusNumber?: number;
  customer?: {
    _id: string;
    name: string;
  };
  cashCustomer?: string;
  notes?: string;
  description?: {
    _id: string;
    name: string;
  } | string;
  valueExVat?: number;
  adm?: string;
  assistingAdm?: string;
  repCode?: {
    _id: string;
    code: string;
    description?: string;
  };
  machines?: (Machine | string)[];
  registerDate?: string | Date;
  techBooked?: string | {
    _id: string;
    name: string;
  };
  bookings?: Array<{
    technicianId: string;
    technicianName?: string;
    startDate: string;
    endDate: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    notes?: string;
    hoursWorked?: number;
  }>;
  rsrNumber?: string;
  feedback?: string;
  followUp1Date?: string | Date;
  followUp2Date?: string | Date;
  followUp3Date?: string | Date;
  followUp4Date?: string | Date;
  followUp5Date?: string | Date;
  followUp6Date?: string | Date;
  quoteRefreshCount?: number;
  lastQuoteRefreshDate?: string | Date;
  // Status-based follow-up tracking
  statusFollowUpCount?: number;
  statusFollowUpDate?: string | Date;
  statusFollowUpNotes?: string;
  reminderFollowUp1Date?: string | Date;
  reminderFollowUp2Date?: string | Date;
  reminderFollowUp3Date?: string | Date;
  dateSentToClient?: string | Date;
  poDate?: string | Date;
  poNumber?: string;
  dateBooked?: string | Date;
  oilSampleNumber?: string;
  storePack?: string;
  storePackDate?: string | Date;
  invoiceDate?: string | Date;
  invNumber?: string;
  branch?: {
    _id: string;
    name: string;
  };
  jobSource?: {
    _id: string;
    name: string;
  } | string;
  startDate?: string | Date;
  dateQuoted?: string | Date;
  statusChangedAt?: string;
  statusHistory?: Array<{
    status: string;
    statusName: string;
    changedAt: string | Date;
    changedBy?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface JobStats {
  totalJobs: number;
  activeJobs: number;
  totalValue: number;
  overdueReminders: number;
  approachingReminders: number;
  jobsByStatus: Record<string, number>;
  jobsByBranch: Record<string, number>;
}

export interface OverdueJob {
  jobId: string;
  jobNumber: string;
  isOverdue: boolean;
  isApproaching: boolean;
  daysOverdue?: number;
  daysInStatus: number;
  currentStatus: string;
  currentStatusNumber: number;
  expectedNextStatus: string;
  maxDaysAllowed: number;
  reminderType: "status_overdue" | "followup_overdue" | "approaching_due" | "status_followup";
  followUpLevel?: number; // 1-6 for follow-ups, 7 for refresh/cancel, 8 for cancel only
  severity: "critical" | "warning" | "info";
  quoteRefreshCount?: number; // Number of times quote has been refreshed (0-3)
  statusFollowUpCount?: number; // Number of status follow-ups done
  requiresNotes?: boolean; // Whether follow-up requires notes/reason
  job: Job | null;
}

/**
 * Gets dashboard statistics.
 */
export async function getJobStats(): Promise<JobStats> {
  return apiRequest<JobStats>('/api/jobs/stats');
}

/**
 * Gets overdue and approaching jobs.
 */
export async function getOverdueJobs(params?: {
  branch?: string;
  severity?: "critical" | "warning" | "info";
  includeApproaching?: boolean;
  includeHidden?: boolean;
}): Promise<{ jobs: OverdueJob[]; count: number; overdueCount: number; approachingCount: number }> {
  const queryParams = new URLSearchParams();
  if (params?.branch) queryParams.append('branch', params.branch);
  if (params?.severity) queryParams.append('severity', params.severity);
  if (params?.includeApproaching !== undefined) {
    queryParams.append('includeApproaching', params.includeApproaching.toString());
  }
  if (params?.includeHidden !== undefined) {
    queryParams.append('includeHidden', params.includeHidden.toString());
  }
  
  const query = queryParams.toString();
  return apiRequest(`/api/jobs/overdue${query ? `?${query}` : ''}`);
}

/**
 * Gets list of jobs with optional filtering.
 */
export async function getJobs(params?: {
  status?: string;
  branch?: string;
  customer?: string;
  search?: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  allTime?: string;
  includeHidden?: boolean;
  adm?: string;
  repCode?: string;
  technician?: string;
  jobSource?: string;
}): Promise<{ jobs: Job[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.branch) queryParams.append('branch', params.branch);
  if (params?.customer) queryParams.append('customer', params.customer);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
  if (params?.allTime) queryParams.append('allTime', params.allTime);
  if (params?.includeHidden !== undefined) queryParams.append('includeHidden', params.includeHidden.toString());
  if (params?.adm) queryParams.append('adm', params.adm);
  if (params?.repCode) queryParams.append('repCode', params.repCode);
  if (params?.technician) queryParams.append('technician', params.technician);
  if (params?.jobSource) queryParams.append('jobSource', params.jobSource);
  
  const query = queryParams.toString();
  return apiRequest(`/api/jobs${query ? `?${query}` : ''}`);
}

/**
 * Gets a single job by ID.
 */
export async function getJob(id: string): Promise<{ job: Job; reminder: OverdueJob | null }> {
  return apiRequest(`/api/jobs/${id}`);
}

/**
 * Gets diary/calendar jobs — only jobs with active bookings, minimal payload.
 * Replaces the paginated getJobs loop for the Diary page.
 */
export async function getDiaryJobs(params?: {
  technicianId?: string;
  startDate?: string;
  endDate?: string;
  branch?: string;
}): Promise<{ jobs: Job[]; total: number }> {
  const queryParams = new URLSearchParams();
  if (params?.technicianId) queryParams.append('technicianId', params.technicianId);
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.branch) queryParams.append('branch', params.branch);

  const query = queryParams.toString();
  return apiRequest(`/api/jobs/diary${query ? `?${query}` : ''}`);
}

/**
 * Creates a new job.
 */
export async function createJob(jobData: Partial<Job>): Promise<{ job: Job }> {
  const canonicalJobData = await canonicalizeJobMachinePayload(jobData);
  return apiRequest('/api/jobs', {
    method: 'POST',
    body: JSON.stringify(canonicalJobData),
  });
}

/**
 * Updates a job.
 */
export async function updateJob(id: string, jobData: Partial<Job>): Promise<{ job: Job }> {
  const canonicalJobData = await canonicalizeJobMachinePayload(jobData);
  return apiRequest(`/api/jobs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(canonicalJobData),
  });
}

/**
 * Deletes a job (soft delete).
 */
export async function deleteJob(id: string): Promise<void> {
  await apiRequest(`/api/jobs/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Reference data API functions.
 */

export interface Status {
  _id: string;
  name: string;
  sortOrder: number;
  description?: string;
  isActive?: boolean;
  isHidden?: boolean;
}

export interface Customer {
  _id: string;
  name: string;
  defaultContactPerson?: string;
  defaultWhatsAppNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface CashCustomer {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  _id: string;
  name: string;
  code?: string;
  isDefault?: boolean;
  jobNumberCode?: string;
  address?: string;
  isActive?: boolean;
}

export interface ServiceDescription {
  _id: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface JobSource {
  _id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface RepCode {
  _id: string;
  code: string;
  description?: string;
  adminCodes: string[]; // Linked admin codes (e.g., ["AS", "ER"])
  branches: {
    _id: string;
    name: string;
  }[];
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  /** Array of linked users — populated by backend when requested. */
  users?: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
  }[];
  isActive: boolean;
  dbStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminCode {
  _id: string;
  code: string;
  description?: string;
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  isActive: boolean;
  dbStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MachineRSR {
  _id: string;
  title?: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  description?: string;
  /** Structured report fields (present on machine-native RSRs, pre-filled from the job) */
  jobNumber?: string;
  rsrNumber?: string;
  workDate?: string;
  currentHours?: number;
  nextServiceHours?: number;
  nextServiceDate?: string;
  quoteDate?: string;
  value?: number;
  poNumber?: string;
  invNumber?: string;
  tech?: string;
  hoursWorked?: number;
  comments?: string;
  /** Present when report metadata was corrected after upload. */
  metadataCorrection?: {
    values: Record<string, unknown>;
    editedBy: string | { _id: string; firstName?: string; lastName?: string };
    editedAt: string;
  };
  uploadedBy: {
    _id: string;
    firstName: string;
    lastName: string;
  } | string;
  uploadedAt: string;
  /** 'job' when this RSR was uploaded via a job; 'machine' (or absent) for direct machine uploads */
  source?: 'machine' | 'job';
  jobId?: string;
}

export interface Machine {
  _id: string;
  make: string;
  model: string;
  machineType?: string;
  serialNumber: string;
  assetNumber?: string;
  customer?: {
    _id: string;
    name: string;
  } | string;
  cashCustomer?: string;
  isRental?: boolean;
  ownershipType?: 'customer' | 'ars_rental';
  serviceType?: 'hours' | 'date';
  machineHours: number;
  nextServiceHours: number;
  lastServiceDate?: string;
  nextServiceDate?: string;
  lastOilSampleDate?: string;
  oilSampleComment?: string;
  currentLocation?: string;
  yearOfManufacture?: number;
  isActive: boolean;
  dbStatus?: string;
  /** Deduplication metadata returned only for legacy/stale machine records. */
  mergeStatus?: 'merged';
  redirectStatus?: 'redirected';
  isReadOnly?: boolean;
  canonicalMachineId?: string;
  rsrDocuments?: MachineRSR[];
  /** Count of RSR documents attached via a job referencing this machine. */
  jobRSRDocumentsCount?: number;
  /** Name of the person responsible for submitting hour readings at this machine's site */
  contactPerson?: string;
  /** WhatsApp number for reading reminders (overrides customer default) */
  whatsAppNumber?: string;
  /** How often (in days) to send a reading reminder. Default: 30 */
  readingFrequencyDays?: number;
  /** Whether WhatsApp reading reminders are enabled for this machine */
  whatsAppRemindersEnabled?: boolean;
  /** Stamped when an hour reading is approved */
  lastReadingReceivedAt?: string;
  /** Stamped when a WhatsApp reading reminder is sent */
  lastReadingRequestSentAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ImportableMachineRow {
  clientName: string;
  customerId?: string;
  machineType?: string;
  make: string;
  model: string;
  serialNumber: string;
  serviceType: 'hours' | 'date';
  machineHours?: number;
  nextServiceHours?: number;
  lastServiceDate?: string;
  nextServiceDate?: string;
  ownershipType: 'customer' | 'ars_rental';
  isRental: boolean;
  assetNumber?: string;
  currentLocation?: string;
  cashCustomer?: string;
  lastOilSampleDate?: string;
  oilSampleComment?: string;
}

// ─── Unified Machine Import types ────────────────────────────────────────────

export interface ValidatedMachineRow {
  rowIndex: number;
  make: string;
  model: string;
  serialNumber: string;
  assetNumber?: string;
  machineType?: string;
  ownershipType: 'customer' | 'ars_rental';
  serviceType: 'hours' | 'date';
  machineHours: number;
  nextServiceHours: number;
  lastServiceDate?: string;
  nextServiceDate?: string;
  currentLocation?: string;
  lastOilSampleDate?: string;
  oilSampleComment?: string;
  yearOfManufacture?: number;
  isRental: boolean;
  customerId?: string;
  customerName?: string;
  cashCustomer?: string;
  skip?: boolean;
}

export interface ErrorMachineRow {
  rowIndex: number;
  make: string;
  model: string;
  serialNumber: string;
  assetNumber?: string;
  machineType?: string;
  ownershipType: 'customer' | 'ars_rental';
  serviceType: 'hours' | 'date';
  machineHours: number;
  nextServiceHours: number;
  lastServiceDate?: string;
  nextServiceDate?: string;
  currentLocation?: string;
  lastOilSampleDate?: string;
  oilSampleComment?: string;
  yearOfManufacture?: number;
  cashCustomer?: string;
  errorType: 'customer_not_found' | 'missing_field' | 'duplicate_serial';
  errorMessage: string;
  customerName?: string;
  suggestions: { id: string; name: string }[];
  existingMachine?: {
    make: string;
    model: string;
    serialNumber: string;
    assetNumber?: string;
    machineType?: string;
    machineHours: number;
    nextServiceHours: number;
    currentLocation?: string;
    customerName?: string;
  };
  // user corrections
  resolvedCustomerId?: string;
  keepExisting?: boolean; // duplicate_serial: true = keep DB record, false = overwrite with CSV
  skip?: boolean;
}

export interface Technician {
  _id: string;
  name: string;
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  email?: string;
  phone?: string;
  isActive?: boolean;
}

export interface FollowUpStatus {
  _id: string;
  name: string;
  order: number;
}

/**
 * Gets all statuses.
 */
export async function getStatuses(): Promise<{ statuses: Status[] }> {
  return apiRequest('/api/reference/statuses');
}

/**
 * Creates a new status.
 */
export async function createStatus(statusData: {
  name: string;
  description?: string;
}): Promise<{ status: Status }> {
  return apiRequest('/api/reference/statuses', {
    method: 'POST',
    body: JSON.stringify(statusData),
  });
}

/**
 * Updates a status.
 */
export async function updateStatus(id: string, statusData: Partial<Status>): Promise<{ status: Status }> {
  return apiRequest(`/api/reference/statuses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(statusData),
  });
}

/**
 * Deletes a status.
 */
export async function deleteStatus(id: string): Promise<void> {
  await apiRequest(`/api/reference/statuses/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Gets all customers.
 */
export async function getCustomers(params?: { search?: string; page?: number; limit?: number; includeArchived?: boolean }): Promise<{ customers: Customer[]; pagination: any }> {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.includeArchived) queryParams.append('includeArchived', 'true');
  
  const query = queryParams.toString();
  return apiRequest(`/api/reference/customers${query ? `?${query}` : ''}`);
}

/**
 * Creates a new customer.
 */
export async function createCustomer(data: string | { name: string; address?: string; phone?: string; email?: string; defaultContactPerson?: string; defaultWhatsAppNumber?: string }): Promise<{ customer: Customer }> {
  const body = typeof data === 'string' ? { name: data } : data;
  return apiRequest('/api/reference/customers', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Updates a customer's name and/or WhatsApp defaults.
 */
export async function updateCustomer(id: string, data: { name?: string; defaultContactPerson?: string; defaultWhatsAppNumber?: string; address?: string; phone?: string; email?: string; isActive?: boolean }): Promise<{ customer: Customer }> {
  return apiRequest(`/api/reference/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Sends a test WhatsApp message to a given number.
 */
export async function sendWhatsAppTest(to: string, message?: string): Promise<{ sid: string; to: string; message: string }> {
  return apiRequest('/api/whatsapp/test', {
    method: 'POST',
    body: JSON.stringify({ to, message: message || 'ARS test message — WhatsApp is configured correctly for this machine.' }),
  });
}

/**
 * Sends the real production reading-reminder message for a specific machine.
 * Uses the machine's configured WhatsApp number unless `to` is overridden.
 */
export async function sendMachineWhatsAppTest(machineId: string, to?: string): Promise<{ sid: string; to: string; message: string }> {
  return apiRequest('/api/whatsapp/test-machine', {
    method: 'POST',
    body: JSON.stringify({ machineId, ...(to ? { to } : {}) }),
  });
}

/**
 * Gets all branches.
 */
export async function getBranches(): Promise<{ branches: Branch[] }> {
  return apiRequest('/api/reference/branches');
}

/**
 * Creates a new branch.
 */
export async function createBranch(branchData: {
  name: string;
  code?: string;
  jobNumberCode?: string;
  address?: string;
  isDefault?: boolean;
}): Promise<{ branch: Branch }> {
  return apiRequest('/api/reference/branches', {
    method: 'POST',
    body: JSON.stringify(branchData),
  });
}

/**
 * Updates a branch.
 */
export async function updateBranch(
  id: string,
  branchData: {
    name?: string;
    code?: string;
    jobNumberCode?: string;
    address?: string;
    isDefault?: boolean;
  }
): Promise<{ branch: Branch }> {
  return apiRequest(`/api/reference/branches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(branchData),
  });
}

/**
 * Deletes a branch.
 */
export async function deleteBranch(id: string): Promise<{ message: string }> {
  return apiRequest(`/api/reference/branches/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Gets all service descriptions.
 */
export async function getServiceDescriptions(): Promise<{ descriptions: ServiceDescription[] }> {
  return apiRequest('/api/reference/service-descriptions');
}

/**
 * Creates a new service description.
 */
export async function createServiceDescription(descriptionData: {
  name: string;
  description?: string;
}): Promise<{ description: ServiceDescription }> {
  return apiRequest('/api/reference/service-descriptions', {
    method: 'POST',
    body: JSON.stringify(descriptionData),
  });
}

/**
 * Updates a service description.
 */
export async function updateServiceDescription(id: string, descriptionData: Partial<ServiceDescription>): Promise<{ description: ServiceDescription }> {
  return apiRequest(`/api/reference/service-descriptions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(descriptionData),
  });
}

/**
 * Deletes a service description.
 */
export async function deleteServiceDescription(id: string): Promise<{ message: string }> {
  return apiRequest(`/api/reference/service-descriptions/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Gets all job sources.
 */
export async function getJobSources(): Promise<{ sources: JobSource[] }> {
  return apiRequest('/api/reference/job-sources');
}

/**
 * Creates a new job source.
 */
export async function createJobSource(sourceData: {
  name: string;
  description?: string;
  isDefault?: boolean;
}): Promise<{ source: JobSource }> {
  return apiRequest('/api/reference/job-sources', {
    method: 'POST',
    body: JSON.stringify(sourceData),
  });
}

/**
 * Updates a job source.
 */
export async function updateJobSource(id: string, sourceData: Partial<JobSource>): Promise<{ source: JobSource }> {
  return apiRequest(`/api/reference/job-sources/${id}`, {
    method: 'PUT',
    body: JSON.stringify(sourceData),
  });
}

/**
 * Deletes a job source.
 */
export async function deleteJobSource(id: string): Promise<{ message: string }> {
  return apiRequest(`/api/reference/job-sources/${id}`, {
    method: 'DELETE',
  });
}

export interface MachineType {
  _id: string;
  name: string;
  serviceType: 'hours' | 'date';
  isActive?: boolean;
}

export async function getMachineTypes(): Promise<{ machineTypes: MachineType[] }> {
  return apiRequest('/api/reference/machine-types');
}

export async function createMachineType(data: { name: string; serviceType: 'hours' | 'date' }): Promise<{ machineType: MachineType }> {
  return apiRequest('/api/reference/machine-types', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMachineType(id: string, data: Partial<MachineType>): Promise<{ machineType: MachineType }> {
  return apiRequest(`/api/reference/machine-types/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteMachineType(id: string): Promise<{ message: string }> {
  return apiRequest(`/api/reference/machine-types/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Gets all rep codes.
 */
export async function getRepCodes(): Promise<{ repCodes: RepCode[] }> {
  return apiRequest('/api/reference/rep-codes');
}

/**
 * Creates a new rep code.
 */
export async function createRepCode(repCodeData: {
  code: string;
  description?: string;
  adminCodes?: string[];
  branches?: string[];
  user?: string | null;
}): Promise<{ repCode: RepCode }> {
  return apiRequest('/api/reference/rep-codes', {
    method: 'POST',
    body: JSON.stringify(repCodeData),
  });
}

/**
 * Updates a rep code.
 */
export async function updateRepCode(id: string, repCodeData: Partial<RepCode>): Promise<{ repCode: RepCode }> {
  return apiRequest(`/api/reference/rep-codes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(repCodeData),
  });
}

/**
 * Deletes a rep code.
 */
export async function deleteRepCode(id: string): Promise<void> {
  await apiRequest(`/api/reference/rep-codes/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Gets all admin codes.
 */
export async function getAdminCodes(): Promise<{ adminCodes: AdminCode[] }> {
  return apiRequest('/api/reference/admin-codes');
}

// ── Admin Activity Summary Report ──────────────────────────────────────────

export interface AdminActivityRow {
  adminCode: string;
  daily: number;
  weekly: number;
  monthly: number;
  last3months: number;
  last6months: number;
  ytd: number;
  avgPerDay: number;
}

export interface AdminActivityMeta {
  dailyLabel: string;    // e.g. "05/05/2026"
  weeklyLabel: string;   // e.g. "04/05/2026 – 10/05/2026"
  monthlyLabel: string;  // e.g. "May 2026"
  last3mLabel: string;   // e.g. "05/03/2026 – 05/06/2026"
  last6mLabel: string;   // e.g. "05/12/2025 – 05/06/2026"
  ytdLabel: string;      // e.g. "2026 YTD"
  workingDays: number;
}

export interface AdminActivityData {
  rows: AdminActivityRow[];
  meta: AdminActivityMeta;
}

export async function getAdminActivitySummary(params: {
  date?: string;
  adminCodes?: string[];
  branches?: string[];
}): Promise<AdminActivityData> {
  const qs = new URLSearchParams();
  if (params.date) qs.set('date', params.date);
  if (params.adminCodes?.length) qs.set('adminCodes', params.adminCodes.join(','));
  if (params.branches?.length) qs.set('branches', params.branches.join(','));
  return apiRequest<AdminActivityData>(
    `/api/jobs/admin-activity-summary?${qs.toString()}`
  );
}

// ─── Admin Activity Schedule ──────────────────────────────────────────────────

export interface AdminActivityScheduleConfig {
  _id?: string;
  isActive: boolean;
  sendTime: string;       // "HH:MM" SAST
  recipients: string[];
  lastRunDate?: string;
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'failed';
  lastRunError?: string;
}

export async function getAdminActivityScheduleConfig(): Promise<AdminActivityScheduleConfig> {
  return apiRequest<AdminActivityScheduleConfig>('/api/jobs/admin-activity-schedule');
}

export async function updateAdminActivityScheduleConfig(
  data: Partial<Pick<AdminActivityScheduleConfig, 'isActive' | 'sendTime' | 'recipients'>>,
): Promise<AdminActivityScheduleConfig> {
  return apiRequest<AdminActivityScheduleConfig>('/api/jobs/admin-activity-schedule', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function sendAdminActivityNow(recipients?: string[]): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/api/jobs/admin-activity-schedule/send-now', {
    method: 'POST',
    body: JSON.stringify({ recipients }),
  });
}

/**
 * Creates a new admin code.
 */
export async function createAdminCode(adminCodeData: {
  code: string;
  description?: string;
  userId?: string;
}): Promise<{ adminCode: AdminCode }> {
  return apiRequest('/api/reference/admin-codes', {
    method: 'POST',
    body: JSON.stringify(adminCodeData),
  });
}

/**
 * Updates an admin code.
 */
export async function updateAdminCode(id: string, adminCodeData: Partial<AdminCode>): Promise<{ adminCode: AdminCode }> {
  return apiRequest(`/api/reference/admin-codes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(adminCodeData),
  });
}

/**
 * Deletes an admin code.
 */
export async function deleteAdminCode(id: string): Promise<void> {
  await apiRequest(`/api/reference/admin-codes/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Gets all machines with optional filtering.
 */
export async function getMachines(params?: {
  customerId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortField?: 'make' | 'serialNumber' | 'customer' | 'machineHours';
  sortDir?: 'asc' | 'desc';
  ownershipType?: 'ars_rental' | 'customer' | '';
  dbStatus?: 'active' | 'archived';
}): Promise<{ machines: Machine[]; pagination: any }> {
  const queryParams = new URLSearchParams();
  if (params?.customerId) queryParams.append('customerId', params.customerId);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.sortField) queryParams.append('sortField', params.sortField);
  if (params?.sortDir) queryParams.append('sortDir', params.sortDir);
  if (params?.ownershipType) queryParams.append('ownershipType', params.ownershipType);
  if (params?.dbStatus) queryParams.append('dbStatus', params.dbStatus);
  
  const query = queryParams.toString();
  const response = await apiRequest<{ machines: Machine[]; pagination: any }>(`/api/machines${query ? `?${query}` : ''}`);
  // The explicit archived view is an audit/history surface, not a normal
  // selectable-machine result. Preserve its existing backend contract.
  return {
    ...response,
    machines: params?.dbStatus === 'archived'
      ? (response.machines || [])
      : canonicalMachineOptions(response.machines || []),
  };
}

/**
 * Gets a single machine by ID.
 */
export async function getMachine(id: string): Promise<{ machine: Machine; redirectedFromMachineId?: string }> {
  return apiRequest(`/api/machines/${id}`);
}

export interface CanonicalMachineSelectionResolution extends MachineResolutionSnapshot<Machine> {}

/**
 * Resolves a small set of current form selections through the direct backend
 * endpoint. This is deliberately not used for paginated lists: list APIs are
 * already canonical-only and must retain their pagination behaviour.
 */
export async function resolveCanonicalMachineSelections(
  machineIds: Array<Machine | string | null | undefined>,
): Promise<CanonicalMachineSelectionResolution> {
  const requestedIds = Array.from(new Set(machineIds
    .map((machine) => typeof machine === 'string' ? machine : machine?._id)
    .filter((machineId): machineId is string => Boolean(machineId))));
  const entries = await Promise.all(requestedIds.map(async (requestedId): Promise<MachineResolutionEntry<Machine>> => {
    try {
      const response = await getMachine(requestedId);
      const machine = response?.machine;
      if (!machine || canonicalMachineOptions([machine]).length !== 1) {
        return {
          originalMachineId: requestedId,
          status: 'UNRESOLVED_TRANSIENT',
          failureKind: 'malformed',
        };
      }
      const redirectedFromMachineId = response.redirectedFromMachineId
        || (machine._id !== requestedId ? requestedId : undefined);
      return {
        originalMachineId: requestedId,
        status: redirectedFromMachineId ? 'RESOLVED_CANONICAL' : 'RESOLVED',
        machine,
        canonicalMachineId: machine._id,
        redirectedFromMachineId,
      };
    } catch (error) {
      return {
        originalMachineId: requestedId,
        status: machineResolutionStatusForFailure(error),
        failureKind: classifyApiFailure(error),
      };
    }
  }));

  return createMachineResolutionSnapshot(entries);
}

async function canonicalizeJobMachinePayload(jobData: Partial<Job>): Promise<Partial<Job>> {
  if (!Array.isArray(jobData.machines)) return jobData;

  const resolution = await resolveCanonicalMachineSelections(jobData.machines);
  if (resolution.unresolvedMachineIds.length > 0) {
    throw new Error('One or more selected machines could not be resolved safely. Refresh the machine selection and try again.');
  }

  return { ...jobData, machines: resolution.machineIds };
}

/**
 * Gets machines by customer ID or cash customer name.
 */
export async function getMachinesByCustomer(customerId?: string, cashCustomer?: string): Promise<{ machines: Machine[] }> {
  if (cashCustomer) {
    const response = await apiRequest<{ machines: Machine[] }>(`/api/machines/cash-customer/${encodeURIComponent(cashCustomer)}`);
    return { ...response, machines: canonicalMachineOptions(response.machines || []) };
  }
  if (customerId) {
    const response = await apiRequest<{ machines: Machine[] }>(`/api/machines/customer/${customerId}`);
    return { ...response, machines: canonicalMachineOptions(response.machines || []) };
  }
  throw new Error('Either customerId or cashCustomer must be provided');
}

/**
 * Gets all rental fleet machines.
 */
export async function getRentalMachines(search?: string): Promise<{ machines: Machine[] }> {
  const queryParams = new URLSearchParams();
  if (search) queryParams.append('search', search);
  const query = queryParams.toString();
  const response = await apiRequest<{ machines: Machine[] }>(`/api/machines/rental${query ? `?${query}` : ''}`);
  return { ...response, machines: canonicalMachineOptions(response.machines || []) };
}

/**
 * Creates a new machine.
 */
export async function createMachine(machineData: {
  make: string;
  model: string;
  serialNumber: string;
  customer?: string;
  cashCustomer?: string;
  isRental?: boolean;
  serviceType?: 'hours' | 'date';
  machineHours?: number;
  nextServiceHours?: number;
  lastServiceDate?: string;
  nextServiceDate?: string;
}): Promise<{ machine: Machine }> {
  return apiRequest('/api/machines', {
    method: 'POST',
    body: JSON.stringify(machineData),
  });
}

/**
 * Updates a machine.
 */
export async function updateMachine(id: string, machineData: Partial<Machine>): Promise<{ machine: Machine }> {
  return apiRequest(`/api/machines/${id}`, {
    method: 'PUT',
    body: JSON.stringify(machineData),
  });
}

/** Re-links an active or archived cash-customer machine to a customer record. */
export async function relinkMachineToCustomer(
  machineId: string,
  customerId: string,
  preserveAsLocation = true,
): Promise<{ machine: Machine }> {
  return apiRequest(`/api/machines/${machineId}/relink`, {
    method: 'PUT',
    body: JSON.stringify({ customerId, preserveAsLocation }),
  });
}

/**
 * Deletes a machine.
 */
export async function deleteMachine(id: string): Promise<void> {
  await apiRequest(`/api/machines/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Report API functions.
 */

export interface CustomerWithMachines {
  _id: string;
  name: string;
  machineCount: number;
}

/**
 * Gets customers that have machines (for report selection).
 */
export async function getCustomersWithMachines(): Promise<{ customers: CustomerWithMachines[] }> {
  return apiRequest<{ customers: CustomerWithMachines[] }>('/api/reports/customers-with-machines');
}

/**
 * Downloads the machine planner report as an Excel file.
 */
export async function downloadMachinePlannerReport(customerId: string, customerName: string): Promise<void> {
  const token = getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${apiBase()}/api/reports/machine-planner/${customerId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to generate report' } }));
    throw new Error(error.error?.message || 'Failed to generate report');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = customerName.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `${safeName}_Machine_Planner_${dateStr}.xlsx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}

/**
 * Cash Customer API functions.
 */

/**
 * Gets all cash customers.
 */
export async function getCashCustomers(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ cashCustomers: CashCustomer[]; pagination: any }> {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  
  const query = queryParams.toString();
  return apiRequest(`/api/cash-customers${query ? `?${query}` : ''}`);
}

/**
 * Gets a single cash customer by ID.
 */
export async function getCashCustomer(id: string): Promise<{ cashCustomer: CashCustomer }> {
  return apiRequest(`/api/cash-customers/${id}`);
}

/**
 * Creates a new cash customer.
 */
export async function createCashCustomer(cashCustomerData: {
  name: string;
}): Promise<{ cashCustomer: CashCustomer }> {
  return apiRequest('/api/cash-customers', {
    method: 'POST',
    body: JSON.stringify(cashCustomerData),
  });
}

/**
 * Updates a cash customer.
 */
export async function updateCashCustomer(id: string, cashCustomerData: Partial<CashCustomer>): Promise<{ cashCustomer: CashCustomer }> {
  return apiRequest(`/api/cash-customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(cashCustomerData),
  });
}

/**
 * Deletes a cash customer (soft delete).
 */
export async function deleteCashCustomer(id: string): Promise<void> {
  await apiRequest(`/api/cash-customers/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Gets all technicians.
 */
export async function getTechnicians(): Promise<{ technicians: Technician[] }> {
  return apiRequest('/api/reference/technicians');
}

/**
 * Creates a new technician.
 */
export async function createTechnician(technicianData: {
  name: string;
  email?: string;
  phone?: string;
  user?: string;
}): Promise<{ technician: Technician }> {
  return apiRequest('/api/reference/technicians', {
    method: 'POST',
    body: JSON.stringify(technicianData),
  });
}

/**
 * Updates a technician.
 */
export async function updateTechnician(id: string, technicianData: Partial<Technician>): Promise<{ technician: Technician }> {
  return apiRequest(`/api/reference/technicians/${id}`, {
    method: 'PUT',
    body: JSON.stringify(technicianData),
  });
}

/**
 * Deletes a technician.
 */
export async function deleteTechnician(id: string): Promise<{ message: string }> {
  return apiRequest(`/api/reference/technicians/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Gets all follow-up statuses.
 */
export async function getFollowUpStatuses(): Promise<{ followUpStatuses: FollowUpStatus[] }> {
  return apiRequest('/api/reference/follow-up-statuses');
}

/**
 * User Management API functions.
 */

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: {
    _id: string;
    name: string;
    description?: string;
    isActive: boolean;
  };
  permissions: string[];
  branches?: {
    _id: string;
    name: string;
    code?: string;
  }[] | string[];
  isActive: boolean;
  isSuperAdmin?: boolean;
  adminCode?: {
    _id: string;
    code: string;
    description?: string;
  } | string;
  repCode?: {
    _id: string;
    code: string;
    description?: string;
  } | string;
  repCodes?: {
    _id: string;
    code: string;
    description?: string;
  }[];
  adminCodes?: {
    _id: string;
    code: string;
    description?: string;
  }[];
  technician?: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
  } | string;
  passwordSet?: boolean;
  locationTrackingEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface Role {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
  isActive: boolean;
}

export interface Permission {
  _id: string;
  name: string;
  resource: string;
  action: string;
  description: string;
  category?: string;
  isActive: boolean;
}

/**
 * Gets all users with pagination and search.
 */
export async function getUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ users: User[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);
  
  const query = queryParams.toString();
  return apiRequest(`/api/users${query ? `?${query}` : ''}`);
}

/**
 * Gets a single user by ID.
 */
export async function getUser(id: string): Promise<{ user: User }> {
  return apiRequest(`/api/users/${id}`);
}

/**
 * Creates a new user.
 */
export async function createUser(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions?: string[];
  cellPhone?: string;
  locationTrackingEnabled?: boolean;
  repCodeId?: string;
  technicianId?: string;
  branches?: string[];
}): Promise<{ user: User }> {
  return apiRequest('/api/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

/**
 * Invites a user (creates user without password, sends invitation email).
 */
export async function inviteUser(userData: {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions?: string[];
  cellPhone?: string;
  locationTrackingEnabled?: boolean;
  adminCodeId?: string;
  adminCode?: { code: string; description?: string };
  repCodeId?: string;
  repCode?: { code: string; description?: string };
  technicianId?: string;
  technician?: { name: string; email?: string; phone?: string };
}): Promise<{ user: User }> {
  return apiRequest('/api/users/invite', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

/**
 * Updates a user.
 */
export async function updateUser(id: string, userData: Partial<User>): Promise<{ user: User }> {
  return apiRequest(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  });
}

/**
 * Deletes a user (soft delete).
 */
export async function deleteUser(id: string): Promise<void> {
  await apiRequest(`/api/users/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Updates user permissions.
 */
export async function updateUserPermissions(id: string, permissions: string[]): Promise<{ user: User }> {
  return apiRequest(`/api/users/${id}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  });
}

/**
 * Updates user branch access.
 */
export async function updateUserBranches(id: string, branches: string[]): Promise<{ user: User }> {
  return apiRequest(`/api/users/${id}/branches`, {
    method: 'PUT',
    body: JSON.stringify({ branches }),
  });
}

/**
 * Resends invitation email to a user.
 */
export async function resendInvitation(userId: string): Promise<{ message: string }> {
  return apiRequest(`/api/users/${userId}/resend-invitation`, {
    method: 'POST',
  });
}

/**
 * Gets all roles.
 */
export async function getRoles(): Promise<{ roles: Role[]; count: number }> {
  return apiRequest('/api/roles');
}

/**
 * Gets a single role by ID.
 */
export async function getRole(id: string): Promise<{ role: Role }> {
  return apiRequest(`/api/roles/${id}`);
}

/**
 * Creates a new role.
 */
export async function createRole(roleData: {
  name: string;
  description?: string;
  permissions?: string[];
}): Promise<{ role: Role }> {
  return apiRequest('/api/roles', {
    method: 'POST',
    body: JSON.stringify(roleData),
  });
}

/**
 * Updates a role.
 */
export async function updateRole(id: string, roleData: Partial<Role>): Promise<{ role: Role }> {
  return apiRequest(`/api/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(roleData),
  });
}

/**
 * Deletes a role.
 */
export async function deleteRole(id: string): Promise<void> {
  await apiRequest(`/api/roles/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Updates role permissions.
 */
export async function updateRolePermissions(id: string, permissions: string[]): Promise<{ role: Role }> {
  return apiRequest(`/api/roles/${id}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  });
}

/**
 * Apply permissions to all users in a role group.
 * Super admin only. Sets the same permissions on every active user with this role.
 * Individual permissions can still be modified per user afterwards.
 */
export async function applyGroupPermissions(
  roleId: string,
  permissions: string[],
  includeInactive?: boolean,
): Promise<{ role: Role; usersUpdated: number; message: string }> {
  return apiRequest(`/api/roles/${roleId}/apply-group-permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  });
}

/**
 * Gets all permissions (catalog).
 */
export async function getPermissions(params?: {
  category?: string;
  resource?: string;
  isActive?: boolean;
}): Promise<{ permissions: Permission[]; count: number }> {
  const queryParams = new URLSearchParams();
  if (params?.category) queryParams.append('category', params.category);
  if (params?.resource) queryParams.append('resource', params.resource);
  if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
  
  const query = queryParams.toString();
  return apiRequest(`/api/permissions${query ? `?${query}` : ''}`);
}

/**
 * Import Management API functions.
 */

export interface ImportResult {
  imported: number;
  updated: number;
  skipped?: number;
  errors: string[];
  duplicates?: { row: number; serialNumber: string; make: string; model: string }[];
}

export interface ImportHistory {
  jobs: {
    total: number;
    lastImported: string | null;
  };
  customers: {
    total: number;
    lastImported: string | null;
  };
}

/**
 * Gets import history/statistics.
 */
export async function getImportHistory(): Promise<{ data: ImportHistory }> {
  return apiRequest('/api/import/history');
}

export interface TechnicianAppReleaseInfo {
  version: string | null;
  downloadEnabled: boolean;
  hasApk: boolean;
  fileSize: number | null;
  originalFileName: string | null;
  uploadedAt: string | null;
  uploadedBy: { name?: string; email?: string } | null;
}

/**
 * Gets metadata for the latest ARS Technician mobile app APK.
 */
export async function getTechnicianAppRelease(): Promise<TechnicianAppReleaseInfo> {
  return apiRequest('/api/technician-app/release');
}

/**
 * Uploads a new technician app APK (super admin only).
 */
export async function uploadTechnicianAppRelease(
  file: File,
  version: string,
  downloadEnabled: boolean,
): Promise<{ message: string; data: TechnicianAppReleaseInfo }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('version', version);
  formData.append('downloadEnabled', String(downloadEnabled));

  const token = getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${apiBase()}/api/technician-app/release`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to upload APK' } }));
    throw new Error(error.error?.message || 'Failed to upload APK');
  }

  return response.json();
}

/**
 * Updates technician app version label and download availability without replacing the APK.
 */
export async function updateTechnicianAppReleaseSettings(
  version: string,
  downloadEnabled: boolean,
): Promise<TechnicianAppReleaseInfo> {
  return apiRequest('/api/technician-app/release', {
    method: 'PATCH',
    body: JSON.stringify({ version, downloadEnabled }),
  });
}

/**
 * Downloads the latest technician app APK as a file.
 */
export async function downloadTechnicianAppApk(versionLabel?: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${apiBase()}/api/technician-app/release/download`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Download failed' } }));
    throw new Error(error.error?.message || 'Download failed');
  }

  const blob = await response.blob();
  const safeVersion = (versionLabel || 'latest').replace(/[^\w.-]+/g, '_');
  const fileName = `ARS-Technician-${safeVersion}.apk`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Imports jobs from CSV file.
 */
export async function importJobs(file: File, clearExisting: boolean, branchId?: string, branchCode?: string): Promise<{ message: string; data: ImportResult }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('clearExisting', clearExisting.toString());
  if (branchId) {
    formData.append('branchId', branchId);
  }
  if (branchCode) {
    formData.append('branchCode', branchCode);
  }

  const token = getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${apiBase()}/api/import/jobs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to import jobs' } }));
    throw new Error(error.error?.message || 'Failed to import jobs');
  }

  return response.json();
}

/**
 * Updates existing jobs from CSV file.
 * CSV should contain: Job Number, Service Description, Value Ex VAT
 */
export async function updateJobs(file: File): Promise<{ message: string; data: { updated: number; notFound: number; errors: string[]; totalErrors: number } }> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${apiBase()}/api/import/jobs/update`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to update jobs' } }));
    throw new Error(error.error?.message || 'Failed to update jobs');
  }

  return response.json();
}

/**
 * Imports customers from CSV file.
 */
export async function importCustomers(file: File, clearExisting: boolean): Promise<{ message: string; data: ImportResult }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('clearExisting', clearExisting.toString());

  const token = getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${apiBase()}/api/import/customers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to import customers' } }));
    throw new Error(error.error?.message || 'Failed to import customers');
  }

  return response.json();
}

/**
 * Imports rental machines from CSV file.
 */
export async function importRentalMachines(file: File, clearExisting: boolean): Promise<{ message: string; data: ImportResult }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('clearExisting', clearExisting.toString());

  const token = getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${apiBase()}/api/import/rental-machines`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to import rental machines' } }));
    throw new Error(error.error?.message || 'Failed to import rental machines');
  }

  return response.json();
}

/**
 * Imports customer machines from the XLSX wizard (JSON payload).
 */
export async function importCustomerMachines(machines: ImportableMachineRow[]): Promise<{ message: string; data: { imported: number; skipped: number; errors: string[] } }> {
  const token = getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${apiBase()}/api/import/customer-machines`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ machines }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to import machines' } }));
    throw new Error(error.error?.message || 'Failed to import machines');
  }

  return response.json();
}

/**
 * Unified machine import — Phase 1: validate CSV.
 * Returns valid rows and error rows without writing to DB.
 */
export async function validateMachinesCSV(file: File): Promise<{
  data: {
    totalRows: number;
    validRows: ValidatedMachineRow[];
    errorRows: ErrorMachineRow[];
    summary: { valid: number; errors: number };
  };
}> {
  const formData = new FormData();
  formData.append('file', file);
  const token = getAuthToken();
  if (!token) throw new Error('No authentication token found');
  const response = await fetch(`${apiBase()}/api/import/machines/validate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Validation failed' } }));
    throw new Error(error.error?.message || 'Validation failed');
  }
  return response.json();
}

/**
 * Unified machine import — Phase 2: confirm (smart upsert).
 * Takes validated + user-corrected rows and writes to DB.
 */
export async function confirmMachinesImport(
  rows: (ValidatedMachineRow | ErrorMachineRow)[],
): Promise<{
  data: { imported: number; updated: number; skipped: number; errors: string[] };
}> {
  const token = getAuthToken();
  if (!token) throw new Error('No authentication token found');
  const response = await fetch(`${apiBase()}/api/import/machines/confirm`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rows }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Import failed' } }));
    throw new Error(error.error?.message || 'Import failed');
  }
  return response.json();
}

export async function previewDedupMachines(): Promise<{
  data: {
    totalMachines: number;
    duplicateGroups: number;
    duplicateRecords: number;
    groups: Array<{
      serialNumber: string;
      count: number;
      masterId: string;
      duplicateIds: string[];
      totalRSRDocs: number;
    }>;
  };
}> {
  const token = getAuthToken();
  if (!token) throw new Error('No authentication token found');
  const response = await fetch(`${apiBase()}/api/machines/dedup/preview`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Preview failed' } }));
    throw new Error(error.error?.message || 'Preview failed');
  }
  return response.json();
}

export async function confirmDedupMachines(): Promise<{
  data: { merged: number; jobsRelinked: number };
  message: string;
}> {
  const token = getAuthToken();
  if (!token) throw new Error('No authentication token found');
  const response = await fetch(`${apiBase()}/api/machines/dedup/confirm`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Dedup failed' } }));
    throw new Error(error.error?.message || 'Dedup failed');
  }
  return response.json();
}

/**
 * Imports sales leads from CSV file.
 */
export async function importSalesLeads(file: File, clearExisting: boolean): Promise<{ message: string; data: ImportResult }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('clearExisting', clearExisting.toString());

  const token = getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${apiBase()}/api/import/sales-leads`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to import sales leads' } }));
    throw new Error(error.error?.message || 'Failed to import sales leads');
  }

  return response.json();
}

/**
 * Downloads an example CSV file.
 */
export async function downloadExampleCSV(type: 'jobs' | 'customers' | 'rental-machines' | 'sales-leads'): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${apiBase()}/api/import/example/${type}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to download example file');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}-example.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Activity Management API functions.
 */

export interface Activity {
  _id: string;
  userId?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  } | string;
  action: string;
  resourceType: string;
  resourceId?: string;
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ActivitiesResponse {
  activities: Activity[];
  pagination: ActivityPagination;
}

/**
 * Gets activities with optional filtering.
 */
export async function getActivities(params?: {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<ActivitiesResponse> {
  const queryParams = new URLSearchParams();
  if (params?.userId) queryParams.append('userId', params.userId);
  if (params?.action) queryParams.append('action', params.action);
  if (params?.resourceType) queryParams.append('resourceType', params.resourceType);
  if (params?.resourceId) queryParams.append('resourceId', params.resourceId);
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
  
  const query = queryParams.toString();
  return apiRequest<ActivitiesResponse>(`/api/activities${query ? `?${query}` : ''}`);
}

/**
 * Gets the complete canonical-machine activity history for one requested
 * machine ID. The backend resolves retired and triplicate machine history.
 */
export interface MachineHistoryRecord {
  id: string;
  type: string;
  occurredAt: string | null;
  record: Record<string, unknown>;
  provenance: Record<string, unknown> & { machineIds: string[] };
  file?: Record<string, unknown>;
}

export interface CanonicalMachineHistoryData {
  requestedMachineId: string;
  canonicalMachineId: string;
  resolvedFromRetired: boolean;
  canonicalIdentity?: MachineHistoryIdentity;
  groupIdentities: MachineHistoryIdentity[];
  section: MachineHistorySection;
  records: MachineHistoryRecord[];
  pagination: { page: number; limit: number; total: number; hasMore: boolean };
}

/** Gets one paginated, read-only section of canonical machine history. */
export async function getCanonicalMachineHistory(
  machineId: string,
  params: { section: MachineHistorySection; page: number; limit: number },
): Promise<CanonicalMachineHistoryData> {
  return apiRequest<CanonicalMachineHistoryData>(
    buildCanonicalMachineHistoryEndpoint(machineId, params.section, params.page, params.limit),
  );
}

/**
 * Gets a single activity by ID.
 */
export async function getActivity(id: string): Promise<{ activity: Activity }> {
  return apiRequest<{ activity: Activity }>(`/api/activities/${id}`);
}

/**
 * Chat API types and functions.
 */
export interface ChatUser {
  _id: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
}

export interface ChatMessage {
  _id: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  receiver: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  text: string;
  attachments: ChatAttachment[];
  reactions: Array<{
    emoji: string;
    userId: string;
    createdAt: string;
  }>;
  isRead: boolean;
  readAt?: string;
  status: 'sent' | 'delivered' | 'failed';
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatAttachment {
  _id: string;
  messageId?: string;
  uploadedBy: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageType: 'gridfs' | 's3';
  storageKey: string;
  checksum: string;
  url?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get list of users available for chat.
 */
export async function getChatUsers(): Promise<ChatUser[]> {
  const response = await apiRequest<{ users: ChatUser[] }>('/api/chat/users');
  return response.users;
}

/**
 * Get message thread with a specific user.
 */
export async function getChatThread(userId: string, cursor?: string, limit = 50): Promise<{
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (cursor) params.append('cursor', cursor);
  
  const response = await apiRequest<{
    messages: ChatMessage[];
    nextCursor: string | null;
    hasMore: boolean;
  }>(`/api/chat/threads/${userId}?${params}`);
  
  return response;
}

/**
 * Send a chat message (REST fallback).
 */
export async function sendChatMessage(receiverId: string, text: string, attachmentIds: string[] = []): Promise<ChatMessage> {
  const response = await apiRequest<{ message: ChatMessage }>('/api/chat/messages', {
    method: 'POST',
    body: JSON.stringify({ receiverId, text, attachmentIds }),
  });
  return response.message;
}

/**
 * Mark messages as read.
 */
export async function markMessagesRead(senderId?: string, messageIds?: string[]): Promise<{ modifiedCount: number }> {
  const response = await apiRequest<{ modifiedCount: number }>('/api/chat/messages/read', {
    method: 'POST',
    body: JSON.stringify({ senderId, messageIds }),
  });
  return response;
}

/**
 * Get unread message count.
 */
export async function getUnreadCount(): Promise<number> {
  const response = await apiRequest<{ count: number }>('/api/chat/unread-count');
  return response.count;
}

/**
 * Upload chat attachment.
 */
export async function uploadChatAttachment(file: File): Promise<ChatAttachment> {
  const formData = new FormData();
  formData.append('file', file);
  
  const token = getAuthToken();
  const response = await fetch(`${apiBase()}/api/chat/attachments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Upload failed');
  }
  
  const data = await response.json();
  return data.data.attachment;
}

/**
 * Get download URL for attachment.
 */
export function getChatAttachmentUrl(attachmentId: string): string {
  const token = getAuthToken();
  return `${apiBase()}/api/chat/attachments/${attachmentId}?token=${token}`;
}

/**
 * Search messages.
 */
export async function searchChatMessages(query: string, userId?: string, limit = 20): Promise<ChatMessage[]> {
  const params = new URLSearchParams({ query, limit: limit.toString() });
  if (userId) params.append('userId', userId);
  
  const response = await apiRequest<{ messages: ChatMessage[] }>(`/api/chat/search?${params}`);
  return response.messages;
}

/**
 * Job RSR Document and Notes API functions.
 */

export interface JobRSRDocument {
  _id: string;
  jobId: string;
  title: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  visibility: 'all' | 'private';
  uploadedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface JobNoteAttachment {
  _id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface JobNote {
  _id: string;
  jobId: string;
  text: string;
  attachments: JobNoteAttachment[];
  visibility: 'all' | 'private';
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

// ==================== SUPPORT TICKETS ====================

/**
 * Support ticket submission data.
 */
export interface SupportTicketData {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'bug' | 'feature' | 'feature_request' | 'question' | 'access' | 'other';
  subject: string;
  description: string;
  reportedBy: string; // User ID of the person who reported the issue
  context?: {
    page?: string;
    browser?: string;
    jobNumber?: string;
  };
}

/**
 * Support ticket response from API.
 */
export interface SupportTicketResponse {
  ticketId: string;
  ticketNumber: string;
  severity: string;
  category: string;
  subject: string;
}

/**
 * Full support ticket from API.
 */
export interface SupportTicketFull {
  _id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'bug' | 'feature' | 'feature_request' | 'question' | 'access' | 'other';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  reportedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  responses: Array<{
    _id: string;
    message: string;
    respondedBy: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    respondedByName: string;
    isFromSupport: boolean;
    createdAt: string;
  }>;
  unreadByUser: boolean;
  unreadBySupport?: boolean;
  context?: {
    page?: string;
    browser?: string;
    jobNumber?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type RSRUploadOperationState = 'PREPARED' | 'FILE_STORED' | 'COMMITTED' | 'RECOVERY_REQUIRED';

export interface RSRUploadOperationResult {
  operationId: string;
  state: RSRUploadOperationState;
  idempotentReplay?: boolean;
}

function rsrUploadHeaders(attempt?: RSRUploadAttempt): Record<string, string> {
  const token = getAuthToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...rsrUploadAttemptHeaders(attempt),
  };
}

async function postRSRUpload<T>(
  endpoint: string,
  formData: FormData,
  attempt?: RSRUploadAttempt,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBase()}${endpoint}`, {
      method: 'POST',
      headers: rsrUploadHeaders(attempt),
      body: formData,
    });
  } catch (error) {
    throw new ApiRequestError(
      error instanceof Error && error.message ? error.message : 'Network request failed',
      { kind: 'transient' },
    );
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    throw new ApiRequestError(
      data?.error?.message || data?.message || 'Failed to upload RSR document',
      {
        kind: response.ok ? 'malformed' : classifyApiFailure({ status: response.status }),
        status: response.status,
      },
    );
  }
  return data.data as T;
}

/** Upload RSR document for a job with an optional sealed target set and retry identity. */
export async function uploadRSRDocument(
  jobId: string,
  file: File,
  title: string,
  visibility: 'all' | 'private' = 'all',
  options: { attempt?: RSRUploadAttempt; machineIds?: string[] } = {},
): Promise<RSRUploadOperationResult & { rsrDocument: JobRSRDocument }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  formData.append('visibility', visibility);
  if (options.machineIds) {
    const resolution = await resolveCanonicalMachineSelections(options.machineIds);
    if (resolution.unresolvedMachineIds.length > 0 || resolution.machineIds.length === 0) {
      throw new ApiRequestError('One or more intended machines could not be resolved safely.', { kind: 'validation' });
    }
    formData.append('machineIds', JSON.stringify(resolution.machineIds));
  }
  const data = await postRSRUpload<RSRUploadOperationResult & { rsrDocument: JobRSRDocument }>(`/api/jobs/${jobId}/rsr-documents`, formData, options.attempt);
  if (!data?.operationId || !data?.state || !data?.rsrDocument) {
    throw new ApiRequestError('RSR upload completed without a durable operation result.', { kind: 'malformed' });
  }
  return data;
}

/**
 * Get all RSR documents for a job.
 */
export async function getRSRDocuments(jobId: string): Promise<JobRSRDocument[]> {
  const response = await apiRequest<{ rsrDocuments: JobRSRDocument[] }>(`/api/jobs/${jobId}/rsr-documents`);
  return response.rsrDocuments;
}

/**
 * Download RSR document.
 */
export function getRSRDocumentUrl(documentId: string): string {
  const token = getAuthToken();
  return `${apiBase()}/api/rsr-documents/${documentId}?token=${token}`;
}

/**
 * @deprecated RSR records are retained for audit and historical integrity.
 * The frontend intentionally exposes no deletion flow and the backend rejects
 * this legacy operation before performing any storage or metadata change.
 */
export async function deleteRSRDocument(_documentId: string): Promise<never> {
  void _documentId;
  throw new Error('RSR deletion is unavailable. RSR records are retained for audit and historical integrity.');
}

// ============================================================================
// Machine RSR Document Functions
// ============================================================================

/**
 * Upload RSR document to a machine.
 */
export async function uploadMachineRSR(
  machineId: string,
  file: File,
  title: string,
  description?: string,
  extraFields?: {
    workDate?: string;
    currentHours?: number;
    nextServiceHours?: number;
    nextServiceDate?: string;
  },
  attempt?: RSRUploadAttempt,
): Promise<RSRUploadOperationResult & { rsrDocument: MachineRSR }> {
  const resolution = await resolveCanonicalMachineSelections([machineId]);
  if (resolution.unresolvedMachineIds.length > 0 || resolution.machineIds.length !== 1) {
    throw new Error('The selected machine could not be resolved safely. Refresh the machine selection and try again.');
  }
  const canonicalMachineId = resolution.machineIds[0];
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  if (description) formData.append('description', description);
  if (extraFields?.workDate) formData.append('workDate', extraFields.workDate);
  if (extraFields?.currentHours !== undefined) formData.append('currentHours', String(extraFields.currentHours));
  if (extraFields?.nextServiceHours !== undefined) formData.append('nextServiceHours', String(extraFields.nextServiceHours));
  if (extraFields?.nextServiceDate) formData.append('nextServiceDate', extraFields.nextServiceDate);

  const data = await postRSRUpload<RSRUploadOperationResult & { rsrDocument: MachineRSR }>(`/api/machines/${canonicalMachineId}/rsr`, formData, attempt);
  if (!data?.operationId || !data?.state || !data?.rsrDocument) {
    throw new ApiRequestError('RSR upload completed without a durable operation result.', { kind: 'malformed' });
  }
  return data;
}

/**
 * Unified RSR upload. Stores the file once and attaches a copy to every
 * target machine. When `jobId` is supplied the backend defaults the target
 * machines to that job's machines and pre-fills the report fields.
 */
export async function uploadRSR(params: {
  file: File;
  title?: string;
  description?: string;
  workDate: string;
  jobId?: string;
  machineIds?: string[];
  currentHours?: number;
  nextServiceHours?: number;
  nextServiceDate?: string;
  jobNumber?: string;
  quoteDate?: string;
  value?: number;
  rsrNumber?: string;
  poNumber?: string;
  invNumber?: string;
  tech?: string;
  hoursWorked?: number;
  comments?: string;
  attempt?: RSRUploadAttempt;
}): Promise<{
  operationId: string;
  state: RSRUploadOperationState;
  idempotentReplay?: boolean;
  rsrGroupId: string;
  documents: { machineId: string; rsrId: string }[];
  attachedCount: number;
  targetMachineIds: string[];
  rsrDocumentIds: string[];
}> {
  const machineResolution = params.machineIds
    ? await resolveCanonicalMachineSelections(params.machineIds)
    : null;
  if (machineResolution && (machineResolution.unresolvedMachineIds.length > 0 || machineResolution.machineIds.length === 0)) {
    throw new ApiRequestError('One or more intended machines could not be resolved safely.', { kind: 'validation' });
  }
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('workDate', params.workDate);
  if (params.title) formData.append('title', params.title);
  if (params.description) formData.append('description', params.description);
  if (params.jobId) formData.append('jobId', params.jobId);
  if (machineResolution)
    formData.append('machineIds', JSON.stringify(machineResolution.machineIds));
  if (params.currentHours !== undefined) formData.append('currentHours', String(params.currentHours));
  if (params.nextServiceHours !== undefined) formData.append('nextServiceHours', String(params.nextServiceHours));
  if (params.nextServiceDate) formData.append('nextServiceDate', params.nextServiceDate);
  if (params.jobNumber) formData.append('jobNumber', params.jobNumber);
  if (params.quoteDate) formData.append('quoteDate', params.quoteDate);
  if (params.value !== undefined) formData.append('value', String(params.value));
  if (params.rsrNumber) formData.append('rsrNumber', params.rsrNumber);
  if (params.poNumber) formData.append('poNumber', params.poNumber);
  if (params.invNumber) formData.append('invNumber', params.invNumber);
  if (params.tech) formData.append('tech', params.tech);
  if (params.hoursWorked !== undefined) formData.append('hoursWorked', String(params.hoursWorked));
  if (params.comments) formData.append('comments', params.comments);

  const data = await postRSRUpload<{
    operationId?: string;
    state?: RSRUploadOperationState;
    idempotentReplay?: boolean;
    rsrGroupId?: string;
    documents?: { machineId: string; rsrId: string }[];
    attachedCount?: number;
    targetMachineIds?: string[];
    rsrDocumentIds?: string[];
  }>('/api/machines/rsr', formData, params.attempt);
  if (
    !data?.operationId ||
    !data?.state ||
    !Array.isArray(data.documents) ||
    !Array.isArray(data.targetMachineIds) ||
    !Array.isArray(data.rsrDocumentIds) ||
    !Number.isInteger(data.attachedCount)
  ) {
    throw new ApiRequestError('RSR upload completed without attachment results.', { kind: 'malformed' });
  }
  if (data.attachedCount === 0) {
    throw new ApiRequestError('RSR file was saved but was not attached to any machine.', { kind: 'malformed' });
  }

  return data as {
    operationId: string;
    state: RSRUploadOperationState;
    idempotentReplay?: boolean;
    rsrGroupId: string;
    documents: { machineId: string; rsrId: string }[];
    attachedCount: number;
    targetMachineIds: string[];
    rsrDocumentIds: string[];
  };
}

/**
 * Get RSR documents for a machine.
 * Returns both machine-level RSRs and job-level RSRs from jobs linked to this machine.
 */
export async function getMachineRSRs(machineId: string): Promise<MachineRSR[]> {
  const response = await apiRequest<{ rsrDocuments: MachineRSR[], jobRSRDocuments?: JobRSRDocument[] }>(
    `/api/machines/${machineId}/rsr`
  );

  const machineRSRs = (response.rsrDocuments || []).map(r => ({ ...r, source: 'machine' as const }));

  // Transform job RSR documents into MachineRSR shape for unified display
  const jobRSRs: MachineRSR[] = (response.jobRSRDocuments || []).map(doc => ({
    _id: doc._id,
    title: doc.title,
    fileName: doc.originalName,
    fileUrl: doc._id, // serves as document ID for URL construction
    fileSize: doc.size,
    mimeType: doc.mimeType,
    uploadedBy: doc.uploadedBy,
    uploadedAt: doc.createdAt,
    source: 'job' as const,
    jobId: doc.jobId,
  }));

  return [...machineRSRs, ...jobRSRs];
}

/**
 * Get machine RSR document download URL.
 */
export function getMachineRSRUrl(machineId: string, rsrId: string): string {
  return `${apiBase()}/api/machines/${machineId}/rsr/${rsrId}`;
}

/**
 * Corrects report metadata on one already-uploaded machine RSR.
 *
 * Sends only correctable fields. The uploaded file is never replaced, and there
 * is no deletion counterpart.
 */
export async function updateMachineRSRMetadata(
  machineId: string,
  rsrId: string,
  updates: MachineRSRMetadataUpdate,
): Promise<MachineRSR> {
  const permitted = permittedMetadataPayload(updates);
  const response = await apiRequest<{ rsrDocument: MachineRSR }>(
    `/api/machines/${machineId}/rsr/${rsrId}/metadata`,
    {
      method: 'PATCH',
      body: JSON.stringify(permitted),
    },
  );
  if (!response?.rsrDocument) {
    throw new ApiRequestError('RSR metadata was saved without a refreshed record.', {
      kind: 'malformed',
    });
  }
  return { ...response.rsrDocument, source: 'machine' as const };
}

/**
 * @deprecated RSR records are retained for audit and historical integrity.
 * Kept as a fail-closed compatibility export for legacy callers only.
 */
export async function deleteMachineRSR(_machineId: string, _rsrId: string): Promise<never> {
  void _machineId;
  void _rsrId;
  throw new Error('RSR deletion is unavailable. RSR records are retained for audit and historical integrity.');
}

/**
 * Create a note for a job.
 */
export async function createJobNote(
  jobId: string,
  text: string,
  visibility: 'all' | 'private' = 'all',
  attachmentIds: string[] = []
): Promise<JobNote> {
  const response = await apiRequest<{ note: JobNote }>(`/api/jobs/${jobId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ text, visibility, attachmentIds }),
  });
  return response.note;
}

/**
 * Get all notes for a job.
 */
export async function getJobNotes(jobId: string): Promise<JobNote[]> {
  const response = await apiRequest<{ notes: JobNote[] }>(`/api/jobs/${jobId}/notes`);
  return response.notes;
}

/**
 * Upload attachment for a note.
 */
export async function uploadJobNoteAttachment(file: File): Promise<JobNoteAttachment> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAuthToken();
  const response = await fetch(`${apiBase()}/api/notes/attachments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to upload attachment');
  }

  const data = await response.json();
  return data.data.attachment;
}

/**
 * Download note attachment.
 */
export function getJobNoteAttachmentUrl(attachmentId: string): string {
  const token = getAuthToken();
  return `${apiBase()}/api/notes/attachments/${attachmentId}?token=${token}`;
}

/**
 * Delete note (super admin only).
 */
export async function deleteJobNote(noteId: string): Promise<void> {
  await apiRequest(`/api/notes/${noteId}`, {
    method: 'DELETE',
  });
}

/**
 * Submit a support ticket.
 * Creates a ticket in MongoDB (Super Admin only).
 * 
 * @param ticket - Support ticket data
 * @returns {Promise<SupportTicketResponse>} Created ticket info
 */
export async function submitSupportTicket(ticket: SupportTicketData): Promise<SupportTicketResponse> {
  const response = await apiRequest<{ data: SupportTicketResponse }>('/api/support/ticket', {
    method: 'POST',
    body: JSON.stringify(ticket),
  });
  return response.data;
}

/**
 * Get tickets for the current user.
 */
export async function getMyTickets(): Promise<{ tickets: SupportTicketFull[]; count: number }> {
  const response = await apiRequest<{ tickets: SupportTicketFull[]; count: number }>('/api/support/my-tickets');
  return response;
}

/**
 * Get unread ticket count for notification badge.
 */
export async function getUnreadTicketCount(): Promise<number> {
  const response = await apiRequest<{ unreadCount: number }>('/api/support/unread-count');
  return response.unreadCount;
}

/**
 * Get a single ticket by ID.
 */
export async function getTicket(ticketId: string): Promise<SupportTicketFull> {
  const response = await apiRequest<{ ticket: SupportTicketFull }>(`/api/support/ticket/${ticketId}`);
  return response.ticket;
}

/**
 * Add a response to a ticket.
 */
export async function addTicketResponse(ticketId: string, message: string): Promise<void> {
  await apiRequest(`/api/support/ticket/${ticketId}/response`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

/**
 * Mark a ticket as read.
 */
export async function markTicketAsRead(ticketId: string): Promise<void> {
  await apiRequest(`/api/support/ticket/${ticketId}/read`, {
    method: 'PATCH',
  });
}

/**
 * Mark all tickets as read for current user.
 */
export async function markAllTicketsAsRead(): Promise<void> {
  await apiRequest('/api/support/mark-all-read', {
    method: 'PATCH',
  });
}

// ============ SUPER ADMIN SUPPORT FUNCTIONS ============

/**
 * Get all tickets (Super Admin only).
 */
export async function getAllTickets(params?: {
  status?: string;
  severity?: string;
  page?: number;
  limit?: number;
}): Promise<{ tickets: SupportTicketFull[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.severity) queryParams.append('severity', params.severity);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  
  const query = queryParams.toString();
  const response = await apiRequest<{ tickets: SupportTicketFull[]; pagination: { page: number; limit: number; total: number; pages: number } }>(`/api/support/all${query ? `?${query}` : ''}`);
  return response;
}

/**
 * Get unread ticket count for support team.
 */
export async function getSupportUnreadCount(): Promise<number> {
  const response = await apiRequest<{ unreadCount: number }>('/api/support/support-unread-count');
  return response.unreadCount;
}

/**
 * Update ticket status (Super Admin only).
 */
export async function updateTicketStatus(ticketId: string, status: 'open' | 'in-progress' | 'resolved' | 'closed'): Promise<void> {
  await apiRequest(`/api/support/ticket/${ticketId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/**
 * Mark ticket as read by support team.
 */
export async function markTicketAsReadBySupport(ticketId: string): Promise<void> {
  await apiRequest(`/api/support/ticket/${ticketId}/support-read`, {
    method: 'PATCH',
  });
}

// ============================================================================
// Sales Lead Management
// ============================================================================

import type { SalesLead, SalesLeadWithDetails, Appointment, CanvassingPlan, VisitGpsVerification } from '../types';

/**
 * Get all sales leads with optional filtering.
 */
export async function getSalesLeads(params?: {
  status?: string;
  branch?: string;
  assignedRep?: string;
  leadSource?: string;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{ leads: SalesLead[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.branch) queryParams.append('branch', params.branch);
  if (params?.assignedRep) queryParams.append('assignedRep', params.assignedRep);
  if (params?.leadSource) queryParams.append('leadSource', params.leadSource);
  if (params?.priority) queryParams.append('priority', params.priority);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
  
  const query = queryParams.toString();
  const response = await apiRequest<{ leads: SalesLead[]; pagination: { page: number; limit: number; total: number; pages: number } }>(`/api/sales-leads${query ? `?${query}` : ''}`);
  return response;
}

/**
 * Get a single sales lead by ID with full details.
 */
export async function getSalesLead(id: string): Promise<SalesLeadWithDetails> {
  const response = await apiRequest<{ lead: SalesLead; appointments: Appointment[] }>(`/api/sales-leads/${id}`);
  return {
    ...response.lead,
    appointments: response.appointments,
  };
}

/**
 * Create a new sales lead.
 */
export async function createSalesLead(data: {
  companyName: string;
  contactPerson: string;
  contactEmail?: string;
  contactPhone: string;
  contactAddress?: string;
  geoLocation?: { type: 'Point'; coordinates: [number, number] };
  branch: string;
  assignedRep?: string;
  leadSource: string;
  serviceDescription?: string;
  estimatedValue?: number;
  priority?: string;
  notes?: string;
}): Promise<SalesLead> {
  const response = await apiRequest<SalesLead>('/api/sales-leads', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response;
}

/**
 * Update an existing sales lead.
 */
export async function updateSalesLead(id: string, data: Partial<SalesLead>): Promise<SalesLead> {
  const response = await apiRequest<SalesLead>(`/api/sales-leads/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response;
}

/**
 * Delete a sales lead (soft delete).
 */
export async function deleteSalesLead(id: string): Promise<void> {
  await apiRequest(`/api/sales-leads/${id}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Job Card Templates
// ============================================================================

/**
 * Job Card Template types.
 */
export interface JobCardTemplate {
  _id?: string;
  name: string;
  description?: string;
  templateKey?: string;
  reportPrefix?: 'RSR' | 'MCC';
  isSystemTemplate?: boolean;
  sections?: any[];
  pdfBackground?: string;
  fields?: any[]; // Legacy support
  groups?: any[]; // New structure: groups with tables
  header?: any; // Header configuration
  footer?: any; // Footer configuration
  showHeader?: boolean; // Whether to display header on report (default: true)
  pageWidth?: number;
  pageHeight?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  createdBy?: any;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
}

export interface JobCardTemplatesResponse {
  templates: JobCardTemplate[];
}

export interface JobCardTemplateResponse {
  template: JobCardTemplate;
}

/**
 * Gets all job card templates.
 */
export async function getJobCardTemplates(includeInactive?: boolean, systemOnly?: boolean, partsReadyOnly?: boolean): Promise<JobCardTemplatesResponse> {
  const search = new URLSearchParams();
  if (includeInactive) search.set('includeInactive', 'true');
  if (systemOnly) search.set('systemOnly', 'true');
  if (partsReadyOnly) search.set('partsReadyOnly', 'true');
  const qs = search.toString();
  return await apiRequest<JobCardTemplatesResponse>(`/api/job-card-templates${qs ? `?${qs}` : ''}`);
}

/**
 * Gets a single job card template by ID.
 */
export async function getJobCardTemplate(id: string): Promise<JobCardTemplateResponse> {
  return await apiRequest<JobCardTemplateResponse>(`/api/job-card-templates/${id}`);
}

/**
 * Creates a new job card template.
 */
export async function createJobCardTemplate(template: Partial<JobCardTemplate>): Promise<JobCardTemplateResponse> {
  return await apiRequest<JobCardTemplateResponse>('/api/job-card-templates', {
    method: 'POST',
    body: JSON.stringify(template),
  });
}

/**
 * Updates a job card template.
 */
export async function updateJobCardTemplate(id: string, template: Partial<JobCardTemplate>): Promise<JobCardTemplateResponse> {
  return await apiRequest<JobCardTemplateResponse>(`/api/job-card-templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(template),
  });
}

/**
 * Deletes a job card template.
 */
export async function deleteJobCardTemplate(id: string): Promise<void> {
  return await apiRequest(`/api/job-card-templates/${id}`, {
    method: 'DELETE',
  });
}

export async function duplicateJobCardTemplate(
  id: string,
  data: { name: string; description?: string }
): Promise<JobCardTemplateResponse> {
  return await apiRequest<JobCardTemplateResponse>(`/api/job-card-templates/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createBlankJobCardTemplate(data: {
  name: string;
  description?: string;
  reportPrefix?: 'RSR' | 'MCC';
}): Promise<JobCardTemplateResponse> {
  return await apiRequest<JobCardTemplateResponse>('/api/job-card-templates/blank', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Parts Ready job row: job + optional assignment + optional submission. */
export interface PartsReadyItem {
  job: Job & { bookings?: Array<{ technicianId: string; technicianName?: string }> };
  assignment: {
    _id: string;
    template: { _id: string; name: string };
    status: 'assigned' | 'started' | 'submitted';
    assignedAt: string;
    assignedBy?: { firstName?: string; lastName?: string };
    notifiedAt?: string;
    submission?: string;
  } | null;
  submission: {
    _id: string;
    submittedAt: string;
    reportNumber?: string;
    submittedBy?: { firstName?: string; lastName?: string };
  } | null;
}

/**
 * Gets all jobs with status "Parts Ready" and their job card assignment/submission info.
 */
export async function getPartsReadyJobs(): Promise<{
  items: PartsReadyItem[];
  statusId: string | null;
}> {
  return apiRequest<{ items: PartsReadyItem[]; statusId: string | null }>(
    '/api/job-card-assignments/parts-ready'
  );
}

/**
 * Assigns a job card template to a job (job must be Parts Ready).
 */
export async function createJobCardAssignment(params: {
  jobId: string;
  templateId: string;
  technicianId: string;
  notes?: string;
}): Promise<{ assignment: any }> {
  return apiRequest<{ assignment: any }>(
    '/api/job-card-assignments',
    { method: 'POST', body: JSON.stringify(params) }
  );
}

/** Job card submission record. */
export interface JobCardSubmissionRecord {
  _id: string;
  template: JobCardTemplate & { templateKey?: string; sections?: unknown[]; pdfBackground?: string };
  job: Job & Record<string, unknown>;
  submittedBy?: { firstName?: string; lastName?: string; email?: string };
  reportNumber?: string;
  fieldValues: Array<{ fieldId: string; type: string; value: unknown; signatureData?: string; imageData?: string }>;
  submittedAt: string;
  notes?: string;
  submissionLocation?: {
    lat: number;
    lng: number;
    accuracy?: number;
    capturedAt?: string;
  };
}

/**
 * Gets all job card submissions.
 */
export async function getJobCardSubmissions(params?: {
  template?: string;
  job?: string;
  page?: number;
}): Promise<{ submissions: JobCardSubmissionRecord[]; pagination: { total: number } }> {
  const search = new URLSearchParams();
  if (params?.template) search.set('template', params.template);
  if (params?.job) search.set('job', params.job);
  if (params?.page) search.set('page', String(params.page));
  const qs = search.toString();
  return apiRequest(`/api/job-card-submissions${qs ? `?${qs}` : ''}`);
}

/**
 * Gets a single job card submission with machine data for print preview.
 */
export async function getJobCardSubmission(id: string): Promise<{
  submission: JobCardSubmissionRecord;
  machine?: Record<string, unknown>;
}> {
  return apiRequest(`/api/job-card-submissions/${id}`);
}

/**
 * Patches editable field values on a submission. Signatures and photos are ignored server-side.
 */
export async function patchJobCardSubmission(
  id: string,
  data: { fieldValues?: { fieldId: string; value: unknown }[]; notes?: string }
): Promise<{ submission: JobCardSubmissionRecord }> {
  return apiRequest(`/api/job-card-submissions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Updates a job card assignment (e.g. notify technician, or set status).
 */
export async function updateJobCardAssignment(
  id: string,
  updates: { notifyTechnician?: boolean; status?: 'assigned' | 'started' | 'submitted' }
): Promise<{ assignment: any }> {
  return apiRequest<{ assignment: any }>(
    `/api/job-card-assignments/${id}`,
    { method: 'PATCH', body: JSON.stringify(updates) }
  );
}

/**
 * Deletes a job card assignment (soft delete).
 */
export async function deleteJobCardAssignment(id: string): Promise<void> {
  await apiRequest(`/api/job-card-assignments/${id}`, { method: 'DELETE' });
}

/**
 * Assign a sales lead to a rep.
 */
export async function assignSalesLead(id: string, repCode: string): Promise<SalesLead> {
  const response = await apiRequest<SalesLead>(`/api/sales-leads/${id}/assign`, {
    method: 'PUT',
    body: JSON.stringify({ repCode }),
  });
  return response;
}

/**
 * Convert a sales lead to a job.
 */
export async function convertSalesLeadToJob(id: string, jobData: any): Promise<{ lead: SalesLead; job: any }> {
  const response = await apiRequest<{ lead: SalesLead; job: any }>(`/api/sales-leads/${id}/convert`, {
    method: 'POST',
    body: JSON.stringify(jobData),
  });
  return response;
}

/**
 * Get appointments for a sales lead.
 */
export async function getAppointments(leadId: string): Promise<Appointment[]> {
  const response = await apiRequest<Appointment[]>(`/api/sales-leads/${leadId}/appointments`);
  return response;
}

/**
 * Get weekly appointments across all sales leads.
 * Optional filters: startDate, endDate, branch, assignedRep.
 */
export async function getWeeklyAppointments(params?: {
  startDate?: string;
  endDate?: string;
  branch?: string;
  assignedRep?: string;
  search?: string;
  status?: string;
  appointmentType?: string;
}): Promise<any[]> {
  const query = new URLSearchParams();
  if (params?.startDate) query.append('startDate', params.startDate);
  if (params?.endDate) query.append('endDate', params.endDate);
  if (params?.branch) query.append('branch', params.branch);
  if (params?.assignedRep) query.append('assignedRep', params.assignedRep);
  if (params?.search) query.append('search', params.search);
  if (params?.status) query.append('status', params.status);
  if (params?.appointmentType) query.append('appointmentType', params.appointmentType);

  const qs = query.toString();
  const response = await apiRequest<any[]>(`/api/sales-leads/appointments/weekly${qs ? `?${qs}` : ''}`);
  return response;
}

/**
 * Loads completed / cancelled visit history for the Sales Diary History tab.
 */
export async function getVisitHistory(params?: {
  search?: string;
  customer?: string;
  assignedRep?: string;
  branch?: string;
  appointmentType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<any[]> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.customer) query.append('customer', params.customer);
  if (params?.assignedRep) query.append('assignedRep', params.assignedRep);
  if (params?.branch) query.append('branch', params.branch);
  if (params?.appointmentType) query.append('appointmentType', params.appointmentType);
  if (params?.status) query.append('status', params.status);
  if (params?.startDate) query.append('startDate', params.startDate);
  if (params?.endDate) query.append('endDate', params.endDate);
  if (params?.limit != null) query.append('limit', String(params.limit));

  const qs = query.toString();
  return apiRequest<any[]>(`/api/sales-leads/appointments/history${qs ? `?${qs}` : ''}`);
}

/**
 * Manual check-in for an appointment (geofence fallback).
 */
export async function appointmentCheckIn(
  leadId: string,
  appointmentId: string,
  location?: { latitude: number; longitude: number; accuracy?: number }
): Promise<Appointment> {
  const response = await apiRequest<Appointment>(
    `/api/sales-leads/${leadId}/appointments/${appointmentId}/checkin`,
    {
      method: 'POST',
      body: JSON.stringify(location || {}),
    }
  );
  return response;
}

/**
 * Geocode a sales lead's contact address.
 */
export async function geocodeSalesLead(leadId: string): Promise<{
  geoLocation: { type: 'Point'; coordinates: [number, number] };
  displayName: string;
}> {
  const response = await apiRequest<{
    geoLocation: { type: 'Point'; coordinates: [number, number] };
    displayName: string;
  }>(`/api/sales-leads/${leadId}/geocode`, { method: 'POST' });
  return response;
}

/**
 * Get appointments with geolocation data for map display.
 */
export async function getGeoAppointments(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<Appointment[]> {
  const query = new URLSearchParams();
  if (params?.startDate) query.append('startDate', params.startDate);
  if (params?.endDate) query.append('endDate', params.endDate);

  const qs = query.toString();
  const response = await apiRequest<Appointment[]>(
    `/api/sales-leads/appointments/geo${qs ? `?${qs}` : ''}`
  );
  return response;
}

/**
 * Get sales lead statistics for dashboard.
 */
export async function getSalesLeadStats(): Promise<{
  totalLeads: number;
  openLeads: number;
  pendingConversions: number;
  conversionRate: number;
  appointmentsThisWeek: number;
  upcomingAppointments: number;
  totalEstimatedValue: number;
  convertedValue: number;
  statusCounts: Record<string, number>;
}> {
  const response = await apiRequest<{
    totalLeads: number;
    openLeads: number;
    pendingConversions: number;
    conversionRate: number;
    appointmentsThisWeek: number;
    upcomingAppointments: number;
    totalEstimatedValue: number;
    convertedValue: number;
    statusCounts: Record<string, number>;
  }>('/api/sales-leads/stats');
  return response;
}

/**
 * Get comprehensive sales lead analytics.
 */
export async function getSalesLeadAnalytics(filters?: {
  startDate?: string;
  endDate?: string;
  branch?: string;
  assignedRep?: string;
  leadSource?: string;
}): Promise<{
  leadPerformance: {
    totalLeads: number;
    statusBreakdown: Record<string, number>;
    conversionRate: number;
    avgDaysToConversion: number;
    valueMetrics: {
      totalPipelineValue: number;
      totalConvertedValue: number;
      avgLeadValue: number;
      avgConvertedValue: number;
    };
  };
  sourceAnalysis: {
    leadsBySource: Array<{
      source: string;
      count: number;
      totalValue: number;
    }>;
    sourceConversionRates: Array<{
      source: string;
      conversionRate: number;
      totalLeads: number;
      convertedLeads: number;
    }>;
  };
  repPerformance: {
    reps: Array<{
      repId: string;
      repName: string;
      totalLeads: number;
      convertedLeads: number;
      conversionRate: number;
      totalValue: number;
      avgLeadValue: number;
    }>;
  };
  appointmentAnalytics: {
    totalAppointments: number;
    attendedAppointments: number;
    noShowAppointments: number;
    appointmentShowRate: number;
  };
  branchPerformance: Array<{
    branch: string;
    totalLeads: number;
    convertedLeads: number;
    totalValue: number;
    avgValue: number;
  }>;
  leadAging: {
    ranges: Array<{
      range: string;
      count: number;
    }>;
  };
  lostReasons: Array<{
    reason: string;
    count: number;
  }>;
}> {
  const params = new URLSearchParams();
  if (filters) {
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.branch) params.append('branch', filters.branch);
    if (filters.assignedRep) params.append('assignedRep', filters.assignedRep);
    if (filters.leadSource) params.append('leadSource', filters.leadSource);
  }
  const queryString = params.toString();
  const url = `/api/sales-leads/analytics${queryString ? '?' + queryString : ''}`;
  const raw = await apiRequest<any>(url);

  /**
   * Normalizes analytics payloads so older/newer backend shapes both work in the UI.
   */
  const valueMetricsRaw = raw?.leadPerformance?.valueMetrics || {};
  const convertedMetricsRaw = raw?.leadPerformance?.convertedValueMetrics || {};
  const repRows = Array.isArray(raw?.repPerformance)
    ? raw.repPerformance
    : Array.isArray(raw?.repPerformance?.reps)
      ? raw.repPerformance.reps
      : [];

  const leadAgingRaw = raw?.leadAging;
  const leadAgingRanges = Array.isArray(leadAgingRaw?.ranges)
    ? leadAgingRaw.ranges
    : [
        { range: '0-7 days', count: Number(leadAgingRaw?.['0-7days']) || 0 },
        { range: '8-30 days', count: Number(leadAgingRaw?.['8-30days']) || 0 },
        { range: '31-60 days', count: Number(leadAgingRaw?.['31-60days']) || 0 },
        { range: '60+ days', count: Number(leadAgingRaw?.['60plus']) || 0 },
      ];

  return {
    leadPerformance: {
      totalLeads: Number(raw?.leadPerformance?.totalLeads) || 0,
      statusBreakdown: raw?.leadPerformance?.statusBreakdown || {},
      conversionRate: Number(raw?.leadPerformance?.conversionRate) || 0,
      avgDaysToConversion: Number(raw?.leadPerformance?.avgDaysToConversion) || 0,
      valueMetrics: {
        totalPipelineValue:
          Number(valueMetricsRaw.totalPipelineValue ?? valueMetricsRaw.totalEstimatedValue) || 0,
        totalConvertedValue:
          Number(
            valueMetricsRaw.totalConvertedValue ??
              convertedMetricsRaw.totalConvertedValue,
          ) || 0,
        avgLeadValue:
          Number(valueMetricsRaw.avgLeadValue ?? valueMetricsRaw.avgEstimatedValue) || 0,
        avgConvertedValue:
          Number(
            valueMetricsRaw.avgConvertedValue ?? convertedMetricsRaw.avgConvertedValue,
          ) || 0,
      },
    },
    sourceAnalysis: {
      leadsBySource: (raw?.sourceAnalysis?.leadsBySource || []).map((item: any) => ({
        source: item.source || item._id || 'Unknown',
        count: Number(item.count) || 0,
        totalValue: Number(item.totalValue) || 0,
      })),
      sourceConversionRates: (raw?.sourceAnalysis?.sourceConversionRates || []).map(
        (item: any) => ({
          source: item.source || item._id || 'Unknown',
          conversionRate: Number(item.conversionRate) || 0,
          totalLeads: Number(item.totalLeads ?? item.total) || 0,
          convertedLeads: Number(item.convertedLeads ?? item.converted) || 0,
        }),
      ),
    },
    repPerformance: {
      reps: repRows.map((item: any) => {
        const repDoc = item._id && typeof item._id === 'object' ? item._id : null;
        const totalLeads = Number(item.totalLeads) || 0;
        const totalValue = Number(item.totalValue) || 0;
        return {
          repId: String(item.repId || repDoc?._id || item._id || ''),
          repName:
            item.repName ||
            repDoc?.description ||
            repDoc?.code ||
            repDoc?.name ||
            'Unknown rep',
          totalLeads,
          convertedLeads: Number(item.convertedLeads) || 0,
          conversionRate: Number(item.conversionRate) || 0,
          totalValue,
          avgLeadValue:
            Number(item.avgLeadValue) ||
            (totalLeads > 0 ? totalValue / totalLeads : 0),
        };
      }),
    },
    appointmentAnalytics: {
      totalAppointments: Number(raw?.appointmentAnalytics?.totalAppointments) || 0,
      attendedAppointments: Number(raw?.appointmentAnalytics?.attendedAppointments) || 0,
      noShowAppointments: Number(raw?.appointmentAnalytics?.noShowAppointments) || 0,
      appointmentShowRate: Number(raw?.appointmentAnalytics?.appointmentShowRate) || 0,
    },
    branchPerformance: (raw?.branchPerformance || []).map((item: any) => {
      const branchDoc = item._id && typeof item._id === 'object' ? item._id : null;
      return {
        branch:
          item.branch ||
          branchDoc?.name ||
          branchDoc?.code ||
          String(item._id || 'Unknown branch'),
        totalLeads: Number(item.totalLeads) || 0,
        convertedLeads: Number(item.convertedLeads) || 0,
        totalValue: Number(item.totalValue) || 0,
        avgValue: Number(item.avgValue) || 0,
      };
    }),
    leadAging: {
      ranges: leadAgingRanges,
    },
    lostReasons: (raw?.lostReasons || []).map((item: any) => ({
      reason: item.reason || item._id || 'Unknown',
      count: Number(item.count) || 0,
    })),
  };
}

/**
 * Creates a diary appointment from customer name or an existing sales lead.
 * Used by the Sales Diary planner New Appointment flow.
 */
export async function createDiaryAppointment(data: {
  customerName?: string;
  salesLeadId?: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType?: string;
  status?: string;
  location?: string;
  purpose?: string;
  notes?: string;
  internalNotes?: string;
  nextAction?: string;
  assignedRep?: string;
  geoLocation?: { type: 'Point'; coordinates: [number, number] };
}): Promise<Appointment> {
  const response = await apiRequest<Appointment>('/api/sales-leads/appointments/diary', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response;
}

/** Sales request form types aligned with diary visit sheets. */
export type SalesRequestType =
  | 'rfc'
  | 'loan'
  | 'rental'
  | 'loan_rental'
  | 'rfc_new_service_level';

/** Planner form template types controlled by Super Admin (system + custom_*). */
export type PlannerFormType = string;

/** Dynamic field types for planner forms. */
export type PlannerFormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'phone'
  | 'email'
  | 'date'
  | 'time'
  | 'dropdown'
  | 'checkbox'
  | 'radio'
  | 'address'
  | 'file';

/** Visual builder element types (Shopify-style form editor). */
export type PlannerFormElementType =
  | 'heading'
  | 'text_block'
  | 'divider'
  | 'section'
  | 'spacer'
  | PlannerFormFieldType
  | 'logo'
  | 'image'
  | 'button';

export interface PlannerFormFieldOption {
  value: string;
  label: string;
}

/** Appearance / layout / validation settings for a builder element. */
export interface PlannerFormElementSettings {
  fontSize?: number;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string;
  backgroundColor?: string;
  padding?: string;
  margin?: string;
  borderRadius?: string;
  borderColor?: string;
  visibility?: boolean;
  logoUrl?: string;
  imageUrl?: string;
  logoWidth?: number;
  logoHeight?: number;
  columns?: number;
  buttonStyle?: 'primary' | 'secondary' | 'outline';
  buttonAction?: 'save' | 'submit' | 'next' | 'none';
  spacerHeight?: number;
  validationMin?: number;
  validationMax?: number;
  validationPattern?: string;
}

/** Single visual builder element in the form tree. */
export interface PlannerFormElement {
  id: string;
  type: PlannerFormElementType;
  order: number;
  enabled: boolean;
  label?: string;
  key?: string;
  content?: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  description?: string;
  defaultValue?: string;
  options?: PlannerFormFieldOption[];
  width?: 'full' | 'half' | 'third';
  settings?: PlannerFormElementSettings;
  children?: PlannerFormElement[];
}

export interface PlannerFormField {
  id: string;
  key: string;
  type: PlannerFormFieldType;
  label: string;
  description?: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  enabled: boolean;
  options?: PlannerFormFieldOption[];
  order: number;
  width?: 'full' | 'half';
}

export interface PlannerFormContent {
  name: string;
  title: string;
  description?: string;
  logoUrl?: string;
  elements?: PlannerFormElement[];
  fields: PlannerFormField[];
}

export interface PlannerFormPublished extends PlannerFormContent {
  type?: PlannerFormType;
  version: number;
  publishedAt: string;
}

export interface PlannerFormAdminTemplate {
  type: PlannerFormType;
  draft: PlannerFormContent;
  published: PlannerFormPublished | null;
  hasUnpublishedChanges?: boolean;
  draftSavedAt?: string | null;
  isActive?: boolean;
  displayOrder?: number;
  isSystem?: boolean;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

/**
 * Lists published planner forms (metadata) for diary users.
 */
export async function listPublishedPlannerForms(): Promise<{
  forms: Array<{
    type: PlannerFormType;
    name: string;
    title: string;
    description?: string;
    logoUrl?: string;
    version: number;
    publishedAt?: string | null;
    fieldCount: number;
    elementCount?: number;
    isSystem?: boolean;
    displayOrder?: number;
  }>;
}> {
  return apiRequest('/api/planner-form-templates/published');
}

/**
 * Loads the published planner form schema for a type (rep fill).
 */
export async function getPublishedPlannerForm(
  type: PlannerFormType,
): Promise<PlannerFormPublished & { type: PlannerFormType }> {
  return apiRequest(`/api/planner-form-templates/published/${type}`);
}

/**
 * Lists draft + published templates for Super Admin Form Editor.
 */
export async function listAdminPlannerForms(): Promise<{ forms: PlannerFormAdminTemplate[] }> {
  return apiRequest('/api/planner-form-templates/admin');
}

/**
 * Creates a new custom form template (Super Admin).
 */
export async function createAdminPlannerForm(payload: {
  name: string;
  description?: string;
  logoUrl?: string;
}): Promise<PlannerFormAdminTemplate> {
  return apiRequest('/api/planner-form-templates/admin', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Loads one Super Admin draft template.
 */
export async function getAdminPlannerForm(
  type: PlannerFormType,
): Promise<PlannerFormAdminTemplate> {
  return apiRequest(`/api/planner-form-templates/admin/${type}`);
}

/**
 * Saves Super Admin draft changes (does not publish).
 */
export async function saveAdminPlannerFormDraft(
  type: PlannerFormType,
  draft: PlannerFormContent,
): Promise<PlannerFormAdminTemplate> {
  return apiRequest(`/api/planner-form-templates/admin/${type}`, {
    method: 'PUT',
    body: JSON.stringify({ draft }),
  });
}

/**
 * Publishes the Super Admin draft so reps receive the updated form.
 */
export async function publishAdminPlannerForm(
  type: PlannerFormType,
  draft?: PlannerFormContent,
): Promise<PlannerFormAdminTemplate> {
  return apiRequest(`/api/planner-form-templates/admin/${type}/publish`, {
    method: 'POST',
    body: JSON.stringify(draft ? { draft } : {}),
  });
}

/**
 * Discards unpublished draft and restores from published version.
 */
export async function discardAdminPlannerFormDraft(
  type: PlannerFormType,
): Promise<PlannerFormAdminTemplate> {
  return apiRequest(`/api/planner-form-templates/admin/${type}/discard`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/** Sales request lifecycle status. */
export type SalesRequestStatus = 'draft' | 'pending' | 'approved' | 'declined';

/**
 * Stored sales request attachment metadata returned by the API.
 */
export interface SalesRequestAttachmentMeta {
  _id: string;
  originalName: string;
  mimeType: string;
  size: number;
  source?: 'visit_photo' | 'upload' | 'signature';
  caption?: string;
  clientRef?: string;
  createdAt?: string;
}

/**
 * Sales request document returned by `/api/sales-requests`.
 */
export interface SalesRequest {
  _id: string;
  requestNumber: string;
  requestType: SalesRequestType;
  status: SalesRequestStatus;
  formData: Record<string, unknown>;
  salesLead?: string | {
    _id: string;
    leadNumber?: string;
    companyName?: string;
    contactPerson?: string;
    contactPhone?: string;
    contactEmail?: string;
    contactAddress?: string;
    city?: string;
  };
  appointment?: string;
  appointmentDetails?: {
    _id?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    appointmentType?: string;
    status?: string;
    location?: string;
    notes?: string;
    purpose?: string;
    outcome?: string;
    attended?: boolean;
    attendedAt?: string;
    visitGpsVerification?: VisitGpsVerification;
    attendanceLocation?: { type?: string; coordinates?: [number, number] };
    attendanceAccuracy?: number;
    attendanceMethod?: string;
    geoLocation?: { type?: string; coordinates?: [number, number] };
  } | null;
  visitNotes?: string;
  visitPhotos?: Array<{ id?: string; dataUrl?: string; caption?: string; attachmentId?: string }>;
  attachments?: SalesRequestAttachmentMeta[];
  attachmentCount?: number;
  repCode?: string | { _id: string; code?: string; name?: string; email?: string };
  branch?: string | { _id: string; name?: string; code?: string };
  customerCompanyName?: string;
  customerContactPerson?: string;
  submittedBy?: string | { _id: string; firstName?: string; lastName?: string; email?: string };
  submittedAt?: string;
  approvedBy?: string | { _id: string; firstName?: string; lastName?: string; email?: string };
  approvedAt?: string;
  approvedJob?: string | { _id: string; jobNumber?: string; status?: string; startDate?: string };
  declinedBy?: string | { _id: string; firstName?: string; lastName?: string; email?: string };
  declinedAt?: string;
  declineReason?: string;
  reviewedBy?: string | { _id: string; firstName?: string; lastName?: string; email?: string };
  reviewedAt?: string;
  createdBy: string | { _id: string; firstName?: string; lastName?: string; email?: string };
  updatedBy?: string | { _id: string; firstName?: string; lastName?: string; email?: string };
  dbStatus: 'active' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

/**
 * Lists sales requests with optional status / type / appointment filters.
 */
export async function listSalesRequests(params?: {
  status?: SalesRequestStatus;
  requestType?: SalesRequestType;
  appointment?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  requests: SalesRequest[];
  pagination: { total: number; page: number; limit: number; pages: number };
}> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.requestType) searchParams.set('requestType', params.requestType);
  if (params?.appointment) searchParams.set('appointment', params.appointment);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  const query = searchParams.toString();
  return apiRequest(`/api/sales-requests${query ? `?${query}` : ''}`);
}

/**
 * Fetches a single sales request by ID.
 */
export async function getSalesRequest(id: string): Promise<SalesRequest> {
  return apiRequest<SalesRequest>(`/api/sales-requests/${id}`);
}

/**
 * Creates a draft sales request from a diary visit sheet.
 */
export async function createSalesRequest(data: {
  requestType: SalesRequestType;
  formData?: Record<string, unknown>;
  salesLead?: string;
  appointment?: string;
  repCode?: string;
  branch?: string;
  visitNotes?: string;
  visitPhotos?: Array<{ id?: string; dataUrl?: string; caption?: string }>;
}): Promise<SalesRequest> {
  return apiRequest<SalesRequest>('/api/sales-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Updates a draft or declined sales request form payload.
 */
export async function updateSalesRequest(
  id: string,
  data: {
    formData?: Record<string, unknown>;
    salesLead?: string;
    appointment?: string;
    repCode?: string;
    branch?: string;
    visitNotes?: string;
    visitPhotos?: Array<{ id?: string; dataUrl?: string; caption?: string }>;
  },
): Promise<SalesRequest> {
  return apiRequest<SalesRequest>(`/api/sales-requests/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Submits a draft or declined sales request for admin approval.
 * Optional visitGpsVerification is persisted on the linked appointment when provided.
 */
export async function submitSalesRequest(
  id: string,
  data?: { visitGpsVerification?: VisitGpsVerification },
): Promise<SalesRequest> {
  return apiRequest<SalesRequest>(`/api/sales-requests/${id}/submit`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
}

/**
 * Soft-deletes a draft sales request owned by the current user.
 */
export async function deleteSalesRequest(id: string): Promise<void> {
  await apiRequest(`/api/sales-requests/${id}`, { method: 'DELETE' });
}

/**
 * Approves a pending sales request and creates a Job via the existing Job model.
 */
export async function approveSalesRequest(
  id: string,
  data?: { formData?: Record<string, unknown> },
): Promise<{ request: SalesRequest; job: Job }> {
  return apiRequest(`/api/sales-requests/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
}

/**
 * Declines a pending sales request and returns it to the representative.
 */
export async function declineSalesRequest(
  id: string,
  data?: { formData?: Record<string, unknown>; declineReason?: string },
): Promise<SalesRequest> {
  return apiRequest<SalesRequest>(`/api/sales-requests/${id}/decline`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
}

/**
 * Saves reviewer edits on a pending sales request without approving or rejecting.
 */
export async function reviewUpdateSalesRequest(
  id: string,
  data: { formData?: Record<string, unknown>; visitNotes?: string },
): Promise<SalesRequest> {
  return apiRequest<SalesRequest>(`/api/sales-requests/${id}/review`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Deletes a stored sales request attachment.
 */
export async function deleteSalesRequestAttachment(attachmentId: string): Promise<void> {
  await apiRequest(`/api/sales-requests/attachments/${attachmentId}`, {
    method: 'DELETE',
  });
}

/**
 * Uploads a PDF, photo, or document to a draft sales request.
 */
export async function uploadSalesRequestAttachment(
  requestId: string,
  file: File,
): Promise<SalesRequestAttachmentMeta> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAuthToken();
  const response = await fetch(`${apiBase()}/api/sales-requests/${requestId}/attachments`, {
    method: 'POST',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Upload failed' } }));
    throw new Error(error.error?.message || 'Failed to upload attachment');
  }

  const payload = await response.json();
  return payload.data.attachment as SalesRequestAttachmentMeta;
}

/**
 * Create an appointment for a sales lead.
 */
export async function createAppointment(leadId: string, data: {
  appointmentDate: string;
  appointmentTime: string;
  location: string;
  purpose?: string;
  notes?: string;
  appointmentType?: string;
  status?: string;
  assignedRep?: string;
  geoLocation?: { type: 'Point'; coordinates: [number, number] };
}): Promise<Appointment> {
  const response = await apiRequest<Appointment>(`/api/sales-leads/${leadId}/appointments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response;
}

/**
 * Update an appointment.
 */
export async function updateAppointment(leadId: string, appointmentId: string, data: Partial<Appointment>): Promise<Appointment> {
  const response = await apiRequest<Appointment>(`/api/sales-leads/${leadId}/appointments/${appointmentId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response;
}

/**
 * Get all canvassing plans with optional filtering.
 */
export async function getCanvassingPlans(params?: {
  status?: string;
  repCode?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{ plans: CanvassingPlan[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.repCode) queryParams.append('repCode', params.repCode);
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
  
  const query = queryParams.toString();
  const response = await apiRequest<{ plans: CanvassingPlan[]; pagination: { page: number; limit: number; total: number; pages: number } }>(`/api/canvassing-plans${query ? `?${query}` : ''}`);
  return response;
}

/**
 * Get a single canvassing plan by ID.
 */
export async function getCanvassingPlan(id: string): Promise<CanvassingPlan> {
  const response = await apiRequest<CanvassingPlan>(`/api/canvassing-plans/${id}`);
  return response;
}

/**
 * Create a new canvassing plan.
 */
export async function createCanvassingPlan(data: {
  repCode: string;
  area: string;
  startDate: string;
  endDate: string;
  travelDays: number;
  travelTime?: string;
  accommodationRequired: boolean;
  preferredAccommodation?: string;
  accommodationCost?: number;
  possibleLeads: number;
  appointmentsMade: number;
  objectives?: string;
  notes?: string;
}): Promise<CanvassingPlan> {
  const response = await apiRequest<CanvassingPlan>('/api/canvassing-plans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response;
}

/**
 * Update an existing canvassing plan.
 */
export async function updateCanvassingPlan(id: string, data: Partial<CanvassingPlan>): Promise<CanvassingPlan> {
  const response = await apiRequest<CanvassingPlan>(`/api/canvassing-plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response;
}

/**
 * Delete a canvassing plan (soft delete).
 */
export async function deleteCanvassingPlan(id: string): Promise<void> {
  await apiRequest(`/api/canvassing-plans/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Approve a canvassing plan.
 */
export async function approveCanvassingPlan(id: string): Promise<CanvassingPlan> {
  const response = await apiRequest<CanvassingPlan>(`/api/canvassing-plans/${id}/approve`, {
    method: 'PUT',
  });
  return response;
}

/**
 * Reject a canvassing plan.
 */
export async function rejectCanvassingPlan(id: string, rejectionReason: string): Promise<CanvassingPlan> {
  const response = await apiRequest<CanvassingPlan>(`/api/canvassing-plans/${id}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ rejectionReason }),
  });
  return response;
}

// ============================================================
// Location Tracking API
// ============================================================

/** Live rep location (in-memory snapshot from server). */
export interface LiveRepLocation {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  timestamp: number;
  socketId: string;
}

/** A single point on a daily route trail. */
export interface RoutePoint {
  lat: number;
  lng: number;
  time: string;
  speed: number | null;
  isAtBranch: boolean;
}

/** A stop event from the aggregation service. */
export interface StopEvent {
  latitude: number;
  longitude: number;
  arrivalTime: string;
  departureTime: string;
  durationMinutes: number;
  isAtBranch: boolean;
  branchName?: string;
  pingCount: number;
}

/** A trip segment between stops. */
export interface TripSegment {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  distanceMeters: number;
  startLocation: { latitude: number; longitude: number };
  endLocation: { latitude: number; longitude: number };
  avgSpeed: number;
}

/** Full daily route data with stops and trips. */
export interface DailyRouteData {
  userId: string;
  date: string;
  stops: StopEvent[];
  trips: TripSegment[];
  totalDistanceKm: number;
  totalMovingMinutes: number;
  totalStoppedMinutes: number;
  firstPingTime?: string;
  lastPingTime?: string;
  pingCount: number;
}

/** Daily summary for a rep. */
export interface DailySummary {
  userId: string;
  userName: string;
  date: string;
  totalDistanceKm: number;
  totalMovingMinutes: number;
  totalStoppedMinutes: number;
  stopsCount: number;
  tripsCount: number;
  firstActivity?: string;
  lastActivity?: string;
  branchTimeMinutes: number;
  fieldTimeMinutes: number;
  stops: StopEvent[];
}

/**
 * Get real-time locations of all tracked reps.
 */
export async function getLiveRepLocations(): Promise<LiveRepLocation[]> {
  return apiRequest<LiveRepLocation[]>('/api/location/live');
}

/**
 * Get real-time location of a specific rep.
 */
export async function getLiveRepLocation(userId: string): Promise<LiveRepLocation> {
  return apiRequest<LiveRepLocation>(`/api/location/live/${userId}`);
}

/**
 * Get a rep's daily route trail (polyline points).
 */
export async function getRepDailyRoute(userId: string, date: string): Promise<RoutePoint[]> {
  return apiRequest<RoutePoint[]>(`/api/location/route/${userId}/${date}`);
}

/**
 * Get stops and trips aggregation for a rep on a date.
 */
export async function getRepStopsAndTrips(userId: string, date: string): Promise<DailyRouteData> {
  return apiRequest<DailyRouteData>(`/api/location/stops/${userId}/${date}`);
}

/**
 * Get daily summary for a specific rep.
 */
export async function getRepDailySummary(userId: string, date: string): Promise<DailySummary> {
  return apiRequest<DailySummary>(`/api/location/summary/${userId}/${date}`);
}

/**
 * Get all reps' daily summaries (manager overview).
 */
export async function getAllRepSummaries(date: string, branchId?: string): Promise<DailySummary[]> {
  const params = branchId ? `?branchId=${branchId}` : '';
  return apiRequest<DailySummary[]>(`/api/location/summaries/${date}${params}`);
}

/**
 * Get paginated location history for a rep.
 */
export async function getLocationHistory(userId: string, params?: {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: Array<{
    latitude: number;
    longitude: number;
    accuracy: number;
    speed: number | null;
    heading: number | null;
    isAtBranch: boolean;
    isMoving: boolean;
    recordedAt: string;
    batteryLevel?: number;
  }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const query = new URLSearchParams();
  if (params?.startDate) query.append('startDate', params.startDate);
  if (params?.endDate) query.append('endDate', params.endDate);
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  const qs = query.toString();
  return apiRequest(`/api/location/history/${userId}${qs ? `?${qs}` : ''}`);
}

// ============================================================
// Area Overlap API
// ============================================================

/** A nearby appointment returned by overlap checks. */
export interface NearbyAppointmentItem {
  appointmentId: string;
  salesLeadId: string;
  companyName: string;
  contactAddress: string;
  repCodeId: string;
  repCode: string;
  repName: string;
  appointmentDate: string;
  appointmentTime: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  distanceKm: number;
}

/** Overlap check result from the scheduling endpoint. */
export interface OverlapCheckResult {
  hasOverlaps: boolean;
  centerLocation: { latitude: number; longitude: number };
  radiusMeters: number;
  nearbyAppointments: NearbyAppointmentItem[];
  otherRepsCount: number;
  consolidationPossible: boolean;
  consolidationMessage?: string;
}

/** A group of overlapping appointments on a given day. */
export interface DailyOverlapGroup {
  date: string;
  area: { latitude: number; longitude: number };
  radiusMeters: number;
  appointments: NearbyAppointmentItem[];
  uniqueReps: string[];
  potentialSavingsKm: number;
}

/**
 * Check overlap when scheduling a new appointment.
 */
export async function checkAppointmentOverlap(data: {
  latitude: number;
  longitude: number;
  appointmentDate: string;
  proposingRepCodeId?: string;
  radiusMeters?: number;
}): Promise<OverlapCheckResult> {
  return apiRequest<OverlapCheckResult>('/api/overlap/check', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Find appointments near a location.
 */
export async function getNearbyAppointments(params: {
  lat: number;
  lng: number;
  radius?: number;
  startDate?: string;
  endDate?: string;
  excludeRepCodeId?: string;
}): Promise<NearbyAppointmentItem[]> {
  const query = new URLSearchParams();
  query.append('lat', params.lat.toString());
  query.append('lng', params.lng.toString());
  if (params.radius) query.append('radius', params.radius.toString());
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.excludeRepCodeId) query.append('excludeRepCodeId', params.excludeRepCodeId);
  return apiRequest<NearbyAppointmentItem[]>(`/api/overlap/nearby?${query.toString()}`);
}

/**
 * Get daily overlap groups for a date (manager reports).
 */
export async function getDailyOverlaps(date: string, radius?: number): Promise<DailyOverlapGroup[]> {
  const params = radius ? `?radius=${radius}` : '';
  return apiRequest<DailyOverlapGroup[]>(`/api/overlap/daily/${date}${params}`);
}

// ============================================================
// Scheduled Reports API (super admin)
// ============================================================

export type ScheduledReportDateRange =
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'thisYear'
  | 'last12months';

export type ScheduledReportFrequency = 'daily' | 'weekly' | 'monthly';

export interface ScheduledReportSections {
  overview: boolean;
  leadPerformance: boolean;
  repPerformance: boolean;
  sourceAnalysis: boolean;
  appointmentAnalytics: boolean;
  branchPerformance: boolean;
  leadAging: boolean;
  lostReasons: boolean;
  quotesPerDayPerAdmin: boolean;
}

export interface ScheduledReportFilters {
  branches: string[];
  assignedReps: string[];
  leadSources: string[];
  statuses: string[];
  dateRangeType: ScheduledReportDateRange;
}

export interface ScheduledReport {
  _id: string;
  name: string;
  description?: string;
  sections: ScheduledReportSections;
  filters: ScheduledReportFilters & {
    branches: Array<{ _id: string; name: string } | string>;
    assignedReps: Array<{ _id: string; code: string; description?: string } | string>;
  };
  frequency: ScheduledReportFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  sendTime: string;
  recipients: Array<{ _id: string; firstName: string; lastName: string; email: string } | string>;
  isActive: boolean;
  nextRunAt: string;
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'failed';
  lastRunError?: string;
  createdBy: { _id: string; firstName: string; lastName: string; email: string } | string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledReportPayload {
  name: string;
  description?: string;
  sections: ScheduledReportSections;
  filters: {
    branches: string[];
    assignedReps: string[];
    leadSources: string[];
    statuses: string[];
    dateRangeType: ScheduledReportDateRange;
  };
  frequency: ScheduledReportFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  sendTime: string;
  recipients: string[];
  isActive?: boolean;
}

export async function getScheduledReports(): Promise<{ reports: ScheduledReport[] }> {
  return apiRequest<{ reports: ScheduledReport[] }>('/api/scheduled-reports');
}

export async function getScheduledReport(id: string): Promise<{ report: ScheduledReport }> {
  return apiRequest<{ report: ScheduledReport }>(`/api/scheduled-reports/${id}`);
}

export async function createScheduledReport(data: ScheduledReportPayload): Promise<{ report: ScheduledReport }> {
  return apiRequest<{ report: ScheduledReport }>('/api/scheduled-reports', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateScheduledReport(id: string, data: Partial<ScheduledReportPayload>): Promise<{ report: ScheduledReport }> {
  return apiRequest<{ report: ScheduledReport }>(`/api/scheduled-reports/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function toggleScheduledReport(id: string): Promise<{ report: Partial<ScheduledReport> }> {
  return apiRequest<{ report: Partial<ScheduledReport> }>(`/api/scheduled-reports/${id}/toggle`, {
    method: 'PATCH',
  });
}

export async function deleteScheduledReport(id: string): Promise<void> {
  await apiRequest(`/api/scheduled-reports/${id}`, { method: 'DELETE' });
}

export async function sendScheduledReportNow(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/scheduled-reports/${id}/send-now`, {
    method: 'POST',
  });
}

export async function previewScheduledReport(data: ScheduledReportPayload): Promise<string> {
  const token = getAuthToken();
  const response = await fetch(`${apiBase()}/api/scheduled-reports/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Preview failed (${response.status})`);
  }
  return response.text();
}

export default {
  login,
  logout,
  getCurrentUser,
  changePassword,
  getJobStats,
  getOverdueJobs,
  getJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  getStatuses,
  createStatus,
  updateStatus,
  deleteStatus,
  getCustomers,
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getServiceDescriptions,
  createServiceDescription,
  updateServiceDescription,
  deleteServiceDescription,
  getJobSources,
  createJobSource,
  updateJobSource,
  deleteJobSource,
  getMachineTypes,
  createMachineType,
  updateMachineType,
  deleteMachineType,
  getRepCodes,
  createRepCode,
  updateRepCode,
  deleteRepCode,
  getAdminCodes,
  createAdminCode,
  updateAdminCode,
  deleteAdminCode,
  getMachines,
  getMachine,
  getMachinesByCustomer,
  getRentalMachines,
  createMachine,
  updateMachine,
  deleteMachine,
  getCashCustomers,
  getCashCustomer,
  createCashCustomer,
  updateCashCustomer,
  deleteCashCustomer,
  getTechnicians,
  createTechnician,
  updateTechnician,
  deleteTechnician,
  getFollowUpStatuses,
  getChatUsers,
  getChatThread,
  sendChatMessage,
  markMessagesRead,
  getUnreadCount,
  uploadChatAttachment,
  getChatAttachmentUrl,
  searchChatMessages,
  uploadRSRDocument,
  getRSRDocuments,
  getRSRDocumentUrl,
  deleteRSRDocument,
  uploadMachineRSR,
  getMachineRSRs,
  getMachineRSRUrl,
  updateMachineRSRMetadata,
  deleteMachineRSR,
  createJobNote,
  getJobNotes,
  uploadJobNoteAttachment,
  getJobNoteAttachmentUrl,
  deleteJobNote,
  submitSupportTicket,
  getMyTickets,
  getUnreadTicketCount,
  getTicket,
  addTicketResponse,
  markTicketAsRead,
  markAllTicketsAsRead,
  getAllTickets,
  getSupportUnreadCount,
  updateTicketStatus,
  markTicketAsReadBySupport,
  // Sales Lead Management
  getSalesLeads,
  getSalesLead,
  createSalesLead,
  updateSalesLead,
  deleteSalesLead,
  assignSalesLead,
  convertSalesLeadToJob,
  getAppointments,
  getWeeklyAppointments,
  getVisitHistory,
  createDiaryAppointment,
  createAppointment,
  updateAppointment,
  listSalesRequests,
  getSalesRequest,
  createSalesRequest,
  updateSalesRequest,
  submitSalesRequest,
  deleteSalesRequest,
  approveSalesRequest,
  declineSalesRequest,
  reviewUpdateSalesRequest,
  deleteSalesRequestAttachment,
  getCanvassingPlans,
  getCanvassingPlan,
  createCanvassingPlan,
  updateCanvassingPlan,
  deleteCanvassingPlan,
  approveCanvassingPlan,
  rejectCanvassingPlan,
  getJobCardTemplates,
  getJobCardTemplate,
  createJobCardTemplate,
  updateJobCardTemplate,
  deleteJobCardTemplate,
  // Location Tracking
  getLiveRepLocations,
  getLiveRepLocation,
  getRepDailyRoute,
  getRepStopsAndTrips,
  getRepDailySummary,
  getAllRepSummaries,
  getLocationHistory,
  // Area Overlap
  checkAppointmentOverlap,
  getNearbyAppointments,
  getDailyOverlaps,
  apiRequest,
  // Geocoding proxy
  geocodeSearch,
  geocodeReverse,
  geocodeEnrich,
};

// ============================================================
// Geocode Proxy (avoids browser CORS issues with Nominatim)
// ============================================================

export interface GeoSearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    city?: string;
    town?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

/**
 * Search for addresses via backend proxy.
 */
export async function geocodeSearch(query: string, limit = 6): Promise<GeoSearchResult[]> {
  const params = new URLSearchParams({ q: query, limit: limit.toString(), countrycodes: 'za' });
  const response = await apiRequest<GeoSearchResult[]>(`/api/geocode/search?${params}`, { method: 'GET' });
  return response;
}

/**
 * Reverse geocode coordinates via backend proxy.
 */
export async function geocodeReverse(lat: number, lon: number): Promise<{ display_name: string; lat: string; lon: string; address?: any }> {
  const params = new URLSearchParams({ lat: lat.toString(), lon: lon.toString() });
  const response = await apiRequest<{ display_name: string; lat: string; lon: string; address?: any }>(`/api/geocode/reverse?${params}`, { method: 'GET' });
  return response;
}

export interface SiteLocationEnrichmentResponse {
  coordinates: { latitude: number; longitude: number };
  address: {
    formatted: string | null;
    road: string | null;
    houseNumber: string | null;
    suburb: string | null;
    locality: string | null;
    municipality: string | null;
    district: string | null;
    province: string | null;
    postcode: string | null;
    country: string | null;
    countryCode: string | null;
  } | null;
  geocodeFailed: boolean;
  elevation: {
    metres: number;
    source: 'published_map_reference';
    provider: 'open_meteo';
    latitude: number;
    longitude: number;
    lookedUpAt: string;
  } | null;
  elevationFailed: boolean;
}

/**
 * Reverse-geocode and look up terrain elevation for one map or search action.
 */
export async function geocodeEnrich(
  lat: number,
  lon: number,
): Promise<SiteLocationEnrichmentResponse> {
  const params = new URLSearchParams({ lat: lat.toString(), lon: lon.toString() });
  return apiRequest<SiteLocationEnrichmentResponse>(`/api/geocode/enrich?${params}`, {
    method: 'GET',
  });
}


// ============================================================
// Notifications
// ============================================================

export interface AppNotification {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  leadId?: string;
  appointmentId?: string;
  leadNumber?: string;
  companyName?: string;
  isRead: boolean;
  readAt?: string;
  isDismissed: boolean;
  dismissedAt?: string;
  actionUrl?: string;
  actionLabel?: string;
  emailSent: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  notifications: AppNotification[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  unreadCount: number;
}

export interface DailyTask {
  job_id: string;
  job_number: string;
  client_name: string;
  branch_name: string;
  technician: string;
  current_status: string;
  expected_next_status: string;
  days_in_status: number;
  days_overdue: number;
  max_days_allowed: number;
  is_overdue: boolean;
  is_approaching: boolean;
  severity: 'critical' | 'warning' | 'info';
  reminder_type: string;
  follow_up_level?: number;
  requires_action: string;
}

export interface DailyTasksResponse {
  tasks: DailyTask[];
  summary: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
}

/**
 * Get notifications for the current user.
 */
export async function getNotifications(options?: {
  unreadOnly?: boolean;
  type?: string;
  limit?: number;
  offset?: number;
}): Promise<NotificationListResponse> {
  const params = new URLSearchParams();
  if (options?.unreadOnly) params.set('unreadOnly', 'true');
  if (options?.type) params.set('type', options.type);
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());
  const qs = params.toString();
  return apiRequest<NotificationListResponse>(`/api/notifications${qs ? '?' + qs : ''}`, { method: 'GET' });
}

/**
 * Get unread notification count.
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const result = await apiRequest<{ count: number }>('/api/notifications/unread-count', { method: 'GET' });
  return result.count;
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(id: string): Promise<void> {
  await apiRequest(`/api/notifications/${id}/read`, { method: 'PUT' });
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsRead(): Promise<{ modifiedCount: number }> {
  return apiRequest<{ modifiedCount: number }>('/api/notifications/read-all', { method: 'PUT' });
}

/**
 * Dismiss a notification.
 */
export async function dismissNotification(id: string): Promise<void> {
  await apiRequest(`/api/notifications/${id}/dismiss`, { method: 'PUT' });
}

/**
 * Get daily tasks (overdue/approaching jobs) for the current user.
 */
export async function getDailyTasks(): Promise<DailyTasksResponse> {
  return apiRequest<DailyTasksResponse>('/api/notifications/daily-tasks', { method: 'GET' });
}

/**
 * Trigger sending of daily reminder email (super admin only).
 */
export async function sendDailyReminderEmail(): Promise<{ sentTo: string[] }> {
  return apiRequest<{ sentTo: string[] }>('/api/reminders/send', { method: 'POST' });
}

// =============================================
// Email Log API
// =============================================

export interface EmailLog {
  _id: string;
  recipientEmail: string;
  recipientName: string;
  sentAt: string;
  subject?: string;
  jobCount?: number;
  adminCode?: string;
  emailType: string;
  leadNumber?: string;
  companyName?: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
  createdAt: string;
}

export interface EmailLogsResponse {
  emailLogs: EmailLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Gets email logs with optional filtering. Super admin only.
 */
export async function getEmailLogs(params?: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  recipientEmail?: string;
  emailType?: string;
}): Promise<EmailLogsResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.recipientEmail) queryParams.append('recipientEmail', params.recipientEmail);
  if (params?.emailType) queryParams.append('emailType', params.emailType);

  const query = queryParams.toString();
  return apiRequest<EmailLogsResponse>(`/api/email-logs${query ? `?${query}` : ''}`);
}


// ============================================================================
// MACHINE QR READING WORKFLOW
// ============================================================================

/**
 * Read-only machine summary returned to the public scan page.
 * Deliberately omits ownership + oil-sample fields (we don't expose those to
 * the customer scanning the QR).
 */
export interface PublicMachineForScan {
  id: string;
  make: string;
  model: string;
  machineType: string | null;
  serialNumber: string;
  assetNumber: string | null;
  currentLocation: string | null;
  customerName: string | null;
  machineHours: number;
  nextServiceHours: number;
  serviceType: 'hours' | 'date';
  serviceDue: boolean;
}

export type MachineReadingSubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface MachineReadingSubmission {
  _id: string;
  machine: {
    _id: string;
    make: string;
    model: string;
    serialNumber: string;
    assetNumber?: string | null;
    machineHours?: number;
    nextServiceHours?: number;
    currentLocation?: string | null;
    customer?: { _id: string; name: string } | null;
    cashCustomer?: string | null;
  };
  submittedHours: number;
  faultReported: boolean;
  faultDescription?: string;
  submitterName?: string;
  submitterPhone?: string;
  photoFileName: string;
  photoMimeType: string;
  photoFileSize: number;
  previousHours: number;
  previousReadingAt?: string;
  status: MachineReadingSubmissionStatus;
  submittedAt: string;
  verifiedBy?: { _id: string; firstName?: string; lastName?: string; email?: string } | null;
  verifiedAt?: string;
  verificationNote?: string;
  rejectionReason?: string;
  approvedHours?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Returns the signed QR token + the full scan URL for a machine.
 * Requires machines.manage.
 */
export async function getMachineQrToken(
  machineId: string,
): Promise<{ token: string; scanUrl: string }> {
  return apiRequest<{ token: string; scanUrl: string }>(
    `/api/machines/${machineId}/qr-token`,
  );
}

/**
 * Fetches the audit trail of customer reading submissions for one machine.
 */
export async function getMachineReadingHistory(
  machineId: string,
): Promise<{ submissions: MachineReadingSubmission[] }> {
  return apiRequest<{ submissions: MachineReadingSubmission[] }>(
    `/api/machines/${machineId}/reading-submissions`,
  );
}

/**
 * Public, unauthenticated lookup used by the QR scan page.
 */
export async function getPublicMachineForScan(
  token: string,
): Promise<{ machine: PublicMachineForScan }> {
  const url = `${apiBase()}/api/public/machine-readings/${encodeURIComponent(token)}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.success) {
    throw new Error(body?.error?.message || body?.message || 'Failed to load machine');
  }
  return body.data;
}

/**
 * Public, unauthenticated reading submission (multipart form data).
 */
export async function submitPublicMachineReading(
  token: string,
  payload: {
    submittedHours: number;
    photo: File;
    faultReported?: boolean;
    faultDescription?: string;
    submitterName?: string;
    submitterPhone?: string;
    submitterEmail?: string;
  },
): Promise<{ reference: string; submissionId: string; status: string }> {
  const form = new FormData();
  form.append('submittedHours', String(payload.submittedHours));
  form.append('photo', payload.photo);
  if (payload.faultReported) form.append('faultReported', 'true');
  if (payload.faultDescription) form.append('faultDescription', payload.faultDescription);
  if (payload.submitterName) form.append('submitterName', payload.submitterName);
  if (payload.submitterPhone) form.append('submitterPhone', payload.submitterPhone);
  if (payload.submitterEmail) form.append('submitterEmail', payload.submitterEmail);

  const url = `${apiBase()}/api/public/machine-readings/${encodeURIComponent(token)}`;
  const response = await fetch(url, {
    method: 'POST',
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.success) {
    throw new Error(body?.error?.message || body?.message || 'Failed to submit reading');
  }
  return body.data;
}

export interface PublicReadingHistoryEntry {
  _id: string;
  submittedHours: number;
  approvedHours?: number;
  submittedAt: string;
  verifiedAt?: string;
}

/**
 * Public, unauthenticated — returns approved reading history for the machine.
 */
export async function getPublicMachineReadingHistory(
  token: string,
): Promise<{ submissions: PublicReadingHistoryEntry[] }> {
  const url = `${apiBase()}/api/public/machine-readings/${encodeURIComponent(token)}/history`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.success) {
    throw new Error(body?.error?.message || body?.message || 'Failed to load history');
  }
  return body.data;
}

/**
 * Lists submissions in the verification queue.
 * Requires machines.verifyReadings.
 */
export async function listMachineReadingSubmissions(
  status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
): Promise<{ submissions: MachineReadingSubmission[] }> {
  return apiRequest<{ submissions: MachineReadingSubmission[] }>(
    `/api/machine-reading-submissions?status=${status}`,
  );
}

/**
 * Returns a URL to the submission photo with the auth token embedded as a
 * query string (the backend allows `?token=` for binary file responses).
 */
export function getMachineReadingPhotoUrl(submissionId: string): string {
  const token = getAuthToken();
  const base = `${apiBase()}/api/machine-reading-submissions/${submissionId}/photo`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

/**
 * Approves a submission. Writes the supplied (or originally submitted) hours
 * onto the machine. Requires machines.verifyReadings.
 */
export async function approveMachineReadingSubmission(
  submissionId: string,
  body: { approvedHours?: number; verificationNote?: string } = {},
): Promise<{ submission: MachineReadingSubmission }> {
  return apiRequest<{ submission: MachineReadingSubmission }>(
    `/api/machine-reading-submissions/${submissionId}/approve`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

/**
 * Rejects a submission with a mandatory reason.
 * Requires machines.verifyReadings.
 */
export async function rejectMachineReadingSubmission(
  submissionId: string,
  rejectionReason: string,
): Promise<{ submission: MachineReadingSubmission }> {
  return apiRequest<{ submission: MachineReadingSubmission }>(
    `/api/machine-reading-submissions/${submissionId}/reject`,
    {
      method: 'POST',
      body: JSON.stringify({ rejectionReason }),
    },
  );
}
