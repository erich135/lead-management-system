/**
 * Reports component for displaying comprehensive user and customer analytics.
 * Split into User Performance Reports and Customer Reports sections.
 * Supports role-based filtering and export functionality.
 */
import { useState, useEffect } from 'react';
import { 
  getJobs, 
  getActivities, 
  getUsers, 
  getCustomers, 
  getOverdueJobs,
  getAdminCodes,
  getRepCodes,
  getTechnicians,
  getMachines,
  Job, 
  Activity,
  User,
  Customer,
  AdminCode,
  RepCode,
  Technician,
  Machine,
  OverdueJob
} from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatDateTime } from '../utils/dateFormat';
import { 
  Download, 
  Filter, 
  TrendingUp, 
  Banknote,
  Search,
  Calendar,
  User as UserIcon,
  Users,
  Building2,
  Wrench,
  FileText,
  Clock,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Edit2,
  Send,
  X
} from 'lucide-react';
import { LeadDetails } from './LeadDetails';
import { HelpIcon } from './ui';
import { helpContent } from '../config/helpContent';

interface ReportsProps {
  statuses: any[];
  branches: any[];
}

type ReportTab = 'user-performance' | 'customer' | 'machine';

type UserRole = 'admin' | 'rep' | 'technician';

type DateRangePreset = 'today' | 'this-month' | 'last-month' | 'all-time' | 'custom';

type UserPerformanceSection = 'overdue' | 'jobs' | 'activities' | 'conversion';

type StatsPanelType = 
  | 'user-total-jobs' 
  | 'user-overdue-jobs' 
  | 'customer-invoiced' 
  | 'customer-quoted' 
  | 'customer-in-progress' 
  | null;

export function Reports({ statuses, branches }: ReportsProps) {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportTab>('user-performance');
  
  // User Performance Report State
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedAdminCode, setSelectedAdminCode] = useState<string>('');
  const [selectedRepCode, setSelectedRepCode] = useState<string>('');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('this-month');
  const [customDateFrom, setCustomDateFrom] = useState<string>('');
  
  // Section selector for User Performance
  const [activeSection, setActiveSection] = useState<UserPerformanceSection>('overdue');
  const [customDateTo, setCustomDateTo] = useState<string>('');
  
  // Customer Report State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  
  // Machine Report State
  const [machineMakeFilter, setMachineMakeFilter] = useState<string>('');
  const [machineModelFilter, setMachineModelFilter] = useState<string>('');
  const [machineSerialFilter, setMachineSerialFilter] = useState<string>('');
  
  // Overdue Jobs Filters
  const [overdueStatusFilter, setOverdueStatusFilter] = useState<string>('');
  const [overdueAdminFilter, setOverdueAdminFilter] = useState<string>('');
  const [overdueRepFilter, setOverdueRepFilter] = useState<string>('');
  const [overdueBranchFilter, setOverdueBranchFilter] = useState<string>('');
  const [overdueStatusChangedFrom, setOverdueStatusChangedFrom] = useState<string>('');
  const [overdueStatusChangedTo, setOverdueStatusChangedTo] = useState<string>('');
  
  // All Jobs Filters
  const [jobsStatusFilter, setJobsStatusFilter] = useState<string>('');
  const [jobsAdminFilter, setJobsAdminFilter] = useState<string>('');
  const [jobsRepFilter, setJobsRepFilter] = useState<string>('');
  const [jobsBranchFilter, setJobsBranchFilter] = useState<string>('');
  const [jobsStatusChangedFrom, setJobsStatusChangedFrom] = useState<string>('');
  const [jobsStatusChangedTo, setJobsStatusChangedTo] = useState<string>('');
  
  // Conversion Time Tracker State
  const [conversionAdminFilter, setConversionAdminFilter] = useState<string>('');
  const [conversionRepFilter, setConversionRepFilter] = useState<string>('');
  const [conversionBranchFilter, setConversionBranchFilter] = useState<string>('');
  const [conversionDateFrom, setConversionDateFrom] = useState<string>('');
  const [conversionDateTo, setConversionDateTo] = useState<string>('');
  const [conversionCompleteOnly, setConversionCompleteOnly] = useState<boolean>(false); // Only show jobs with complete workflow
  
  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [adminCodes, setAdminCodes] = useState<AdminCode[]>([]);
  const [repCodes, setRepCodes] = useState<RepCode[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [userJobs, setUserJobs] = useState<Job[]>([]);
  const [userActivities, setUserActivities] = useState<Activity[]>([]);
  const [userOverdueJobs, setUserOverdueJobs] = useState<OverdueJob[]>([]);
  const [customerJobs, setCustomerJobs] = useState<Job[]>([]);
  const [customerMachines, setCustomerMachines] = useState<Machine[]>([]);
  const [customerActivities, setCustomerActivities] = useState<Activity[]>([]);
  const [allMachines, setAllMachines] = useState<Machine[]>([]);
  const [machineJobs, setMachineJobs] = useState<Job[]>([]);
  const [conversionJobs, setConversionJobs] = useState<Job[]>([]);
  const [allConversionJobs, setAllConversionJobs] = useState<Job[]>([]); // Unfiltered for dropdown population
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  
  // Stats panel slide-out state
  const [statsPanelType, setStatsPanelType] = useState<StatsPanelType>(null);

  /**
   * Loads initial reference data.
   */
  useEffect(() => {
    loadReferenceData();
  }, []);

  /**
   * Loads user performance data when filters change.
   */
  useEffect(() => {
    if (activeTab === 'user-performance') {
      loadUserPerformanceData();
    }
  }, [activeTab, selectedRole, selectedUserId, selectedAdminCode, selectedRepCode, selectedTechnician, dateRangePreset, customDateFrom, customDateTo]);

  /**
   * Loads customer data when customer is selected.
   */
  useEffect(() => {
    if (activeTab === 'customer' && selectedCustomerId) {
      loadCustomerData();
    }
  }, [activeTab, selectedCustomerId, dateRangePreset, customDateFrom, customDateTo]);

  /**
   * Loads machine data when machine tab is active or filters change.
   */
  useEffect(() => {
    if (activeTab === 'machine') {
      loadMachineData();
    }
  }, [activeTab, machineMakeFilter, machineModelFilter, machineSerialFilter]);

  /**
   * Loads conversion data initially with all jobs.
   */
  useEffect(() => {
    loadConversionData();
  }, []);

  /**
   * Loads reference data (users, codes, technicians, customers).
   */
  async function loadReferenceData() {
    try {
      setLoading(true);
      
      // Load users (for super admin)
      if (currentUser?.isSuperAdmin) {
        const usersResponse = await getUsers({ limit: 1000 });
        setUsers(usersResponse.users || []);
      } else {
        // For non-super admin, set current user
        setUsers([{
          _id: currentUser?.id || '',
          email: currentUser?.email || '',
          firstName: currentUser?.firstName || '',
          lastName: currentUser?.lastName || '',
          role: currentUser?.role || { _id: '', name: '', isActive: true },
          permissions: currentUser?.permissions || [],
          isActive: true,
          createdAt: '',
          updatedAt: '',
        }]);
      }

      // Load admin codes
      const adminCodesResponse = await getAdminCodes();
      setAdminCodes(adminCodesResponse.adminCodes || []);

      // Load rep codes
      const repCodesResponse = await getRepCodes();
      setRepCodes(repCodesResponse.repCodes || []);

      // Load technicians
      const techniciansResponse = await getTechnicians();
      setTechnicians(techniciansResponse.technicians || []);

      // Load customers
      const customersResponse = await getCustomers({ limit: 1000 });
      setCustomers(customersResponse.customers || []);

      // Auto-select current user's code/technician if not super admin
      if (!currentUser?.isSuperAdmin) {
        // This will be handled by the backend filtering, but we can set defaults here
        if (currentUser?.role?.name === 'admin') {
          // Find admin code for current user
          const userAdminCode = adminCodesResponse.adminCodes?.find(ac => ac.user?._id === currentUser.id);
          if (userAdminCode) {
            setSelectedAdminCode(userAdminCode._id);
            setSelectedRole('admin');
          }
        } else if (currentUser?.role?.name === 'rep') {
          const userRepCode = repCodesResponse.repCodes?.find(rc => rc.user?._id === currentUser.id);
          if (userRepCode) {
            setSelectedRepCode(userRepCode._id);
            setSelectedRole('rep');
          }
        } else if (currentUser?.role?.name === 'technician') {
          const userTechnician = techniciansResponse.technicians?.find(t => t.user?._id === currentUser.id);
          if (userTechnician) {
            setSelectedTechnician(userTechnician._id);
            setSelectedRole('technician');
          }
        }
      }
    } catch (err: any) {
      console.error('Error loading reference data:', err);
      setError(err.message || 'Failed to load reference data');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Gets date range based on preset.
   */
  function getDateRange(): { startDate: string; endDate: string } {
    const now = new Date();
    let startDate = '';
    let endDate = '';

    switch (dateRangePreset) {
      case 'today':
        startDate = now.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      case 'this-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'last-month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        break;
      case 'all-time':
        // Return empty dates to indicate all-time (no date filter)
        startDate = '';
        endDate = '';
        break;
      case 'custom':
        startDate = customDateFrom;
        endDate = customDateTo;
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Loads user performance data based on selected filters.
   */
  async function loadUserPerformanceData() {
    try {
      setLoading(true);
      setError(null);

      const { startDate, endDate } = getDateRange();
      if (!startDate || !endDate) {
        return;
      }

      // Build job filters based on role
      const jobFilters: any = {
        allTime: 'true',
        startDate,
        endDate,
        limit: 10000, // Get all jobs, not just 50
      };

      // Build activity filters
      const activityFilters: any = {
        startDate,
        endDate,
        limit: 1000,
      };

      if (selectedRole === 'admin' && selectedAdminCode) {
        const adminCode = adminCodes.find(ac => ac._id === selectedAdminCode);
        if (adminCode) {
          jobFilters.admin = adminCode.code;
          // Find user for this admin code
          const adminUser = users.find(u => u._id === adminCode.user?._id);
          if (adminUser) {
            activityFilters.userId = adminUser._id;
          }
        }
      } else if (selectedRole === 'rep' && selectedRepCode) {
        jobFilters.repCode = selectedRepCode;
        const repCode = repCodes.find(rc => rc._id === selectedRepCode);
        if (repCode) {
          const repUser = users.find(u => u._id === repCode.user?._id);
          if (repUser) {
            activityFilters.userId = repUser._id;
          }
        }
      } else if (selectedRole === 'technician' && selectedTechnician) {
        jobFilters.techBooked = selectedTechnician;
        const technician = technicians.find(t => t._id === selectedTechnician);
        if (technician) {
          const techUser = users.find(u => u._id === technician.user?._id);
          if (techUser) {
            activityFilters.userId = techUser._id;
          }
        }
      }

      // Load jobs
      const jobsResponse = await getJobs(jobFilters);
      setUserJobs(jobsResponse.jobs || []);

      // Load activities (optional - may fail if user doesn't have permission)
      try {
        const activitiesResponse = await getActivities(activityFilters);
        setUserActivities(activitiesResponse.activities || []);
      } catch (activitiesError: any) {
        // If activities.read permission is missing, just set empty array
        console.warn('Could not load activities (permission may be missing):', activitiesError.message);
        setUserActivities([]);
      }

      // Load overdue jobs
      const overdueResponse = await getOverdueJobs({ includeApproaching: true });
      // Filter overdue jobs by selected role
      let filteredOverdue = overdueResponse.jobs || [];
      if (selectedRole === 'admin' && selectedAdminCode) {
        const adminCode = adminCodes.find(ac => ac._id === selectedAdminCode);
        if (adminCode) {
          filteredOverdue = filteredOverdue.filter(oj => oj.job?.adm === adminCode.code);
        }
      } else if (selectedRole === 'rep' && selectedRepCode) {
        filteredOverdue = filteredOverdue.filter(oj => {
          const repCodeId = typeof oj.job?.repCode === 'object' && oj.job?.repCode !== null
            ? (oj.job.repCode as any)._id
            : oj.job?.repCode;
          return repCodeId === selectedRepCode;
        });
      } else if (selectedRole === 'technician' && selectedTechnician) {
        filteredOverdue = filteredOverdue.filter(oj => {
          const techId = typeof oj.job?.techBooked === 'object' && oj.job?.techBooked !== null
            ? (oj.job.techBooked as any)._id
            : oj.job?.techBooked;
          return techId === selectedTechnician;
        });
      }
      setUserOverdueJobs(filteredOverdue);

    } catch (err: any) {
      console.error('Error loading user performance data:', err);
      setError(err.message || 'Failed to load user performance data');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Loads conversion tracker data.
   */
  async function loadConversionData() {
    try {
      setLoading(true);
      setError(null);

      // Build job filters - only use date filters for API call
      const jobFilters: any = {
        allTime: 'true',
        limit: 10000, // Get all jobs
      };

      // Add date filters if specified
      if (conversionDateFrom) {
        jobFilters.startDate = conversionDateFrom;
      }
      if (conversionDateTo) {
        jobFilters.endDate = conversionDateTo;
      }

      // Load jobs
      const jobsResponse = await getJobs(jobFilters);
      const allJobs = jobsResponse.jobs || [];
      
      // Store all jobs for dropdown population (before filtering)
      setAllConversionJobs(allJobs);
      
      // Apply frontend filters
      let filteredJobs = [...allJobs];
      
      // Filter by admin on frontend if specified
      if (conversionAdminFilter) {
        filteredJobs = filteredJobs.filter(job => job.adm === conversionAdminFilter);
      }
      
      // Filter by rep code if specified
      if (conversionRepFilter) {
        filteredJobs = filteredJobs.filter(job => {
          const repCode = typeof job.repCode === 'object' ? (job.repCode as any)?.code : null;
          return repCode === conversionRepFilter;
        });
      }
      
      // Filter by branch if specified
      if (conversionBranchFilter) {
        filteredJobs = filteredJobs.filter(job => {
          const branch = typeof job.branch === 'object' ? job.branch?.name : null;
          return branch === conversionBranchFilter;
        });
      }
      
      setConversionJobs(filteredJobs);

    } catch (err: any) {
      console.error('Error loading conversion data:', err);
      setError(err.message || 'Failed to load conversion data');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Loads customer data.
   */
  async function loadCustomerData() {
    try {
      setLoading(true);
      setError(null);

      if (!selectedCustomerId) return;

      const { startDate, endDate } = getDateRange();
      const isAllTime = dateRangePreset === 'all-time';

      // Load customer jobs - only pass dates if not all-time
      const jobParams: any = {
        customer: selectedCustomerId,
        limit: 1000, // Get all jobs for this customer
      };
      
      if (isAllTime) {
        jobParams.allTime = 'true';
      } else if (startDate && endDate) {
        jobParams.startDate = startDate;
        jobParams.endDate = endDate;
      }
      
      const jobsResponse = await getJobs(jobParams);
      setCustomerJobs(jobsResponse.jobs || []);

      // Load customer machines
      const machinesResponse = await getMachines({ customerId: selectedCustomerId });
      setCustomerMachines(machinesResponse.machines || []);

      // Load activities related to customer jobs (optional - may fail if user doesn't have permission)
      const jobIds = (jobsResponse.jobs || []).map(j => j._id);
      if (jobIds.length > 0) {
        try {
          // Load activities for these jobs
          const activitiesResponse = await getActivities({
            resourceType: 'Job',
            startDate,
            endDate,
            limit: 1000,
          });
          // Filter to only activities for this customer's jobs
          const filteredActivities = (activitiesResponse.activities || []).filter(
            act => jobIds.includes(act.resourceId as string)
          );
          setCustomerActivities(filteredActivities);
        } catch (activitiesError: any) {
          // If activities.read permission is missing, just set empty array
          console.warn('Could not load activities (permission may be missing):', activitiesError.message);
          setCustomerActivities([]);
        }
      } else {
        setCustomerActivities([]);
      }

    } catch (err: any) {
      console.error('Error loading customer data:', err);
      setError(err.message || 'Failed to load customer data');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Exports user performance report to CSV.
   */
  function exportUserPerformanceReport() {
    const { startDate, endDate } = getDateRange();
    const roleLabel = selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1);
    const selectedLabel = selectedRole === 'admin' 
      ? adminCodes.find(ac => ac._id === selectedAdminCode)?.code || 'All'
      : selectedRole === 'rep'
      ? repCodes.find(rc => rc._id === selectedRepCode)?.code || 'All'
      : technicians.find(t => t._id === selectedTechnician)?.name || 'All';

    // Jobs CSV
    const jobHeaders = [
      'Job Number', 'Status', 'Customer', 'Cash Customer', 'Start Date', 'Date Quoted',
      'Value ex VAT', 'Admin', 'Rep Code', 'Technician', 'Branch', 'Description', 'Feedback',
      'RSR Number', 'PO Number', 'PO Date', 'Invoice Number', 'Invoice Date'
    ];
    const jobRows = userJobs.map(job => [
      job.jobNumber || '',
      job.status?.name || '',
      typeof job.customer === 'object' ? job.customer?.name || '' : '',
      job.cashCustomer || '',
      job.startDate ? formatDate(job.startDate) : '',
      job.dateQuoted ? formatDate(job.dateQuoted) : '',
      job.valueExVat || 0,
      job.adm || '',
      typeof job.repCode === 'object' ? (job.repCode as any)?.code || '' : '',
      typeof job.techBooked === 'object' ? (job.techBooked as any)?.name || '' : '',
      typeof job.branch === 'object' ? job.branch?.name || '' : '',
      typeof job.description === 'object' ? (job.description as any)?.name || '' : '',
      job.feedback || '',
      job.rsrNumber || '',
      job.poNumber || '',
      job.poDate ? formatDate(job.poDate) : '',
      job.invNumber || '',
      job.invoiceDate ? formatDate(job.invoiceDate) : '',
    ]);

    // Activities CSV
    const activityHeaders = ['Date', 'Time', 'Action', 'Resource Type', 'Description', 'IP Address'];
    const activityRows = userActivities.map(act => [
      act.createdAt ? formatDate(act.createdAt) : '',
      act.createdAt ? new Date(act.createdAt).toLocaleTimeString() : '',
      act.action || '',
      act.resourceType || '',
      act.description || '',
      act.ipAddress || '',
    ]);

    // Overdue Jobs CSV
    const overdueHeaders = ['Job Number', 'Status', 'Days Overdue', 'Customer', 'Current Status', 'Expected Next Status'];
    const overdueRows = userOverdueJobs.map(oj => [
      oj.jobNumber || '',
      oj.job?.status?.name || '',
      oj.daysOverdue || 0,
      typeof oj.job?.customer === 'object' ? oj.job.customer?.name || '' : '',
      oj.currentStatus || '',
      oj.expectedNextStatus || '',
    ]);

    // Combine all data
    const csv = [
      [`${roleLabel} Performance Report - ${selectedLabel}`],
      [`Date Range: ${startDate} to ${endDate}`],
      [''],
      ['=== JOBS ==='],
      jobHeaders,
      ...jobRows,
      [''],
      ['=== ACTIVITIES ==='],
      activityHeaders,
      ...activityRows,
      [''],
      ['=== OVERDUE JOBS ==='],
      overdueHeaders,
      ...overdueRows,
    ].map(row => row.map(cell => `"${String(cell)}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${roleLabel}-Performance-${selectedLabel}-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Exports customer report to CSV.
   */
  function exportCustomerReport() {
    const customer = customers.find(c => c._id === selectedCustomerId);
    const customerName = customer?.name || 'Unknown';
    const { startDate, endDate } = getDateRange();

    // Jobs CSV
    const jobHeaders = [
      'Job Number', 'Status', 'Start Date', 'Date Quoted', 'Value ex VAT',
      'Admin', 'Rep Code', 'Technician', 'Branch', 'Description', 'Feedback',
      'RSR Number', 'PO Number', 'PO Date', 'Invoice Number', 'Invoice Date'
    ];
    const jobRows = customerJobs.map(job => [
      job.jobNumber || '',
      job.status?.name || '',
      job.startDate ? formatDate(job.startDate) : '',
      job.dateQuoted ? formatDate(job.dateQuoted) : '',
      job.valueExVat || 0,
      job.adm || '',
      typeof job.repCode === 'object' ? (job.repCode as any)?.code || '' : '',
      typeof job.techBooked === 'object' ? (job.techBooked as any)?.name || '' : '',
      typeof job.branch === 'object' ? job.branch?.name || '' : '',
      typeof job.description === 'object' ? (job.description as any)?.name || '' : '',
      job.feedback || '',
      job.rsrNumber || '',
      job.poNumber || '',
      job.poDate ? formatDate(job.poDate) : '',
      job.invNumber || '',
      job.invoiceDate ? formatDate(job.invoiceDate) : '',
    ]);

    // Machines CSV
    const machineHeaders = ['Make', 'Model', 'Serial Number', 'Machine Hours', 'Next Service Hours'];
    const machineRows = customerMachines.map(machine => [
      machine.make || '',
      machine.model || '',
      machine.serialNumber || '',
      machine.machineHours || 0,
      machine.nextServiceHours || 0,
    ]);

    // Activities CSV
    const activityHeaders = ['Date', 'Time', 'Action', 'Description', 'User'];
    const activityRows = customerActivities.map(act => [
      act.createdAt ? formatDate(act.createdAt) : '',
      act.createdAt ? new Date(act.createdAt).toLocaleTimeString() : '',
      act.action || '',
      act.description || '',
      typeof act.userId === 'object' && act.userId !== null
        ? `${(act.userId as any).firstName || ''} ${(act.userId as any).lastName || ''}`.trim()
        : 'System',
    ]);

    const csv = [
      [`Customer Report - ${customerName}`],
      [`Date Range: ${startDate} to ${endDate}`],
      [''],
      ['=== JOBS ==='],
      jobHeaders,
      ...jobRows,
      [''],
      ['=== MACHINES ==='],
      machineHeaders,
      ...machineRows,
      [''],
      ['=== ACTIVITIES ==='],
      activityHeaders,
      ...activityRows,
    ].map(row => row.map(cell => `"${String(cell)}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Customer-Report-${customerName}-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Exports machine report to CSV.
   */
  function exportMachineReport() {
    // Machine and Job CSV
    const headers = [
      'Machine Make', 'Machine Model', 'Serial Number', 'Customer', 'Machine Hours', 'Next Service Hours',
      'Job Number', 'Job Status', 'Start Date', 'Date Quoted', 'Value ex VAT', 'Admin', 'Rep Code', 'Technician', 'Branch', 'Description',
      'RSR Number', 'PO Number', 'PO Date', 'Invoice Number', 'Invoice Date'
    ];
    
    const rows: string[][] = [];
    
    allMachines.forEach(machine => {
      // Get jobs that have this machine
      const jobsForMachine = machineJobs.filter(job => {
        if (!Array.isArray(job.machines) || job.machines.length === 0) return false;
        return job.machines.some(machineRef => {
          const machineId = typeof machineRef === 'object' && machineRef !== null
            ? (machineRef as any)._id
            : machineRef;
          return String(machineId) === machine._id;
        });
      });

      if (jobsForMachine.length === 0) {
        // Machine with no jobs
        const customerName = typeof machine.customer === 'object' && machine.customer !== null
          ? (machine.customer as any).name || ''
          : '';
        rows.push([
          machine.make || '',
          machine.model || '',
          machine.serialNumber || '',
          customerName,
          machine.machineHours?.toString() || '',
          machine.nextServiceHours?.toString() || '',
          '', '', '', '', '', '', '', '', '', ''
        ]);
      } else {
        // Machine with jobs - one row per job
        jobsForMachine.forEach(job => {
          const customerName = typeof machine.customer === 'object' && machine.customer !== null
            ? (machine.customer as any).name || ''
            : '';
          rows.push([
            machine.make || '',
            machine.model || '',
            machine.serialNumber || '',
            customerName,
            machine.machineHours?.toString() || '',
            machine.nextServiceHours?.toString() || '',
            job.jobNumber || '',
            job.status?.name || '',
            job.startDate ? formatDate(job.startDate) : '',
            job.dateQuoted ? formatDate(job.dateQuoted) : '',
            job.valueExVat?.toString() || '0',
            job.adm || '',
            typeof job.repCode === 'object' ? (job.repCode as any)?.code || '' : '',
            typeof job.techBooked === 'object' ? (job.techBooked as any)?.name || '' : '',
            typeof job.branch === 'object' ? job.branch?.name || '' : '',
            typeof job.description === 'object' ? (job.description as any)?.name || '' : '',
            job.rsrNumber || '',
            job.poNumber || '',
            job.poDate ? formatDate(job.poDate) : '',
            job.invNumber || '',
            job.invoiceDate ? formatDate(job.invoiceDate) : ''
          ]);
        });
      }
    });

    const csv = [headers, ...rows].map((r) => 
      r.map((x) => `"${(x || '').toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `machine-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Filters overdue jobs by status and date range.
   */
  function getFilteredOverdueJobs(): OverdueJob[] {
    let filtered = userOverdueJobs;
    
    // Filter by status
    if (overdueStatusFilter) {
      filtered = filtered.filter(oj => {
        const jobStatus = oj.job?.status?.name || oj.currentStatus || '';
        return jobStatus.toLowerCase().includes(overdueStatusFilter.toLowerCase());
      });
    }
    
    // Filter by admin
    if (overdueAdminFilter) {
      filtered = filtered.filter(oj => {
        const jobAdmin = oj.job?.adm || '';
        return jobAdmin.toLowerCase().includes(overdueAdminFilter.toLowerCase());
      });
    }
    
    // Filter by rep code
    if (overdueRepFilter) {
      filtered = filtered.filter(oj => {
        const repCode = typeof oj.job?.repCode === 'object' ? (oj.job.repCode as any)?.code : '';
        return repCode.toLowerCase().includes(overdueRepFilter.toLowerCase());
      });
    }
    
    // Filter by branch
    if (overdueBranchFilter) {
      filtered = filtered.filter(oj => {
        const branch = typeof oj.job?.branch === 'object' ? oj.job.branch?.name : '';
        return branch?.toLowerCase().includes(overdueBranchFilter.toLowerCase());
      });
    }
    
    // Filter by status changed date range
    if (overdueStatusChangedFrom) {
      filtered = filtered.filter(oj => {
        const statusChangedAt = oj.job?.statusChangedAt;
        if (!statusChangedAt) return false;
        return new Date(statusChangedAt) >= new Date(overdueStatusChangedFrom);
      });
    }
    
    if (overdueStatusChangedTo) {
      filtered = filtered.filter(oj => {
        const statusChangedAt = oj.job?.statusChangedAt;
        if (!statusChangedAt) return false;
        return new Date(statusChangedAt) <= new Date(overdueStatusChangedTo);
      });
    }
    
    return filtered;
  }

  /**
   * Filters all jobs by status, admin, rep, branch, and date range.
   */
  function getFilteredJobs(): Job[] {
    let filtered = userJobs;
    
    // Filter by status
    if (jobsStatusFilter) {
      filtered = filtered.filter(job => {
        const jobStatus = job.status?.name || '';
        return jobStatus.toLowerCase().includes(jobsStatusFilter.toLowerCase());
      });
    }
    
    // Filter by admin
    if (jobsAdminFilter) {
      filtered = filtered.filter(job => {
        const jobAdmin = job.adm || '';
        return jobAdmin.toLowerCase().includes(jobsAdminFilter.toLowerCase());
      });
    }
    
    // Filter by rep code
    if (jobsRepFilter) {
      filtered = filtered.filter(job => {
        const repCode = typeof job.repCode === 'object' ? (job.repCode as any)?.code : '';
        return repCode.toLowerCase().includes(jobsRepFilter.toLowerCase());
      });
    }
    
    // Filter by branch
    if (jobsBranchFilter) {
      filtered = filtered.filter(job => {
        const branch = typeof job.branch === 'object' ? job.branch?.name : '';
        return branch?.toLowerCase().includes(jobsBranchFilter.toLowerCase());
      });
    }
    
    // Filter by status changed date range
    if (jobsStatusChangedFrom) {
      filtered = filtered.filter(job => {
        const statusChangedAt = job.statusChangedAt;
        if (!statusChangedAt) return false;
        return new Date(statusChangedAt) >= new Date(jobsStatusChangedFrom);
      });
    }
    
    if (jobsStatusChangedTo) {
      filtered = filtered.filter(job => {
        const statusChangedAt = job.statusChangedAt;
        if (!statusChangedAt) return false;
        return new Date(statusChangedAt) <= new Date(jobsStatusChangedTo);
      });
    }
    
    return filtered;
  }

  /**
   * Gets unique statuses from overdue jobs.
   */
  function getUniqueOverdueStatuses(): string[] {
    const statusSet = new Set<string>();
    userOverdueJobs.forEach(oj => {
      const status = oj.job?.status?.name || oj.currentStatus;
      if (status) statusSet.add(status);
    });
    return Array.from(statusSet).sort();
  }

  /**
   * Gets unique admin codes from overdue jobs.
   */
  function getUniqueOverdueAdmins(): string[] {
    const adminSet = new Set<string>();
    userOverdueJobs.forEach(oj => {
      const admin = oj.job?.adm;
      if (admin) adminSet.add(admin);
    });
    return Array.from(adminSet).sort();
  }

  /**
   * Gets unique rep codes from overdue jobs.
   */
  function getUniqueOverdueReps(): string[] {
    const repSet = new Set<string>();
    userOverdueJobs.forEach(oj => {
      const repCode = typeof oj.job?.repCode === 'object' ? (oj.job.repCode as any)?.code : null;
      if (repCode) repSet.add(repCode);
    });
    return Array.from(repSet).sort();
  }

  /**
   * Gets unique branches from overdue jobs.
   */
  function getUniqueOverdueBranches(): string[] {
    const branchSet = new Set<string>();
    userOverdueJobs.forEach(oj => {
      const branch = typeof oj.job?.branch === 'object' ? oj.job.branch?.name : null;
      if (branch) branchSet.add(branch);
    });
    return Array.from(branchSet).sort();
  }

  /**
   * Gets unique statuses from all jobs.
   */
  function getUniqueJobStatuses(): string[] {
    const statusSet = new Set<string>();
    userJobs.forEach(job => {
      const status = job.status?.name;
      if (status) statusSet.add(status);
    });
    return Array.from(statusSet).sort();
  }

  /**
   * Gets unique admin codes from all jobs.
   */
  function getUniqueJobAdmins(): string[] {
    const adminSet = new Set<string>();
    userJobs.forEach(job => {
      const admin = job.adm;
      if (admin) adminSet.add(admin);
    });
    return Array.from(adminSet).sort();
  }

  /**
   * Gets unique rep codes from all jobs.
   */
  function getUniqueJobReps(): string[] {
    const repSet = new Set<string>();
    userJobs.forEach(job => {
      const repCode = typeof job.repCode === 'object' ? (job.repCode as any)?.code : null;
      if (repCode) repSet.add(repCode);
    });
    return Array.from(repSet).sort();
  }

  /**
   * Gets unique branches from all jobs.
   */
  function getUniqueJobBranches(): string[] {
    const branchSet = new Set<string>();
    userJobs.forEach(job => {
      const branch = typeof job.branch === 'object' ? job.branch?.name : null;
      if (branch) branchSet.add(branch);
    });
    return Array.from(branchSet).sort();
  }

  /**
   * Gets unique admin codes from all conversion jobs (unfiltered).
   */
  function getUniqueConversionAdmins(): string[] {
    const adminSet = new Set<string>();
    allConversionJobs.forEach(job => {
      const admin = job.adm;
      if (admin) adminSet.add(admin);
    });
    return Array.from(adminSet).sort();
  }

  /**
   * Gets unique rep codes from all conversion jobs (unfiltered).
   */
  function getUniqueConversionReps(): string[] {
    const repSet = new Set<string>();
    allConversionJobs.forEach(job => {
      const repCode = typeof job.repCode === 'object' ? (job.repCode as any)?.code : null;
      if (repCode) repSet.add(repCode);
    });
    return Array.from(repSet).sort();
  }

  /**
   * Gets unique branches from all conversion jobs (unfiltered).
   */
  function getUniqueConversionBranches(): string[] {
    const branchSet = new Set<string>();
    allConversionJobs.forEach(job => {
      const branch = typeof job.branch === 'object' ? job.branch?.name : null;
      if (branch) branchSet.add(branch);
    });
    return Array.from(branchSet).sort();
  }

  /**
   * Calculates conversion time metrics.
   * When conversionCompleteOnly is true, only uses jobs with ALL date fields present.
   */
  function calculateConversionMetrics() {
    let filteredJobs = conversionJobs;
    
    // If "complete workflow only" is enabled, filter to jobs with all dates
    if (conversionCompleteOnly) {
      filteredJobs = filteredJobs.filter(job => 
        job.startDate && 
        job.dateQuoted && 
        job.dateSentToClient && 
        job.poDate && 
        job.invoiceDate
      );
    }
    
    // Calculate metrics for complete workflow jobs (for consistent totals)
    const completeWorkflowJobs = filteredJobs.filter(job => 
      job.startDate && 
      job.dateQuoted && 
      job.dateSentToClient && 
      job.poDate && 
      job.invoiceDate
    );
    
    // Calculate average days between status transitions
    const metrics = {
      startToQuoted: [] as number[],
      quotedToSentToClient: [] as number[],
      sentToClientToAwaitingPO: [] as number[],
      awaitingPOToInProgress: [] as number[],
      inProgressToJobDone: [] as number[],
      jobDoneToRSRNeeded: [] as number[],
      rsrNeededToInvoiced: [] as number[],
      startToInvoiced: [] as number[],
    };
    
    // Complete workflow metrics (where numbers will add up)
    const completeMetrics = {
      startToQuoted: [] as number[],
      quotedToSentToClient: [] as number[],
      sentToClientToAwaitingPO: [] as number[],
      inProgressToJobDone: [] as number[],
      startToInvoiced: [] as number[],
    };
    
    filteredJobs.forEach(job => {
      if (!job.startDate) return;
      
      const startDate = new Date(job.startDate).getTime();
      const quotedDate = job.dateQuoted ? new Date(job.dateQuoted).getTime() : null;
      const sentToClientDate = job.dateSentToClient ? new Date(job.dateSentToClient).getTime() : null;
      const poDate = job.poDate ? new Date(job.poDate).getTime() : null;
      const invoiceDate = job.invoiceDate ? new Date(job.invoiceDate).getTime() : null;
      
      // Start to Quoted (only count positive values - negative means data error)
      if (quotedDate) {
        const days = (quotedDate - startDate) / (1000 * 60 * 60 * 24);
        if (days >= 0) metrics.startToQuoted.push(days);
      }
      
      // Quoted to Sent to Client
      if (quotedDate && sentToClientDate) {
        const days = (sentToClientDate - quotedDate) / (1000 * 60 * 60 * 24);
        if (days >= 0) metrics.quotedToSentToClient.push(days);
      }
      
      // Sent to Client to Awaiting PO (client decision time - the sticky point!)
      if (sentToClientDate && poDate) {
        const days = (poDate - sentToClientDate) / (1000 * 60 * 60 * 24);
        if (days >= 0) metrics.sentToClientToAwaitingPO.push(days);
      }
      
      // Awaiting PO to In Progress (using PO date - if no sentToClient, fall back to quoted)
      if (!sentToClientDate && quotedDate && poDate) {
        const days = (poDate - quotedDate) / (1000 * 60 * 60 * 24);
        if (days >= 0) metrics.awaitingPOToInProgress.push(days);
      }
      
      // PO to Invoiced (job execution time)
      if (poDate && invoiceDate) {
        const days = (invoiceDate - poDate) / (1000 * 60 * 60 * 24);
        if (days >= 0) metrics.inProgressToJobDone.push(days);
      }
      
      // Start to Invoiced (total conversion time)
      if (invoiceDate) {
        const days = (invoiceDate - startDate) / (1000 * 60 * 60 * 24);
        if (days >= 0) metrics.startToInvoiced.push(days);
      }
    });
    
    // Calculate complete workflow metrics separately (these will add up correctly)
    completeWorkflowJobs.forEach(job => {
      const startDate = new Date(job.startDate!).getTime();
      const quotedDate = new Date(job.dateQuoted!).getTime();
      const sentToClientDate = new Date(job.dateSentToClient!).getTime();
      const poDate = new Date(job.poDate!).getTime();
      const invoiceDate = new Date(job.invoiceDate!).getTime();
      
      // Only include if all segments are positive (valid data)
      const d1 = (quotedDate - startDate) / (1000 * 60 * 60 * 24);
      const d2 = (sentToClientDate - quotedDate) / (1000 * 60 * 60 * 24);
      const d3 = (poDate - sentToClientDate) / (1000 * 60 * 60 * 24);
      const d4 = (invoiceDate - poDate) / (1000 * 60 * 60 * 24);
      
      if (d1 >= 0 && d2 >= 0 && d3 >= 0 && d4 >= 0) {
        completeMetrics.startToQuoted.push(d1);
        completeMetrics.quotedToSentToClient.push(d2);
        completeMetrics.sentToClientToAwaitingPO.push(d3);
        completeMetrics.inProgressToJobDone.push(d4);
        completeMetrics.startToInvoiced.push(d1 + d2 + d3 + d4);
      }
    });
    
    // Calculate averages
    const calculateAverage = (arr: number[]) => {
      if (arr.length === 0) return 0;
      return arr.reduce((sum, val) => sum + val, 0) / arr.length;
    };
    
    return {
      avgStartToQuoted: calculateAverage(metrics.startToQuoted),
      avgQuotedToSentToClient: calculateAverage(metrics.quotedToSentToClient),
      avgSentToClientToAwaitingPO: calculateAverage(metrics.sentToClientToAwaitingPO),
      avgAwaitingPOToInProgress: calculateAverage(metrics.awaitingPOToInProgress),
      avgInProgressToJobDone: calculateAverage(metrics.inProgressToJobDone),
      avgJobDoneToRSRNeeded: calculateAverage(metrics.jobDoneToRSRNeeded),
      avgRSRNeededToInvoiced: calculateAverage(metrics.rsrNeededToInvoiced),
      avgStartToInvoiced: calculateAverage(metrics.startToInvoiced),
      jobCount: filteredJobs.length,
      counts: {
        startToQuoted: metrics.startToQuoted.length,
        quotedToSentToClient: metrics.quotedToSentToClient.length,
        sentToClientToAwaitingPO: metrics.sentToClientToAwaitingPO.length,
        awaitingPOToInProgress: metrics.awaitingPOToInProgress.length,
        inProgressToJobDone: metrics.inProgressToJobDone.length,
        jobDoneToRSRNeeded: metrics.jobDoneToRSRNeeded.length,
        rsrNeededToInvoiced: metrics.rsrNeededToInvoiced.length,
        startToInvoiced: metrics.startToInvoiced.length,
      },
      // Complete workflow metrics (these add up correctly)
      complete: {
        avgStartToQuoted: calculateAverage(completeMetrics.startToQuoted),
        avgQuotedToSentToClient: calculateAverage(completeMetrics.quotedToSentToClient),
        avgSentToClientToAwaitingPO: calculateAverage(completeMetrics.sentToClientToAwaitingPO),
        avgInProgressToJobDone: calculateAverage(completeMetrics.inProgressToJobDone),
        avgTotal: calculateAverage(completeMetrics.startToInvoiced),
        jobCount: completeMetrics.startToInvoiced.length,
      }
    };
  }

  /**
   * Calculates user performance statistics.
   */
  function calculateUserStats() {
    const totalJobs = userJobs.length;
    const totalValue = userJobs.reduce((sum, job) => sum + (job.valueExVat || 0), 0);
    const avgValue = totalJobs > 0 ? totalValue / totalJobs : 0;
    const totalActivities = userActivities.length;
    const overdueCount = userOverdueJobs.filter(oj => oj.isOverdue).length;
    const approachingCount = userOverdueJobs.filter(oj => oj.isApproaching && !oj.isOverdue).length;

    const activitiesByType = userActivities.reduce((acc, act) => {
      acc[act.action] = (acc[act.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalJobs,
      totalValue,
      avgValue,
      totalActivities,
      overdueCount,
      approachingCount,
      activitiesByType,
    };
  }

  /**
   * Loads machine data based on user role and filters.
   */
  async function loadMachineData() {
    try {
      setLoading(true);
      setError(null);

      // First, get all jobs (backend filters by role)
      let allJobsList: Job[] = [];
      let currentPage = 1;
      let hasMore = true;
      const pageSize = 1000;

      while (hasMore) {
        const jobsResponse = await getJobs({
          allTime: 'true',
          page: currentPage,
          limit: pageSize,
        });
        
        const jobsList = jobsResponse.jobs || [];
        allJobsList = [...allJobsList, ...jobsList];
        
        const totalPages = jobsResponse.pagination?.pages || 1;
        hasMore = currentPage < totalPages && jobsList.length === pageSize;
        currentPage++;
        
        if (currentPage > 10) break;
      }

      // Get all machines
      const machinesResponse = await getMachines({ limit: 10000 });
      let machinesList = machinesResponse.machines || [];

      // For non-super admins, filter machines to only those connected to their jobs
      if (!currentUser?.isSuperAdmin) {
        const userJobMachineIds = new Set<string>();
        allJobsList.forEach(job => {
          if (Array.isArray(job.machines)) {
            job.machines.forEach(machineRef => {
              const machineId = typeof machineRef === 'object' && machineRef !== null
                ? (machineRef as any)._id
                : machineRef;
              if (machineId) userJobMachineIds.add(String(machineId));
            });
          }
        });
        machinesList = machinesList.filter(m => userJobMachineIds.has(m._id));
      }

      // Apply filters
      if (machineMakeFilter) {
        machinesList = machinesList.filter(m => 
          m.make?.toLowerCase().includes(machineMakeFilter.toLowerCase())
        );
      }
      if (machineModelFilter) {
        machinesList = machinesList.filter(m => 
          m.model?.toLowerCase().includes(machineModelFilter.toLowerCase())
        );
      }
      if (machineSerialFilter) {
        machinesList = machinesList.filter(m => 
          m.serialNumber?.toLowerCase().includes(machineSerialFilter.toLowerCase())
        );
      }

      setAllMachines(machinesList);

      // Get all jobs that have these machines
      const machineIds = new Set(machinesList.map(m => m._id));
      const jobsWithMachines = allJobsList.filter(job => {
        if (!Array.isArray(job.machines) || job.machines.length === 0) return false;
        return job.machines.some(machineRef => {
          const machineId = typeof machineRef === 'object' && machineRef !== null
            ? (machineRef as any)._id
            : machineRef;
          return machineIds.has(String(machineId));
        });
      });

      setMachineJobs(jobsWithMachines);

    } catch (err: any) {
      console.error('Error loading machine data:', err);
      setError(err.message || 'Failed to load machine data');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Calculates comprehensive customer statistics.
   */
  function calculateCustomerStats() {
    const totalJobs = customerJobs.length;
    const totalValue = customerJobs.reduce((sum, job) => sum + (job.valueExVat || 0), 0);
    const totalMachines = customerMachines.length;
    const totalActivities = customerActivities.length;

    // Get unique admins, reps, technicians who worked on this customer
    const admins = new Set(customerJobs.map(j => j.adm).filter(Boolean));
    const repCodes = new Set(
      customerJobs
        .map(j => typeof j.repCode === 'object' && j.repCode !== null ? (j.repCode as any)?.code : null)
        .filter(Boolean)
    );
    const technicians = new Set(
      customerJobs
        .map(j => typeof j.techBooked === 'object' && j.techBooked !== null ? (j.techBooked as any)?.name : null)
        .filter(Boolean)
    );

    // Jobs by status breakdown
    const jobsByStatus: Record<string, { count: number; value: number }> = {};
    customerJobs.forEach(job => {
      const statusName = job.status?.name || 'No Status';
      if (!jobsByStatus[statusName]) {
        jobsByStatus[statusName] = { count: 0, value: 0 };
      }
      jobsByStatus[statusName].count++;
      jobsByStatus[statusName].value += job.valueExVat || 0;
    });

    // Financial breakdown
    const quotedValue = customerJobs
      .filter(j => j.dateQuoted && !j.invoiceDate)
      .reduce((sum, j) => sum + (j.valueExVat || 0), 0);
    const invoicedValue = customerJobs
      .filter(j => j.invoiceDate)
      .reduce((sum, j) => sum + (j.valueExVat || 0), 0);
    const pendingValue = customerJobs
      .filter(j => !j.dateQuoted && !j.invoiceDate)
      .reduce((sum, j) => sum + (j.valueExVat || 0), 0);
    const avgJobValue = totalJobs > 0 ? totalValue / totalJobs : 0;

    // Jobs over time (by month)
    const jobsByMonth: Record<string, { count: number; value: number }> = {};
    customerJobs.forEach(job => {
      const date = job.startDate ? new Date(job.startDate) : new Date(job.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!jobsByMonth[monthKey]) {
        jobsByMonth[monthKey] = { count: 0, value: 0 };
      }
      jobsByMonth[monthKey].count++;
      jobsByMonth[monthKey].value += job.valueExVat || 0;
    });

    // Team details with names
    const adminDetails = Array.from(admins).map(adm => ({
      code: adm as string,
      jobCount: customerJobs.filter(j => j.adm === adm).length,
      totalValue: customerJobs.filter(j => j.adm === adm).reduce((sum, j) => sum + (j.valueExVat || 0), 0),
    }));
    const repDetails = Array.from(repCodes).map(code => ({
      code: code as string,
      jobCount: customerJobs.filter(j => typeof j.repCode === 'object' && (j.repCode as any)?.code === code).length,
      totalValue: customerJobs.filter(j => typeof j.repCode === 'object' && (j.repCode as any)?.code === code).reduce((sum, j) => sum + (j.valueExVat || 0), 0),
    }));
    const techDetails = Array.from(technicians).map(name => ({
      name: name as string,
      jobCount: customerJobs.filter(j => typeof j.techBooked === 'object' && (j.techBooked as any)?.name === name).length,
      totalValue: customerJobs.filter(j => typeof j.techBooked === 'object' && (j.techBooked as any)?.name === name).reduce((sum, j) => sum + (j.valueExVat || 0), 0),
    }));

    return {
      totalJobs,
      totalValue,
      totalMachines,
      totalActivities,
      uniqueAdmins: admins.size,
      uniqueRepCodes: repCodes.size,
      uniqueTechnicians: technicians.size,
      // New comprehensive stats
      jobsByStatus,
      quotedValue,
      invoicedValue,
      pendingValue,
      avgJobValue,
      jobsByMonth,
      adminDetails,
      repDetails,
      techDetails,
    };
  }

  const userStats = calculateUserStats();
  const customerStats = calculateCustomerStats();

  if (loading && userJobs.length === 0 && customerJobs.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ars-primary mx-auto mb-4"></div>
          <p className="text-ars-body">Loading report data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-ars-heading">Reports & Analytics</h2>
          {activeTab === 'user-performance' && (
            <button
              onClick={exportUserPerformanceReport}
              className="bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] px-4 py-2 rounded-xl font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              EXPORT REPORT
            </button>
          )}
          {activeTab === 'customer' && (
            <button
              onClick={exportCustomerReport}
              disabled={!selectedCustomerId}
              className="bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] px-4 py-2 rounded-xl font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              EXPORT REPORT
            </button>
          )}
          {activeTab === 'machine' && (
            <button
              onClick={exportMachineReport}
              className="bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] px-4 py-2 rounded-xl font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              EXPORT REPORT
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('user-performance')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'user-performance'
                ? 'border-ars-primary text-ars-primary'
                : 'border-transparent text-ars-body hover:text-ars-heading'
            }`}
          >
            <UserIcon className="w-4 h-4 inline mr-2" />
            User Performance
          </button>
          <button
            onClick={() => setActiveTab('customer')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'customer'
                ? 'border-ars-primary text-ars-primary'
                : 'border-transparent text-ars-body hover:text-ars-heading'
            }`}
          >
            <Building2 className="w-4 h-4 inline mr-2" />
            Customer Reports
          </button>
          <button
            onClick={() => setActiveTab('machine')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'machine'
                ? 'border-ars-primary text-ars-primary'
                : 'border-transparent text-ars-body hover:text-ars-heading'
            }`}
          >
            <Wrench className="w-4 h-4 inline mr-2" />
            Machine Reports
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* User Performance Report */}
        {activeTab === 'user-performance' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
              <h3 className="text-lg font-bold text-ars-heading mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-semibold text-ars-heading mb-2">Role</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => {
                      setSelectedRole(e.target.value as UserRole);
                      setSelectedAdminCode('');
                      setSelectedRepCode('');
                      setSelectedTechnician('');
                    }}
                    disabled={!currentUser?.isSuperAdmin}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[15px] disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="admin">Admin</option>
                    <option value="rep">Rep</option>
                    <option value="technician">Technician</option>
                  </select>
                  {!currentUser?.isSuperAdmin && (
                    <p className="text-xs text-ars-body mt-1">Viewing your own data</p>
                  )}
                </div>

                {/* Role-specific Selection */}
                {selectedRole === 'admin' && (
                  <div>
                    <label className="block text-sm font-semibold text-ars-heading mb-2">Admin Code</label>
                    <select
                      value={selectedAdminCode}
                      onChange={(e) => setSelectedAdminCode(e.target.value)}
                      disabled={!currentUser?.isSuperAdmin}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[15px] disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Admin Code</option>
                      {adminCodes.map(ac => (
                        <option key={ac._id} value={ac._id}>
                          {ac.code} {ac.user ? `(${ac.user.firstName} ${ac.user.lastName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedRole === 'rep' && (
                  <div>
                    <label className="block text-sm font-semibold text-ars-heading mb-2">Rep Code</label>
                    <select
                      value={selectedRepCode}
                      onChange={(e) => setSelectedRepCode(e.target.value)}
                      disabled={!currentUser?.isSuperAdmin}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[15px] disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Rep Code</option>
                      {repCodes.map(rc => (
                        <option key={rc._id} value={rc._id}>
                          {rc.code} {rc.user ? `(${rc.user.firstName} ${rc.user.lastName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedRole === 'technician' && (
                  <div>
                    <label className="block text-sm font-semibold text-ars-heading mb-2">Technician</label>
                    <select
                      value={selectedTechnician}
                      onChange={(e) => setSelectedTechnician(e.target.value)}
                      disabled={!currentUser?.isSuperAdmin}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[15px] disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Technician</option>
                      {technicians.map(t => (
                        <option key={t._id} value={t._id}>
                          {t.name} {t.user ? `(${t.user.firstName} ${t.user.lastName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Date Range Preset */}
                <div>
                  <label className="text-sm font-semibold text-ars-heading mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date Range
                  </label>
                  <select
                    value={dateRangePreset}
                    onChange={(e) => setDateRangePreset(e.target.value as DateRangePreset)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[15px]"
                  >
                    <option value="today">Today</option>
                    <option value="this-month">This Month</option>
                    <option value="last-month">Last Month</option>
                    <option value="all-time">All Time</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {/* Custom Date Range */}
                {dateRangePreset === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-ars-heading mb-2">From Date</label>
                      <input
                        type="date"
                        value={customDateFrom}
                        onChange={(e) => setCustomDateFrom(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[15px]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-heading mb-2">To Date</label>
                      <input
                        type="date"
                        value={customDateTo}
                        onChange={(e) => setCustomDateTo(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[15px]"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div 
                onClick={() => userStats.totalJobs > 0 && setStatsPanelType('user-total-jobs')}
                className={`bg-white rounded-xl border border-gray-200 shadow-md p-6 transition-all duration-200 ${
                  userStats.totalJobs > 0 ? 'cursor-pointer hover:shadow-lg hover:border-ars-primary hover:scale-[1.02]' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-ars-body">Total Jobs</p>
                  <FileText className="w-5 h-5 text-ars-primary" />
                </div>
                <p className="text-3xl font-bold text-ars-heading">{userStats.totalJobs.toLocaleString()}</p>
                {userStats.totalJobs > 0 && (
                  <p className="text-xs text-ars-primary mt-2">Click to view list →</p>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-ars-body">Total Value</p>
                  <Banknote className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-ars-heading">R{userStats.totalValue.toLocaleString()}</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-ars-body">Total Activities</p>
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-ars-heading">{userStats.totalActivities.toLocaleString()}</p>
              </div>

              <div 
                onClick={() => userStats.overdueCount > 0 && setStatsPanelType('user-overdue-jobs')}
                className={`bg-white rounded-xl border border-gray-200 shadow-md p-6 transition-all duration-200 ${
                  userStats.overdueCount > 0 ? 'cursor-pointer hover:shadow-lg hover:border-red-400 hover:scale-[1.02]' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-ars-body">Overdue Jobs</p>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-3xl font-bold text-ars-heading">{userStats.overdueCount.toLocaleString()}</p>
                {userStats.overdueCount > 0 && (
                  <p className="text-xs text-red-500 mt-2">Click to view list →</p>
                )}
              </div>
            </div>

            {/* Section Selector */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-md p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-ars-heading mr-2">View Section:</span>
                <button
                  onClick={() => setActiveSection('overdue')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                    activeSection === 'overdue'
                      ? 'bg-red-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  Overdue Jobs ({userOverdueJobs.length})
                </button>
                <button
                  onClick={() => setActiveSection('jobs')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                    activeSection === 'jobs'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  All Jobs ({userJobs.length})
                </button>
                <button
                  onClick={() => setActiveSection('activities')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                    activeSection === 'activities'
                      ? 'bg-purple-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Activities ({userActivities.length})
                </button>
                <button
                  onClick={() => setActiveSection('conversion')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                    activeSection === 'conversion'
                      ? 'bg-green-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Conversion Tracker
                </button>
              </div>
            </div>

            {/* Overdue Jobs */}
            {activeSection === 'overdue' && userOverdueJobs.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                <h3 className="text-lg font-bold text-ars-heading mb-4">Overdue Jobs</h3>
                
                {/* Overdue Jobs Filters */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-ars-heading mb-3 flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filter Overdue Jobs
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                      <select
                        value={overdueStatusFilter}
                        onChange={(e) => setOverdueStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      >
                        <option value="">All Statuses</option>
                        {getUniqueOverdueStatuses().map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Admin</label>
                      <select
                        value={overdueAdminFilter}
                        onChange={(e) => setOverdueAdminFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      >
                        <option value="">All Admins</option>
                        {getUniqueOverdueAdmins().map(admin => (
                          <option key={admin} value={admin}>{admin}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Rep Code</label>
                      <select
                        value={overdueRepFilter}
                        onChange={(e) => setOverdueRepFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      >
                        <option value="">All Reps</option>
                        {getUniqueOverdueReps().map(rep => (
                          <option key={rep} value={rep}>{rep}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
                      <select
                        value={overdueBranchFilter}
                        onChange={(e) => setOverdueBranchFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      >
                        <option value="">All Branches</option>
                        {getUniqueOverdueBranches().map(branch => (
                          <option key={branch} value={branch}>{branch}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Status Changed From</label>
                      <input
                        type="date"
                        value={overdueStatusChangedFrom}
                        onChange={(e) => setOverdueStatusChangedFrom(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Status Changed To</label>
                      <input
                        type="date"
                        value={overdueStatusChangedTo}
                        onChange={(e) => setOverdueStatusChangedTo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                  {(overdueStatusFilter || overdueAdminFilter || overdueRepFilter || overdueBranchFilter || overdueStatusChangedFrom || overdueStatusChangedTo) && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-600">Active filters:</span>
                      {overdueStatusFilter && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          Status: {overdueStatusFilter}
                        </span>
                      )}
                      {overdueAdminFilter && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          Admin: {overdueAdminFilter}
                        </span>
                      )}
                      {overdueRepFilter && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                          Rep: {overdueRepFilter}
                        </span>
                      )}
                      {overdueBranchFilter && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                          Branch: {overdueBranchFilter}
                        </span>
                      )}
                      {overdueStatusChangedFrom && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs">
                          From: {formatDate(overdueStatusChangedFrom)}
                        </span>
                      )}
                      {overdueStatusChangedTo && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs">
                          To: {formatDate(overdueStatusChangedTo)}
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setOverdueStatusFilter('');
                          setOverdueAdminFilter('');
                          setOverdueRepFilter('');
                          setOverdueBranchFilter('');
                          setOverdueStatusChangedFrom('');
                          setOverdueStatusChangedTo('');
                        }}
                        className="text-xs text-ars-primary hover:text-ars-primary/80 underline"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  {getFilteredOverdueJobs().length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No overdue jobs match the selected filters.</p>
                    </div>
                  ) : (
                    getFilteredOverdueJobs().slice(0, 10).map(overdue => (
                    <div
                      key={overdue.jobId}
                      onClick={() => overdue.job && setSelectedJob(overdue.job)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                        overdue.isOverdue ? 'border-red-200 bg-red-50 hover:bg-red-100' : 'border-orange-200 bg-orange-50 hover:bg-orange-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-ars-heading">{overdue.jobNumber}</p>
                          <p className="text-sm text-ars-body">
                            {typeof overdue.job?.customer === 'object' ? overdue.job.customer?.name : ''}
                          </p>
                          <p className="text-xs text-ars-body mt-1">
                            {overdue.isOverdue ? `${overdue.daysOverdue} days overdue` : 'Approaching deadline'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-ars-heading">{overdue.currentStatus}</p>
                          <p className="text-xs text-ars-body">Expected: {overdue.expectedNextStatus}</p>
                        </div>
                      </div>
                    </div>
                  ))
                  )}
                  {getFilteredOverdueJobs().length > 10 && (
                    <p className="text-xs text-center text-gray-500 mt-4">
                      Showing 10 of {getFilteredOverdueJobs().length} filtered jobs
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Empty state for overdue when no jobs */}
            {activeSection === 'overdue' && userOverdueJobs.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-md p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-ars-heading mb-2">No Overdue Jobs!</h3>
                <p className="text-sm text-ars-body">All jobs are on track. Great work!</p>
              </div>
            )}

            {/* Recent Activities */}
            {activeSection === 'activities' && userActivities.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                <h3 className="text-lg font-bold text-ars-heading mb-4">Recent Activities</h3>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {userActivities.slice(0, 100).map(activity => (
                    <div key={activity._id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 mt-1">
                        {activity.action === 'create' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        {activity.action === 'update' && <Edit2 className="w-4 h-4 text-blue-500" />}
                        {activity.action === 'delete' && <XCircle className="w-4 h-4 text-red-500" />}
                        {activity.action === 'view' && <Eye className="w-4 h-4 text-gray-500" />}
                        {!['create', 'update', 'delete', 'view'].includes(activity.action) && (
                          <FileText className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ars-heading">{activity.description}</p>
                        <p className="text-xs text-ars-body mt-1">
                          {formatDateTime(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state for activities */}
            {activeSection === 'activities' && userActivities.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-md p-8 text-center">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-ars-heading mb-2">No Activities Found</h3>
                <p className="text-sm text-ars-body">No recent activities for this user in the selected period.</p>
              </div>
            )}

            {/* Jobs List */}
            {activeSection === 'jobs' && userJobs.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                <h3 className="text-lg font-bold text-ars-heading mb-4">Jobs ({userJobs.length})</h3>
                
                {/* Jobs Filters */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-ars-heading mb-3 flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filter Jobs
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                      <select
                        value={jobsStatusFilter}
                        onChange={(e) => setJobsStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      >
                        <option value="">All Statuses</option>
                        {getUniqueJobStatuses().map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Admin</label>
                      <select
                        value={jobsAdminFilter}
                        onChange={(e) => setJobsAdminFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      >
                        <option value="">All Admins</option>
                        {getUniqueJobAdmins().map(admin => (
                          <option key={admin} value={admin}>{admin}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Rep Code</label>
                      <select
                        value={jobsRepFilter}
                        onChange={(e) => setJobsRepFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      >
                        <option value="">All Reps</option>
                        {getUniqueJobReps().map(rep => (
                          <option key={rep} value={rep}>{rep}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
                      <select
                        value={jobsBranchFilter}
                        onChange={(e) => setJobsBranchFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      >
                        <option value="">All Branches</option>
                        {getUniqueJobBranches().map(branch => (
                          <option key={branch} value={branch}>{branch}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Status Changed From</label>
                      <input
                        type="date"
                        value={jobsStatusChangedFrom}
                        onChange={(e) => setJobsStatusChangedFrom(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Status Changed To</label>
                      <input
                        type="date"
                        value={jobsStatusChangedTo}
                        onChange={(e) => setJobsStatusChangedTo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                  {(jobsStatusFilter || jobsAdminFilter || jobsRepFilter || jobsBranchFilter || jobsStatusChangedFrom || jobsStatusChangedTo) && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-600">Active filters:</span>
                      {jobsStatusFilter && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          Status: {jobsStatusFilter}
                        </span>
                      )}
                      {jobsAdminFilter && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          Admin: {jobsAdminFilter}
                        </span>
                      )}
                      {jobsRepFilter && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                          Rep: {jobsRepFilter}
                        </span>
                      )}
                      {jobsBranchFilter && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                          Branch: {jobsBranchFilter}
                        </span>
                      )}
                      {jobsStatusChangedFrom && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs">
                          From: {formatDate(jobsStatusChangedFrom)}
                        </span>
                      )}
                      {jobsStatusChangedTo && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs">
                          To: {formatDate(jobsStatusChangedTo)}
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setJobsStatusFilter('');
                          setJobsAdminFilter('');
                          setJobsRepFilter('');
                          setJobsBranchFilter('');
                          setJobsStatusChangedFrom('');
                          setJobsStatusChangedTo('');
                        }}
                        className="text-xs text-ars-primary hover:text-ars-primary/80 underline"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {getFilteredJobs().length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No jobs match the selected filters.</p>
                    </div>
                  ) : (
                    getFilteredJobs().map(job => (
                    <div 
                      key={job._id} 
                      onClick={() => setSelectedJob(job)}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer transition-all hover:shadow-md hover:bg-gray-100"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-ars-heading">{job.jobNumber}</p>
                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                              job.status?.name === 'Job Done' ? 'bg-green-100 text-green-700' :
                              job.status?.name === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {job.status?.name || 'No Status'}
                            </span>
                          </div>
                          <p className="text-sm text-ars-body mb-2">
                            {typeof job.customer === 'object' ? job.customer?.name : ''}
                            {job.cashCustomer && ` (${job.cashCustomer})`}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-ars-body">
                            {job.startDate && (
                              <div><span className="font-medium">Start:</span> {formatDate(job.startDate)}</div>
                            )}
                            {job.dateQuoted && (
                              <div><span className="font-medium">Quoted:</span> {formatDate(job.dateQuoted)}</div>
                            )}
                            {job.poDate && (
                              <div><span className="font-medium">PO Date:</span> {formatDate(job.poDate)}</div>
                            )}
                            {job.invoiceDate && (
                              <div><span className="font-medium">Invoice Date:</span> {formatDate(job.invoiceDate)}</div>
                            )}
                            {job.poNumber && (
                              <div><span className="font-medium">PO #:</span> {job.poNumber}</div>
                            )}
                            {job.invNumber && (
                              <div><span className="font-medium">Invoice #:</span> {job.invNumber}</div>
                            )}
                            {job.rsrNumber && (
                              <div><span className="font-medium">RSR #:</span> {job.rsrNumber}</div>
                            )}
                            {job.branch && (
                              <div><span className="font-medium">Branch:</span> {typeof job.branch === 'object' ? job.branch.name : ''}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-semibold text-ars-heading">
                            R{(job.valueExVat || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                  )}
                  {getFilteredJobs().length > 0 && (jobsStatusFilter || jobsAdminFilter || jobsStatusChangedFrom || jobsStatusChangedTo) && (
                    <p className="text-xs text-center text-gray-500 mt-4 pt-4 border-t">
                      Showing {getFilteredJobs().length} of {userJobs.length} jobs
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Empty state for jobs */}
            {activeSection === 'jobs' && userJobs.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-md p-8 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-ars-heading mb-2">No Jobs Found</h3>
                <p className="text-sm text-ars-body">No jobs for this user in the selected period.</p>
              </div>
            )}

            {/* Conversion Time Tracker */}
            {activeSection === 'conversion' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-bold text-ars-heading">Conversion Time Tracker</h3>
                  <HelpIcon 
                    title={helpContent.reports.conversionTracker.title}
                    content={helpContent.reports.conversionTracker.description}
                    position="right"
                  />
                </div>
                
                {/* Conversion Tracker Filters */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-ars-heading mb-3 flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filter Analysis
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Admin</label>
                      <select
                        value={conversionAdminFilter}
                        onChange={(e) => setConversionAdminFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      >
                        <option value="">All Admins</option>
                        {getUniqueConversionAdmins().map(admin => (
                          <option key={admin} value={admin}>{admin}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Rep Code</label>
                      <select
                        value={conversionRepFilter}
                        onChange={(e) => setConversionRepFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      >
                        <option value="">All Reps</option>
                        {getUniqueConversionReps().map(rep => (
                          <option key={rep} value={rep}>{rep}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
                      <select
                        value={conversionBranchFilter}
                        onChange={(e) => setConversionBranchFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      >
                        <option value="">All Branches</option>
                        {getUniqueConversionBranches().map(branch => (
                          <option key={branch} value={branch}>{branch}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date From</label>
                      <input
                        type="date"
                        value={conversionDateFrom}
                        onChange={(e) => setConversionDateFrom(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date To</label>
                      <input
                        type="date"
                        value={conversionDateTo}
                        onChange={(e) => setConversionDateTo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                  {(conversionAdminFilter || conversionRepFilter || conversionBranchFilter || conversionDateFrom || conversionDateTo) && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-600">Active filters:</span>
                      {conversionAdminFilter && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          Admin: {conversionAdminFilter}
                        </span>
                      )}
                      {conversionRepFilter && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                          Rep: {conversionRepFilter}
                        </span>
                      )}
                      {conversionBranchFilter && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                          Branch: {conversionBranchFilter}
                        </span>
                      )}
                      {conversionDateFrom && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs">
                          From: {formatDate(conversionDateFrom)}
                        </span>
                      )}
                      {conversionDateTo && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs">
                          To: {formatDate(conversionDateTo)}
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setConversionAdminFilter('');
                          setConversionRepFilter('');
                          setConversionBranchFilter('');
                          setConversionDateFrom('');
                          setConversionDateTo('');
                          loadConversionData();
                        }}
                        className="text-xs text-ars-primary hover:text-ars-primary/80 underline"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                  
                  {/* Complete Workflow Toggle */}
                  <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
                    <button
                      onClick={loadConversionData}
                      className="px-4 py-2 bg-ars-primary text-white rounded-lg hover:bg-ars-primary/90 transition-colors text-sm font-medium"
                    >
                      Load Data
                    </button>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={conversionCompleteOnly}
                        onChange={(e) => setConversionCompleteOnly(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-ars-primary focus:ring-ars-primary"
                      />
                      <span className="text-sm text-gray-700">Complete workflow only</span>
                      <span className="text-xs text-gray-500">(numbers will add up)</span>
                    </label>
                  </div>
                </div>

                {/* Conversion Metrics */}
                {(() => {
                  const metrics = calculateConversionMetrics();
                  const segmentsTotal = metrics.avgStartToQuoted + metrics.avgQuotedToSentToClient + 
                    metrics.avgSentToClientToAwaitingPO + metrics.avgInProgressToJobDone;
                  const showMismatchNote = !conversionCompleteOnly && 
                    Math.abs(segmentsTotal - metrics.avgStartToInvoiced) > 1 && 
                    metrics.avgStartToInvoiced > 0;
                  
                  return (
                    <>
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <p className="text-sm font-semibold text-blue-900">
                              Analyzing {metrics.jobCount} jobs
                              {conversionCompleteOnly && metrics.complete.jobCount > 0 && (
                                <span className="font-normal text-blue-700 ml-1">
                                  ({metrics.complete.jobCount} with complete workflow)
                                </span>
                              )}
                            </p>
                            {!conversionCompleteOnly && metrics.complete.jobCount > 0 && (
                              <p className="text-xs text-blue-600 mt-1">
                                💡 {metrics.complete.jobCount} jobs have complete workflow data - enable "Complete workflow only" for consistent totals
                              </p>
                            )}
                          </div>
                          {conversionAdminFilter && (
                            <p className="text-xs text-blue-700">Admin: {conversionAdminFilter}</p>
                          )}
                        </div>
                        {(conversionDateFrom || conversionDateTo) && (
                          <p className="text-xs text-blue-700 mt-1">
                            Period: {conversionDateFrom || 'Start'} to {conversionDateTo || 'End'}
                          </p>
                        )}
                        {showMismatchNote && (
                          <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Note: Segment averages ({segmentsTotal.toFixed(1)}d) ≠ Total ({metrics.avgStartToInvoiced.toFixed(1)}d) because each is calculated from different job sets
                          </p>
                        )}
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        {/* Start to Quoted */}
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1">
                              <p className="text-xs font-semibold text-blue-900">Start → Quoted</p>
                              <HelpIcon 
                                title={helpContent.reports.conversionTracker.metrics.startToQuoted.title}
                                content={helpContent.reports.conversionTracker.metrics.startToQuoted.description}
                                size="sm"
                                position="top"
                              />
                            </div>
                            <Clock className="w-4 h-4 text-blue-600" />
                          </div>
                          <p className="text-2xl font-bold text-blue-900">
                            {metrics.avgStartToQuoted > 0 ? metrics.avgStartToQuoted.toFixed(1) : '0'}
                          </p>
                          <p className="text-xs text-blue-700 mt-1">days average</p>
                          <p className="text-xs text-blue-600 mt-1">({metrics.counts.startToQuoted} jobs)</p>
                        </div>

                        {/* Quoted to Sent to Client */}
                        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1">
                              <p className="text-xs font-semibold text-indigo-900">Quoted → Sent</p>
                              <HelpIcon 
                                title={helpContent.reports.conversionTracker.metrics.quotedToSent.title}
                                content={helpContent.reports.conversionTracker.metrics.quotedToSent.description}
                                size="sm"
                                position="top"
                              />
                            </div>
                            <Send className="w-4 h-4 text-indigo-600" />
                          </div>
                          <p className="text-2xl font-bold text-indigo-900">
                            {metrics.avgQuotedToSentToClient > 0 ? metrics.avgQuotedToSentToClient.toFixed(1) : '0'}
                          </p>
                          <p className="text-xs text-indigo-700 mt-1">days average</p>
                          <p className="text-xs text-indigo-600 mt-1">({metrics.counts.quotedToSentToClient} jobs)</p>
                        </div>

                        {/* Sent to Client to PO Received - THE STICKY POINT! */}
                        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border-2 border-amber-400">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1">
                              <p className="text-xs font-semibold text-amber-900">Sent → PO ⚠️</p>
                              <HelpIcon 
                                title={helpContent.reports.conversionTracker.metrics.sentToPO.title}
                                content={helpContent.reports.conversionTracker.metrics.sentToPO.description}
                                size="sm"
                                position="top"
                              />
                            </div>
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                          </div>
                          <p className="text-2xl font-bold text-amber-900">
                            {metrics.avgSentToClientToAwaitingPO > 0 ? metrics.avgSentToClientToAwaitingPO.toFixed(1) : '0'}
                          </p>
                          <p className="text-xs text-amber-700 mt-1">days (client decision)</p>
                          <p className="text-xs text-amber-600 mt-1">({metrics.counts.sentToClientToAwaitingPO} jobs)</p>
                        </div>

                        {/* PO to Invoiced */}
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1">
                              <p className="text-xs font-semibold text-purple-900">PO → Invoiced</p>
                              <HelpIcon 
                                title={helpContent.reports.conversionTracker.metrics.poToInvoiced.title}
                                content={helpContent.reports.conversionTracker.metrics.poToInvoiced.description}
                                size="sm"
                                position="top"
                              />
                            </div>
                            <Clock className="w-4 h-4 text-purple-600" />
                          </div>
                          <p className="text-2xl font-bold text-purple-900">
                            {metrics.avgInProgressToJobDone > 0 ? metrics.avgInProgressToJobDone.toFixed(1) : '0'}
                          </p>
                          <p className="text-xs text-purple-700 mt-1">days (execution)</p>
                          <p className="text-xs text-purple-600 mt-1">({metrics.counts.inProgressToJobDone} jobs)</p>
                        </div>

                        {/* Start to Invoiced (Total) */}
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-300 col-span-1 md:col-span-2">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1">
                              <p className="text-xs font-semibold text-green-900">Start → Invoiced</p>
                              <HelpIcon 
                                title={helpContent.reports.conversionTracker.metrics.totalTime.title}
                                content={helpContent.reports.conversionTracker.metrics.totalTime.description}
                                size="sm"
                                position="top"
                              />
                            </div>
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          </div>
                          <p className="text-2xl font-bold text-green-900">
                            {metrics.avgStartToInvoiced > 0 ? metrics.avgStartToInvoiced.toFixed(1) : '0'}
                          </p>
                          <p className="text-xs text-green-700 mt-1">days average (Total)</p>
                          <p className="text-xs text-green-600 mt-1">({metrics.counts.startToInvoiced} jobs)</p>
                        </div>
                      </div>

                      {/* Visual Timeline */}
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="text-sm font-semibold text-ars-heading mb-4">Average Workflow Timeline</h4>
                        <div className="flex items-center gap-2 overflow-x-auto pb-2">
                          <div className="flex-shrink-0 text-center">
                            <div className="w-20 bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded">
                              Start
                            </div>
                          </div>
                          <div className="flex-shrink-0 flex items-center gap-1">
                            <div className="text-xs font-bold text-blue-600">
                              {metrics.avgStartToQuoted > 0 ? `${metrics.avgStartToQuoted.toFixed(0)}d` : '0d'}
                            </div>
                            <div className="h-0.5 w-10 bg-blue-400"></div>
                          </div>
                          <div className="flex-shrink-0 text-center">
                            <div className="w-20 bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded">
                              Quoted
                            </div>
                          </div>
                          <div className="flex-shrink-0 flex items-center gap-1">
                            <div className="text-xs font-bold text-indigo-600">
                              {metrics.avgQuotedToSentToClient > 0 ? `${metrics.avgQuotedToSentToClient.toFixed(0)}d` : '0d'}
                            </div>
                            <div className="h-0.5 w-10 bg-indigo-400"></div>
                          </div>
                          <div className="flex-shrink-0 text-center">
                            <div className="w-20 bg-indigo-500 text-white text-xs font-medium px-2 py-1 rounded">
                              Sent
                            </div>
                          </div>
                          <div className="flex-shrink-0 flex items-center gap-1">
                            <div className="text-xs font-bold text-amber-600">
                              {metrics.avgSentToClientToAwaitingPO > 0 ? `${metrics.avgSentToClientToAwaitingPO.toFixed(0)}d` : '0d'}
                            </div>
                            <div className="h-0.5 w-10 bg-amber-400"></div>
                          </div>
                          <div className="flex-shrink-0 text-center">
                            <div className="w-24 bg-amber-500 text-white text-xs font-medium px-2 py-1 rounded">
                              PO Recv'd ⚠️
                            </div>
                          </div>
                          <div className="flex-shrink-0 flex items-center gap-1">
                            <div className="text-xs font-bold text-purple-600">
                              {metrics.avgInProgressToJobDone > 0 ? `${metrics.avgInProgressToJobDone.toFixed(0)}d` : '0d'}
                            </div>
                            <div className="h-0.5 w-10 bg-purple-400"></div>
                          </div>
                          <div className="flex-shrink-0 text-center">
                            <div className="w-20 bg-green-600 text-white text-xs font-medium px-2 py-1 rounded">
                              Invoiced
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 text-center">
                          <p className="text-sm font-semibold text-gray-700">
                            Total Average: <span className="text-green-600">{metrics.avgStartToInvoiced > 0 ? metrics.avgStartToInvoiced.toFixed(1) : '0'} days</span>
                          </p>
                          {metrics.counts.sentToClientToAwaitingPO > 0 && metrics.avgSentToClientToAwaitingPO > 7 && (
                            <p className="text-xs text-amber-600 mt-1 flex items-center justify-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Client decision time is averaging {metrics.avgSentToClientToAwaitingPO.toFixed(1)} days - consider follow-up improvements
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Customer Report */}
        {activeTab === 'customer' && (
          <div className="space-y-6">
            {/* Customer Selection */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
              <h3 className="text-lg font-bold text-ars-heading mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Select Customer
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-ars-heading mb-2">Customer</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[15px]"
                  >
                    <option value="">Select Customer</option>
                    {customers.map(customer => (
                      <option key={customer._id} value={customer._id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-ars-heading mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date Range
                  </label>
                  <select
                    value={dateRangePreset}
                    onChange={(e) => setDateRangePreset(e.target.value as DateRangePreset)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[15px]"
                  >
                    <option value="today">Today</option>
                    <option value="this-month">This Month</option>
                    <option value="last-month">Last Month</option>
                    <option value="all-time">All Time</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
                {dateRangePreset === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-ars-heading mb-2">From Date</label>
                      <input
                        type="date"
                        value={customDateFrom}
                        onChange={(e) => setCustomDateFrom(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[15px]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-heading mb-2">To Date</label>
                      <input
                        type="date"
                        value={customDateTo}
                        onChange={(e) => setCustomDateTo(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[15px]"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {selectedCustomerId && (
              <>
                {/* Summary Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-ars-body">Total Jobs</p>
                      <FileText className="w-5 h-5 text-ars-primary" />
                    </div>
                    <p className="text-3xl font-bold text-ars-heading">{customerStats.totalJobs.toLocaleString()}</p>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-ars-body">Total Value</p>
                      <Banknote className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-3xl font-bold text-ars-heading">R{customerStats.totalValue.toLocaleString()}</p>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-ars-body">Machines</p>
                      <Wrench className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold text-ars-heading">{customerStats.totalMachines.toLocaleString()}</p>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-ars-body">Avg Job Value</p>
                      <TrendingUp className="w-5 h-5 text-purple-500" />
                    </div>
                    <p className="text-3xl font-bold text-ars-heading">R{Math.round(customerStats.avgJobValue).toLocaleString()}</p>
                  </div>
                </div>

                {/* Financial Overview */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                  <h3 className="text-lg font-bold text-ars-heading mb-4 flex items-center gap-2">
                    <Banknote className="w-5 h-5" />
                    Financial Overview
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div 
                      onClick={() => customerJobs.filter(j => j.invoiceDate).length > 0 && setStatsPanelType('customer-invoiced')}
                      className={`p-4 bg-green-50 rounded-lg border border-green-200 transition-all duration-200 ${
                        customerJobs.filter(j => j.invoiceDate).length > 0 
                          ? 'cursor-pointer hover:shadow-md hover:border-green-400 hover:scale-[1.02]' 
                          : ''
                      }`}
                    >
                      <p className="text-sm font-medium text-green-800 mb-1">Invoiced</p>
                      <p className="text-2xl font-bold text-green-900">R{customerStats.invoicedValue.toLocaleString()}</p>
                      <p className="text-xs text-green-700 mt-1">
                        {customerJobs.filter(j => j.invoiceDate).length} jobs invoiced
                      </p>
                      {customerJobs.filter(j => j.invoiceDate).length > 0 && (
                        <p className="text-xs text-green-600 mt-2 font-medium">Click to view →</p>
                      )}
                    </div>
                    <div 
                      onClick={() => customerJobs.filter(j => j.dateQuoted && !j.invoiceDate).length > 0 && setStatsPanelType('customer-quoted')}
                      className={`p-4 bg-blue-50 rounded-lg border border-blue-200 transition-all duration-200 ${
                        customerJobs.filter(j => j.dateQuoted && !j.invoiceDate).length > 0 
                          ? 'cursor-pointer hover:shadow-md hover:border-blue-400 hover:scale-[1.02]' 
                          : ''
                      }`}
                    >
                      <p className="text-sm font-medium text-blue-800 mb-1">Quoted (Pending)</p>
                      <p className="text-2xl font-bold text-blue-900">R{customerStats.quotedValue.toLocaleString()}</p>
                      <p className="text-xs text-blue-700 mt-1">
                        {customerJobs.filter(j => j.dateQuoted && !j.invoiceDate).length} jobs quoted
                      </p>
                      {customerJobs.filter(j => j.dateQuoted && !j.invoiceDate).length > 0 && (
                        <p className="text-xs text-blue-600 mt-2 font-medium">Click to view →</p>
                      )}
                    </div>
                    <div 
                      onClick={() => customerJobs.filter(j => !j.dateQuoted && !j.invoiceDate).length > 0 && setStatsPanelType('customer-in-progress')}
                      className={`p-4 bg-gray-50 rounded-lg border border-gray-200 transition-all duration-200 ${
                        customerJobs.filter(j => !j.dateQuoted && !j.invoiceDate).length > 0 
                          ? 'cursor-pointer hover:shadow-md hover:border-gray-400 hover:scale-[1.02]' 
                          : ''
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-800 mb-1">In Progress</p>
                      <p className="text-2xl font-bold text-gray-900">R{customerStats.pendingValue.toLocaleString()}</p>
                      <p className="text-xs text-gray-700 mt-1">
                        {customerJobs.filter(j => !j.dateQuoted && !j.invoiceDate).length} jobs in progress
                      </p>
                      {customerJobs.filter(j => !j.dateQuoted && !j.invoiceDate).length > 0 && (
                        <p className="text-xs text-gray-600 mt-2 font-medium">Click to view →</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Jobs by Status */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                  <h3 className="text-lg font-bold text-ars-heading mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Jobs by Status
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Object.entries(customerStats.jobsByStatus)
                      .sort((a, b) => b[1].count - a[1].count)
                      .map(([status, data]) => (
                        <div key={status} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-xs font-medium text-ars-body truncate">{status}</p>
                          <p className="text-lg font-bold text-ars-heading">{data.count}</p>
                          <p className="text-xs text-ars-body">R{data.value.toLocaleString()}</p>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Revenue Over Time */}
                {Object.keys(customerStats.jobsByMonth).length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                    <h3 className="text-lg font-bold text-ars-heading mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Revenue Over Time
                    </h3>
                    <div className="overflow-x-auto">
                      <div className="flex gap-2 min-w-max pb-2">
                        {Object.entries(customerStats.jobsByMonth)
                          .sort((a, b) => a[0].localeCompare(b[0]))
                          .map(([month, data]) => {
                            const [year, monthNum] = month.split('-');
                            const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                            const maxValue = Math.max(...Object.values(customerStats.jobsByMonth).map(d => d.value));
                            const barHeight = maxValue > 0 ? (data.value / maxValue) * 100 : 0;
                            return (
                              <div key={month} className="flex flex-col items-center w-16">
                                <div className="w-full h-24 flex flex-col justify-end bg-gray-100 rounded">
                                  <div
                                    className="w-full bg-ars-primary rounded transition-all"
                                    style={{ height: `${barHeight}%` }}
                                  />
                                </div>
                                <p className="text-xs font-medium text-ars-body mt-1">{monthName}</p>
                                <p className="text-xs text-ars-body">{data.count} jobs</p>
                                <p className="text-xs text-green-600 font-medium">R{(data.value / 1000).toFixed(0)}k</p>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Team Involvement */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                  <h3 className="text-lg font-bold text-ars-heading mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Team Involvement
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Admins */}
                    <div>
                      <h4 className="text-sm font-semibold text-ars-heading mb-3 flex items-center gap-2">
                        <UserIcon className="w-4 h-4" />
                        Admins ({customerStats.uniqueAdmins})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {customerStats.adminDetails.length > 0 ? (
                          customerStats.adminDetails
                            .sort((a, b) => b.totalValue - a.totalValue)
                            .map((admin) => (
                              <div key={admin.code} className="p-2 bg-blue-50 rounded-lg">
                                <p className="font-medium text-sm text-blue-900">{admin.code}</p>
                                <p className="text-xs text-blue-700">{admin.jobCount} jobs • R{admin.totalValue.toLocaleString()}</p>
                              </div>
                            ))
                        ) : (
                          <p className="text-sm text-ars-body">No admins assigned</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Rep Codes */}
                    <div>
                      <h4 className="text-sm font-semibold text-ars-heading mb-3 flex items-center gap-2">
                        <UserIcon className="w-4 h-4" />
                        Rep Codes ({customerStats.uniqueRepCodes})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {customerStats.repDetails.length > 0 ? (
                          customerStats.repDetails
                            .sort((a, b) => b.totalValue - a.totalValue)
                            .map((rep) => (
                              <div key={rep.code} className="p-2 bg-green-50 rounded-lg">
                                <p className="font-medium text-sm text-green-900">{rep.code}</p>
                                <p className="text-xs text-green-700">{rep.jobCount} jobs • R{rep.totalValue.toLocaleString()}</p>
                              </div>
                            ))
                        ) : (
                          <p className="text-sm text-ars-body">No reps assigned</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Technicians */}
                    <div>
                      <h4 className="text-sm font-semibold text-ars-heading mb-3 flex items-center gap-2">
                        <Wrench className="w-4 h-4" />
                        Technicians ({customerStats.uniqueTechnicians})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {customerStats.techDetails.length > 0 ? (
                          customerStats.techDetails
                            .sort((a, b) => b.totalValue - a.totalValue)
                            .map((tech) => (
                              <div key={tech.name} className="p-2 bg-purple-50 rounded-lg">
                                <p className="font-medium text-sm text-purple-900">{tech.name}</p>
                                <p className="text-xs text-purple-700">{tech.jobCount} jobs • R{tech.totalValue.toLocaleString()}</p>
                              </div>
                            ))
                        ) : (
                          <p className="text-sm text-ars-body">No technicians assigned</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Machines with Service History */}
                {customerMachines.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                    <h3 className="text-lg font-bold text-ars-heading mb-4 flex items-center gap-2">
                      <Wrench className="w-5 h-5" />
                      Machines & Service History ({customerMachines.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {customerMachines.map(machine => {
                        // Find jobs that include this machine
                        const machineJobsList = customerJobs.filter(job => {
                          if (!job.machines) return false;
                          return job.machines.some(m => {
                            const machineId = typeof m === 'string' ? m : m._id;
                            return machineId === machine._id;
                          });
                        });
                        const machineValue = machineJobsList.reduce((sum, j) => sum + (j.valueExVat || 0), 0);
                        const servicesDue = machine.nextServiceHours > 0 && machine.machineHours >= machine.nextServiceHours * 0.9;

                        return (
                          <div key={machine._id} className={`p-4 rounded-lg border ${servicesDue ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-semibold text-ars-heading">{machine.make} {machine.model}</p>
                                <p className="text-sm text-ars-body">Serial: {machine.serialNumber}</p>
                              </div>
                              {servicesDue && (
                                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                                  Service Due
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                              <div>
                                <p className="text-xs text-ars-body">Current Hours</p>
                                <p className="font-semibold text-ars-heading">{machine.machineHours.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-xs text-ars-body">Next Service</p>
                                <p className={`font-semibold ${servicesDue ? 'text-orange-600' : 'text-ars-heading'}`}>
                                  {machine.nextServiceHours.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-ars-body">Jobs Done</p>
                                <p className="font-semibold text-ars-heading">{machineJobsList.length}</p>
                              </div>
                              <div>
                                <p className="text-xs text-ars-body">Total Value</p>
                                <p className="font-semibold text-green-600">R{machineValue.toLocaleString()}</p>
                              </div>
                            </div>
                            {machineJobsList.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-xs font-medium text-ars-body mb-2">Recent Jobs:</p>
                                <div className="space-y-1">
                                  {machineJobsList.slice(0, 3).map(job => (
                                    <div key={job._id} className="flex justify-between text-xs">
                                      <span className="text-ars-heading">{job.jobNumber}</span>
                                      <span className={`px-1.5 py-0.5 rounded ${
                                        job.status?.name === 'Job Done' ? 'bg-green-100 text-green-700' :
                                        job.status?.name === 'Invoiced' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-700'
                                      }`}>
                                        {job.status?.name || 'No Status'}
                                      </span>
                                    </div>
                                  ))}
                                  {machineJobsList.length > 3 && (
                                    <p className="text-xs text-ars-primary">+{machineJobsList.length - 3} more jobs</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Jobs List */}
                {customerJobs.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                    <h3 className="text-lg font-bold text-ars-heading mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      All Jobs ({customerJobs.length})
                    </h3>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {customerJobs
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map(job => (
                          <div key={job._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-ars-primary transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-ars-heading">{job.jobNumber}</p>
                                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                    job.status?.name === 'Job Done' ? 'bg-green-100 text-green-700' :
                                    job.status?.name === 'Invoiced' ? 'bg-blue-100 text-blue-700' :
                                    job.status?.name === 'In Progress' ? 'bg-purple-100 text-purple-700' :
                                    job.status?.name === 'Sent to Client' ? 'bg-amber-100 text-amber-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {job.status?.name || 'No Status'}
                                  </span>
                                </div>
                                {typeof job.description === 'object' && job.description && (
                                  <p className="text-sm text-ars-body">{(job.description as any).name}</p>
                                )}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-ars-body mt-2">
                                  {job.startDate && (
                                    <div><span className="font-medium">Start:</span> {formatDate(job.startDate)}</div>
                                  )}
                                  {job.dateQuoted && (
                                    <div><span className="font-medium">Quoted:</span> {formatDate(job.dateQuoted)}</div>
                                  )}
                                  {job.poDate && (
                                    <div><span className="font-medium">PO:</span> {formatDate(job.poDate)}</div>
                                  )}
                                  {job.invoiceDate && (
                                    <div><span className="font-medium">Invoiced:</span> {formatDate(job.invoiceDate)}</div>
                                  )}
                                </div>
                                <p className="text-xs text-ars-body mt-2">
                                  Admin: <span className="font-medium">{job.adm || 'N/A'}</span> | 
                                  Rep: <span className="font-medium">{typeof job.repCode === 'object' ? (job.repCode as any)?.code || 'N/A' : 'N/A'}</span> | 
                                  Tech: <span className="font-medium">{typeof job.techBooked === 'object' ? (job.techBooked as any)?.name || 'N/A' : 'N/A'}</span>
                                </p>
                              </div>
                              <div className="text-right ml-4">
                                <p className="text-lg font-bold text-green-600">
                                  R{(job.valueExVat || 0).toLocaleString()}
                                </p>
                                <div className="flex gap-1 mt-2">
                                  <button
                                    onClick={() => setSelectedJob(job)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="View Job"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Activity Timeline */}
                {customerActivities.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                    <h3 className="text-lg font-bold text-ars-heading mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Activity Timeline ({customerActivities.length})
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {customerActivities
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map(activity => (
                          <div key={activity._id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-shrink-0 mt-1">
                              {activity.action === 'create' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                              {activity.action === 'update' && <Edit2 className="w-4 h-4 text-blue-500" />}
                              {activity.action === 'delete' && <XCircle className="w-4 h-4 text-red-500" />}
                              {activity.action === 'view' && <Eye className="w-4 h-4 text-gray-500" />}
                              {!['create', 'update', 'delete', 'view'].includes(activity.action) && (
                                <FileText className="w-4 h-4 text-gray-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-ars-heading">{activity.description}</p>
                              <p className="text-xs text-ars-body mt-1">
                                {activity.createdAt ? new Date(activity.createdAt).toLocaleString() : ''} | 
                                By: {typeof activity.userId === 'object' && activity.userId !== null
                                  ? `${(activity.userId as any).firstName || ''} ${(activity.userId as any).lastName || ''}`.trim()
                                  : 'System'}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* No Data State */}
                {customerJobs.length === 0 && customerMachines.length === 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-md p-12 text-center">
                    <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-ars-heading mb-2">No Data Found</h3>
                    <p className="text-ars-body">
                      No jobs or machines found for this customer in the selected date range.
                      Try expanding the date range or selecting "Custom Range" with a wider period.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'machine' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
              <h3 className="text-lg font-bold text-ars-heading mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Machine Filters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ars-body mb-2">Make</label>
                  <input
                    type="text"
                    placeholder="Filter by make..."
                    value={machineMakeFilter}
                    onChange={(e) => setMachineMakeFilter(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[15px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ars-body mb-2">Model</label>
                  <input
                    type="text"
                    placeholder="Filter by model..."
                    value={machineModelFilter}
                    onChange={(e) => setMachineModelFilter(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[15px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ars-body mb-2">Serial Number</label>
                  <input
                    type="text"
                    placeholder="Filter by serial number..."
                    value={machineSerialFilter}
                    onChange={(e) => setMachineSerialFilter(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[15px]"
                  />
                </div>
              </div>
            </div>

            {loading && allMachines.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ars-primary mx-auto mb-4"></div>
                <p className="text-ars-body">Loading machine data...</p>
              </div>
            ) : allMachines.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-semibold text-ars-heading mb-2">No machines found</p>
                <p className="text-sm text-ars-body">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-ars-body">Total Machines</p>
                      <Wrench className="w-5 h-5 text-ars-primary" />
                    </div>
                    <p className="text-3xl font-bold text-ars-heading">{allMachines.length.toLocaleString()}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-ars-body">Total Jobs</p>
                      <FileText className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold text-ars-heading">{machineJobs.length.toLocaleString()}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-ars-body">Total Value</p>
                      <Banknote className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-3xl font-bold text-ars-heading">
                      R{machineJobs.reduce((sum, job) => sum + (job.valueExVat || 0), 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Machines List */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                  <h3 className="text-lg font-bold text-ars-heading mb-4">Machines & Jobs</h3>
                  <div className="space-y-6">
                    {allMachines.map((machine) => {
                      // Get jobs for this machine
                      const jobsForMachine = machineJobs.filter(job => {
                        if (!Array.isArray(job.machines) || job.machines.length === 0) return false;
                        return job.machines.some(machineRef => {
                          const machineId = typeof machineRef === 'object' && machineRef !== null
                            ? (machineRef as any)._id
                            : machineRef;
                          return String(machineId) === machine._id;
                        });
                      });

                      const customerName = typeof machine.customer === 'object' && machine.customer !== null
                        ? (machine.customer as any).name || ''
                        : '';

                      return (
                        <div key={machine._id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                          {/* Machine Info */}
                          <div className="mb-4 pb-4 border-b border-gray-200">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="text-lg font-bold text-ars-heading mb-1">
                                  {machine.make} {machine.model}
                                </h4>
                                <p className="text-sm text-ars-body">
                                  <span className="font-medium">Serial:</span> {machine.serialNumber || '-'}
                                </p>
                                {customerName && (
                                  <p className="text-sm text-ars-body mt-1">
                                    <span className="font-medium">Customer:</span> {customerName}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-ars-body mb-1">
                                  <span className="font-medium">Hours:</span> {machine.machineHours?.toLocaleString() || '0'}
                                </div>
                                <div className="text-sm text-orange-600">
                                  <span className="font-medium">Next Service:</span> {machine.nextServiceHours?.toLocaleString() || '0'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Jobs for this Machine */}
                          {jobsForMachine.length > 0 ? (
                            <div>
                              <h5 className="text-sm font-semibold text-ars-heading mb-3">
                                Jobs ({jobsForMachine.length})
                              </h5>
                              <div className="space-y-2">
                                {jobsForMachine.map((job) => (
                                  <div key={job._id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-semibold text-ars-heading">{job.jobNumber || '-'}</span>
                                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                            job.status?.name === 'Job Done' ? 'bg-green-100 text-green-700' :
                                            job.status?.name === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-700'
                                          }`}>
                                            {job.status?.name || 'No Status'}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-ars-body mt-2">
                                          {job.startDate && (
                                            <div>
                                              <span className="font-medium">Start:</span> {formatDate(job.startDate)}
                                            </div>
                                          )}
                                          {job.dateQuoted && (
                                            <div>
                                              <span className="font-medium">Quoted:</span> {formatDate(job.dateQuoted)}
                                            </div>
                                          )}
                                          {job.poDate && (
                                            <div>
                                              <span className="font-medium">PO Date:</span> {formatDate(job.poDate)}
                                            </div>
                                          )}
                                          {job.invoiceDate && (
                                            <div>
                                              <span className="font-medium">Invoice Date:</span> {formatDate(job.invoiceDate)}
                                            </div>
                                          )}
                                          {job.valueExVat && (
                                            <div>
                                              <span className="font-medium">Value:</span> R{job.valueExVat.toLocaleString()}
                                            </div>
                                          )}
                                          {job.branch && (
                                            <div>
                                              <span className="font-medium">Branch:</span> {typeof job.branch === 'object' ? job.branch.name : ''}
                                            </div>
                                          )}
                                          {job.poNumber && (
                                            <div>
                                              <span className="font-medium">PO #:</span> {job.poNumber}
                                            </div>
                                          )}
                                          {job.invNumber && (
                                            <div>
                                              <span className="font-medium">Invoice #:</span> {job.invNumber}
                                            </div>
                                          )}
                                          {job.rsrNumber && (
                                            <div>
                                              <span className="font-medium">RSR #:</span> {job.rsrNumber}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-ars-body mt-2">
                                          {job.adm && (
                                            <span><span className="font-medium">Admin:</span> {job.adm}</span>
                                          )}
                                          {job.repCode && (
                                            <span>
                                              <span className="font-medium">Rep:</span> {typeof job.repCode === 'object' ? (job.repCode as any).code : ''}
                                            </span>
                                          )}
                                          {job.techBooked && (
                                            <span>
                                              <span className="font-medium">Tech:</span> {typeof job.techBooked === 'object' ? (job.techBooked as any).name : ''}
                                            </span>
                                          )}
                                        </div>
                                        {job.description && (
                                          <div className="text-xs text-ars-body mt-2">
                                            <span className="font-medium">Description:</span> {typeof job.description === 'object' ? (job.description as any).name : ''}
                                          </div>
                                        )}
                                        {job.feedback && (
                                          <div className="text-xs text-ars-body mt-2 pt-2 border-t border-gray-200">
                                            <span className="font-medium">Feedback:</span> {job.feedback}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-ars-body italic">No jobs associated with this machine</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Job Details Popup Modal */}
      {selectedJob && (
        <LeadDetails
          lead={selectedJob}
          statuses={statuses}
          branches={branches}
          onClose={() => setSelectedJob(null)}
          onUpdate={() => {
            // Reload the report data after update
            if (activeTab === 'user-performance') {
              loadUserPerformanceData();
            } else if (activeTab === 'customer') {
              loadCustomerReport();
            } else if (activeTab === 'machine') {
              loadMachineReport();
            }
            setSelectedJob(null);
          }}
        />
      )}

      {/* Stats Panel Slide-out */}
      {statsPanelType && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setStatsPanelType(null)}
          />
          
          {/* Slide-out Panel */}
          <div className="absolute inset-y-0 right-0 max-w-2xl w-full bg-white shadow-2xl flex flex-col animate-slide-in-right">
            {/* Panel Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              statsPanelType === 'user-overdue-jobs' ? 'bg-red-50 border-red-200' :
              statsPanelType === 'customer-invoiced' ? 'bg-green-50 border-green-200' :
              statsPanelType === 'customer-quoted' ? 'bg-blue-50 border-blue-200' :
              statsPanelType === 'customer-in-progress' ? 'bg-gray-50 border-gray-200' :
              'bg-ars-primary/10 border-ars-primary/20'
            }`}>
              <div>
                <h3 className="text-lg font-bold text-ars-heading">
                  {statsPanelType === 'user-total-jobs' && 'All Jobs'}
                  {statsPanelType === 'user-overdue-jobs' && 'Overdue Jobs'}
                  {statsPanelType === 'customer-invoiced' && 'Invoiced Jobs'}
                  {statsPanelType === 'customer-quoted' && 'Quoted Jobs (Pending)'}
                  {statsPanelType === 'customer-in-progress' && 'Jobs In Progress'}
                </h3>
                <p className="text-sm text-ars-body">
                  {statsPanelType === 'user-total-jobs' && `${userJobs.length} jobs`}
                  {statsPanelType === 'user-overdue-jobs' && `${userOverdueJobs.length} overdue jobs`}
                  {statsPanelType === 'customer-invoiced' && `${customerJobs.filter(j => j.invoiceDate).length} jobs`}
                  {statsPanelType === 'customer-quoted' && `${customerJobs.filter(j => j.dateQuoted && !j.invoiceDate).length} jobs`}
                  {statsPanelType === 'customer-in-progress' && `${customerJobs.filter(j => !j.dateQuoted && !j.invoiceDate).length} jobs`}
                </p>
              </div>
              <button
                onClick={() => setStatsPanelType(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {/* User Performance - Total Jobs */}
                {statsPanelType === 'user-total-jobs' && userJobs.map(job => (
                  <div 
                    key={job._id}
                    onClick={() => {
                      setSelectedJob(job);
                    }}
                    className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-ars-primary cursor-pointer transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-ars-heading">{job.jobNumber}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        typeof job.status === 'object' && job.status?.name 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {typeof job.status === 'object' ? job.status?.name : job.status || 'No Status'}
                      </span>
                    </div>
                    <p className="text-sm text-ars-body mb-1">
                      {typeof job.customer === 'object' ? job.customer?.companyName : 'Unknown Customer'}
                    </p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-ars-body">{formatDate(job.dateOfJob)}</span>
                      <span className="font-semibold text-green-600">R{(job.quoteValue || 0).toLocaleString()}</span>
                    </div>
                  </div>
                ))}

                {/* User Performance - Overdue Jobs */}
                {statsPanelType === 'user-overdue-jobs' && userOverdueJobs.map(overdueJob => (
                  <div 
                    key={overdueJob.jobId}
                    onClick={() => {
                      // Use the nested job object if available, otherwise construct minimal job data
                      if (overdueJob.job) {
                        setSelectedJob(overdueJob.job);
                      }
                    }}
                    className={`p-4 bg-white border border-red-200 rounded-lg transition-all ${
                      overdueJob.job ? 'hover:shadow-md hover:border-red-400 cursor-pointer' : 'opacity-75'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-ars-heading">{overdueJob.jobNumber}</span>
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                        {overdueJob.daysOverdue || overdueJob.daysInStatus} days overdue
                      </span>
                    </div>
                    <p className="text-sm text-ars-body mb-1">
                      {overdueJob.job?.customer && typeof overdueJob.job.customer === 'object' 
                        ? overdueJob.job.customer?.companyName 
                        : 'Unknown Customer'}
                    </p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-ars-body">{overdueJob.job?.dateOfJob ? formatDate(overdueJob.job.dateOfJob) : '-'}</span>
                      <span className="font-semibold text-green-600">R{(overdueJob.job?.quoteValue || 0).toLocaleString()}</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Status: {overdueJob.currentStatus || 'Unknown'}
                    </div>
                  </div>
                ))}

                {/* Customer Report - Invoiced */}
                {statsPanelType === 'customer-invoiced' && customerJobs.filter(j => j.invoiceDate).map(job => (
                  <div 
                    key={job._id}
                    onClick={() => setSelectedJob(job)}
                    className="p-4 bg-white border border-green-200 rounded-lg hover:shadow-md hover:border-green-400 cursor-pointer transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-ars-heading">{job.jobNumber}</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        Invoiced
                      </span>
                    </div>
                    <p className="text-sm text-ars-body mb-1">
                      Invoice Date: {formatDate(job.invoiceDate)}
                    </p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-ars-body">Job Date: {formatDate(job.dateOfJob)}</span>
                      <span className="font-semibold text-green-600">R{(job.quoteValue || 0).toLocaleString()}</span>
                    </div>
                  </div>
                ))}

                {/* Customer Report - Quoted (Pending) */}
                {statsPanelType === 'customer-quoted' && customerJobs.filter(j => j.dateQuoted && !j.invoiceDate).map(job => (
                  <div 
                    key={job._id}
                    onClick={() => setSelectedJob(job)}
                    className="p-4 bg-white border border-blue-200 rounded-lg hover:shadow-md hover:border-blue-400 cursor-pointer transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-ars-heading">{job.jobNumber}</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        Quoted - Pending
                      </span>
                    </div>
                    <p className="text-sm text-ars-body mb-1">
                      Quoted: {formatDate(job.dateQuoted)}
                    </p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-ars-body">Job Date: {formatDate(job.dateOfJob)}</span>
                      <span className="font-semibold text-blue-600">R{(job.quoteValue || 0).toLocaleString()}</span>
                    </div>
                  </div>
                ))}

                {/* Customer Report - In Progress */}
                {statsPanelType === 'customer-in-progress' && customerJobs.filter(j => !j.dateQuoted && !j.invoiceDate).map(job => (
                  <div 
                    key={job._id}
                    onClick={() => setSelectedJob(job)}
                    className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-gray-400 cursor-pointer transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-ars-heading">{job.jobNumber}</span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                        In Progress
                      </span>
                    </div>
                    <p className="text-sm text-ars-body mb-1">
                      Status: {typeof job.status === 'object' ? job.status?.name : job.status || 'Unknown'}
                    </p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-ars-body">Job Date: {formatDate(job.dateOfJob)}</span>
                      <span className="font-semibold text-gray-600">R{(job.quoteValue || 0).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel Footer with Total */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-ars-body">Total Value:</span>
                <span className="text-lg font-bold text-green-600">
                  R{(
                    statsPanelType === 'user-total-jobs' 
                      ? userJobs.reduce((sum, j) => sum + (j.quoteValue || 0), 0)
                    : statsPanelType === 'user-overdue-jobs'
                      ? userOverdueJobs.reduce((sum, oj) => sum + (oj.job?.quoteValue || 0), 0)
                    : statsPanelType === 'customer-invoiced'
                      ? customerJobs.filter(j => j.invoiceDate).reduce((sum, j) => sum + (j.quoteValue || 0), 0)
                    : statsPanelType === 'customer-quoted'
                      ? customerJobs.filter(j => j.dateQuoted && !j.invoiceDate).reduce((sum, j) => sum + (j.quoteValue || 0), 0)
                    : customerJobs.filter(j => !j.dateQuoted && !j.invoiceDate).reduce((sum, j) => sum + (j.quoteValue || 0), 0)
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
