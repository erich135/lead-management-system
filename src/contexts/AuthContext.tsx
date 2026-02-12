import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { BackendUser, login, logout, getCurrentUser, getAuthToken } from '../lib/api';

/**
 * Frontend user type derived from backend user.
 */
export interface FrontendUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: {
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
  };
  permissions: string[];
  branches?: {
    id: string;
    name: string;
    code?: string;
  }[];
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  adminCode?: {
    id: string;
    code: string;
    description?: string;
  };
  repCode?: {
    id: string;
    code: string;
    description?: string;
  };
  technician?: {
    id: string;
    name: string;
  };
  cellPhone?: string;
  locationTrackingEnabled: boolean;
}

interface AuthContextType {
  user: FrontendUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Converts backend user to frontend user format.
 * 
 * @param backendUser - User data from backend API
 * @returns {FrontendUser} Formatted user object
 */
function transformUser(backendUser: BackendUser): FrontendUser {
  const adminCode = typeof backendUser.adminCode === 'object' && backendUser.adminCode !== null
    ? {
        id: backendUser.adminCode._id,
        code: backendUser.adminCode.code,
        description: backendUser.adminCode.description,
      }
    : undefined;

  const repCode = typeof backendUser.repCode === 'object' && backendUser.repCode !== null
    ? {
        id: backendUser.repCode._id,
        code: backendUser.repCode.code,
        description: backendUser.repCode.description,
      }
    : undefined;

  const technician = typeof backendUser.technician === 'object' && backendUser.technician !== null
    ? {
        id: backendUser.technician._id,
        name: backendUser.technician.name,
      }
    : undefined;

  const branches = backendUser.branches 
    ? backendUser.branches.map(branch => 
        typeof branch === 'object' 
          ? { id: branch._id, name: branch.name, code: branch.code }
          : { id: branch, name: '', code: '' }
      )
    : undefined;

  return {
    id: backendUser._id,
    email: backendUser.email,
    firstName: backendUser.firstName,
    lastName: backendUser.lastName,
    fullName: `${backendUser.firstName} ${backendUser.lastName}`,
    role: {
      id: backendUser.role._id,
      name: backendUser.role.name,
      description: backendUser.role.description,
      isActive: backendUser.role.isActive,
    },
    permissions: backendUser.permissions || [],
    branches,
    isActive: backendUser.isActive,
    isSuperAdmin: backendUser.isSuperAdmin || backendUser.role.name === 'super_admin',
    createdAt: backendUser.createdAt,
    updatedAt: backendUser.updatedAt,
    lastLogin: backendUser.lastLogin,
    adminCode,
    repCode,
    technician,
    cellPhone: backendUser.cellPhone,
    locationTrackingEnabled: backendUser.locationTrackingEnabled ?? false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FrontendUser | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Loads the current user from the API using stored token.
   */
  async function loadUser() {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const backendUser = await getCurrentUser();
      setUser(transformUser(backendUser));
    } catch (error) {
      // Token might be invalid, clear it
      console.error('Error loading user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  /**
   * Signs in a user with email and password.
   * 
   * @param email - User email
   * @param password - User password
   * @returns {Promise<{ error: Error | null }>} Error object if login fails
   */
  async function signIn(email: string, password: string) {
    try {
      setLoading(true);
      const response = await login({ email, password });
      setUser(transformUser(response.user));
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  }

  /**
   * Signs out the current user.
   */
  async function signOut() {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  }

  /**
   * Checks if the current user has a specific permission.
   * 
   * @param permission - Permission name (e.g., 'users.read')
   * @returns {boolean} True if user has the permission
   */
  function hasPermission(permission: string): boolean {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    return user.permissions.includes(permission);
  }

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    isAdmin: user?.role.name === 'admin' || user?.isSuperAdmin || false,
    isSuperAdmin: user?.isSuperAdmin || false,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
