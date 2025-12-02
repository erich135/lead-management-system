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
  technician?: {
    _id: string;
    name: string;
  } | string;
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
  description?: {
    _id: string;
    name: string;
  };
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
  oilSampleNumber?: string;
  storePack?: string;
  invoiceDate?: string | Date;
  invNumber?: string;
  branch: {
    _id: string;
    name: string;
  };
  startDate?: string | Date;
  dateQuoted?: string | Date;
  statusChangedAt?: string;
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
  includeHidden?: boolean; // If true, show only hidden jobs. If false/undefined, exclude hidden jobs.
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
  isActive?: boolean;
  isHidden?: boolean;
}

export interface Customer {
  _id: string;
  name: string;
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
}

export interface ServiceDescription {
  _id: string;
  name: string;
}

export interface RepCode {
  _id: string;
  code: string;
  description?: string;
  adminCode?: string; // Linked admin code (e.g., "AS", "ER")
  branch?: {
    _id: string;
    name: string;
  };
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

export interface Machine {
  _id: string;
  make: string;
  model: string;
  serialNumber: string;
  customer?: {
    _id: string;
    name: string;
  } | string;
  cashCustomer?: string;
  machineHours: number;
  nextServiceHours: number;
  isActive: boolean;
  dbStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Technician {
  _id: string;
  name: string;
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
export async function getCustomers(params?: { search?: string; page?: number; limit?: number }): Promise<{ customers: Customer[]; pagination: any }> {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  
  const query = queryParams.toString();
  return apiRequest(`/api/reference/customers${query ? `?${query}` : ''}`);
}

/**
 * Creates a new customer.
 */
export async function createCustomer(name: string): Promise<{ customer: Customer }> {
  return apiRequest('/api/reference/customers', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
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
}): Promise<{ machines: Machine[]; pagination: any }> {
  const queryParams = new URLSearchParams();
  if (params?.customerId) queryParams.append('customerId', params.customerId);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  
  const query = queryParams.toString();
  return apiRequest(`/api/machines${query ? `?${query}` : ''}`);
}

/**
 * Gets a single machine by ID.
 */
export async function getMachine(id: string): Promise<{ machine: Machine }> {
  return apiRequest(`/api/machines/${id}`);
}

/**
 * Gets machines by customer ID or cash customer name.
 */
export async function getMachinesByCustomer(customerId?: string, cashCustomer?: string): Promise<{ machines: Machine[] }> {
  if (cashCustomer) {
    return apiRequest(`/api/machines/cash-customer/${encodeURIComponent(cashCustomer)}`);
  }
  if (customerId) {
    return apiRequest(`/api/machines/customer/${customerId}`);
  }
  throw new Error('Either customerId or cashCustomer must be provided');
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
  machineHours: number;
  nextServiceHours: number;
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

/**
 * Deletes a machine.
 */
export async function deleteMachine(id: string): Promise<void> {
  await apiRequest(`/api/machines/${id}`, {
    method: 'DELETE',
  });
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
  isActive: boolean;
  isSuperAdmin?: boolean;
  passwordSet?: boolean;
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
  errors: string[];
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

  const response = await fetch(`${API_BASE_URL}/api/import/jobs`, {
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

  const response = await fetch(`${API_BASE_URL}/api/import/jobs/update`, {
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

  const response = await fetch(`${API_BASE_URL}/api/import/customers`, {
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
 * Downloads an example CSV file.
 */
export async function downloadExampleCSV(type: 'jobs' | 'customers'): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/api/import/example/${type}`, {
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
  };
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
 * Gets a single activity by ID.
 */
export async function getActivity(id: string): Promise<{ activity: Activity }> {
  return apiRequest<{ activity: Activity }>(`/api/activities/${id}`);
}

/**
 * Logs a view activity from the frontend.
 * This is a helper function to log page views and other view actions.
 */
export async function logViewActivity(
  action: string,
  resourceType: string,
  description: string,
  resourceId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await apiRequest('/api/activities/log', {
      method: 'POST',
      body: JSON.stringify({
        action,
        resourceType,
        resourceId,
        description,
        metadata,
      }),
    });
  } catch (error) {
    // Silently fail - activity logging should not break the app
    console.error('Failed to log view activity:', error);
  }
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
  const response = await fetch(`${API_BASE_URL}/api/chat/attachments`, {
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
  return `${API_BASE_URL}/api/chat/attachments/${attachmentId}?token=${token}`;
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
  getServiceDescriptions,
  createServiceDescription,
  updateServiceDescription,
  deleteServiceDescription,
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
  submitSupportTicket,
  apiRequest,
};

