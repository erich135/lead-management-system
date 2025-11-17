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
  CheckCircle2,
  XCircle,
  Eye,
  Edit2
} from 'lucide-react';

interface ReportsProps {
  statuses: any[];
  branches: any[];
}

type ReportTab = 'user-performance' | 'customer' | 'machine';

type UserRole = 'admin' | 'rep' | 'technician';

type DateRangePreset = 'today' | 'this-month' | 'last-month' | 'custom';

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
  const [customDateTo, setCustomDateTo] = useState<string>('');
  
  // Customer Report State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  
  // Machine Report State
  const [machineMakeFilter, setMachineMakeFilter] = useState<string>('');
  const [machineModelFilter, setMachineModelFilter] = useState<string>('');
  const [machineSerialFilter, setMachineSerialFilter] = useState<string>('');
  
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
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [activeTab, selectedCustomerId]);

  /**
   * Loads machine data when machine tab is active or filters change.
   */
  useEffect(() => {
    if (activeTab === 'machine') {
      loadMachineData();
    }
  }, [activeTab, machineMakeFilter, machineModelFilter, machineSerialFilter]);

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
   * Loads customer data.
   */
  async function loadCustomerData() {
    try {
      setLoading(true);
      setError(null);

      if (!selectedCustomerId) return;

      const { startDate, endDate } = getDateRange();

      // Load customer jobs
      const jobsResponse = await getJobs({
        customer: selectedCustomerId,
        allTime: 'true',
        startDate,
        endDate,
      });
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
      job.startDate ? new Date(job.startDate).toLocaleDateString() : '',
      job.dateQuoted ? new Date(job.dateQuoted).toLocaleDateString() : '',
      job.valueExVat || 0,
      job.adm || '',
      typeof job.repCode === 'object' ? (job.repCode as any)?.code || '' : '',
      typeof job.techBooked === 'object' ? (job.techBooked as any)?.name || '' : '',
      typeof job.branch === 'object' ? job.branch?.name || '' : '',
      typeof job.description === 'object' ? (job.description as any)?.name || '' : '',
      job.feedback || '',
      job.rsrNumber || '',
      job.poNumber || '',
      job.poDate ? new Date(job.poDate).toLocaleDateString() : '',
      job.invNumber || '',
      job.invoiceDate ? new Date(job.invoiceDate).toLocaleDateString() : '',
    ]);

    // Activities CSV
    const activityHeaders = ['Date', 'Time', 'Action', 'Resource Type', 'Description', 'IP Address'];
    const activityRows = userActivities.map(act => [
      act.createdAt ? new Date(act.createdAt).toLocaleDateString() : '',
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
      job.startDate ? new Date(job.startDate).toLocaleDateString() : '',
      job.dateQuoted ? new Date(job.dateQuoted).toLocaleDateString() : '',
      job.valueExVat || 0,
      job.adm || '',
      typeof job.repCode === 'object' ? (job.repCode as any)?.code || '' : '',
      typeof job.techBooked === 'object' ? (job.techBooked as any)?.name || '' : '',
      typeof job.branch === 'object' ? job.branch?.name || '' : '',
      typeof job.description === 'object' ? (job.description as any)?.name || '' : '',
      job.feedback || '',
      job.rsrNumber || '',
      job.poNumber || '',
      job.poDate ? new Date(job.poDate).toLocaleDateString() : '',
      job.invNumber || '',
      job.invoiceDate ? new Date(job.invoiceDate).toLocaleDateString() : '',
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
      act.createdAt ? new Date(act.createdAt).toLocaleDateString() : '',
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
            job.startDate ? new Date(job.startDate).toLocaleDateString() : '',
            job.dateQuoted ? new Date(job.dateQuoted).toLocaleDateString() : '',
            job.valueExVat?.toString() || '0',
            job.adm || '',
            typeof job.repCode === 'object' ? (job.repCode as any)?.code || '' : '',
            typeof job.techBooked === 'object' ? (job.techBooked as any)?.name || '' : '',
            typeof job.branch === 'object' ? job.branch?.name || '' : '',
            typeof job.description === 'object' ? (job.description as any)?.name || '' : '',
            job.rsrNumber || '',
            job.poNumber || '',
            job.poDate ? new Date(job.poDate).toLocaleDateString() : '',
            job.invNumber || '',
            job.invoiceDate ? new Date(job.invoiceDate).toLocaleDateString() : ''
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
   * Calculates customer statistics.
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

    return {
      totalJobs,
      totalValue,
      totalMachines,
      totalActivities,
      uniqueAdmins: admins.size,
      uniqueRepCodes: repCodes.size,
      uniqueTechnicians: technicians.size,
    };
  }

  const userStats = calculateUserStats();
  const customerStats = calculateCustomerStats();

  if (loading && userJobs.length === 0 && customerJobs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ars-primary mx-auto mb-4"></div>
          <p className="text-ars-body">Loading report data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-ars-heading">Reports & Analytics</h2>
          {activeTab === 'user-performance' && (
            <button
              onClick={exportUserPerformanceReport}
              className="bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] px-4 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
          )}
          {activeTab === 'customer' && (
            <button
              onClick={exportCustomerReport}
              disabled={!selectedCustomerId}
              className="bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] px-4 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
          )}
          {activeTab === 'machine' && (
            <button
              onClick={exportMachineReport}
              className="bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] px-4 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Export Report
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
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  <label className="block text-sm font-semibold text-ars-heading mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date Range
                  </label>
                  <select
                    value={dateRangePreset}
                    onChange={(e) => setDateRangePreset(e.target.value as DateRangePreset)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
                  >
                    <option value="today">Today</option>
                    <option value="this-month">This Month</option>
                    <option value="last-month">Last Month</option>
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
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-heading mb-2">To Date</label>
                      <input
                        type="date"
                        value={customDateTo}
                        onChange={(e) => setCustomDateTo(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-ars-body">Total Jobs</p>
                  <FileText className="w-5 h-5 text-ars-primary" />
                </div>
                <p className="text-3xl font-bold text-ars-heading">{userStats.totalJobs.toLocaleString()}</p>
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

              <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-ars-body">Overdue Jobs</p>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-3xl font-bold text-ars-heading">{userStats.overdueCount.toLocaleString()}</p>
              </div>
            </div>

            {/* Overdue Jobs */}
            {userOverdueJobs.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                <h3 className="text-lg font-bold text-ars-heading mb-4">Overdue Jobs</h3>
                <div className="space-y-3">
                  {userOverdueJobs.slice(0, 10).map(overdue => (
                    <div
                      key={overdue.jobId}
                      className={`p-4 rounded-lg border-2 ${
                        overdue.isOverdue ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'
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
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activities */}
            {userActivities.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                <h3 className="text-lg font-bold text-ars-heading mb-4">Recent Activities</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {userActivities.slice(0, 50).map(activity => (
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
                          {activity.createdAt ? new Date(activity.createdAt).toLocaleString() : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Jobs List */}
            {userJobs.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                <h3 className="text-lg font-bold text-ars-heading mb-4">Jobs ({userJobs.length})</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {userJobs.map(job => (
                    <div key={job._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
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
                              <div><span className="font-medium">Start:</span> {new Date(job.startDate).toLocaleDateString()}</div>
                            )}
                            {job.dateQuoted && (
                              <div><span className="font-medium">Quoted:</span> {new Date(job.dateQuoted).toLocaleDateString()}</div>
                            )}
                            {job.poDate && (
                              <div><span className="font-medium">PO Date:</span> {new Date(job.poDate).toLocaleDateString()}</div>
                            )}
                            {job.invoiceDate && (
                              <div><span className="font-medium">Invoice Date:</span> {new Date(job.invoiceDate).toLocaleDateString()}</div>
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
                  ))}
                </div>
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
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
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
                  <label className="block text-sm font-semibold text-ars-heading mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date Range
                  </label>
                  <select
                    value={dateRangePreset}
                    onChange={(e) => setDateRangePreset(e.target.value as DateRangePreset)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
                  >
                    <option value="today">Today</option>
                    <option value="this-month">This Month</option>
                    <option value="last-month">Last Month</option>
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
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-heading mb-2">To Date</label>
                      <input
                        type="date"
                        value={customDateTo}
                        onChange={(e) => setCustomDateTo(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {selectedCustomerId && (
              <>
                {/* Statistics Cards */}
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
                      <p className="text-sm font-medium text-ars-body">Activities</p>
                      <TrendingUp className="w-5 h-5 text-purple-500" />
                    </div>
                    <p className="text-3xl font-bold text-ars-heading">{customerStats.totalActivities.toLocaleString()}</p>
                  </div>
                </div>

                {/* Who Worked on This Customer */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                  <h3 className="text-lg font-bold text-ars-heading mb-4">Who Worked on This Customer</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-ars-body mb-2">Admins</p>
                      <p className="text-2xl font-bold text-ars-heading">{customerStats.uniqueAdmins}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-ars-body mb-2">Rep Codes</p>
                      <p className="text-2xl font-bold text-ars-heading">{customerStats.uniqueRepCodes}</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm font-medium text-ars-body mb-2">Technicians</p>
                      <p className="text-2xl font-bold text-ars-heading">{customerStats.uniqueTechnicians}</p>
                    </div>
                  </div>
                </div>

                {/* Machines */}
                {customerMachines.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                    <h3 className="text-lg font-bold text-ars-heading mb-4">Machines ({customerMachines.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {customerMachines.map(machine => (
                        <div key={machine._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="font-semibold text-ars-heading">{machine.make} {machine.model}</p>
                          <p className="text-sm text-ars-body mt-1">Serial: {machine.serialNumber}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-ars-body">
                              Hours: <span className="font-semibold">{machine.machineHours.toLocaleString()}</span>
                            </p>
                            <p className="text-xs text-ars-body">
                              Next Service: <span className="font-semibold">{machine.nextServiceHours.toLocaleString()}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Jobs List */}
                {customerJobs.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                    <h3 className="text-lg font-bold text-ars-heading mb-4">Jobs ({customerJobs.length})</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {customerJobs.map(job => (
                        <div key={job._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
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
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-ars-body mt-2">
                                {job.startDate && (
                                  <div><span className="font-medium">Start:</span> {new Date(job.startDate).toLocaleDateString()}</div>
                                )}
                                {job.dateQuoted && (
                                  <div><span className="font-medium">Quoted:</span> {new Date(job.dateQuoted).toLocaleDateString()}</div>
                                )}
                                {job.poDate && (
                                  <div><span className="font-medium">PO Date:</span> {new Date(job.poDate).toLocaleDateString()}</div>
                                )}
                                {job.invoiceDate && (
                                  <div><span className="font-medium">Invoice Date:</span> {new Date(job.invoiceDate).toLocaleDateString()}</div>
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
                              <p className="text-xs text-ars-body mt-2">
                                Admin: {job.adm || 'N/A'} | 
                                Rep: {typeof job.repCode === 'object' ? (job.repCode as any)?.code || 'N/A' : 'N/A'} | 
                                Tech: {typeof job.techBooked === 'object' ? (job.techBooked as any)?.name || 'N/A' : 'N/A'}
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-sm font-semibold text-ars-heading">
                                R{(job.valueExVat || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          {job.feedback && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs text-ars-body">
                                <span className="font-medium">Feedback:</span> {job.feedback}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activities */}
                {customerActivities.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                    <h3 className="text-lg font-bold text-ars-heading mb-4">Activity History</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {customerActivities.map(activity => (
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
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ars-body mb-2">Model</label>
                  <input
                    type="text"
                    placeholder="Filter by model..."
                    value={machineModelFilter}
                    onChange={(e) => setMachineModelFilter(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ars-body mb-2">Serial Number</label>
                  <input
                    type="text"
                    placeholder="Filter by serial number..."
                    value={machineSerialFilter}
                    onChange={(e) => setMachineSerialFilter(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
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
                                              <span className="font-medium">Start:</span> {new Date(job.startDate).toLocaleDateString()}
                                            </div>
                                          )}
                                          {job.dateQuoted && (
                                            <div>
                                              <span className="font-medium">Quoted:</span> {new Date(job.dateQuoted).toLocaleDateString()}
                                            </div>
                                          )}
                                          {job.poDate && (
                                            <div>
                                              <span className="font-medium">PO Date:</span> {new Date(job.poDate).toLocaleDateString()}
                                            </div>
                                          )}
                                          {job.invoiceDate && (
                                            <div>
                                              <span className="font-medium">Invoice Date:</span> {new Date(job.invoiceDate).toLocaleDateString()}
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
    </div>
  );
}
