/**
 * API service for communicating with the ARS backend.
 * Handles authentication, request/response formatting, and error handling.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005';

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
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

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
    throw new Error(errorMessage);
  }

  return data.data as T;
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
 * Job-related API functions.
 */

export interface Job {
  _id: string;
  jobNumber: string;
  status?: {
    _id: string;
    name: string;
    sortOrder: number;
  };
  statusNumber?: number;
  customer?: {
    _id: string;
    name: string;
  };
  cashCustomer?: string;
  description?: {
    _id: string;
    name: string;
  };
  valueExVat?: number;
  adm?: string;
  branch: {
    _id: string;
    name: string;
  };
  techBooked?: {
    _id: string;
    name: string;
  };
  startDate?: string | Date;
  dateQuoted?: string | Date;
  statusChangedAt?: string;
  followUp1?: { _id: string; name: string };
  followUp2?: { _id: string; name: string };
  followUp3?: { _id: string; name: string };
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
  reminderType: "status_overdue" | "followup_overdue" | "approaching_due";
  followUpLevel?: number;
  severity: "critical" | "warning" | "info";
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
}): Promise<{ jobs: OverdueJob[]; count: number; overdueCount: number; approachingCount: number }> {
  const queryParams = new URLSearchParams();
  if (params?.branch) queryParams.append('branch', params.branch);
  if (params?.severity) queryParams.append('severity', params.severity);
  if (params?.includeApproaching !== undefined) {
    queryParams.append('includeApproaching', params.includeApproaching.toString());
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
 * Creates a new job.
 */
export async function createJob(jobData: Partial<Job>): Promise<{ job: Job }> {
  return apiRequest('/api/jobs', {
    method: 'POST',
    body: JSON.stringify(jobData),
  });
}

/**
 * Updates a job.
 */
export async function updateJob(id: string, jobData: Partial<Job>): Promise<{ job: Job }> {
  return apiRequest(`/api/jobs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(jobData),
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
}

export interface Customer {
  _id: string;
  name: string;
}

export interface Branch {
  _id: string;
  name: string;
  code?: string;
}

export interface ServiceDescription {
  _id: string;
  name: string;
}

export interface RepCode {
  _id: string;
  code: string;
}

export interface Technician {
  _id: string;
  name: string;
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
 * Gets all customers.
 */
export async function getCustomers(params?: { search?: string; page?: number; limit?: number }): Promise<{ customers: Customer[]; pagination: any }> {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  
  const query = queryParams.toString();
  return apiRequest(`/api/reference/customers${query ? `?${query}` : ''}`);
}

/**
 * Gets all branches.
 */
export async function getBranches(): Promise<{ branches: Branch[] }> {
  return apiRequest('/api/reference/branches');
}

/**
 * Gets all service descriptions.
 */
export async function getServiceDescriptions(): Promise<{ descriptions: ServiceDescription[] }> {
  return apiRequest('/api/reference/service-descriptions');
}

/**
 * Gets all rep codes.
 */
export async function getRepCodes(): Promise<{ repCodes: RepCode[] }> {
  return apiRequest('/api/reference/rep-codes');
}

/**
 * Gets all technicians.
 */
export async function getTechnicians(): Promise<{ technicians: Technician[] }> {
  return apiRequest('/api/reference/technicians');
}

/**
 * Gets all follow-up statuses.
 */
export async function getFollowUpStatuses(): Promise<{ followUpStatuses: FollowUpStatus[] }> {
  return apiRequest('/api/reference/follow-up-statuses');
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
  getCustomers,
  getBranches,
  getServiceDescriptions,
  getRepCodes,
  getTechnicians,
  getFollowUpStatuses,
  apiRequest,
};

