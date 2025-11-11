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

export default {
  login,
  logout,
  getCurrentUser,
  changePassword,
  apiRequest,
};

