import { useState, useEffect, useRef } from 'react';
import { getJobs, updateJob, getCustomers, getTechnicians, getOverdueJobs, getRepCodes, getAdminCodes, type Job, type Status, type Branch, type Customer, type Technician, type OverdueJob, type RepCode, type AdminCode } from '../lib/api';
import { Search, Filter, Plus, AlertCircle, Calendar, Eye, Clock, CheckCircle2, X, Zap, FileText, User, Building2, DollarSign, Wrench, Sparkles, ArrowRight, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { LeadDetails } from './LeadDetails';
import { useAuth } from '../contexts/AuthContext';

interface LeadsListProps {
  onLeadClick: (lead: Job) => void;
  onCreateNew: () => void;
  statuses: Status[];
  branches: Branch[];
  refreshKey?: number; // When this changes, refresh the job list
}


export function LeadsList({ onLeadClick, onCreateNew, statuses, branches, refreshKey }: LeadsListProps) {
  const { user, isSuperAdmin } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [overdueJobs, setOverdueJobs] = useState<OverdueJob[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [admFilter, setAdmFilter] = useState<string>('all');
  const [repCodeFilter, setRepCodeFilter] = useState<string>('all');
  const [technicianFilter, setTechnicianFilter] = useState<string>('all');
  const [showHiddenJobs, setShowHiddenJobs] = useState(false); // Toggle for Super Admins to show hidden jobs
  const [priorityFilter, setPriorityFilter] = useState<{
    overdue: boolean;
    approaching: boolean;
    open: boolean;
    all: boolean;
  }>({
    overdue: false,
    approaching: false,
    open: false,
    all: true, // Default to "All Jobs" on page load
  });
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [repCodes, setRepCodes] = useState<RepCode[]>([]);
  const [adminCodes, setAdminCodes] = useState<AdminCode[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(24); // 24 items per page (good for grid)
  const [isLoadingJobs, setIsLoadingJobs] = useState(false); // Track if we're actively loading jobs
  const isLoadingAllJobsRef = useRef(false); // Ref to track if we're loading all jobs (prevents race conditions)
  const isAllJobsModeRef = useRef(false); // Ref to track if we're in "all jobs" mode (prevents overdue requests from overwriting)
  
  // Machines visibility state - load from localStorage
  const [showMachinesGlobal, setShowMachinesGlobal] = useState<boolean>(() => {
    const saved = localStorage.getItem('leadsList_showMachines');
    return saved !== null ? saved === 'true' : true; // Default to showing machines
  });
  const [expandedMachines, setExpandedMachines] = useState<Set<string>>(new Set());

  /**
   * Extracts the numeric part from a job number for sorting.
   * Example: "J1568" -> 1568, "CE1990" -> 1990
   * This allows sorting by numeric value regardless of branch prefix.
   */
  const getJobNumberValue = (jobNumber: string | undefined): number => {
    if (!jobNumber) return 0;
    // Extract numeric part from job number (e.g., "J1568" -> 1568, "CE1990" -> 1990)
    const numericPart = jobNumber.replace(/^[A-Z]+/i, '');
    const num = parseInt(numericPart, 10);
    return isNaN(num) ? 0 : num;
  };

  /**
   * Sorts jobs by job number (numeric part) in descending order (highest first).
   * This ensures J1568 appears before CE1989, and CE1990 appears before CE1989.
   */
  const sortJobsByJobNumber = (jobs: Job[]): Job[] => {
    return [...jobs].sort((a, b) => {
      const numA = getJobNumberValue(a.jobNumber);
      const numB = getJobNumberValue(b.jobNumber);
      // Sort descending (highest first)
      return numB - numA;
    });
  };

  // Get admin code codes for filter dropdown
  const adminCodeOptions = adminCodes
    .filter(ac => ac.isActive)
    .map(ac => ac.code)
    .sort();

  // Initialize refs based on initial state
  useEffect(() => {
    isAllJobsModeRef.current = priorityFilter.all;
  }, []);

  useEffect(() => {
    // Update the ref to track current "all" mode state
    isAllJobsModeRef.current = priorityFilter.all;
    
    if (priorityFilter.all) {
      loadAllJobs();
    } else {
      loadOverdueJobsList();
    }
  }, [priorityFilter.all, showHiddenJobs]); // Reload when all changes OR when showHiddenJobs changes

  // Refresh jobs when refreshKey changes (triggered from parent after job creation)
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      if (priorityFilter.all) {
        loadAllJobs();
      } else {
        loadOverdueJobsList();
      }
    }
  }, [refreshKey]);

  useEffect(() => {
    loadCustomers();
    loadTechnicians();
    loadRepCodes();
    loadAdminCodes();
  }, []);

  // Auto-set admin filter for admin users
  useEffect(() => {
    if (user?.role?.name === 'admin' && !user?.isSuperAdmin && user?.adminCode?.code) {
      if (admFilter === 'all') {
        setAdmFilter(user.adminCode.code);
      }
    }
  }, [user, adminCodes]);

  // Auto-set rep code filter for rep users
  useEffect(() => {
    if (user?.role?.name === 'rep' && !user?.isSuperAdmin && user?.repCode?.code) {
      // Find the rep code ID from the repCodes list
      const userRepCode = repCodes.find(rc => rc.code === user.repCode?.code);
      if (userRepCode && repCodeFilter === 'all') {
        setRepCodeFilter(userRepCode._id);
      }
    }
  }, [user, repCodes]);

  // Auto-set technician filter for technician users
  useEffect(() => {
    if (user?.role?.name === 'technician' && !user?.isSuperAdmin && user?.technician?.id) {
      if (technicianFilter === 'all') {
        setTechnicianFilter(user.technician.id);
      }
    }
  }, [user, technicians]);

  useEffect(() => {
    // Only apply filters if not loading and not actively loading jobs
    // This prevents applyFilters from running while loadAllJobs is setting state
    // Also skip if we're in "all" mode - loadAllJobs handles filtering directly
    if (!loading && !isLoadingJobs && !priorityFilter.all) {
      applyFilters();
    }
  }, [jobs, searchTerm, statusFilter, branchFilter, admFilter, repCodeFilter, technicianFilter, priorityFilter, overdueJobs, loading, isLoadingJobs]);

  // Handle filter changes when in "All Jobs" mode (re-filter existing jobs without re-fetching)
  // This only runs when filters change, NOT when jobs are initially loaded (loadAllJobs handles that)
  useEffect(() => {
    // Only re-filter if:
    // 1. Not loading
    // 2. In "all" mode
    // 3. We have jobs loaded
    // 4. We're not in the middle of loading all jobs (prevents race condition)
    if (!loading && !isLoadingJobs && !isLoadingAllJobsRef.current && priorityFilter.all && jobs.length > 0) {
      let filtered = [...jobs];
      
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(job => {
          const repCode = getRepCodeFromJob(job);
          return (
            job.jobNumber?.toLowerCase().includes(searchLower) ||
            job.customer?.name?.toLowerCase().includes(searchLower) ||
            job.cashCustomer?.toLowerCase().includes(searchLower) ||
            job.adm?.toLowerCase().includes(searchLower) ||
            job.branch?.name?.toLowerCase().includes(searchLower) ||
            repCode?.code?.toLowerCase().includes(searchLower)
          );
        });
      }
      
      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(job => job.status?._id === statusFilter);
      }
      
      // Apply branch filter
      if (branchFilter !== 'all') {
        filtered = filtered.filter(job => job.branch?._id === branchFilter);
      }
      
      // Apply admin filter
      if (admFilter !== 'all') {
        filtered = filtered.filter(job => job.adm === admFilter);
      }
      
      // Apply rep code filter
      if (repCodeFilter !== 'all') {
        filtered = filtered.filter(job => {
          // Handle both string ID and object formats
          if (typeof job.repCode === 'string') {
            return job.repCode === repCodeFilter;
          }
          if (typeof job.repCode === 'object' && job.repCode?._id) {
            return job.repCode._id === repCodeFilter;
          }
          return false;
        });
      }
      
      // Apply technician filter
      if (technicianFilter !== 'all') {
        filtered = filtered.filter(job => {
          // Handle both string ID and object formats
          if (typeof job.techBooked === 'string') {
            return job.techBooked === technicianFilter;
          }
          if (typeof job.techBooked === 'object' && job.techBooked?._id) {
            return job.techBooked._id === technicianFilter;
          }
          return false;
        });
      }
      
      // Sort by job number (numeric part) descending when in "All Jobs" mode
      // Otherwise, sort by date descending for overdue/approaching/open filters
      if (priorityFilter.all) {
        filtered = sortJobsByJobNumber(filtered);
      } else {
        filtered.sort((a, b) => {
          const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
          const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
          return dateB - dateA;
        });
      }
      
      setFilteredJobs(filtered);
      setCurrentPage(1);
    }
  }, [searchTerm, statusFilter, branchFilter, admFilter, repCodeFilter, technicianFilter, priorityFilter.all]);

  async function loadAllJobs() {
    try {
      setLoading(true);
      setIsLoadingJobs(true); // Prevent applyFilters from running
      isLoadingAllJobsRef.current = true; // Prevent filter-change effect from running
      isAllJobsModeRef.current = true; // Mark that we're in "all jobs" mode (prevents overdue requests from overwriting)
      
      // Clear existing jobs immediately to show loading state
      setJobs([]);
      setFilteredJobs([]);
      
      // Load all jobs without date restrictions
      // We'll need to paginate through multiple pages to get all jobs
      let allJobs: Job[] = [];
      let currentPage = 1;
      let hasMore = true;
      const pageSize = 1000; // Large page size to minimize requests
      
      while (hasMore) {
        const data = await getJobs({
          sortBy: 'startDate',
          sortOrder: 'desc',
          page: currentPage,
          limit: pageSize,
          allTime: 'true', // Get ALL jobs, not just last 3 months
          includeHidden: showHiddenJobs ? true : undefined, // If true, show only hidden jobs. If false/undefined, exclude hidden jobs.
        });
        
        const jobsList = data.jobs || [];
        allJobs = [...allJobs, ...jobsList];
        
        // Check if there are more pages
        const totalPages = data.pagination?.pages || 1;
        hasMore = currentPage < totalPages && jobsList.length === pageSize;
        currentPage++;
        
        // Safety limit: don't fetch more than 10 pages (10,000 jobs)
        if (currentPage > 10) break;
      }
      
      // Sort by job number (numeric part) descending (highest to lowest)
      // This ensures J1568 appears before CE1989, and CE1990 appears before CE1989
      allJobs = sortJobsByJobNumber(allJobs);
      
      // Apply filters with the new jobs data immediately
      // We need to apply all filters (search, status, branch, admin) to the new jobs
      let filtered = [...allJobs];
      
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(job => {
          const repCode = getRepCodeFromJob(job);
          return (
            job.jobNumber?.toLowerCase().includes(searchLower) ||
            job.customer?.name?.toLowerCase().includes(searchLower) ||
            job.cashCustomer?.toLowerCase().includes(searchLower) ||
            job.adm?.toLowerCase().includes(searchLower) ||
            job.branch?.name?.toLowerCase().includes(searchLower) ||
            repCode?.code?.toLowerCase().includes(searchLower)
          );
        });
      }
      
      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(job => job.status?._id === statusFilter);
      }
      
      // Apply branch filter
      if (branchFilter !== 'all') {
        filtered = filtered.filter(job => job.branch?._id === branchFilter);
      }
      
      // Apply admin filter
      if (admFilter !== 'all') {
        filtered = filtered.filter(job => job.adm === admFilter);
      }
      
      // Apply rep code filter
      if (repCodeFilter !== 'all') {
        filtered = filtered.filter(job => {
          // Handle both string ID and object formats
          if (typeof job.repCode === 'string') {
            return job.repCode === repCodeFilter;
          }
          if (typeof job.repCode === 'object' && job.repCode?._id) {
            return job.repCode._id === repCodeFilter;
          }
          return false;
        });
      }
      
      // Apply technician filter
      if (technicianFilter !== 'all') {
        filtered = filtered.filter(job => {
          // Handle both string ID and object formats
          if (typeof job.techBooked === 'string') {
            return job.techBooked === technicianFilter;
          }
          if (typeof job.techBooked === 'object' && job.techBooked?._id) {
            return job.techBooked._id === technicianFilter;
          }
          return false;
        });
      }
      
      // Sort by job number (numeric part) descending (highest to lowest)
      filtered = sortJobsByJobNumber(filtered);
      
      // Set both jobs and filteredJobs in the same batch
      // Use React's batching to ensure both updates happen together
      setJobs(allJobs);
      setFilteredJobs(filtered);
      setCurrentPage(1);
      
      // Set loading states - use setTimeout to ensure state updates are batched
      // This prevents the useEffect from running before jobs and filteredJobs are set
      setTimeout(() => {
        setLoading(false);
        setIsLoadingJobs(false); // Now allow applyFilters to run
        isLoadingAllJobsRef.current = false; // Now allow filter-change effect to run
      }, 0);
    } catch (error) {
      console.error('Error loading jobs:', error);
      setJobs([]);
      setFilteredJobs([]);
      setLoading(false);
      setIsLoadingJobs(false);
      isLoadingAllJobsRef.current = false;
    }
  }

  async function loadOverdueJobsList() {
    try {
      setLoading(true);
      setIsLoadingJobs(true); // Prevent applyFilters from running
      
      const overdueData = await getOverdueJobs();
      
      // Check if we're in "all" mode using ref (always current, not closure value)
      // This prevents race conditions where overdue requests complete after switching to "all" mode
      if (isAllJobsModeRef.current) {
        // Just update overdueJobs for reference (for badges/indicators), but don't update jobs or filteredJobs
        const overdueJobsList = overdueData.jobs || [];
        setOverdueJobs(overdueJobsList);
        setLoading(false);
        setIsLoadingJobs(false);
        return;
      }
      
      const overdueJobsList = overdueData.jobs || [];
      setOverdueJobs(overdueJobsList);
      
      // Extract unique jobs from overdue jobs
      const uniqueJobs = overdueJobsList
        .map(oj => oj.job)
        .filter((job): job is Job => job !== null)
        .filter((job, index, self) => 
          index === self.findIndex(j => j._id === job._id)
        );
      
      // Sort by startDate descending (newest first)
      uniqueJobs.sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateB - dateA; // Descending order
      });
      
      // Apply filters with the new jobs data immediately
      let filtered = uniqueJobs.filter(job => {
        // Check if job matches any of the selected priority filters
        const overdueJobIds = new Set(overdueJobsList.map(oj => oj.jobId));
        const matchesOverdue = priorityFilter.overdue && overdueJobIds.has(job._id) && overdueJobsList.find(oj => oj.jobId === job._id)?.isOverdue;
        const matchesApproaching = priorityFilter.approaching && overdueJobIds.has(job._id) && overdueJobsList.find(oj => oj.jobId === job._id)?.isApproaching;
        
        // Consider a job "open" if it's not in a final status
        const finalStatuses = ['Job Done', 'Invoiced', 'Warranty', 'Ask Leana to Cancel', 'Cancel before 7/7/25'];
        const matchesOpen = priorityFilter.open && job.status && !finalStatuses.includes(job.status.name);
        
        return matchesOverdue || matchesApproaching || matchesOpen;
      });
      
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(job => {
          const repCode = getRepCodeFromJob(job);
          return (
            job.jobNumber?.toLowerCase().includes(searchLower) ||
            job.customer?.name?.toLowerCase().includes(searchLower) ||
            job.cashCustomer?.toLowerCase().includes(searchLower) ||
            job.adm?.toLowerCase().includes(searchLower) ||
            job.branch?.name?.toLowerCase().includes(searchLower) ||
            repCode?.code?.toLowerCase().includes(searchLower)
          );
        });
      }
      
      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(job => job.status?._id === statusFilter);
      }
      
      // Apply branch filter
      if (branchFilter !== 'all') {
        filtered = filtered.filter(job => job.branch?._id === branchFilter);
      }
      
      // Apply admin filter
      if (admFilter !== 'all') {
        filtered = filtered.filter(job => job.adm === admFilter);
      }
      
      // Apply rep code filter
      if (repCodeFilter !== 'all') {
        filtered = filtered.filter(job => {
          // Handle both string ID and object formats
          if (typeof job.repCode === 'string') {
            return job.repCode === repCodeFilter;
          }
          if (typeof job.repCode === 'object' && job.repCode?._id) {
            return job.repCode._id === repCodeFilter;
          }
          return false;
        });
      }
      
      // Apply technician filter
      if (technicianFilter !== 'all') {
        filtered = filtered.filter(job => {
          // Handle both string ID and object formats
          if (typeof job.techBooked === 'string') {
            return job.techBooked === technicianFilter;
          }
          if (typeof job.techBooked === 'object' && job.techBooked?._id) {
            return job.techBooked._id === technicianFilter;
          }
          return false;
        });
      }
      
      // Sort by date descending (newest first) for overdue/approaching/open filters
      filtered.sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateB - dateA;
      });
      
      // Set both jobs and filteredJobs in the same batch
      setJobs(uniqueJobs);
      setFilteredJobs(filtered);
      setCurrentPage(1);
      
      // Set loading states after a microtask to ensure state updates are batched
      setTimeout(() => {
        setLoading(false);
        setIsLoadingJobs(false); // Now allow applyFilters to run
      }, 0);
    } catch (error) {
      console.error('Error loading overdue jobs:', error);
      // Only update state if we're not in "all" mode (use ref for current state)
      if (!isAllJobsModeRef.current) {
        setOverdueJobs([]);
        setJobs([]);
        setFilteredJobs([]);
      }
      setLoading(false);
      setIsLoadingJobs(false);
    }
  }

  async function loadCustomers() {
    try {
      const data = await getCustomers();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  }

  async function loadTechnicians() {
    try {
      const data = await getTechnicians();
      setTechnicians(data.technicians || []);
    } catch (error) {
      console.error('Error loading technicians:', error);
    }
  }

  async function loadRepCodes() {
    try {
      const data = await getRepCodes();
      setRepCodes(data.repCodes || []);
    } catch (error) {
      console.error('Error loading rep codes:', error);
    }
  }

  async function loadAdminCodes() {
    try {
      const data = await getAdminCodes();
      setAdminCodes(data.adminCodes || []);
    } catch (error) {
      console.error('Error loading admin codes:', error);
    }
  }

  function applyFilters() {
    // Don't apply filters if we're still loading - this prevents the glitch
    if (loading) {
      return;
    }

    let filtered: Job[] = [];

    if (priorityFilter.all) {
      // When showing all jobs, use all jobs from the jobs array
      // Make sure we have jobs before filtering
      if (jobs.length > 0) {
        filtered = [...jobs];
      } else {
        // If no jobs and we're not loading, set empty array
        setFilteredJobs([]);
        return;
      }
    } else {
      // Filter by priority: show jobs that match ANY of the selected criteria
      const overdueJobIds = new Set(overdueJobs.map(oj => oj.jobId));
      filtered = jobs.filter(job => {
        // Check if job matches any of the selected priority filters
        const matchesOverdue = priorityFilter.overdue && overdueJobIds.has(job._id) && overdueJobs.find(oj => oj.jobId === job._id)?.isOverdue;
        const matchesApproaching = priorityFilter.approaching && overdueJobIds.has(job._id) && overdueJobs.find(oj => oj.jobId === job._id)?.isApproaching;
        
        // Consider a job "open" if it's not in a final status
        const finalStatuses = ['Job Done', 'Invoiced', 'Warranty', 'Ask Leana to Cancel', 'Cancel before 7/7/25'];
        const matchesOpen = priorityFilter.open && job.status && !finalStatuses.includes(job.status.name);
        
        // Return true if job matches any selected filter
        return matchesOverdue || matchesApproaching || matchesOpen;
      });
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(job => {
        const repCode = getRepCodeFromJob(job);
        return (
          job.jobNumber?.toLowerCase().includes(searchLower) ||
          job.customer?.name?.toLowerCase().includes(searchLower) ||
          job.cashCustomer?.toLowerCase().includes(searchLower) ||
          job.adm?.toLowerCase().includes(searchLower) ||
          job.branch?.name?.toLowerCase().includes(searchLower) ||
          repCode?.code?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status?._id === statusFilter);
    }

    // Apply branch filter
    if (branchFilter !== 'all') {
      filtered = filtered.filter(job => job.branch?._id === branchFilter);
    }

    // Apply admin filter
    if (admFilter !== 'all') {
      filtered = filtered.filter(job => job.adm === admFilter);
    }

    // Apply rep code filter
    if (repCodeFilter !== 'all') {
      filtered = filtered.filter(job => {
        // Handle both string ID and object formats
        if (typeof job.repCode === 'string') {
          return job.repCode === repCodeFilter;
        }
        if (typeof job.repCode === 'object' && job.repCode?._id) {
          return job.repCode._id === repCodeFilter;
        }
        return false;
      });
    }

    // Sort by job number (numeric part) descending when in "All Jobs" mode
    // Otherwise, sort by date descending for overdue/approaching/open filters
    if (priorityFilter.all) {
      filtered = sortJobsByJobNumber(filtered);
    } else {
      filtered.sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateB - dateA; // Descending order
      });
    }

    setFilteredJobs(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }

  function handleViewJob(job: Job) {
    setSelectedJob(job);
  }

  async function handleJobUpdate() {
    await loadOverdueJobsList();
    if (priorityFilter.all) {
      await loadAllJobs();
    }
  }

  function getStatusColor(statusName?: string): string {
    if (!statusName) return 'bg-gray-50 border-gray-200';
    
    const colors: Record<string, string> = {
      'In Progress': 'bg-blue-50 border-blue-200',
      'Quoted': 'bg-amber-50 border-amber-200',
      'Sent to Client': 'bg-purple-50 border-purple-200',
      'Await PO': 'bg-orange-50 border-orange-200',
      'Register': 'bg-cyan-50 border-cyan-200',
      'Parts Ready': 'bg-teal-50 border-teal-200',
      'Job Done': 'bg-green-50 border-green-200',
      'RSR Needed': 'bg-yellow-50 border-yellow-200',
      'Sent to Inv': 'bg-indigo-50 border-indigo-200',
      'Query': 'bg-pink-50 border-pink-200',
      'Ready to Inv': 'bg-emerald-50 border-emerald-200',
      'Invoiced': 'bg-emerald-50 border-emerald-200',
      'Warranty': 'bg-gray-50 border-gray-200',
      'Assesment': 'bg-slate-50 border-slate-200',
      'Asses Done': 'bg-slate-50 border-slate-200',
      'Ask Leana to Cancel': 'bg-red-50 border-red-200',
      'Cancel before 7/7/25': 'bg-red-50 border-red-200',
    };
    return colors[statusName] || 'bg-gray-50 border-gray-200';
  }

  function getStatusTextColor(statusName?: string): string {
    if (!statusName) return 'text-gray-700';
    
    const colors: Record<string, string> = {
      'In Progress': 'text-blue-700',
      'Quoted': 'text-amber-700',
      'Sent to Client': 'text-purple-700',
      'Await PO': 'text-orange-700',
      'Register': 'text-cyan-700',
      'Parts Ready': 'text-teal-700',
      'Job Done': 'text-green-700',
      'RSR Needed': 'text-yellow-700',
      'Sent to Inv': 'text-indigo-700',
      'Query': 'text-pink-700',
      'Ready to Inv': 'text-emerald-700',
      'Invoiced': 'text-emerald-700',
      'Warranty': 'text-gray-700',
      'Assesment': 'text-slate-700',
      'Asses Done': 'text-slate-700',
      'Ask Leana to Cancel': 'text-red-700',
      'Cancel before 7/7/25': 'text-red-700',
    };
    return colors[statusName] || 'text-gray-700';
  }

  function getOverdueInfo(jobId: string): OverdueJob | null {
    return overdueJobs.find(oj => oj.jobId === jobId) || null;
  }

  /**
   * Gets the rep code object from a job's repCode field (which can be a string ID or an object)
   */
  function getRepCodeFromJob(job: Job): RepCode | null {
    if (!job.repCode) return null;
    
    // If repCode is already an object with _id, use it
    if (typeof job.repCode === 'object' && '_id' in job.repCode) {
      const repCodeObj = job.repCode as { _id: string; code: string; description?: string };
      return repCodes.find(rc => rc._id === repCodeObj._id) || null;
    }
    
    // If repCode is a string ID, look it up
    if (typeof job.repCode === 'string') {
      const repCodeId = job.repCode;
      return repCodes.find(rc => rc._id === repCodeId) || null;
    }
    
    return null;
  }

  /**
   * Gets the technician name from a job's techBooked field (which can be a string ID or an object)
   */
  function getTechnicianNameFromJob(job: Job): string | null {
    if (!job.techBooked) return null;
    
    // If techBooked is already an object with name, use it
    if (typeof job.techBooked === 'object' && 'name' in job.techBooked) {
      return job.techBooked.name;
    }
    
    // If techBooked is a string ID, look it up from technicians array
    if (typeof job.techBooked === 'string') {
      const techBookedId = job.techBooked;
      const technician = technicians.find(t => t._id === techBookedId);
      return technician ? technician.name : null;
    }
    
    return null;
  }

  function formatDate(dateString?: string | Date) {
    if (!dateString) return '-';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatCurrency(value?: number) {
    if (!value) return '-';
    // Format number with commas and 2 decimal places, then add R prefix
    const formatted = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const result = `R${formatted}`;
    console.log('formatCurrency - Input:', value, 'Formatted:', formatted, 'Result:', result);
    return result;
  }

  return (
    <div className="min-h-screen bg-white">
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ars-primary mx-auto mb-4"></div>
          <p className="text-ars-body">Loading jobs...</p>
        </div>
      ) : (
        <div className="flex gap-6 pt-5">
          {/* Left Sidebar - Filters */}
          <div className="w-64 flex-shrink-0 bg-white rounded-2xl border border-gray-200 p-4 h-fit sticky top-[115px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-ars-heading flex items-center gap-2">
                <Filter className="w-4 h-4 text-ars-primary" />
                Filters
              </h3>
            </div>

            {/* Priority Checkboxes */}
            <div className="mb-4">
              <label className="block text-[11px] font-medium text-gray-600 mb-2">Show Jobs</label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={priorityFilter.overdue}
                    onChange={(e) => setPriorityFilter({ ...priorityFilter, overdue: e.target.checked, all: false })}
                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 flex-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    <span className="text-xs text-ars-body group-hover:text-ars-heading transition-colors">Overdue</span>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={priorityFilter.approaching}
                    onChange={(e) => setPriorityFilter({ ...priorityFilter, approaching: e.target.checked, all: false })}
                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 flex-1">
                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                    <span className="text-xs text-ars-body group-hover:text-ars-heading transition-colors">Approaching</span>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={priorityFilter.open}
                    onChange={(e) => setPriorityFilter({ ...priorityFilter, open: e.target.checked, all: false })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 flex-1">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs text-ars-body group-hover:text-ars-heading transition-colors">Open</span>
                  </div>
                </label>
                {isSuperAdmin && (
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={showHiddenJobs}
                      onChange={(e) => {
                        const newValue = e.target.checked;
                        setShowHiddenJobs(newValue);
                        // Ensure we're in "All Jobs" mode when toggling hidden jobs
                        if (!priorityFilter.all) {
                          setPriorityFilter({ ...priorityFilter, all: true, overdue: false, approaching: false, open: false });
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <div className="flex items-center gap-1.5 flex-1">
                      <Eye className="w-3.5 h-3.5 text-orange-600" />
                      <span className="text-xs text-ars-body group-hover:text-ars-heading transition-colors">Show Hidden</span>
                    </div>
                  </label>
                )}
                <label className="flex items-center gap-2 cursor-pointer group pt-1.5 border-t border-gray-200">
                  <input
                    type="checkbox"
                    checked={priorityFilter.all}
                    onChange={(e) => setPriorityFilter({ ...priorityFilter, all: e.target.checked, overdue: !e.target.checked, approaching: !e.target.checked, open: !e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-ars-primary focus:ring-ars-primary cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 flex-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-ars-primary" />
                    <span className="text-xs text-ars-body group-hover:text-ars-heading transition-colors font-medium">All Jobs</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Search */}
            <div className="mb-4">
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Job #, customer, admin..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="mb-4">
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-2 pr-10 py-1.5 text-[13px] border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white appearance-none"
                style={{ 
                  backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')",
                  backgroundPosition: 'right 0.75rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1rem 1rem'
                }}
              >
                <option value="all">All Statuses</option>
                {statuses && statuses.length > 0 ? (
                  statuses.map((status) => (
                    <option key={status._id} value={status._id}>
                      {status.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Loading...</option>
                )}
              </select>
            </div>

            {/* Branch Filter */}
            <div className="mb-4">
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Branch</label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full pl-2 pr-10 py-1.5 text-[13px] border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white appearance-none"
                style={{ 
                  backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')",
                  backgroundPosition: 'right 0.75rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1rem 1rem'
                }}
              >
                <option value="all">All Branches</option>
                {branches && branches.length > 0 ? (
                  branches.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Loading...</option>
                )}
              </select>
            </div>

            {/* Admin Filter */}
            <div className="mb-4">
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Admin</label>
              <select
                value={admFilter}
                onChange={(e) => setAdmFilter(e.target.value)}
                disabled={user?.role?.name === 'admin' && !user?.isSuperAdmin}
                className="w-full pl-2 pr-10 py-1.5 text-[13px] border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500 appearance-none"
                style={{ 
                  backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')",
                  backgroundPosition: 'right 0.75rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1rem 1rem'
                }}
              >
                <option value="all">All Admins</option>
                {adminCodeOptions.length > 0 ? (
                  adminCodeOptions.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Loading admin codes...</option>
                )}
              </select>
            </div>

            {/* Rep Code Filter */}
            <div className="mb-4">
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Rep</label>
              <select
                value={repCodeFilter}
                onChange={(e) => setRepCodeFilter(e.target.value)}
                disabled={user?.role?.name === 'rep' && !user?.isSuperAdmin}
                className="w-full pl-2 pr-10 py-1.5 text-[13px] border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500 appearance-none"
                style={{ 
                  backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')",
                  backgroundPosition: 'right 0.75rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1rem 1rem'
                }}
              >
                <option value="all">All Rep Codes</option>
                {repCodes && repCodes.length > 0 ? (
                  repCodes
                    .filter(rc => rc.isActive)
                    .map((repCode) => (
                      <option key={repCode._id} value={repCode._id}>
                        {repCode.code} {repCode.description ? `- ${repCode.description}` : ''}
                      </option>
                    ))
                ) : (
                  <option value="" disabled>Loading...</option>
                )}
              </select>
            </div>

            {/* Technician Filter */}
            <div className="mb-4">
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Technician</label>
              <select
                value={technicianFilter}
                onChange={(e) => setTechnicianFilter(e.target.value)}
                disabled={user?.role?.name === 'technician' && !user?.isSuperAdmin}
                className="w-full pl-2 pr-10 py-1.5 text-[13px] border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500 appearance-none"
                style={{ 
                  backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')",
                  backgroundPosition: 'right 0.75rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1rem 1rem'
                }}
              >
                <option value="all">All Technicians</option>
                {technicians && technicians.length > 0 ? (
                  technicians.map((technician) => (
                    <option key={technician._id} value={technician._id}>
                      {technician.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Loading...</option>
                )}
              </select>
            </div>

            {/* Machines Visibility Toggle */}
            <div className="mb-4 pt-3 border-t border-gray-200">
              <label className="block text-[11px] font-medium text-gray-600 mb-2">Display Options</label>
              <button
                onClick={() => {
                  const newValue = !showMachinesGlobal;
                  setShowMachinesGlobal(newValue);
                  localStorage.setItem('leadsList_showMachines', String(newValue));
                  // If hiding globally, clear all expanded states
                  if (!newValue) {
                    setExpandedMachines(new Set());
                  }
                }}
                className="w-full flex items-center justify-between pl-2 pr-10 py-1.5 border border-gray-300 rounded-[8px] hover:bg-gray-50 transition-colors bg-white appearance-none"
                style={{ 
                  backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')",
                  backgroundPosition: 'right 0.75rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1rem 1rem'
                }}
              >
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-ars-primary" />
                  <span className="text-[13px] text-gray-900">Show Machines</span>
                </div>
              </button>
            </div>

            {/* Results Count */}
            <div className="pt-4 border-t border-gray-200 space-y-2">
              <p className="text-sm text-ars-body">
                <span className="font-semibold text-ars-heading">{filteredJobs.length}</span> jobs found
              </p>
            </div>
          </div>

          {/* Right Side - Job Cards */}
          <div className="flex-1">
            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ars-primary mx-auto mb-4"></div>
                <p className="text-ars-body">Loading jobs...</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-ars-heading mb-2">No jobs found</h3>
                <p className="text-ars-body mb-6">Try adjusting your filters or search term</p>
                <button
                  onClick={onCreateNew}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] px-6 py-3 rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <Sparkles className="w-5 h-5" />
                  Create New Job
                </button>
              </div>
            ) : (
              <>
                {/* Pagination Info */}
                <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-sm text-ars-body">
                      Showing <span className="font-semibold text-ars-heading">
                        {((currentPage - 1) * itemsPerPage) + 1}
                      </span> to <span className="font-semibold text-ars-heading">
                        {Math.min(currentPage * itemsPerPage, filteredJobs.length)}
                      </span> of <span className="font-semibold text-ars-heading">
                        {filteredJobs.length}
                      </span> jobs
                    </p>
                    {priorityFilter.all && jobs.length > 0 && (
                      <p className="text-xs text-ars-body mt-1">
                        Total jobs loaded: <span className="font-medium">{jobs.length}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-[8px] bg-white font-bold text-[14px] text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-sm text-ars-body">
                      Page {currentPage} of {Math.ceil(filteredJobs.length / itemsPerPage) || 1}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredJobs.length / itemsPerPage), prev + 1))}
                      disabled={currentPage >= Math.ceil(filteredJobs.length / itemsPerPage)}
                      className="px-4 py-2 border border-gray-300 rounded-[8px] bg-white font-bold text-[14px] text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase"
                    >
                      Next
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredJobs
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((job, index) => {
                  const overdueInfo = getOverdueInfo(job._id);
                  const serviceDescription =
                    typeof job.description === 'string'
                      ? job.description
                      : job.description?.name;
                  return (
                    <div
                      key={job._id}
                      className={`group relative overflow-hidden rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] cursor-pointer ${getStatusColor(job.status?.name)}`}
                      onClick={() => handleViewJob(job)}
                      style={{
                        animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`
                      }}
                    >
                      {/* Priority Badge */}
                      {overdueInfo && (
                        <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-bold shadow-md ${
                          overdueInfo.severity === 'critical'
                            ? 'bg-red-500 text-white animate-pulse'
                            : overdueInfo.severity === 'warning'
                            ? 'bg-orange-500 text-white'
                            : 'bg-blue-500 text-white'
                        }`}>
                          {overdueInfo.isOverdue 
                            ? `${overdueInfo.daysOverdue}d overdue`
                            : 'Approaching'}
                        </div>
                      )}

                      <div className="p-5">
                        {/* Job Number & Status */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-ars-heading mb-1">
                              {job.jobNumber}
                            </h3>
                            <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold ${getStatusTextColor(job.status?.name)} bg-white/60 border border-current/20`}>
                              {job.status?.name || 'No Status'}
                            </span>
                          </div>
                        </div>

                        {/* Customer */}
                        <div className="mb-3">
                          <div className="flex items-center gap-2 text-xs text-ars-body mb-1">
                            <User className="w-4 h-4" />
                            <span className="font-medium text-ars-heading">
                              {job.customer?.name || job.cashCustomer || 'No customer'}
                            </span>
                          </div>
                          {job.cashCustomer && job.customer && (
                            <p className="text-xs text-ars-body ml-6">Cash: {job.cashCustomer}</p>
                          )}
                        </div>

                        {/* Service Description */}
                        {serviceDescription && (
                          <div className="mb-3 flex items-start gap-2 text-xs text-ars-body">
                            <FileText className="w-4 h-4 flex-shrink-0" />
                            <p className="text-ars-heading font-medium leading-snug">{serviceDescription}</p>
                          </div>
                        )}

                        {/* Dates */}
                        <div className="space-y-2 mb-3 text-xs text-ars-body">
                          {job.startDate && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3" />
                              <span>Start: {formatDate(job.startDate)}</span>
                            </div>
                          )}
                          {job.dateQuoted && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3" />
                              <span>Quoted: {formatDate(job.dateQuoted)}</span>
                            </div>
                          )}
                          {job.statusChangedAt && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3" />
                              <span>Status Changed: {formatDate(job.statusChangedAt)}</span>
                            </div>
                          )}
                        </div>

                        {/* Metadata Row */}
                        <div className="flex items-center gap-3 flex-wrap mb-3 pt-3 border-t border-gray-200">
                          {job.branch && (
                            <div className="flex items-center gap-1 text-xs text-ars-body">
                              <Building2 className="w-3 h-3" />
                              <span>{job.branch.name}</span>
                            </div>
                          )}
                          {job.adm && (
                            <div className="flex items-center gap-1 text-xs text-ars-body">
                              <User className="w-3 h-3" />
                              <span>{job.adm}</span>
                            </div>
                          )}
                          {(() => {
                            const repCode = getRepCodeFromJob(job);
                            return repCode ? (
                              <div className="flex items-center gap-1 text-xs text-ars-body">
                                <Tag className="w-3 h-3" />
                                <span className="font-medium">{repCode.code}</span>
                              </div>
                            ) : null;
                          })()}
                        </div>

                        {/* Technician - On its own line */}
                        {(() => {
                          const technicianName = getTechnicianNameFromJob(job);
                          return technicianName ? (
                            <div className="mb-3 pt-2 border-t border-gray-200">
                              <div className="flex items-center gap-2 text-xs text-ars-body">
                                <User className="w-3 h-3" />
                                <span className="font-medium">Technician: {technicianName}</span>
                              </div>
                            </div>
                          ) : null;
                        })()}

                        {/* Machines */}
                        {Array.isArray(job.machines) && job.machines.length > 0 && (
                          <div className="mb-3 pt-2 border-t border-gray-200">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const isExpanded = expandedMachines.has(job._id);
                                const newExpanded = new Set(expandedMachines);
                                if (isExpanded) {
                                  newExpanded.delete(job._id);
                                } else {
                                  newExpanded.add(job._id);
                                }
                                setExpandedMachines(newExpanded);
                              }}
                              className="w-full flex items-center justify-between mb-2 hover:bg-gray-50 pl-2 pr-4 py-1.5 rounded transition-colors"
                            >
                              <div className="flex items-center gap-2 text-xs text-ars-body">
                                <Wrench className="w-3 h-3 flex-shrink-0" />
                                <span className="font-medium">
                                  {job.machines.length} Machine{job.machines.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              {showMachinesGlobal || expandedMachines.has(job._id) ? (
                                <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              )}
                            </button>
                            {(showMachinesGlobal || expandedMachines.has(job._id)) && (
                              <div className="space-y-2">
                                {job.machines.map((machineRef, index) => {
                                  const machine = typeof machineRef === 'object' && machineRef !== null
                                    ? machineRef
                                    : null;
                                  if (!machine) return null;
                                  return (
                                    <div key={machine._id || index} className="space-y-1">
                                      <div className="flex items-center gap-1 text-xs text-ars-body">
                                        <Wrench className="w-3 h-3 flex-shrink-0" />
                                        <span className="font-medium">
                                          {machine.make} {machine.model}
                                        </span>
                                      </div>
                                      <div className="text-xs text-ars-body pl-4">
                                        <div className="flex items-center gap-2">
                                          <span>Hours: <span className="font-semibold text-ars-primary">{machine.machineHours.toLocaleString()}</span></span>
                                          <span className="text-gray-400">•</span>
                                          <span>Next: <span className="font-semibold text-orange-600">{machine.nextServiceHours.toLocaleString()}</span></span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Value */}
                        {job.valueExVat && (
                          <div className="mb-3 pt-2 border-t border-gray-200">
                            <div className="flex items-center gap-1 text-xs text-ars-body font-medium">
                              <span>{formatCurrency(job.valueExVat)}</span>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewJob(job);
                          }}
                          className="w-full px-3 py-2 bg-white/80 hover:bg-white rounded-lg font-bold text-[14px] text-ars-heading transition-all flex items-center justify-center gap-1 mt-3"
                        >
                          <Eye className="w-3 h-3" />
                          VIEW
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>

                {/* Pagination Controls Bottom */}
                {filteredJobs.length > itemsPerPage && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-[8px] bg-white font-bold text-[14px] text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase"
                    >
                      First
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-[8px] bg-white font-bold text-[14px] text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: Math.min(5, Math.ceil(filteredJobs.length / itemsPerPage)) }, (_, i) => {
                        const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-4 py-2 border rounded-[8px] font-bold text-[14px] transition-colors ${
                              currentPage === pageNum
                                ? 'bg-ars-primary border-ars-primary text-white'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredJobs.length / itemsPerPage), prev + 1))}
                      disabled={currentPage >= Math.ceil(filteredJobs.length / itemsPerPage)}
                      className="px-4 py-2 border border-gray-300 rounded-[8px] bg-white font-bold text-[14px] text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.ceil(filteredJobs.length / itemsPerPage))}
                      disabled={currentPage >= Math.ceil(filteredJobs.length / itemsPerPage)}
                      className="px-4 py-2 border border-gray-300 rounded-[8px] bg-white font-bold text-[14px] text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase"
                    >
                      Last
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={onCreateNew}
        className="fixed bottom-8 right-8 w-14 h-14 bg-ars-primary text-white rounded-full shadow-2xl flex items-center justify-center z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Job Details Modal */}
      {selectedJob && (
        <LeadDetails
          lead={selectedJob}
          statuses={statuses}
          branches={branches}
          adminCodes={adminCodeOptions}
          onClose={() => setSelectedJob(null)}
          onUpdate={handleJobUpdate}
        />
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
