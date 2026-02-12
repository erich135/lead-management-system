/**
 * System Management component for super admin.
 * Provides user management, role/permission assignment, and import functionality.
 */
import { useState, useEffect, useMemo } from 'react';
import { BranchPermissionsSection } from './BranchPermissionsSection';
import { 
  getUsers, 
  getUser, 
  inviteUser, 
  updateUser, 
  updateUserPermissions,
  updateUserBranches,
  resendInvitation,
  getRoles,
  getPermissions,
  getImportHistory,
  importJobs,
  importCustomers,
  importRentalMachines,
  importSalesLeads,
  updateJobs,
  downloadExampleCSV,
  getRepCodes,
  createRepCode,
  updateRepCode,
  deleteRepCode,
  getAdminCodes,
  createAdminCode,
  updateAdminCode,
  deleteAdminCode,
  getTechnicians,
  createTechnician,
  updateTechnician,
  deleteTechnician,
  getServiceDescriptions,
  createServiceDescription,
  updateServiceDescription,
  deleteServiceDescription,
  getJobSources,
  createJobSource,
  updateJobSource,
  deleteJobSource,
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getStatuses,
  createStatus,
  updateStatus,
  deleteStatus,
  User,
  Role,
  Permission,
  ImportHistory,
  RepCode,
  AdminCode,
  Technician,
  ServiceDescription,
  JobSource,
  Branch,
  Status
} from '../lib/api';
import { 
  Users, 
  Search, 
  Edit2, 
  UserCheck, 
  UserX, 
  Plus, 
  X,
  FileEdit, 
  Save, 
  Shield,
  Upload,
  Key,
  FileText,
  AlertCircle,
  Mail,
  Download,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Tag,
  History,
  Building2,
  Cog,
  Target,
  TrendingUp,
  Calendar,
  MapPin,
  Banknote
} from 'lucide-react';
import { ChangelogViewer } from './ChangelogViewer';

export function SystemManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'imports' | 'reference' | 'changelog'>('users');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;
  const [updatingPermissions, setUpdatingPermissions] = useState(false);
  
  // Import state
  const [importHistory, setImportHistory] = useState<ImportHistory | null>(null);
  const [importing, setImporting] = useState(false);
  const [importType, setImportType] = useState<'jobs' | 'customers' | 'rental-machines' | 'update-jobs' | 'sales-leads' | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clearExisting, setClearExisting] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>(''); // Branch ID or code
  const [importResult, setImportResult] = useState<{ imported?: number; updated: number; errors: string[]; notFound?: number } | null>(null);
  
  // Branches state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: '', code: '', jobNumberCode: '', address: '', isDefault: false });
  const [isBranchesExpanded, setIsBranchesExpanded] = useState(false);
  
  // Reference data state
  const [repCodes, setRepCodes] = useState<RepCode[]>([]);
  const [adminCodes, setAdminCodes] = useState<AdminCode[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [descriptions, setDescriptions] = useState<ServiceDescription[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [editingRepCode, setEditingRepCode] = useState<RepCode | null>(null);
  const [showRepCodeForm, setShowRepCodeForm] = useState(false);
  const [newRepCode, setNewRepCode] = useState({ code: '', description: '', adminCode: '', branch: '' });
  const [editingAdminCode, setEditingAdminCode] = useState<AdminCode | null>(null);
  const [showAdminCodeForm, setShowAdminCodeForm] = useState(false);
  const [newAdminCode, setNewAdminCode] = useState({ code: '', description: '', userId: '' });
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [showTechnicianForm, setShowTechnicianForm] = useState(false);
  const [newTechnician, setNewTechnician] = useState({ name: '', email: '', phone: '', userId: '' });
  const [editingDescription, setEditingDescription] = useState<ServiceDescription | null>(null);
  const [showDescriptionForm, setShowDescriptionForm] = useState(false);
  const [newDescription, setNewDescription] = useState({ name: '', description: '' });
  const [jobSources, setJobSources] = useState<JobSource[]>([]);
  const [editingJobSource, setEditingJobSource] = useState<JobSource | null>(null);
  const [showJobSourceForm, setShowJobSourceForm] = useState(false);
  const [newJobSource, setNewJobSource] = useState({ name: '', description: '', isDefault: false });
  const [isJobSourcesExpanded, setIsJobSourcesExpanded] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [newStatus, setNewStatus] = useState({ name: '', description: '' });
  const [isStatusesExpanded, setIsStatusesExpanded] = useState(false);
  const [isRepCodesExpanded, setIsRepCodesExpanded] = useState(false);
  const [isAdminCodesExpanded, setIsAdminCodesExpanded] = useState(false);
  const [isTechniciansExpanded, setIsTechniciansExpanded] = useState(false);
  const [isDescriptionsExpanded, setIsDescriptionsExpanded] = useState(false);
  
  // Invite user state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteFormData, setInviteFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: '',
    adminCodeId: '',
    adminCode: { code: '', description: '' },
    repCodeId: '',
    repCode: { code: '', description: '' },
    technicianId: '',
    technician: { name: '', email: '', phone: '' },
    locationTrackingEnabled: false,
  });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadData();
    loadImportHistory();
    loadBranches();
    if (activeTab === 'reference' || showInviteForm) {
      loadReferenceData();
    }
  }, [currentPage, searchTerm, activeTab, showInviteForm]);

  /**
   * Loads import history/statistics.
   */
  async function loadImportHistory() {
    try {
      const response = await getImportHistory();
      setImportHistory(response.data);
    } catch (err: any) {
      console.error('Error loading import history:', err);
    }
  }

  /**
   * Loads branches.
   */
  async function loadBranches() {
    try {
      const response = await getBranches();
      setBranches(response.branches || []);
    } catch (err: any) {
      console.error('Error loading branches:', err);
    }
  }

  /**
   * Loads reference data (rep codes, admin codes, technicians, descriptions, statuses).
   */
  async function loadReferenceData() {
    try {
      // Load rep codes
      const repCodesResponse = await getRepCodes();
      setRepCodes(repCodesResponse.repCodes || []);

      // Load admin codes from API
      const adminCodesResponse = await getAdminCodes();
      setAdminCodes(adminCodesResponse.adminCodes || []);
      
      // Load technicians
      const techniciansResponse = await getTechnicians();
      setTechnicians(techniciansResponse.technicians || []);

      // Load service descriptions
      const descriptionsResponse = await getServiceDescriptions();
      setDescriptions(descriptionsResponse.descriptions || []);

      // Load job sources
      const jobSourcesResponse = await getJobSources();
      setJobSources(jobSourcesResponse.sources || []);

      // Load statuses
      const statusesResponse = await getStatuses();
      setStatuses(statusesResponse.statuses || []);
    } catch (err: any) {
      console.error('Error loading reference data:', err);
      setError(err.message || 'Failed to load reference data');
    }
  }

  /**
   * Loads users, roles, and permissions from the API.
   */
  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Load users with search and pagination
      const usersResponse = await getUsers({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm || undefined,
      });
      setUsers(usersResponse.users || []);
      setTotalPages(usersResponse.pagination?.pages || 1);

      // Load roles and permissions (only once)
      if (roles.length === 0) {
        const rolesResponse = await getRoles();
        setRoles(rolesResponse.roles || []);
      }

      if (permissions.length === 0) {
        const permsResponse = await getPermissions({ isActive: true });
        setPermissions(permsResponse.permissions || []);
      }
    } catch (err: any) {
      console.error('Error loading system data:', err);
      setError(err.message || 'Failed to load system data');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handles viewing/editing a user.
   */
  async function handleViewUser(userId: string) {
    try {
      // Ensure admin codes are loaded when viewing/editing a user
      if (adminCodes.length === 0) {
        console.log('[SystemManagement] Loading admin codes for user edit...');
        const adminCodesResponse = await getAdminCodes();
        console.log('[SystemManagement] Admin codes loaded:', adminCodesResponse.adminCodes?.length || 0, adminCodesResponse.adminCodes);
        setAdminCodes(adminCodesResponse.adminCodes || []);
      } else {
        console.log('[SystemManagement] Admin codes already loaded:', adminCodes.length);
      }
      
      const response = await getUser(userId);
      console.log('[SystemManagement] User loaded:', response.user);
      console.log('[SystemManagement] User adminCode:', response.user.adminCode);
      setSelectedUser(response.user);
      setIsEditingUser(false);
    } catch (err: any) {
      console.error('Error loading user:', err);
      alert('Failed to load user details');
    }
  }

  /**
   * Handles saving user changes.
   */
  async function handleSaveUser() {
    if (!selectedUser) return;

    try {
      setLoading(true);
      await updateUser(selectedUser._id, {
        firstName: selectedUser.firstName,
        lastName: selectedUser.lastName,
        email: selectedUser.email,
        role: selectedUser.role._id as any,
        isActive: selectedUser.isActive,
        adminCodeId: selectedUser.adminCode && typeof selectedUser.adminCode === 'object' ? selectedUser.adminCode._id : (selectedUser.adminCode || null),
        locationTrackingEnabled: !!selectedUser.locationTrackingEnabled,
      } as any);
      
      // Reload users
      await loadData();
      setIsEditingUser(false);
      alert('User updated successfully');
    } catch (err: any) {
      console.error('Error saving user:', err);
      alert('Failed to save user: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handles updating user permissions.
   */
  async function handleUpdatePermissions(userId: string, newPermissions: string[]) {
    try {
      setUpdatingPermissions(true);
      await updateUserPermissions(userId, newPermissions);
      // Update selected user's permissions immediately for responsive UI
      if (selectedUser?._id === userId) {
        setSelectedUser({ ...selectedUser, permissions: newPermissions });
      }
      // Reload full data in background
      await loadData();
    } catch (err: any) {
      console.error('Error updating permissions:', err);
      alert('Failed to update permissions: ' + (err.message || 'Unknown error'));
      // Reload to revert UI changes on error
      if (selectedUser?._id === userId) {
        const response = await getUser(userId);
        setSelectedUser(response.user);
      }
    } finally {
      setUpdatingPermissions(false);
    }
  }

  /**
   * Handles updating user branch access.
   */
  async function handleUpdateBranches(userId: string, newBranches: string[]) {
    try {
      setUpdatingPermissions(true);
      await updateUserBranches(userId, newBranches);
      // Update selected user's branches immediately for responsive UI
      if (selectedUser?._id === userId) {
        const updatedBranches = newBranches.map(branchId => {
          const branch = branches.find(b => b._id === branchId);
          return branch ? { _id: branch._id, name: branch.name, code: branch.code } : branchId;
        });
        setSelectedUser({ ...selectedUser, branches: updatedBranches as any });
      }
      // Reload full data in background
      await loadData();
    } catch (err: any) {
      console.error('Error updating branch access:', err);
      alert('Failed to update branch access: ' + (err.message || 'Unknown error'));
      // Reload to revert UI changes on error
      if (selectedUser?._id === userId) {
        const response = await getUser(userId);
        setSelectedUser(response.user);
      }
    } finally {
      setUpdatingPermissions(false);
    }
  }

  /**
   * Handles toggling user active status.
   */
  async function handleToggleUserStatus(user: User) {
    const action = user.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} ${user.firstName} ${user.lastName}?`)) {
      return;
    }
    
    try {
      setLoading(true);
      await updateUser(user._id, { isActive: !user.isActive });
      await loadData();
      if (selectedUser?._id === user._id) {
        const response = await getUser(user._id);
        setSelectedUser(response.user);
      }
      alert(`User ${user.isActive ? 'deactivated' : 'activated'} successfully`);
    } catch (err: any) {
      console.error('Error updating user status:', err);
      const errorMessage = err.message === 'Failed to fetch' 
        ? 'Network error. Please check your connection and try again.'
        : (err.message || 'Failed to update user status');
      alert('Failed to update user status: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleTracking(user: User) {
    const newVal = !user.locationTrackingEnabled;
    try {
      setLoading(true);
      await updateUser(user._id, { locationTrackingEnabled: newVal } as any);
      await loadData();
      if (selectedUser?._id === user._id) {
        const response = await getUser(user._id);
        setSelectedUser(response.user);
      }
      alert(`Location tracking ${newVal ? 'enabled' : 'disabled'} for ${user.firstName} ${user.lastName}`);
    } catch (err: any) {
      console.error('Error toggling tracking:', err);
      alert('Failed to update tracking: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handles resending invitation email to a user.
   */
  async function handleResendInvitation(userId: string) {
    if (!confirm('Are you sure you want to resend the invitation email to this user?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await resendInvitation(userId);
      alert(response.message || 'Invitation email has been resent successfully');
      
      // Reload user data to get updated passwordSet status
      if (selectedUser?._id === userId) {
        const userResponse = await getUser(userId);
        setSelectedUser(userResponse.user);
      }
      await loadData();
    } catch (err: any) {
      console.error('Error resending invitation:', err);
      alert('Failed to resend invitation: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  /**
   * Groups permissions by category (when present) or resource for better display.
   * Permissions with the same category (e.g. "Job Cards") appear in one section.
   */
  const groupedPermissions = useMemo(() => {
    if (!permissions || permissions.length === 0) return {} as Record<string, Permission[]>;
    return permissions.reduce((acc, perm) => {
      const groupKey = perm.category && perm.category.trim() ? perm.category.trim() : (perm.resource || 'other');
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [permissions]);

  const allPermissionNames = useMemo(() => {
    return Object.values(groupedPermissions)
      .flat()
      .map((perm) => perm.name);
  }, [groupedPermissions]);

  const hasAllPermissionsSelected = useMemo(() => {
    if (!selectedUser || allPermissionNames.length === 0) return false;
    return allPermissionNames.every((permName) => selectedUser.permissions.includes(permName));
  }, [allPermissionNames, selectedUser]);

  function handleToggleAllPermissions() {
    if (!selectedUser || allPermissionNames.length === 0) return;

    const newPerms = hasAllPermissionsSelected
      ? selectedUser.permissions.filter((perm) => !allPermissionNames.includes(perm))
      : Array.from(new Set([...selectedUser.permissions, ...allPermissionNames]));

    handleUpdatePermissions(selectedUser._id, newPerms);
  }

  /**
   * Handles inviting a new user with role-specific connections.
   */
  async function handleInviteUser() {
    if (!inviteFormData.email || !inviteFormData.firstName || !inviteFormData.lastName || !inviteFormData.role) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setInviting(true);
      setError(null);

      const selectedRole = roles.find(r => r._id === inviteFormData.role);
      const roleName = selectedRole?.name?.toLowerCase() || '';

      // Build invite payload based on role
      const invitePayload: any = {
        email: inviteFormData.email,
        firstName: inviteFormData.firstName,
        lastName: inviteFormData.lastName,
        role: inviteFormData.role,
        locationTrackingEnabled: inviteFormData.locationTrackingEnabled,
      };

      // Add role-specific data
      if (roleName === 'admin') {
        if (inviteFormData.adminCodeId) {
          invitePayload.adminCodeId = inviteFormData.adminCodeId;
        } else if (inviteFormData.adminCode.code) {
          invitePayload.adminCode = inviteFormData.adminCode;
        } else {
          alert('Admin users must have an AdminCode. Please select an existing one or create a new one.');
          setInviting(false);
          return;
        }
      } else if (roleName === 'rep') {
        if (inviteFormData.repCodeId) {
          invitePayload.repCodeId = inviteFormData.repCodeId;
        } else if (inviteFormData.repCode.code) {
          invitePayload.repCode = inviteFormData.repCode;
        } else {
          alert('Rep users must have a RepCode. Please select an existing one or create a new one.');
          setInviting(false);
          return;
        }
      } else if (roleName === 'technician') {
        if (inviteFormData.technicianId) {
          invitePayload.technicianId = inviteFormData.technicianId;
        } else if (inviteFormData.technician.name) {
          invitePayload.technician = inviteFormData.technician;
        } else {
          alert('Technician users must have a Technician record. Please select an existing one or create a new one.');
          setInviting(false);
          return;
        }
      }
      // Manager role doesn't need additional data

      const response = await inviteUser(invitePayload);
alert((response as any).message || 'User invited successfully');
      
      // Reset form and close modal
      setShowInviteForm(false);
      setInviteFormData({
        email: '',
        firstName: '',
        lastName: '',
        role: '',
        adminCodeId: '',
        adminCode: { code: '', description: '' },
        repCodeId: '',
        repCode: { code: '', description: '' },
        technicianId: '',
        technician: { name: '', email: '', phone: '' },
        locationTrackingEnabled: false,
      });
      
      // Reload users
      await loadData();
    } catch (err: any) {
      console.error('Error inviting user:', err);
      alert('Failed to invite user: ' + (err.message || 'Unknown error'));
      setError(err.message || 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  }

  /**
   * Handles importing CSV file.
   */
  async function handleImport() {
    if (!selectedFile || !importType) return;

    if (clearExisting && !confirm(`Are you sure you want to clear all existing ${importType} before importing? This action cannot be undone.`)) {
      return;
    }

    try {
      setImporting(true);
      setError(null);
      setImportResult(null);

      let result;
      if (importType === 'jobs') {
        // Use branchId if a branch is selected
        const branchId = selectedBranch && branches.find(b => b._id === selectedBranch) ? selectedBranch : undefined;
        const branchCode = selectedBranch && !branchId && branches.find(b => b.code === selectedBranch) ? selectedBranch : undefined;
        result = await importJobs(selectedFile, clearExisting, branchId, branchCode);
      } else if (importType === 'customers') {
        result = await importCustomers(selectedFile, clearExisting);
      } else if (importType === 'rental-machines') {
        result = await importRentalMachines(selectedFile, clearExisting);
      } else if (importType === 'sales-leads') {
        result = await importSalesLeads(selectedFile, clearExisting);
      } else if (importType === 'update-jobs') {
        result = await updateJobs(selectedFile);
      }

      setImportResult(result?.data as any);
      await loadImportHistory();
    } catch (err: any) {
      console.error('Error importing:', err);
      setError(err.message || 'Failed to import file');
    } finally {
      setImporting(false);
    }
  }

  /**
   * Handles creating a new rep code.
   */
  async function handleCreateRepCode() {
    if (!newRepCode.code.trim()) {
      setError('Rep code is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await createRepCode({
        code: newRepCode.code.trim(),
        description: newRepCode.description.trim() || undefined,
        adminCode: newRepCode.adminCode?.trim() || undefined,
        branch: newRepCode.branch?.trim() || undefined,
      });
      setRepCodes([...repCodes, response.repCode]);
      setNewRepCode({ code: '', description: '', adminCode: '', branch: '' });
      setShowRepCodeForm(false);
      alert('Rep code created successfully');
    } catch (err: any) {
      console.error('Error creating rep code:', err);
      setError(err.message || 'Failed to create rep code');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handles updating a rep code.
   */
  async function handleUpdateRepCode() {
    if (!editingRepCode) return;

    try {
      setLoading(true);
      setError(null);
      const response = await updateRepCode(editingRepCode._id, {
        code: editingRepCode.code,
        description: editingRepCode.description,
        isActive: editingRepCode.isActive,
        adminCode: editingRepCode.adminCode || undefined,
        branch: (editingRepCode.branch?._id || editingRepCode.branch || undefined) as any,
      });
      setRepCodes(repCodes.map(rc => rc._id === editingRepCode._id ? response.repCode : rc));
      setEditingRepCode(null);
      alert('Rep code updated successfully');
    } catch (err: any) {
      console.error('Error updating rep code:', err);
      setError(err.message || 'Failed to update rep code');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handles deleting a rep code.
   */
  async function handleDeleteRepCode(id: string) {
    if (!confirm('Are you sure you want to delete this rep code?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await deleteRepCode(id);
      setRepCodes(repCodes.filter(rc => rc._id !== id));
      alert('Rep code deleted successfully');
    } catch (err: any) {
      console.error('Error deleting rep code:', err);
      setError(err.message || 'Failed to delete rep code');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handles creating a new admin code.
   */
  async function handleCreateAdminCode() {
    if (!newAdminCode.code.trim()) {
      setError('Admin code is required');
      return;
    }

    try {
      setError(null);
      const response = await createAdminCode({
        code: newAdminCode.code.trim(),
        description: newAdminCode.description.trim() || undefined,
        userId: newAdminCode.userId || undefined,
      });
      setAdminCodes([...adminCodes, response.adminCode].sort((a, b) => a.code.localeCompare(b.code)));
      setNewAdminCode({ code: '', description: '', userId: '' });
      setShowAdminCodeForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create admin code');
    }
  }

  /**
   * Handles updating an admin code.
   */
  async function handleUpdateAdminCode() {
    if (!editingAdminCode) return;

    try {
      setError(null);
      const response = await updateAdminCode(editingAdminCode._id, {
        code: editingAdminCode.code,
        description: editingAdminCode.description,
        userId: (editingAdminCode.user?._id || undefined),
        isActive: editingAdminCode.isActive,
      } as any);
      setAdminCodes(adminCodes.map(ac => ac._id === editingAdminCode._id ? response.adminCode : ac).sort((a, b) => a.code.localeCompare(b.code)));
      setEditingAdminCode(null);
      setShowAdminCodeForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update admin code');
    }
  }

  /**
   * Handles deleting an admin code.
   */
  async function handleDeleteAdminCode(id: string) {
    if (!confirm('Are you sure you want to delete this admin code?')) {
      return;
    }

    try {
      await deleteAdminCode(id);
      setAdminCodes(adminCodes.filter(ac => ac._id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete admin code');
    }
  }

  /**
   * Handles creating a new status.
   */
  async function handleCreateStatus() {
    if (!newStatus.name.trim()) {
      setError('Status name is required');
      return;
    }

    try {
      setError(null);
      const response = await createStatus({
        name: newStatus.name.trim(),
        description: newStatus.description.trim() || undefined,
      });
      setStatuses([...statuses, response.status].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
      setNewStatus({ name: '', description: '' });
      setShowStatusForm(false);
      alert('Status created successfully');
      // Refresh the page to update statuses on other pages
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to create status');
    }
  }

  /**
   * Handles updating a status.
   */
  async function handleUpdateStatus() {
    if (!editingStatus) return;

    try {
      setError(null);
      const response = await updateStatus(editingStatus._id, {
        name: editingStatus.name,
        description: editingStatus.description,
        sortOrder: editingStatus.sortOrder,
        isActive: editingStatus.isActive,
        isHidden: editingStatus.isHidden || false,
      });
      setStatuses(statuses.map(s => s._id === editingStatus._id ? response.status : s).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
      setEditingStatus(null);
      setShowStatusForm(false);
      alert('Status updated successfully');
      // Refresh the page to update statuses on other pages
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    }
  }

  /**
   * Handles deleting a status.
   */
  async function handleDeleteStatus(id: string) {
    if (!confirm('Are you sure you want to delete this status?')) {
      return;
    }

    try {
      await deleteStatus(id);
      setStatuses(statuses.filter(s => s._id !== id));
      alert('Status deleted successfully');
      // Refresh the page to update statuses on other pages
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to delete status');
    }
  }

  /**
   * Handles creating a new branch.
   */
  async function handleCreateBranch() {
    if (!newBranch.name.trim()) {
      setError('Branch name is required');
      return;
    }

    try {
      setError(null);
      const response = await createBranch({
        name: newBranch.name.trim(),
        code: newBranch.code.trim() || undefined,
        jobNumberCode: newBranch.jobNumberCode.trim() || undefined,
        address: newBranch.address.trim() || undefined,
        isDefault: newBranch.isDefault,
      });
      setBranches([...branches, response.branch].sort((a, b) => a.name.localeCompare(b.name)));
      setNewBranch({ name: '', code: '', jobNumberCode: '', address: '', isDefault: false });
      setShowBranchForm(false);
      alert('Branch created successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to create branch');
    }
  }

  /**
   * Handles updating a branch.
   */
  async function handleUpdateBranch() {
    if (!editingBranch) return;

    try {
      setError(null);
      const response = await updateBranch(editingBranch._id, {
        name: editingBranch.name,
        code: editingBranch.code,
        jobNumberCode: editingBranch.jobNumberCode,
        address: editingBranch.address,
        isDefault: editingBranch.isDefault,
      });
      setBranches(branches.map(b => b._id === editingBranch._id ? response.branch : b).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingBranch(null);
      setShowBranchForm(false);
      alert('Branch updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update branch');
    }
  }

  /**
   * Handles deleting a branch.
   */
  async function handleDeleteBranch(id: string) {
    if (!confirm('Are you sure you want to delete this branch?')) {
      return;
    }

    try {
      await deleteBranch(id);
      setBranches(branches.filter(b => b._id !== id));
      alert('Branch deleted successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to delete branch');
    }
  }

  /**
   * Calculates the next sort order for a new status.
   */
  function getNextSortOrder(): number {
    if (statuses.length === 0) return 1;
    const maxOrder = Math.max(...statuses.map(s => s.sortOrder || 0));
    return maxOrder + 1;
  }

  /**
   * Handles creating a new technician.
   */
  async function handleCreateTechnician() {
    if (!newTechnician.name.trim()) {
      setError('Technician name is required');
      return;
    }

    try {
      setError(null);
      const response = await createTechnician({
        name: newTechnician.name.trim(),
        email: newTechnician.email.trim() || undefined,
        phone: newTechnician.phone.trim() || undefined,
        user: newTechnician.userId || undefined,
      });
      setTechnicians([...technicians, response.technician].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTechnician({ name: '', email: '', phone: '', userId: '' });
      setShowTechnicianForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create technician');
    }
  }

  /**
   * Handles updating a technician.
   */
  async function handleUpdateTechnician() {
    if (!editingTechnician) return;

    try {
      setError(null);
      const response = await updateTechnician(editingTechnician._id, {
        name: editingTechnician.name,
        email: editingTechnician.email,
        phone: editingTechnician.phone,
        user: (editingTechnician.user?._id || undefined) as any,
        isActive: editingTechnician.isActive,
      });
      setTechnicians(technicians.map(t => t._id === editingTechnician._id ? response.technician : t).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingTechnician(null);
      setShowTechnicianForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update technician');
    }
  }

  /**
   * Handles deleting a technician.
   */
  async function handleDeleteTechnician(id: string) {
    if (!confirm('Are you sure you want to delete this technician?')) {
      return;
    }

    try {
      await deleteTechnician(id);
      setTechnicians(technicians.filter(t => t._id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete technician');
    }
  }

  /**
   * Handles creating a new service description.
   */
  async function handleCreateDescription() {
    if (!newDescription.name.trim()) {
      setError('Description name is required');
      return;
    }

    try {
      setError(null);
      const response = await createServiceDescription({
        name: newDescription.name.trim(),
        description: newDescription.description.trim() || undefined,
      });
      setDescriptions([...descriptions, response.description].sort((a, b) => a.name.localeCompare(b.name)));
      setNewDescription({ name: '', description: '' });
      setShowDescriptionForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create service description');
    }
  }

  /**
   * Handles updating a service description.
   */
  async function handleUpdateDescription() {
    if (!editingDescription) return;

    try {
      setError(null);
      const response = await updateServiceDescription(editingDescription._id, {
        name: editingDescription.name,
        description: editingDescription.description,
        isActive: editingDescription.isActive,
      });
      setDescriptions(descriptions.map(d => d._id === editingDescription._id ? response.description : d).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingDescription(null);
      setShowDescriptionForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update service description');
    }
  }

  /**
   * Handles deleting a service description.
   */
  async function handleDeleteDescription(id: string) {
    if (!confirm('Are you sure you want to delete this service description?')) {
      return;
    }

    try {
      await deleteServiceDescription(id);
      setDescriptions(descriptions.filter(d => d._id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete service description');
    }
  }

  /**
   * Handles creating a new job source.
   */
  async function handleCreateJobSource() {
    if (!newJobSource.name.trim()) {
      setError('Job source name is required');
      return;
    }

    try {
      setError(null);
      const response = await createJobSource({
        name: newJobSource.name.trim(),
        description: newJobSource.description.trim() || undefined,
        isDefault: newJobSource.isDefault,
      });
      // If we just created a default, update other sources to not be default
      let updatedSources = [...jobSources];
      if (newJobSource.isDefault) {
        updatedSources = updatedSources.map(s => ({ ...s, isDefault: false }));
      }
      setJobSources([...updatedSources, response.source].sort((a, b) => {
        // Sort by default first, then by name
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return a.name.localeCompare(b.name);
      }));
      setNewJobSource({ name: '', description: '', isDefault: false });
      setShowJobSourceForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create job source');
    }
  }

  /**
   * Handles updating a job source.
   */
  async function handleUpdateJobSource() {
    if (!editingJobSource) return;

    try {
      setError(null);
      const response = await updateJobSource(editingJobSource._id, {
        name: editingJobSource.name,
        description: editingJobSource.description,
        isDefault: editingJobSource.isDefault,
        isActive: editingJobSource.isActive,
      });
      // If we just set this as default, update other sources
      let updatedSources = jobSources.map(s => s._id === editingJobSource._id ? response.source : s);
      if (response.source.isDefault) {
        updatedSources = updatedSources.map(s => 
          s._id === response.source._id ? s : { ...s, isDefault: false }
        );
      }
      setJobSources(updatedSources.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return a.name.localeCompare(b.name);
      }));
      setEditingJobSource(null);
      setShowJobSourceForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update job source');
    }
  }

  /**
   * Handles deleting a job source.
   */
  async function handleDeleteJobSource(id: string) {
    if (!confirm('Are you sure you want to delete this job source?')) {
      return;
    }

    try {
      await deleteJobSource(id);
      setJobSources(jobSources.filter(s => s._id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete job source');
    }
  }

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ars-primary mx-auto mb-4"></div>
          <p className="text-ars-body">Loading system management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-8 border border-gray-200 rounded-xl">
        <div className="flex justify-between items-center mb-6">
      <h3 className="text-2xl font-bold text-ars-heading flex items-center gap-2">
            System Management
          </h3>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 px-6 py-4 font-semibold transition-all ${
                activeTab === 'users'
                  ? 'text-ars-primary border-b-2 border-ars-primary bg-blue-50'
                  : 'text-ars-body hover:text-ars-heading hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="w-5 h-5" />
                User Management
              </div>
            </button>
            <button
              onClick={() => setActiveTab('imports')}
              className={`flex-1 px-6 py-4 font-semibold transition-all ${
                activeTab === 'imports'
                  ? 'text-ars-primary border-b-2 border-ars-primary bg-blue-50'
                  : 'text-ars-body hover:text-ars-heading hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Upload className="w-5 h-5" />
                Imports
              </div>
            </button>
            <button
              onClick={() => setActiveTab('reference')}
              className={`flex-1 px-6 py-4 font-semibold transition-all ${
                activeTab === 'reference'
                  ? 'text-ars-primary border-b-2 border-ars-primary bg-blue-50'
                  : 'text-ars-body hover:text-ars-heading hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Key className="w-5 h-5" />
                Reference Data
              </div>
            </button>
            <button
              onClick={() => setActiveTab('changelog')}
              className={`flex-1 px-6 py-4 font-semibold transition-all ${
                activeTab === 'changelog'
                  ? 'text-ars-primary border-b-2 border-ars-primary bg-blue-50'
                  : 'text-ars-body hover:text-ars-heading hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <History className="w-5 h-5" />
                Changelog
              </div>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-800 font-semibold">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="flex gap-6">
            {/* Left Side - User List */}
            <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-ars-heading">Users</h3>
                <button
                  onClick={() => {
                    setShowInviteForm(true);
                    setInviteFormData({
                      email: '',
                      firstName: '',
                      lastName: '',
                      role: '',
                      adminCodeId: '',
                      adminCode: { code: '', description: '' },
                      repCodeId: '',
                      repCode: { code: '', description: '' },
                      technicianId: '',
                      technician: { name: '', email: '', phone: '' },
                      locationTrackingEnabled: false,
                    });
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  INVITE USER
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-2 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[13px] h-[38px]"
                />
              </div>

              {/* User List */}
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => handleViewUser(user._id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedUser?._id === user._id
                        ? 'border-ars-primary bg-blue-50'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <p className="font-semibold text-ars-heading">
                            {user.firstName} {user.lastName}
                          </p>
                          {user.isSuperAdmin && (
                            <span className="px-2 py-1 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] text-xs font-bold rounded-lg">
                              Super Admin
                            </span>
                          )}
                          <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                            user.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {user.passwordSet === false && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-lg flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              Invitation Pending
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-ars-body mb-1">{user.email}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg">
                            {user.role.name}
                          </span>
                          {user.adminCode && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg">
                              {typeof user.adminCode === 'object' ? user.adminCode.code : user.adminCode}
                            </span>
                          )}
                          <span className="text-xs text-ars-body">
                            {user.permissions.length} permission{user.permissions.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleUserStatus(user);
                          }}
                          className={`p-2 rounded-lg transition-colors ${
                            user.isActive
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                          title={user.isActive ? 'Deactivate user' : 'Activate user'}
                        >
                          {user.isActive ? (
                            <UserCheck className="w-5 h-5" />
                          ) : (
                            <UserX className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewUser(user._id);
                          }}
                          className="p-2 text-ars-primary hover:bg-blue-50 rounded-lg transition-colors"
                          title="View/Edit user"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-ars-body"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-ars-body">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-ars-body"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {/* Right Side - User Details */}
            {selectedUser && (
              <div className="w-96 bg-white rounded-xl border border-gray-200 p-6 h-fit sticky top-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-ars-heading">User Details</h3>
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setIsEditingUser(false);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {isEditingUser ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">First Name</label>
                      <input
                        type="text"
                        value={selectedUser.firstName}
                        onChange={(e) => setSelectedUser({ ...selectedUser, firstName: e.target.value })}
                        className="w-full pl-2 pr-2 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[13px] h-[38px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={selectedUser.lastName}
                        onChange={(e) => setSelectedUser({ ...selectedUser, lastName: e.target.value })}
                        className="w-full pl-2 pr-2 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[13px] h-[38px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">Email</label>
                      <input
                        type="email"
                        value={selectedUser.email}
                        onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                        className="w-full pl-2 pr-2 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[13px] h-[38px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">Role</label>
                      <select
                        value={selectedUser.role._id}
                        onChange={(e) => {
                          const role = roles.find(r => r._id === e.target.value);
                          if (role) {
                            setSelectedUser({ ...selectedUser, role });
                          }
                        }}
                        className="w-full pl-2 pr-10 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[13px] h-[38px] appearance-none"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 0.75rem center',
                          backgroundSize: '1rem'
                        }}
                      >
                        {roles.map((role) => (
                          <option key={role._id} value={role._id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">Admin Code</label>
                      {(() => {
                        console.log('[SystemManagement] Rendering Admin Code field. adminCodes.length:', adminCodes.length);
                        console.log('[SystemManagement] adminCodes:', adminCodes);
                        console.log('[SystemManagement] selectedUser.adminCode:', selectedUser.adminCode);
                        const activeAdminCodes = adminCodes.filter(ac => ac.isActive);
                        console.log('[SystemManagement] Active admin codes:', activeAdminCodes.length);
                        
                        if (adminCodes.length === 0) {
                          return (
                            <div className="w-full pl-2 pr-2 py-2.5 border border-gray-300 rounded-[8px] bg-gray-50 text-[13px] h-[38px] flex items-center text-gray-500">
                              No admin codes available. Create one in the Admin Codes section first.
                            </div>
                          );
                        }
                        
                        if (activeAdminCodes.length === 0) {
                          return (
                            <div className="w-full pl-2 pr-2 py-2.5 border border-gray-300 rounded-[8px] bg-gray-50 text-[13px] h-[38px] flex items-center text-gray-500">
                              No active admin codes. Activate one in the Admin Codes section first.
                            </div>
                          );
                        }
                        
                        return (
                          <select
                            value={selectedUser.adminCode && typeof selectedUser.adminCode === 'object' ? selectedUser.adminCode._id : (typeof selectedUser.adminCode === 'string' ? selectedUser.adminCode : '')}
                            onChange={(e) => {
                              const adminCodeId = e.target.value || null;
                              const adminCode = adminCodeId ? adminCodes.find(ac => ac._id === adminCodeId) : null;
                              console.log('[SystemManagement] Admin code changed:', adminCodeId, adminCode);
                              setSelectedUser({ 
                                ...selectedUser, 
                                adminCode: adminCode ? { _id: adminCode._id, code: adminCode.code, description: adminCode.description } : undefined 
                              });
                            }}
                            className="w-full pl-2 pr-10 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[13px] h-[38px] appearance-none bg-white"
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'right 0.75rem center',
                              backgroundSize: '1rem'
                            }}
                          >
                            <option value="">No Admin Code</option>
                            {activeAdminCodes.map((adminCode) => (
                              <option key={adminCode._id} value={adminCode._id}>
                                {adminCode.code} {adminCode.description ? `- ${adminCode.description}` : ''}
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                    </div>
                    {/* Location Tracking Toggle */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-[13px] font-medium text-gray-800">GPS Location Tracking</p>
                          <p className="text-[11px] text-gray-500">Enable real-time GPS tracking for this user</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedUser({ ...selectedUser, locationTrackingEnabled: !selectedUser.locationTrackingEnabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          selectedUser.locationTrackingEnabled ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          selectedUser.locationTrackingEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-4">
                      <button
                        onClick={handleSaveUser}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        SAVE
                      </button>
                      <button
                        onClick={() => setIsEditingUser(false)}
                        className="px-4 py-2.5 border border-gray-300 rounded-[8px] font-bold text-[14px] hover:bg-gray-50 transition-colors"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-1">Name</label>
                      <p className="text-ars-heading font-medium">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-1">Email</label>
                      <p className="text-ars-heading">{selectedUser.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-1">Role</label>
                      <p className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg inline-block font-medium">
                        {selectedUser.role.name}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-1">Admin Code</label>
                      {selectedUser.adminCode ? (
                        <p className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg inline-block font-medium">
                          {typeof selectedUser.adminCode === 'object' ? selectedUser.adminCode.code : selectedUser.adminCode}
                        </p>
                      ) : (
                        <p className="text-ars-body italic">No admin code assigned</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-1">Status</label>
                      <div className="flex items-center gap-2">
                        <p className={`px-3 py-1.5 rounded-lg inline-block font-medium ${
                          selectedUser.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {selectedUser.isActive ? 'Active' : 'Inactive'}
                        </p>
                        <button
                          onClick={() => {
                            const action = selectedUser.isActive ? 'deactivate' : 'activate';
                            if (confirm(`Are you sure you want to ${action} this user?`)) {
                              handleToggleUserStatus(selectedUser);
                            }
                          }}
                          disabled={loading}
                          className={`px-3 py-1.5 rounded-[8px] font-bold text-[13px] transition-all duration-300 hover:scale-105 flex items-center gap-1 disabled:opacity-50 ${
                            selectedUser.isActive
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                          title={selectedUser.isActive ? 'Deactivate user' : 'Activate user'}
                        >
                          {selectedUser.isActive ? (
                            <>
                              <UserX className="w-4 h-4" />
                              DEACTIVATE
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-4 h-4" />
                              ACTIVATE
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-1">Location Tracking</label>
                      <div className="flex items-center gap-2">
                        <p className={`px-3 py-1.5 rounded-lg inline-block font-medium ${
                          selectedUser.locationTrackingEnabled
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {selectedUser.locationTrackingEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </p>
                        <button
                          onClick={() => handleToggleTracking(selectedUser)}
                          disabled={loading}
                          className={`px-3 py-1.5 rounded-[8px] font-bold text-[13px] transition-all duration-300 hover:scale-105 flex items-center gap-1 disabled:opacity-50 ${
                            selectedUser.locationTrackingEnabled
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                          title={selectedUser.locationTrackingEnabled ? 'Disable tracking' : 'Enable tracking'}
                        >
                          <MapPin className="w-4 h-4" />
                          {selectedUser.locationTrackingEnabled ? 'DISABLE' : 'ENABLE'}
                        </button>
                      </div>
                    </div>
                    {selectedUser.passwordSet === false && (
                      <div>
                        <label className="block text-sm font-semibold text-ars-body mb-1">Password Status</label>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg font-medium">
                            Password Not Set
                          </span>
                          <button
                            onClick={() => handleResendInvitation(selectedUser._id)}
                            disabled={loading}
                            className="px-3 py-1.5 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 disabled:opacity-50"
                            title="Resend invitation email"
                          >
                            <Mail className="w-4 h-4" />
                            RESEND INVITATION
                          </button>
                        </div>
                        <p className="text-xs text-ars-body">
                          This user hasn't set their password yet. Click "Resend Invitation" to send them a new invitation email.
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Permissions</label>
                      <p className="text-xs text-ars-body mb-2">Grant access to Job Card Templates, Submissions, Reports, etc.</p>
                      <div className="flex items-center justify-between mb-3">
                        <button
                          type="button"
                          onClick={handleToggleAllPermissions}
                          disabled={updatingPermissions || allPermissionNames.length === 0}
                          className="text-xs text-ars-primary hover:text-ars-primary/80 underline disabled:opacity-50"
                        >
                          {hasAllPermissionsSelected ? 'Clear All' : 'Select All'}
                        </button>
                        <span className="text-xs text-ars-body">
                          {allPermissionNames.length === 0
                            ? 'No permissions available'
                            : `${selectedUser?.permissions?.filter((perm) => allPermissionNames.includes(perm)).length || 0} selected`}
                        </span>
                      </div>
                      <div className="max-h-80 overflow-y-auto space-y-2">
                        {Object.entries(groupedPermissions)
                          .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
                          .map(([groupKey, perms]) => (
                          <div key={groupKey} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-bold text-ars-heading">{groupKey}</p>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!selectedUser) return;
                                  const groupPermissionNames = perms.map((perm) => perm.name);
                                  const groupAllSelected = groupPermissionNames.every((permName) =>
                                    selectedUser.permissions.includes(permName),
                                  );
                                  const newPerms = groupAllSelected
                                    ? selectedUser.permissions.filter(
                                        (perm) => !groupPermissionNames.includes(perm),
                                      )
                                    : Array.from(
                                        new Set([
                                          ...selectedUser.permissions,
                                          ...groupPermissionNames,
                                        ]),
                                      );
                                  handleUpdatePermissions(selectedUser._id, newPerms);
                                }}
                                disabled={updatingPermissions}
                                className="text-[11px] text-ars-primary hover:text-ars-primary/80 underline disabled:opacity-50"
                              >
                                {selectedUser && perms.length > 0 &&
                                perms.every((perm) =>
                                  selectedUser.permissions.includes(perm.name),
                                )
                                  ? 'Clear All'
                                  : 'Select All'}
                              </button>
                            </div>
                            <div className="space-y-1">
                              {perms.map((perm) => {
                                const hasPermission = selectedUser.permissions.includes(perm.name);
                                return (
                                  <label
                                    key={perm._id}
                                    className="flex items-center gap-2 cursor-pointer group"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={hasPermission}
                                      disabled={updatingPermissions}
                                      onChange={(e) => {
                                        const newPerms = e.target.checked
                                          ? [...selectedUser.permissions, perm.name]
                                          : selectedUser.permissions.filter(p => p !== perm.name);
                                        handleUpdatePermissions(selectedUser._id, newPerms);
                                      }}
                                      className="w-4 h-4 rounded border-gray-300 text-ars-primary focus:ring-ars-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <span className="text-sm text-ars-body group-hover:text-ars-heading">
                                      {perm.description || perm.name}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Branch Permissions */}
                    <div className="pt-4 border-t border-gray-200">
                      <label className="block text-sm font-semibold text-ars-body mb-2">Branch Access</label>
                      <p className="text-xs text-ars-body mb-3">
                        Control which branches this user can view and manage data for. Leave empty for unrestricted access to all branches.
                      </p>
                      <BranchPermissionsSection
                        branches={branches}
                        selectedBranches={selectedUser.branches ? selectedUser.branches.map((b: any) => typeof b === 'string' ? b : b._id) : []}
                        onChange={(newBranches) => handleUpdateBranches(selectedUser._id, newBranches)}
                        isLoading={updatingPermissions}
                        disabled={updatingPermissions}
                      />
                    </div>
                    
                    <button
                      onClick={() => setIsEditingUser(true)}
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      EDIT USER
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Imports Tab */}
        {activeTab === 'imports' && (
          <div className="space-y-6">
            {/* Import History/Stats */}
            {importHistory && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-ars-heading flex items-center gap-2">
                      <FileText className="w-5 h-5 text-ars-primary" />
                      Jobs
                    </h3>
                  </div>
                  <p className="text-3xl font-bold text-ars-primary mb-2">{importHistory.jobs.total.toLocaleString()}</p>
                  <p className="text-sm text-ars-body">Total jobs in system</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-ars-heading flex items-center gap-2">
                      <Users className="w-5 h-5 text-ars-primary" />
                      Customers
                    </h3>
                  </div>
                  <p className="text-3xl font-bold text-ars-primary mb-2">{importHistory.customers.total.toLocaleString()}</p>
                  <p className="text-sm text-ars-body">Total customers in system</p>
                </div>
              </div>
            )}

            {/* Import Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Import Jobs */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-ars-heading flex items-center gap-2">
                    <FileText className="w-5 h-5 text-ars-primary" />
                    Import Jobs
                  </h3>
                  <button
                    onClick={() => downloadExampleCSV('jobs').catch(err => alert('Failed to download: ' + err.message))}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-ars-heading rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Example CSV
                  </button>
                </div>
                <p className="text-sm text-ars-body mb-4">
                  Import jobs from a CSV file. Download the example CSV to see the required format.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Select CSV File</label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          setImportType('jobs');
                        }
                      }}
                      className="w-full px-2 py-2 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[13px] file:mr-4 file:py-1.5 file:px-4 file:rounded-[6px] file:border-0 file:text-[13px] file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Branch</label>
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="w-full pl-2 pr-10 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[13px] h-[38px] appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0.75rem center',
                        backgroundSize: '1rem'
                      }}
                    >
                      <option value="">Default (JHB)</option>
                      {branches.map((branch) => (
                        <option key={branch._id} value={branch._id}>
                          {branch.name} ({branch.code})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-ars-body mt-1">
                      Select a branch to assign all imported jobs to. If not selected, defaults to JHB.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="clear-jobs"
                      checked={clearExisting && importType === 'jobs'}
                      onChange={(e) => {
                        setClearExisting(e.target.checked);
                        if (e.target.checked && importType !== 'jobs') {
                          setImportType('jobs');
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-ars-primary focus:ring-ars-primary"
                    />
                    <label htmlFor="clear-jobs" className="text-sm text-ars-body cursor-pointer">
                      Clear existing jobs before importing
                    </label>
                  </div>
                  <button
                    onClick={handleImport}
                    disabled={!selectedFile || importing || importType !== 'jobs'}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing && importType === 'jobs' ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        IMPORTING...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        IMPORT JOBS
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Import Customers */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-ars-heading flex items-center gap-2">
                    <Users className="w-5 h-5 text-ars-primary" />
                    Import Customers
                  </h3>
                  <button
                    onClick={() => downloadExampleCSV('customers').catch(err => alert('Failed to download: ' + err.message))}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-ars-heading rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Example CSV
                  </button>
                </div>
                <p className="text-sm text-ars-body mb-4">
                  Import customers from a CSV file. Download the example CSV to see the required format.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Select CSV File</label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          setImportType('customers');
                        }
                      }}
                      className="w-full px-2 py-2 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[13px] file:mr-4 file:py-1.5 file:px-4 file:rounded-[6px] file:border-0 file:text-[13px] file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="clear-customers"
                      checked={clearExisting && importType === 'customers'}
                      onChange={(e) => {
                        setClearExisting(e.target.checked);
                        if (e.target.checked && importType !== 'customers') {
                          setImportType('customers');
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-ars-primary focus:ring-ars-primary"
                    />
                    <label htmlFor="clear-customers" className="text-sm text-ars-body cursor-pointer">
                      Clear existing customers before importing
                    </label>
                  </div>
                  <button
                    onClick={handleImport}
                    disabled={!selectedFile || importing || importType !== 'customers'}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing && importType === 'customers' ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        IMPORTING...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        IMPORT CUSTOMERS
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Import Rental Machines */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-ars-heading flex items-center gap-2">
                    <Cog className="w-5 h-5 text-amber-600" />
                    Import Rental Machines
                  </h3>
                  <button
                    onClick={() => downloadExampleCSV('rental-machines').catch(err => alert('Failed to download: ' + err.message))}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-ars-heading rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Example CSV
                  </button>
                </div>
                <p className="text-sm text-ars-body mb-4">
                  Import rental fleet machines from a CSV file. These machines can be assigned to rental jobs.
                </p>
                <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs font-semibold text-ars-heading mb-2">CSV Column Names:</p>
                  <ul className="text-xs text-ars-body space-y-1 list-disc list-inside">
                    <li><strong>Make</strong> - <span className="text-red-600">Required</span> (e.g., Generator, Compressor, Dryer, Blower)</li>
                    <li><strong>Model</strong> - <span className="text-red-600">Required</span></li>
                    <li><strong>Serial Number</strong> - <span className="text-red-600">Required</span></li>
                    <li><strong>Asset Number</strong> - Optional, for internal tracking</li>
                    <li><strong>Service Type</strong> - Optional: "hours" or "date" (auto-detected by Make if not specified)</li>
                    <li><strong>Machine Hours</strong> - For hour-based machines (Generator, Genset, Compressors)</li>
                    <li><strong>Next Service Hours</strong> - For hour-based machines</li>
                    <li><strong>Last Service Date</strong> - For date-based machines (Dryer, Blower, Vacuum pump)</li>
                    <li><strong>Next Service Date</strong> - For date-based machines</li>
                  </ul>
                  <p className="text-xs text-ars-body mt-2 italic">
                    Service type auto-detection: Dryer, Blower, and Vacuum pump machines use date-based service tracking. All others use hours.
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Select CSV File</label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          setImportType('rental-machines');
                        }
                      }}
                      className="w-full px-2 py-2 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[13px] file:mr-4 file:py-1.5 file:px-4 file:rounded-[6px] file:border-0 file:text-[13px] file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="clear-rental-machines"
                      checked={clearExisting && importType === 'rental-machines'}
                      onChange={(e) => {
                        setClearExisting(e.target.checked);
                        if (e.target.checked && importType !== 'rental-machines') {
                          setImportType('rental-machines');
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-ars-primary focus:ring-ars-primary"
                    />
                    <label htmlFor="clear-rental-machines" className="text-sm text-ars-body cursor-pointer">
                      Clear existing rental machines before importing
                    </label>
                  </div>
                  <button
                    onClick={handleImport}
                    disabled={!selectedFile || importing || importType !== 'rental-machines'}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing && importType === 'rental-machines' ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        IMPORTING...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        IMPORT RENTAL MACHINES
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Update Jobs */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-ars-heading flex items-center gap-2">
                    <FileEdit className="w-5 h-5 text-ars-primary" />
                    Update Jobs
                  </h3>
                </div>
                <p className="text-sm text-ars-body mb-4">
                  Update existing jobs from a CSV file. CSV must contain: <strong>Job Number</strong>, <strong>Service Description</strong>, and/or <strong>Value Ex VAT</strong>.
                </p>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-ars-heading mb-2">CSV Column Names (Required):</p>
                  <ul className="text-xs text-ars-body space-y-1 list-disc list-inside">
                    <li><strong>Job Number</strong> (or <strong>Job #</strong>) - <span className="text-red-600">Required</span>: The job number to update</li>
                  </ul>
                  <p className="text-xs font-semibold text-ars-heading mb-2 mt-3">CSV Column Names (Optional):</p>
                  <ul className="text-xs text-ars-body space-y-1 list-disc list-inside">
                    <li><strong>Service Description</strong> (or <strong>Description</strong>) - Must match exactly with existing service descriptions in the database. If not found, the existing description will remain unchanged.</li>
                    <li><strong>Value Ex VAT</strong> (or <strong>Value Ex Vat</strong>) - The value excluding VAT (numeric)</li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Select CSV File</label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          setImportType('update-jobs');
                        }
                      }}
                      className="w-full px-2 py-2 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[13px] file:mr-4 file:py-1.5 file:px-4 file:rounded-[6px] file:border-0 file:text-[13px] file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                    />
                  </div>
                  <button
                    onClick={handleImport}
                    disabled={!selectedFile || importing || importType !== 'update-jobs'}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing && importType === 'update-jobs' ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#383838]"></div>
                        UPDATING...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        UPDATE JOBS
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Import Sales Leads */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-ars-heading flex items-center gap-2">
                    <Target className="w-5 h-5 text-green-600" />
                    Import Sales Leads
                  </h3>
                  <button
                    onClick={() => downloadExampleCSV('sales-leads').catch(err => alert('Failed to download: ' + err.message))}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-ars-heading rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Example CSV
                  </button>
                </div>
                <p className="text-sm text-ars-body mb-4">
                  Import sales leads from a CSV file. Download the example CSV to see the required format.
                </p>
                <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs font-semibold text-ars-heading mb-2">CSV Column Names:</p>
                  <ul className="text-xs text-ars-body space-y-1 list-disc list-inside">
                    <li><strong>Company Name</strong> - <span className="text-red-600">Required</span></li>
                    <li><strong>Contact Person</strong> - <span className="text-red-600">Required</span></li>
                    <li><strong>Contact Phone</strong> - <span className="text-red-600">Required</span></li>
                    <li><strong>Contact Email</strong> - Optional</li>
                    <li><strong>Branch</strong> - Optional (e.g., JHB, CPT, DBN)</li>
                    <li><strong>Rep Code</strong> - Optional (assigns lead to rep)</li>
                    <li><strong>Lead Source</strong> - Optional (Website, Referral, Cold Call, Canvassing, etc.)</li>
                    <li><strong>Service Description</strong> - Optional</li>
                    <li><strong>Estimated Value</strong> - Optional (numeric, supports R format)</li>
                    <li><strong>Notes</strong> - Optional</li>
                  </ul>
                  <p className="text-xs text-ars-body mt-2 italic">
                    Leads will be created with status "new" or "assigned" if a Rep Code is provided.
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Select CSV File</label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          setImportType('sales-leads');
                        }
                      }}
                      className="w-full px-2 py-2 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[13px] file:mr-4 file:py-1.5 file:px-4 file:rounded-[6px] file:border-0 file:text-[13px] file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="clear-sales-leads"
                      checked={clearExisting && importType === 'sales-leads'}
                      onChange={(e) => {
                        setClearExisting(e.target.checked);
                        if (e.target.checked && importType !== 'sales-leads') {
                          setImportType('sales-leads');
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-ars-primary focus:ring-ars-primary"
                    />
                    <label htmlFor="clear-sales-leads" className="text-sm text-ars-body cursor-pointer">
                      Clear existing sales leads before importing
                    </label>
                  </div>
                  <button
                    onClick={handleImport}
                    disabled={!selectedFile || importing || importType !== 'sales-leads'}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing && importType === 'sales-leads' ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#383838]"></div>
                        IMPORTING...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        IMPORT SALES LEADS
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Import Result */}
            {importResult && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-ars-heading">Import Result</h3>
                  <button
                    onClick={() => {
                      setImportResult(null);
                      setSelectedFile(null);
                      setImportType(null);
                      setClearExisting(false);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {importType === 'update-jobs' ? (
                    <>
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold text-green-700">{importResult.updated || 0}</p>
                          <p className="text-sm text-green-600">Updated</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                        <AlertCircle className="w-6 h-6 text-orange-600" />
                        <div>
                          <p className="text-2xl font-bold text-orange-700">{importResult.notFound || 0}</p>
                          <p className="text-sm text-orange-600">Not Found</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold text-green-700">{importResult.imported || 0}</p>
                          <p className="text-sm text-green-600">Imported</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <CheckCircle2 className="w-6 h-6 text-blue-600" />
                        <div>
                          <p className="text-2xl font-bold text-blue-700">{importResult.updated || 0}</p>
                          <p className="text-sm text-blue-600">Updated</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                {importResult.errors.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-ars-heading mb-2">
                      Errors ({importResult.errors.length}):
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="flex items-start gap-2 p-2 bg-red-50 rounded text-sm text-red-700">
                          <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    loadImportHistory();
                    setImportResult(null);
                    setSelectedFile(null);
                    setImportType(null);
                    setClearExisting(false);
                  }}
                  className="mt-4 w-full px-4 py-2.5 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  DONE
                </button>
              </div>
            )}
          </div>
        )}

        {/* Reference Data Tab */}
        {activeTab === 'reference' && (
          <div className="space-y-6">
            {/* Job Statuses Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <button
                onClick={() => setIsStatusesExpanded(!isStatusesExpanded)}
                className="w-full flex items-center gap-2 text-xl font-bold text-ars-heading hover:text-ars-primary transition-colors"
              >
                {isStatusesExpanded ? <ChevronUp className="w-6 h-6 text-ars-primary" /> : <ChevronDown className="w-6 h-6 text-ars-primary" />}
                <Tag className="w-6 h-6 text-ars-primary" />
                Job Statuses
              </button>

              {isStatusesExpanded && (
                <>
              <div className="mt-5 mb-4">
                <button
                  onClick={() => {
                    setEditingStatus(null);
                    setNewStatus({ name: '', description: '' });
                    setShowStatusForm(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  ADD STATUS
                </button>
              </div>

              {/* Add/Edit Status Form */}
              {(editingStatus || showStatusForm) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-ars-heading">
                      {editingStatus ? 'Edit Status' : 'New Status'}
                    </h4>
                    <button
                      onClick={() => {
                        setEditingStatus(null);
                        setNewStatus({ name: '', description: '' });
                        setShowStatusForm(false);
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Status Name *</label>
                      <input
                        type="text"
                        value={editingStatus?.name || newStatus.name}
                        onChange={(e) => {
                          if (editingStatus) {
                            setEditingStatus({ ...editingStatus, name: e.target.value });
                          } else {
                            setNewStatus({ ...newStatus, name: e.target.value });
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                        placeholder="e.g., In Progress"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Description</label>
                      <input
                        type="text"
                        value={editingStatus?.description || newStatus.description}
                        onChange={(e) => {
                          if (editingStatus) {
                            setEditingStatus({ ...editingStatus, description: e.target.value });
                          } else {
                            setNewStatus({ ...newStatus, description: e.target.value });
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                        placeholder="Optional description"
                      />
                    </div>
                  </div>
                  {!editingStatus && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-ars-body">
                        <span className="font-semibold">Order Number:</span> {getNextSortOrder()}
                      </p>
                      <p className="text-xs text-ars-body mt-1">This status will be assigned order number {getNextSortOrder()} when created.</p>
                    </div>
                  )}
                  {editingStatus && (
                    <div className="mt-4 space-y-3">
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-ars-body">
                          <span className="font-semibold">Current Order Number:</span> {editingStatus.sortOrder || 0}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-ars-body mb-2">Order Number</label>
                        <input
                          type="number"
                          value={editingStatus.sortOrder || 0}
                          onChange={(e) => setEditingStatus({ ...editingStatus, sortOrder: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                          min="0"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="status-active"
                          checked={editingStatus.isActive}
                          onChange={(e) => setEditingStatus({ ...editingStatus, isActive: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-ars-primary focus:ring-ars-primary"
                        />
                        <label htmlFor="status-active" className="text-sm text-ars-body cursor-pointer">
                          Active
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="status-hidden"
                          checked={editingStatus.isHidden || false}
                          onChange={(e) => setEditingStatus({ ...editingStatus, isHidden: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-ars-primary focus:ring-ars-primary"
                        />
                        <label htmlFor="status-hidden" className="text-sm text-ars-body cursor-pointer">
                          Hide from Job Listings
                        </label>
                        <span className="text-xs text-ars-body italic">
                          (Jobs with this status will be hidden from default job listings)
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={editingStatus ? handleUpdateStatus : handleCreateStatus}
                      disabled={loading}
                      className="px-4 py-2.5 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {editingStatus ? 'UPDATE' : 'CREATE'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingStatus(null);
                        setNewStatus({ name: '', description: '' });
                        setShowStatusForm(false);
                      }}
                      className="px-4 py-2.5 border border-gray-300 rounded-[8px] font-bold text-[14px] hover:bg-gray-50 transition-colors"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}

              {/* Statuses List */}
              <div className="space-y-2">
                {statuses.map((status) => (
                  <div
                    key={status._id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-ars-heading">{status.name}</span>
                        {status.description && (
                          <span className="text-sm text-ars-body">- {status.description}</span>
                        )}
                        <span className="px-2 py-1 text-xs font-medium rounded-lg bg-blue-100 text-blue-700">
                          Order: {status.sortOrder || 0}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                          status.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {status.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {status.isHidden && (
                          <span className="px-2 py-1 text-xs font-medium rounded-lg bg-orange-100 text-orange-700">
                            Hidden
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingStatus(status);
                          setShowStatusForm(false);
                        }}
                        className="p-2 text-ars-primary hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit status"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStatus(status._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete status"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {statuses.length === 0 && (
                  <p className="text-center text-ars-body py-8">No statuses found. Click "Add Status" to create one.</p>
                )}
              </div>
                </>
              )}
            </div>

            {/* Branches Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <button
                onClick={() => setIsBranchesExpanded(!isBranchesExpanded)}
                className="w-full flex items-center gap-2 text-xl font-bold text-ars-heading hover:text-ars-primary transition-colors"
              >
                {isBranchesExpanded ? <ChevronUp className="w-6 h-6 text-ars-primary" /> : <ChevronDown className="w-6 h-6 text-ars-primary" />}
                <Building2 className="w-6 h-6 text-ars-primary" />
                Branches
              </button>

              {isBranchesExpanded && (
                <>
              <div className="mt-5 mb-4">
                <button
                  onClick={() => {
                    setEditingBranch(null);
                    setNewBranch({ name: '', code: '', jobNumberCode: '', address: '', isDefault: false });
                    setShowBranchForm(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  ADD BRANCH
                </button>
              </div>

              {/* Add/Edit Branch Form */}
              {(editingBranch || showBranchForm) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-ars-heading">
                      {editingBranch ? 'Edit Branch' : 'New Branch'}
                    </h4>
                    <button
                      onClick={() => {
                        setEditingBranch(null);
                        setNewBranch({ name: '', code: '', jobNumberCode: '', address: '', isDefault: false });
                        setShowBranchForm(false);
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Branch Name *</label>
                      <input
                        type="text"
                        value={editingBranch?.name || newBranch.name}
                        onChange={(e) => {
                          if (editingBranch) {
                            setEditingBranch({ ...editingBranch, name: e.target.value });
                          } else {
                            setNewBranch({ ...newBranch, name: e.target.value });
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                        placeholder="e.g., Johannesburg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Code</label>
                      <input
                        type="text"
                        value={editingBranch?.code || newBranch.code}
                        onChange={(e) => {
                          if (editingBranch) {
                            setEditingBranch({ ...editingBranch, code: e.target.value });
                          } else {
                            setNewBranch({ ...newBranch, code: e.target.value });
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                        placeholder="e.g., JHB"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Job Number Code</label>
                      <input
                        type="text"
                        value={editingBranch?.jobNumberCode || newBranch.jobNumberCode}
                        onChange={(e) => {
                          if (editingBranch) {
                            setEditingBranch({ ...editingBranch, jobNumberCode: e.target.value });
                          } else {
                            setNewBranch({ ...newBranch, jobNumberCode: e.target.value });
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                        placeholder="e.g., J"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Address</label>
                      <input
                        type="text"
                        value={editingBranch?.address || newBranch.address}
                        onChange={(e) => {
                          if (editingBranch) {
                            setEditingBranch({ ...editingBranch, address: e.target.value });
                          } else {
                            setNewBranch({ ...newBranch, address: e.target.value });
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                        placeholder="Branch address"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isDefaultBranch"
                      checked={editingBranch?.isDefault || newBranch.isDefault}
                      onChange={(e) => {
                        if (editingBranch) {
                          setEditingBranch({ ...editingBranch, isDefault: e.target.checked });
                        } else {
                          setNewBranch({ ...newBranch, isDefault: e.target.checked });
                        }
                      }}
                      className="w-4 h-4 text-ars-primary border-gray-300 rounded focus:ring-ars-primary"
                    />
                    <label htmlFor="isDefaultBranch" className="text-sm font-semibold text-ars-body">
                      Default Branch
                    </label>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={editingBranch ? handleUpdateBranch : handleCreateBranch}
                      disabled={loading}
                      className="px-4 py-2.5 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {editingBranch ? 'UPDATE' : 'CREATE'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingBranch(null);
                        setNewBranch({ name: '', code: '', jobNumberCode: '', address: '', isDefault: false });
                        setShowBranchForm(false);
                      }}
                      className="px-4 py-2.5 border border-gray-300 rounded-[8px] font-bold text-[14px] hover:bg-gray-50 transition-colors"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}

              {/* Branches List */}
              <div className="space-y-2">
                {branches.map((branch) => (
                  <div
                    key={branch._id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-ars-heading">{branch.name}</span>
                        {branch.code && (
                          <span className="px-2 py-1 text-xs font-medium rounded-lg bg-blue-100 text-blue-700">
                            {branch.code}
                          </span>
                        )}
                        {branch.jobNumberCode && (
                          <span className="px-2 py-1 text-xs font-medium rounded-lg bg-purple-100 text-purple-700">
                            Job Code: {branch.jobNumberCode}
                          </span>
                        )}
                        {branch.isDefault && (
                          <span className="px-2 py-1 text-xs font-medium rounded-lg bg-green-100 text-green-700">
                            Default
                          </span>
                        )}
                      </div>
                      {branch.address && (
                        <p className="text-sm text-ars-body mt-1">{branch.address}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingBranch(branch);
                          setShowBranchForm(false);
                        }}
                        className="p-2 text-ars-primary hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit branch"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBranch(branch._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete branch"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {branches.length === 0 && (
                  <p className="text-center text-ars-body py-8">No branches found. Click "Add Branch" to create one.</p>
                )}
              </div>
                </>
              )}
            </div>

            {/* Rep Codes Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <button
                onClick={() => setIsRepCodesExpanded(!isRepCodesExpanded)}
                className="w-full flex items-center gap-2 text-xl font-bold text-ars-heading hover:text-ars-primary transition-colors"
              >
                {isRepCodesExpanded ? <ChevronUp className="w-6 h-6 text-ars-primary" /> : <ChevronDown className="w-6 h-6 text-ars-primary" />}
                <Key className="w-6 h-6 text-ars-primary" />
                Rep Codes
              </button>

              {isRepCodesExpanded && (
                <>
              <div className="mt-5 mb-4">
                <button
                  onClick={() => {
                    setEditingRepCode(null);
                    setNewRepCode({ code: '', description: '', adminCode: '', branch: '' });
                    setShowRepCodeForm(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  ADD REP CODE
                </button>
              </div>
              {/* Add/Edit Rep Code Form */}
              {(editingRepCode || showRepCodeForm) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-ars-heading">
                      {editingRepCode ? 'Edit Rep Code' : 'New Rep Code'}
                    </h4>
                    <button
                      onClick={() => {
                        setEditingRepCode(null);
                        setNewRepCode({ code: '', description: '', adminCode: '', branch: '' });
                        setShowRepCodeForm(false);
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Code *</label>
                      <input
                        type="text"
                        value={editingRepCode?.code || newRepCode.code}
                        onChange={(e) => {
                          if (editingRepCode) {
                            setEditingRepCode({ ...editingRepCode, code: e.target.value.toUpperCase() });
                          } else {
                            setNewRepCode({ ...newRepCode, code: e.target.value.toUpperCase() });
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                        placeholder="e.g., AP001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Description</label>
                      <input
                        type="text"
                        value={editingRepCode?.description || newRepCode.description}
                        onChange={(e) => {
                          if (editingRepCode) {
                            setEditingRepCode({ ...editingRepCode, description: e.target.value });
                          } else {
                            setNewRepCode({ ...newRepCode, description: e.target.value });
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                        placeholder="Optional description"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-ars-body mb-2">
                        Linked Admin Code
                        {editingRepCode?.adminCode && (
                          <span className="ml-2 text-xs text-orange-600 font-normal">
                            (To change admin, unlink first then link to new admin)
                          </span>
                        )}
                      </label>
                      <select
                        value={editingRepCode?.adminCode || newRepCode.adminCode || ''}
                        onChange={(e) => {
                          if (editingRepCode) {
                            setEditingRepCode({ ...editingRepCode, adminCode: e.target.value });
                          } else {
                            setNewRepCode({ ...newRepCode, adminCode: e.target.value });
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                      >
                        <option value="">No admin linked (can be linked later)</option>
                        {adminCodes.filter(ac => ac.isActive).map((adminCode) => (
                          <option key={adminCode._id} value={adminCode.code}>
                            {adminCode.code} {adminCode.description ? `- ${adminCode.description}` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Multiple reps can be linked to the same admin. Once linked, rep cannot be changed to another admin without unlinking first.
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-ars-body mb-2">
                        Linked Branch
                      </label>
                      <select
                        value={(editingRepCode?.branch?._id || editingRepCode?.branch || newRepCode.branch || '') as string}
                        onChange={(e) => {
                          if (editingRepCode) {
                            const selectedBranch = branches.find(b => b._id === e.target.value);
                            setEditingRepCode({ 
                              ...editingRepCode, 
                              branch: (selectedBranch || e.target.value) as any 
                            });
                          } else {
                            setNewRepCode({ ...newRepCode, branch: e.target.value });
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                      >
                        <option value="">No branch linked (can be linked later)</option>
                        {branches.filter(b => b.isActive).map((branch) => (
                          <option key={branch._id} value={branch._id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Link this rep to a specific branch. The branch will auto-populate when creating jobs.
                      </p>
                    </div>
                  </div>
                  {editingRepCode && (
                    <div className="mt-4 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="rep-code-active"
                        checked={editingRepCode.isActive}
                        onChange={(e) => setEditingRepCode({ ...editingRepCode, isActive: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-ars-primary focus:ring-ars-primary"
                      />
                      <label htmlFor="rep-code-active" className="text-sm text-ars-body cursor-pointer">
                        Active
                      </label>
                    </div>
                  )}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={editingRepCode ? handleUpdateRepCode : handleCreateRepCode}
                      disabled={loading}
                      className="px-4 py-2.5 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {editingRepCode ? 'UPDATE' : 'CREATE'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingRepCode(null);
                        setNewRepCode({ code: '', description: '', adminCode: '', branch: '' });
                        setShowRepCodeForm(false);
                      }}
                      className="px-4 py-2.5 border border-gray-300 rounded-[8px] font-bold text-[14px] hover:bg-gray-50 transition-colors"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}

              {/* Rep Codes List */}
              <div className="space-y-2">
                {repCodes.map((repCode) => (
                  <div
                    key={repCode._id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-semibold text-ars-heading">{repCode.code}</span>
                        {repCode.description && (
                          <span className="text-sm text-ars-body">- {repCode.description}</span>
                        )}
                        {repCode.adminCode && (
                          <span className="px-2 py-1 text-xs font-medium rounded-lg bg-purple-100 text-purple-700">
                            Admin: {repCode.adminCode}
                          </span>
                        )}
                        {repCode.branch && (
                          <span className="px-2 py-1 text-xs font-medium rounded-lg bg-blue-100 text-blue-700">
                            Branch: {typeof repCode.branch === 'object' ? repCode.branch.name : repCode.branch}
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                          repCode.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {repCode.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingRepCode(repCode);
                          setShowRepCodeForm(false);
                        }}
                        className="p-2 text-ars-primary hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit rep code"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRepCode(repCode._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete rep code"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {repCodes.length === 0 && (
                  <p className="text-center text-ars-body py-8">No rep codes found. Click "Add Rep Code" to create one.</p>
                )}
              </div>
                </>
              )}
            </div>

            {/* Admin Codes Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <button
                onClick={() => setIsAdminCodesExpanded(!isAdminCodesExpanded)}
                className="w-full flex items-center gap-2 text-xl font-bold text-ars-heading hover:text-ars-primary transition-colors"
              >
                {isAdminCodesExpanded ? <ChevronUp className="w-6 h-6 text-ars-primary" /> : <ChevronDown className="w-6 h-6 text-ars-primary" />}
                <Shield className="w-6 h-6 text-ars-primary" />
                Admin Codes (ADM)
              </button>
              {isAdminCodesExpanded && (
                <>
              <p className="mt-5 text-sm text-ars-body mb-4">
                Admin codes are used in jobs. Link them to users to track which admin is responsible for each code.
              </p>

              <div className="mb-4">
                <button
                  onClick={() => {
                    setEditingAdminCode(null);
                    setNewAdminCode({ code: '', description: '', userId: '' });
                    setShowAdminCodeForm(!showAdminCodeForm);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  ADD ADMIN CODE
                </button>
              </div>

              {/* Admin Code Form */}
              {(showAdminCodeForm || editingAdminCode) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h4 className="text-lg font-semibold text-ars-heading mb-4">
                    {editingAdminCode ? 'Edit Admin Code' : 'Create New Admin Code'}
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">
                        Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editingAdminCode ? editingAdminCode.code : newAdminCode.code}
                        onChange={(e) => {
                          if (editingAdminCode) {
                            setEditingAdminCode({ ...editingAdminCode, code: e.target.value.toUpperCase() });
                          } else {
                            setNewAdminCode({ ...newAdminCode, code: e.target.value.toUpperCase() });
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                        placeholder="e.g., AS, ER, HT"
                        maxLength={10}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Description</label>
                      <input
                        type="text"
                        value={editingAdminCode ? editingAdminCode.description || '' : newAdminCode.description}
                        onChange={(e) => {
                          if (editingAdminCode) {
                            setEditingAdminCode({ ...editingAdminCode, description: e.target.value });
                          } else {
                            setNewAdminCode({ ...newAdminCode, description: e.target.value });
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                        placeholder="Optional description"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Linked User</label>
                      <select
                        value={editingAdminCode ? editingAdminCode.user?._id || '' : newAdminCode.userId}
                        onChange={(e) => {
                          if (editingAdminCode) {
                            setEditingAdminCode({
                              ...editingAdminCode,
                              user: e.target.value ? { _id: e.target.value, firstName: '', lastName: '', email: '' } : undefined,
                            });
                          } else {
                            setNewAdminCode({ ...newAdminCode, userId: e.target.value });
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                      >
                        <option value="">No user linked</option>
                        {users.map((user) => (
                          <option key={user._id} value={user._id}>
                            {user.firstName} {user.lastName} ({user.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {editingAdminCode && (
                    <div className="mt-4 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="admin-code-active"
                        checked={editingAdminCode.isActive}
                        onChange={(e) => setEditingAdminCode({ ...editingAdminCode, isActive: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-ars-primary focus:ring-ars-primary"
                      />
                      <label htmlFor="admin-code-active" className="text-sm text-ars-body cursor-pointer">
                        Active
                      </label>
                    </div>
                  )}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={editingAdminCode ? handleUpdateAdminCode : handleCreateAdminCode}
                      disabled={loading}
                      className="px-4 py-2.5 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {editingAdminCode ? 'UPDATE' : 'CREATE'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingAdminCode(null);
                        setNewAdminCode({ code: '', description: '', userId: '' });
                        setShowAdminCodeForm(false);
                      }}
                      className="px-4 py-2.5 border border-gray-300 rounded-[8px] font-bold text-[14px] hover:bg-gray-50 transition-colors"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}

              {/* Admin Codes List */}
              <div className="space-y-2">
                {adminCodes.map((adminCode) => (
                  <div
                    key={adminCode._id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-ars-heading">{adminCode.code}</span>
                        {adminCode.description && (
                          <span className="text-sm text-ars-body">- {adminCode.description}</span>
                        )}
                        {adminCode.user && (
                          <span className="text-sm text-ars-body">
                            (User: {adminCode.user.firstName} {adminCode.user.lastName})
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                          adminCode.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {adminCode.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingAdminCode(adminCode);
                          setShowAdminCodeForm(false);
                        }}
                        className="p-2 text-ars-primary hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit admin code"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAdminCode(adminCode._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete admin code"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {adminCodes.length === 0 && (
                  <p className="text-center text-ars-body py-8">No admin codes found. Click "Add Admin Code" to create one.</p>
                )}
              </div>
                </>
              )}
            </div>

            {/* Technicians Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <button
                onClick={() => setIsTechniciansExpanded(!isTechniciansExpanded)}
                className="w-full flex items-center gap-2 text-xl font-bold text-ars-heading hover:text-ars-primary transition-colors"
              >
                {isTechniciansExpanded ? <ChevronUp className="w-6 h-6 text-ars-primary" /> : <ChevronDown className="w-6 h-6 text-ars-primary" />}
                <Users className="w-6 h-6 text-ars-primary" />
                Technicians
              </button>
              {isTechniciansExpanded && (
                <>
              <p className="mt-5 text-sm text-ars-body mb-4">
                Manage technicians who can be assigned to jobs.
              </p>

              <div className="mb-4">
                <button
                  onClick={() => {
                    setEditingTechnician(null);
                    setNewTechnician({ name: '', email: '', phone: '', userId: '' });
                    setShowTechnicianForm(!showTechnicianForm);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  ADD TECHNICIAN
                </button>
              </div>

              {/* Technician Form */}
              {(showTechnicianForm || editingTechnician) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h4 className="text-lg font-semibold text-ars-heading mb-4">
                    {editingTechnician ? 'Edit Technician' : 'Create New Technician'}
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editingTechnician ? editingTechnician.name : newTechnician.name}
                        onChange={(e) => {
                          if (editingTechnician) {
                            setEditingTechnician({ ...editingTechnician, name: e.target.value });
                          } else {
                            setNewTechnician({ ...newTechnician, name: e.target.value });
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                        placeholder="e.g., John Smith"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Email</label>
                      <input
                        type="email"
                        value={editingTechnician ? editingTechnician.email || '' : newTechnician.email}
                        onChange={(e) => {
                          if (editingTechnician) {
                            setEditingTechnician({ ...editingTechnician, email: e.target.value });
                          } else {
                            setNewTechnician({ ...newTechnician, email: e.target.value });
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                        placeholder="technician@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Phone</label>
                      <input
                        type="tel"
                        value={editingTechnician ? editingTechnician.phone || '' : newTechnician.phone}
                        onChange={(e) => {
                          if (editingTechnician) {
                            setEditingTechnician({ ...editingTechnician, phone: e.target.value });
                          } else {
                            setNewTechnician({ ...newTechnician, phone: e.target.value });
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Linked User</label>
                      <select
                        value={editingTechnician ? editingTechnician.user?._id || '' : newTechnician.userId}
                        onChange={(e) => {
                          if (editingTechnician) {
                            setEditingTechnician({
                              ...editingTechnician,
                              user: e.target.value ? { _id: e.target.value, firstName: '', lastName: '', email: '' } : undefined,
                            });
                          } else {
                            setNewTechnician({ ...newTechnician, userId: e.target.value });
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                      >
                        <option value="">No user linked</option>
                        {users.map((user) => (
                          <option key={user._id} value={user._id}>
                            {user.firstName} {user.lastName} ({user.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {editingTechnician && (
                    <div className="mt-4 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="technician-active"
                        checked={editingTechnician.isActive}
                        onChange={(e) => setEditingTechnician({ ...editingTechnician, isActive: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-ars-primary focus:ring-ars-primary"
                      />
                      <label htmlFor="technician-active" className="text-sm text-ars-body cursor-pointer">
                        Active
                      </label>
                    </div>
                  )}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={editingTechnician ? handleUpdateTechnician : handleCreateTechnician}
                      disabled={loading}
                      className="px-4 py-2.5 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {editingTechnician ? 'UPDATE' : 'CREATE'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingTechnician(null);
                        setNewTechnician({ name: '', email: '', phone: '', userId: '' });
                        setShowTechnicianForm(false);
                      }}
                      className="px-4 py-2.5 border border-gray-300 rounded-[8px] font-bold text-[14px] hover:bg-gray-50 transition-colors"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}

              {/* Technicians List */}
              <div className="space-y-2">
                {technicians.map((technician) => (
                  <div
                    key={technician._id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-ars-heading">{technician.name}</span>
                        {technician.email && (
                          <span className="text-sm text-ars-body">({technician.email})</span>
                        )}
                        {technician.phone && (
                          <span className="text-sm text-ars-body">| {technician.phone}</span>
                        )}
                        {technician.user && (
                          <span className="text-sm text-ars-body">
                            - User: {technician.user.firstName} {technician.user.lastName}
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                          technician.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {technician.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingTechnician(technician);
                          setShowTechnicianForm(false);
                        }}
                        className="p-2 text-ars-primary hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit technician"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTechnician(technician._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete technician"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {technicians.length === 0 && (
                  <p className="text-center text-ars-body py-8">No technicians found. Click "Add Technician" to create one.</p>
                )}
              </div>
                </>
              )}
            </div>

            {/* Service Descriptions Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <button
                onClick={() => setIsDescriptionsExpanded(!isDescriptionsExpanded)}
                className="w-full flex items-center gap-2 text-xl font-bold text-ars-heading hover:text-ars-primary transition-colors"
              >
                {isDescriptionsExpanded ? <ChevronUp className="w-6 h-6 text-ars-primary" /> : <ChevronDown className="w-6 h-6 text-ars-primary" />}
                <FileText className="w-6 h-6 text-ars-primary" />
                Service Descriptions
              </button>
              {isDescriptionsExpanded && (
                <>
              <p className="mt-5 text-sm text-ars-body mb-4">
                Manage service descriptions for job categorization.
              </p>

              <div className="mb-4">
                <button
                  onClick={() => {
                    setEditingDescription(null);
                    setNewDescription({ name: '', description: '' });
                    setShowDescriptionForm(!showDescriptionForm);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  ADD DESCRIPTION
                </button>
              </div>

              {/* Description Form */}
              {(showDescriptionForm || editingDescription) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h4 className="text-lg font-semibold text-ars-heading mb-4">
                    {editingDescription ? 'Edit Service Description' : 'Create New Service Description'}
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editingDescription ? editingDescription.name : newDescription.name}
                        onChange={(e) => {
                          if (editingDescription) {
                            setEditingDescription({ ...editingDescription, name: e.target.value });
                          } else {
                            setNewDescription({ ...newDescription, name: e.target.value });
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                        placeholder="e.g., Air Audit, Parts Supply"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Description</label>
                      <textarea
                        value={editingDescription ? editingDescription.description || '' : newDescription.description}
                        onChange={(e) => {
                          if (editingDescription) {
                            setEditingDescription({ ...editingDescription, description: e.target.value });
                          } else {
                            setNewDescription({ ...newDescription, description: e.target.value });
                          }
                        }}
                        rows={3}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                        placeholder="Optional detailed description"
                      />
                    </div>
                  </div>
                  {editingDescription && (
                    <div className="mt-4 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="description-active"
                        checked={editingDescription.isActive}
                        onChange={(e) => setEditingDescription({ ...editingDescription, isActive: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-ars-primary focus:ring-ars-primary"
                      />
                      <label htmlFor="description-active" className="text-sm text-ars-body cursor-pointer">
                        Active
                      </label>
                    </div>
                  )}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={editingDescription ? handleUpdateDescription : handleCreateDescription}
                      disabled={loading}
                      className="px-4 py-2.5 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {editingDescription ? 'UPDATE' : 'CREATE'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingDescription(null);
                        setNewDescription({ name: '', description: '' });
                        setShowDescriptionForm(false);
                      }}
                      className="px-4 py-2.5 border border-gray-300 rounded-[8px] font-bold text-[14px] hover:bg-gray-50 transition-colors"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}

              {/* Descriptions List */}
              <div className="space-y-2">
                {descriptions.map((description) => (
                  <div
                    key={description._id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-ars-heading">{description.name}</span>
                        {description.description && (
                          <span className="text-sm text-ars-body">- {description.description}</span>
                        )}
                        <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                          description.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {description.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingDescription(description);
                          setShowDescriptionForm(false);
                        }}
                        className="p-2 text-ars-primary hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit description"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDescription(description._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete description"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {descriptions.length === 0 && (
                  <p className="text-center text-ars-body py-8">No service descriptions found. Click "Add Description" to create one.</p>
                )}
              </div>
                </>
              )}
            </div>

            {/* Job Sources Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <button
                onClick={() => setIsJobSourcesExpanded(!isJobSourcesExpanded)}
                className="w-full flex items-center gap-2 text-xl font-bold text-ars-heading hover:text-ars-primary transition-colors"
              >
                {isJobSourcesExpanded ? <ChevronUp className="w-6 h-6 text-ars-primary" /> : <ChevronDown className="w-6 h-6 text-ars-primary" />}
                <Tag className="w-6 h-6 text-ars-primary" />
                Job Sources
              </button>
              {isJobSourcesExpanded && (
                <>
              <p className="mt-5 text-sm text-ars-body mb-4">
                Manage job sources to track how jobs are acquired (e.g., Normal, Web Enquiry).
              </p>

              <div className="mb-4">
                <button
                  onClick={() => {
                    setEditingJobSource(null);
                    setNewJobSource({ name: '', description: '', isDefault: false });
                    setShowJobSourceForm(!showJobSourceForm);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  ADD JOB SOURCE
                </button>
              </div>

              {/* Job Source Form */}
              {(showJobSourceForm || editingJobSource) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h4 className="text-lg font-semibold text-ars-heading mb-4">
                    {editingJobSource ? 'Edit Job Source' : 'Create New Job Source'}
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editingJobSource ? editingJobSource.name : newJobSource.name}
                        onChange={(e) => {
                          if (editingJobSource) {
                            setEditingJobSource({ ...editingJobSource, name: e.target.value });
                          } else {
                            setNewJobSource({ ...newJobSource, name: e.target.value });
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                        placeholder="e.g., Normal, Web Enquiry, Phone"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Description</label>
                      <textarea
                        value={editingJobSource ? editingJobSource.description || '' : newJobSource.description}
                        onChange={(e) => {
                          if (editingJobSource) {
                            setEditingJobSource({ ...editingJobSource, description: e.target.value });
                          } else {
                            setNewJobSource({ ...newJobSource, description: e.target.value });
                          }
                        }}
                        rows={3}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                        placeholder="Optional description of this job source"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="jobsource-default"
                        checked={editingJobSource ? editingJobSource.isDefault || false : newJobSource.isDefault}
                        onChange={(e) => {
                          if (editingJobSource) {
                            setEditingJobSource({ ...editingJobSource, isDefault: e.target.checked });
                          } else {
                            setNewJobSource({ ...newJobSource, isDefault: e.target.checked });
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-ars-primary focus:ring-ars-primary"
                      />
                      <label htmlFor="jobsource-default" className="text-sm text-ars-body cursor-pointer">
                        Set as default for new jobs
                      </label>
                    </div>
                  </div>
                  {editingJobSource && (
                    <div className="mt-4 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="jobsource-active"
                        checked={editingJobSource.isActive}
                        onChange={(e) => setEditingJobSource({ ...editingJobSource, isActive: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-ars-primary focus:ring-ars-primary"
                      />
                      <label htmlFor="jobsource-active" className="text-sm text-ars-body cursor-pointer">
                        Active
                      </label>
                    </div>
                  )}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={editingJobSource ? handleUpdateJobSource : handleCreateJobSource}
                      disabled={loading}
                      className="px-4 py-2.5 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {editingJobSource ? 'UPDATE' : 'CREATE'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingJobSource(null);
                        setNewJobSource({ name: '', description: '', isDefault: false });
                        setShowJobSourceForm(false);
                      }}
                      className="px-4 py-2.5 border border-gray-300 rounded-[8px] font-bold text-[14px] hover:bg-gray-50 transition-colors"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}

              {/* Job Sources List */}
              <div className="space-y-2">
                {jobSources.map((source) => (
                  <div
                    key={source._id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-ars-heading">{source.name}</span>
                        {source.description && (
                          <span className="text-sm text-ars-body">- {source.description}</span>
                        )}
                        {source.isDefault && (
                          <span className="px-2 py-1 text-xs font-medium rounded-lg bg-blue-100 text-blue-700">
                            Default
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                          source.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {source.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingJobSource(source);
                          setShowJobSourceForm(false);
                        }}
                        className="p-2 text-ars-primary hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit job source"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {!source.isDefault && (
                        <button
                          onClick={() => handleDeleteJobSource(source._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete job source"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {jobSources.length === 0 && (
                  <p className="text-center text-ars-body py-8">No job sources found. Click "Add Job Source" to create one.</p>
                )}
              </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Changelog Tab */}
        {activeTab === 'changelog' && (
          <div className="space-y-6">
            <ChangelogViewer />
          </div>
        )}
      </div>

      {/* Invite User Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white p-6 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Invite New User</h2>
                <button
                  onClick={() => setShowInviteForm(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Basic User Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">Email *</label>
                  <input
                    type="email"
                    value={inviteFormData.email}
                    onChange={(e) => setInviteFormData({ ...inviteFormData, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">Role *</label>
                  <select
                    value={inviteFormData.role}
                    onChange={(e) => setInviteFormData({ ...inviteFormData, role: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                  >
                    <option value="">Select Role</option>
                    {roles.map((role) => (
                      <option key={role._id} value={role._id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">First Name *</label>
                  <input
                    type="text"
                    value={inviteFormData.firstName}
                    onChange={(e) => setInviteFormData({ ...inviteFormData, firstName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ars-body mb-2">Last Name *</label>
                  <input
                    type="text"
                    value={inviteFormData.lastName}
                    onChange={(e) => setInviteFormData({ ...inviteFormData, lastName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                    placeholder="Doe"
                  />
                </div>
              </div>

              {/* Role-Specific Fields */}
              {(() => {
                const selectedRole = roles.find(r => r._id === inviteFormData.role);
                const roleName = selectedRole?.name?.toLowerCase() || '';

                if (roleName === 'admin') {
                  return (
                    <div className="space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <h3 className="font-semibold text-ars-heading">Admin Code *</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-ars-body mb-2">Select Existing AdminCode</label>
                          <select
                            value={inviteFormData.adminCodeId}
                            onChange={(e) => setInviteFormData({ 
                              ...inviteFormData, 
                              adminCodeId: e.target.value,
                              adminCode: { code: '', description: '' }
                            })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                          >
                            <option value="">Select AdminCode (or create new below)</option>
                            {adminCodes.filter(ac => ac.isActive).map((ac) => (
                              <option key={ac._id} value={ac._id}>
                                {ac.code} {ac.description ? `- ${ac.description}` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="text-center text-sm text-gray-500">OR</div>
                        <div>
                          <label className="block text-sm font-medium text-ars-body mb-2">Create New AdminCode</label>
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={inviteFormData.adminCode.code}
                              onChange={(e) => setInviteFormData({ 
                                ...inviteFormData, 
                                adminCode: { ...inviteFormData.adminCode, code: e.target.value },
                                adminCodeId: ''
                              })}
                              className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                              placeholder="Code (e.g., AS)"
                            />
                            <input
                              type="text"
                              value={inviteFormData.adminCode.description}
                              onChange={(e) => setInviteFormData({ 
                                ...inviteFormData, 
                                adminCode: { ...inviteFormData.adminCode, description: e.target.value }
                              })}
                              className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                              placeholder="Description (optional)"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else if (roleName === 'rep') {
                  return (
                    <div className="space-y-4 p-4 bg-green-50 rounded-xl border border-green-200">
                      <h3 className="font-semibold text-ars-heading">Rep Code *</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-ars-body mb-2">Select Existing RepCode</label>
                          <select
                            value={inviteFormData.repCodeId}
                            onChange={(e) => setInviteFormData({ 
                              ...inviteFormData, 
                              repCodeId: e.target.value,
                              repCode: { code: '', description: '' }
                            })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                          >
                            <option value="">Select RepCode (or create new below)</option>
                            {repCodes.filter(rc => rc.isActive).map((rc) => (
                              <option key={rc._id} value={rc._id}>
                                {rc.code} {rc.description ? `- ${rc.description}` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="text-center text-sm text-gray-500">OR</div>
                        <div>
                          <label className="block text-sm font-medium text-ars-body mb-2">Create New RepCode</label>
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={inviteFormData.repCode.code}
                              onChange={(e) => setInviteFormData({ 
                                ...inviteFormData, 
                                repCode: { ...inviteFormData.repCode, code: e.target.value },
                                repCodeId: ''
                              })}
                              className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                              placeholder="Code (e.g., AP001)"
                            />
                            <input
                              type="text"
                              value={inviteFormData.repCode.description}
                              onChange={(e) => setInviteFormData({ 
                                ...inviteFormData, 
                                repCode: { ...inviteFormData.repCode, description: e.target.value }
                              })}
                              className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                              placeholder="Description (optional)"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else if (roleName === 'technician') {
                  return (
                    <div className="space-y-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
                      <h3 className="font-semibold text-ars-heading">Technician *</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-ars-body mb-2">Select Existing Technician</label>
                          <select
                            value={inviteFormData.technicianId}
                            onChange={(e) => setInviteFormData({ 
                              ...inviteFormData, 
                              technicianId: e.target.value,
                              technician: { name: '', email: '', phone: '' }
                            })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                          >
                            <option value="">Select Technician (or create new below)</option>
                            {technicians.filter(t => t.isActive).map((t) => (
                              <option key={t._id} value={t._id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="text-center text-sm text-gray-500">OR</div>
                        <div>
                          <label className="block text-sm font-medium text-ars-body mb-2">Create New Technician</label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input
                              type="text"
                              value={inviteFormData.technician.name}
                              onChange={(e) => setInviteFormData({ 
                                ...inviteFormData, 
                                technician: { ...inviteFormData.technician, name: e.target.value },
                                technicianId: ''
                              })}
                              className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                              placeholder="Name *"
                            />
                            <input
                              type="email"
                              value={inviteFormData.technician.email}
                              onChange={(e) => setInviteFormData({ 
                                ...inviteFormData, 
                                technician: { ...inviteFormData.technician, email: e.target.value }
                              })}
                              className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                              placeholder="Email (optional)"
                            />
                            <input
                              type="tel"
                              value={inviteFormData.technician.phone}
                              onChange={(e) => setInviteFormData({ 
                                ...inviteFormData, 
                                technician: { ...inviteFormData.technician, phone: e.target.value }
                              })}
                              className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent text-[15px]"
                              placeholder="Phone (optional)"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else if (roleName === 'manager') {
                  return (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-sm text-ars-body">Manager role selected. No additional configuration required.</p>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Location Tracking Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">GPS Location Tracking</p>
                    <p className="text-xs text-gray-500">Enable real-time GPS tracking for this user</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInviteFormData({ ...inviteFormData, locationTrackingEnabled: !inviteFormData.locationTrackingEnabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    inviteFormData.locationTrackingEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    inviteFormData.locationTrackingEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowInviteForm(false)}
                  className="px-6 py-3 border border-gray-300 rounded-xl font-bold text-[14px] text-ars-body hover:bg-gray-50 transition-colors"
                  disabled={inviting}
                >
                  CANCEL
                </button>
                <button
                  onClick={handleInviteUser}
                  disabled={inviting}
                  className="px-6 py-3 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviting ? 'INVITING...' : 'SEND INVITATION'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

