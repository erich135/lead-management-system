import { useState, useEffect, useRef } from 'react';
import { getJobs, updateJob, getCustomers, getTechnicians, getOverdueJobs, type Job, type Status, type Branch, type Customer, type Technician, type OverdueJob } from '../lib/api';
import { Search, Filter, Plus, AlertCircle, Calendar, Edit2, Eye, Clock, CheckCircle2, X, Zap, FileText, User, Building2, DollarSign, Wrench, Sparkles, ArrowRight } from 'lucide-react';

interface LeadsListProps {
  onLeadClick: (lead: Job) => void;
  onCreateNew: () => void;
  statuses: Status[];
  branches: Branch[];
}

export function LeadsList({ onLeadClick, onCreateNew, statuses, branches }: LeadsListProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [overdueJobs, setOverdueJobs] = useState<OverdueJob[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [admFilter, setAdmFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<{
    overdue: boolean;
    approaching: boolean;
    open: boolean;
    all: boolean;
  }>({
    overdue: true,
    approaching: true,
    open: true,
    all: false,
  });
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('view');
  const [editForm, setEditForm] = useState<Partial<Job>>({});
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(24); // 24 items per page (good for grid)
  const [isLoadingJobs, setIsLoadingJobs] = useState(false); // Track if we're actively loading jobs
  const isLoadingAllJobsRef = useRef(false); // Ref to track if we're loading all jobs (prevents race conditions)
  const isAllJobsModeRef = useRef(false); // Ref to track if we're in "all jobs" mode (prevents overdue requests from overwriting)

  // Get unique admin codes from jobs
  const adminCodes = Array.from(new Set(jobs.map(j => j.adm).filter(Boolean))).sort();

  useEffect(() => {
    loadOverdueJobsList();
  }, []);

  useEffect(() => {
    // Update the ref to track current "all" mode state
    isAllJobsModeRef.current = priorityFilter.all;
    
    if (priorityFilter.all) {
      loadAllJobs();
    } else {
      loadOverdueJobsList();
    }
  }, [priorityFilter.all]); // Only trigger when all changes, not the whole object

  useEffect(() => {
    loadCustomers();
    loadTechnicians();
  }, []);

  useEffect(() => {
    // Only apply filters if not loading and not actively loading jobs
    // This prevents applyFilters from running while loadAllJobs is setting state
    // Also skip if we're in "all" mode - loadAllJobs handles filtering directly
    if (!loading && !isLoadingJobs && !priorityFilter.all) {
      applyFilters();
    }
  }, [jobs, searchTerm, statusFilter, branchFilter, admFilter, priorityFilter, overdueJobs, loading, isLoadingJobs]);

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
        filtered = filtered.filter(job => 
          job.jobNumber?.toLowerCase().includes(searchLower) ||
          job.customer?.name?.toLowerCase().includes(searchLower) ||
          job.cashCustomer?.toLowerCase().includes(searchLower) ||
          job.adm?.toLowerCase().includes(searchLower) ||
          job.branch?.name?.toLowerCase().includes(searchLower)
        );
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
      
      // Sort by date descending
      filtered.sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateB - dateA;
      });
      
      setFilteredJobs(filtered);
      setCurrentPage(1);
    }
  }, [searchTerm, statusFilter, branchFilter, admFilter, priorityFilter.all]);

  async function loadAllJobs() {
    try {
      setLoading(true);
      setIsLoadingJobs(true); // Prevent applyFilters from running
      isLoadingAllJobsRef.current = true; // Prevent filter-change effect from running
      isAllJobsModeRef.current = true; // Mark that we're in "all jobs" mode (prevents overdue requests from overwriting)
      
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
      
      // Sort by startDate descending (newest first) as fallback
      allJobs.sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateB - dateA; // Descending order
      });
      
      // Apply filters with the new jobs data immediately
      // We need to apply all filters (search, status, branch, admin) to the new jobs
      let filtered = [...allJobs];
      
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(job => 
          job.jobNumber?.toLowerCase().includes(searchLower) ||
          job.customer?.name?.toLowerCase().includes(searchLower) ||
          job.cashCustomer?.toLowerCase().includes(searchLower) ||
          job.adm?.toLowerCase().includes(searchLower) ||
          job.branch?.name?.toLowerCase().includes(searchLower)
        );
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
      
      // Sort by date descending
      filtered.sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateB - dateA;
      });
      
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
        filtered = filtered.filter(job => 
          job.jobNumber?.toLowerCase().includes(searchLower) ||
          job.customer?.name?.toLowerCase().includes(searchLower) ||
          job.cashCustomer?.toLowerCase().includes(searchLower) ||
          job.adm?.toLowerCase().includes(searchLower) ||
          job.branch?.name?.toLowerCase().includes(searchLower)
        );
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
      
      // Sort by date descending
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
      filtered = filtered.filter(job => 
        job.jobNumber?.toLowerCase().includes(searchLower) ||
        job.customer?.name?.toLowerCase().includes(searchLower) ||
        job.cashCustomer?.toLowerCase().includes(searchLower) ||
        job.adm?.toLowerCase().includes(searchLower) ||
        job.branch?.name?.toLowerCase().includes(searchLower)
      );
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

    // Ensure jobs are sorted by date descending (newest first)
    filtered.sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return dateB - dateA; // Descending order
    });

    setFilteredJobs(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }

  function handleViewJob(job: Job) {
    setSelectedJob(job);
    setViewMode('view');
    setShowModal(true);
  }

  function handleEditJob(job: Job) {
    setSelectedJob(job);
    setViewMode('edit');
    setEditForm({
      status: job.status?._id,
      adm: job.adm,
      customer: job.customer?._id,
      cashCustomer: job.cashCustomer,
      branch: job.branch?._id,
      valueExVat: job.valueExVat,
      techBooked: job.techBooked?._id,
      description: job.description?._id,
      startDate: job.startDate,
      dateQuoted: job.dateQuoted,
    });
    setShowModal(true);
  }

  async function handleSaveEdit() {
    if (!selectedJob) return;

    try {
      await updateJob(selectedJob._id, editForm);
      await loadOverdueJobsList();
      setShowModal(false);
      setSelectedJob(null);
      setEditForm({});
    } catch (error) {
      console.error('Error updating job:', error);
      alert('Failed to update job. Please try again.');
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

  function formatDate(dateString?: string | Date) {
    if (!dateString) return '-';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatCurrency(value?: number) {
    if (!value) return '-';
    return `R${value.toLocaleString()}`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-white">
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ars-primary mx-auto mb-4"></div>
          <p className="text-ars-body">Loading jobs...</p>
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Left Sidebar - Filters */}
          <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-gray-200 shadow-lg p-6 h-fit sticky top-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-ars-heading flex items-center gap-2">
                <Filter className="w-5 h-5 text-ars-primary" />
                Filters
              </h3>
            </div>

            {/* Priority Checkboxes */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-ars-heading mb-3">Show Jobs</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={priorityFilter.overdue}
                    onChange={(e) => setPriorityFilter({ ...priorityFilter, overdue: e.target.checked, all: false })}
                    className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-ars-body group-hover:text-ars-heading transition-colors">Overdue</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={priorityFilter.approaching}
                    onChange={(e) => setPriorityFilter({ ...priorityFilter, approaching: e.target.checked, all: false })}
                    className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-ars-body group-hover:text-ars-heading transition-colors">Approaching</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={priorityFilter.open}
                    onChange={(e) => setPriorityFilter({ ...priorityFilter, open: e.target.checked, all: false })}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-ars-body group-hover:text-ars-heading transition-colors">Open</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group pt-2 border-t border-gray-200">
                  <input
                    type="checkbox"
                    checked={priorityFilter.all}
                    onChange={(e) => setPriorityFilter({ ...priorityFilter, all: e.target.checked, overdue: !e.target.checked, approaching: !e.target.checked, open: !e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-ars-primary focus:ring-ars-primary cursor-pointer"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <CheckCircle2 className="w-4 h-4 text-ars-primary" />
                    <span className="text-sm text-ars-body group-hover:text-ars-heading transition-colors font-medium">All Jobs</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Search */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-ars-heading mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Job #, customer, admin..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-ars-heading mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
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
            <div className="mb-6">
              <label className="block text-sm font-semibold text-ars-heading mb-2">Branch</label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
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
            <div className="mb-6">
              <label className="block text-sm font-semibold text-ars-heading mb-2">Admin (ADM)</label>
              <select
                value={admFilter}
                onChange={(e) => setAdmFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
              >
                <option value="all">All Admins</option>
                {adminCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>

            {/* Results Count */}
            <div className="pt-4 border-t border-gray-200 space-y-2">
              <p className="text-sm text-ars-body">
                <span className="font-semibold text-ars-heading">{filteredJobs.length}</span> jobs found
              </p>
              {priorityFilter.all && (
                <p className="text-xs text-ars-body bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <span className="font-medium text-blue-900">Showing all jobs</span> (no date restrictions)
                </p>
              )}
              {!priorityFilter.all && (
                <p className="text-xs text-ars-body bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                  <span className="font-medium text-orange-900">Showing priority jobs only</span> (overdue, approaching, or open - no date restrictions)
                </p>
              )}
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
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-ars-heading mb-2">No jobs found</h3>
                <p className="text-ars-body mb-6">Try adjusting your filters or search term</p>
                <button
                  onClick={onCreateNew}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
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
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-ars-body"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-sm text-ars-body">
                      Page {currentPage} of {Math.ceil(filteredJobs.length / itemsPerPage) || 1}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredJobs.length / itemsPerPage), prev + 1))}
                      disabled={currentPage >= Math.ceil(filteredJobs.length / itemsPerPage)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-ars-body"
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
                  return (
                    <div
                      key={job._id}
                      className={`group relative overflow-hidden rounded-xl border-2 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] cursor-pointer ${getStatusColor(job.status?.name)}`}
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
                            <h3 className="text-lg font-bold text-ars-heading group-hover:text-ars-primary transition-colors mb-1">
                              {job.jobNumber}
                            </h3>
                            <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold ${getStatusTextColor(job.status?.name)} bg-white/60 border border-current/20`}>
                              {job.status?.name || 'No Status'}
                            </span>
                          </div>
                        </div>

                        {/* Customer */}
                        <div className="mb-3">
                          <div className="flex items-center gap-2 text-sm text-ars-body mb-1">
                            <User className="w-4 h-4" />
                            <span className="font-medium text-ars-heading">
                              {job.customer?.name || job.cashCustomer || 'No customer'}
                            </span>
                          </div>
                          {job.cashCustomer && job.customer && (
                            <p className="text-xs text-ars-body ml-6">Cash: {job.cashCustomer}</p>
                          )}
                        </div>

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
                          {job.valueExVat && (
                            <div className="flex items-center gap-1 text-xs text-ars-body font-medium">
                              <DollarSign className="w-3 h-3" />
                              <span>{formatCurrency(job.valueExVat)}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditJob(job);
                            }}
                            className="flex-1 px-3 py-2 bg-white/80 hover:bg-white rounded-lg text-xs font-medium text-ars-heading hover:text-ars-primary transition-all flex items-center justify-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewJob(job);
                            }}
                            className="flex-1 px-3 py-2 bg-white/80 hover:bg-white rounded-lg text-xs font-medium text-ars-heading hover:text-ars-primary transition-all flex items-center justify-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </button>
                        </div>
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
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-ars-body"
                    >
                      First
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-ars-body"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
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
                            className={`px-4 py-2 rounded-lg transition-all ${
                              currentPage === pageNum
                                ? 'bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white shadow-lg'
                                : 'border border-gray-300 hover:bg-gray-50 text-ars-body'
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
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-ars-body"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.ceil(filteredJobs.length / itemsPerPage))}
                      disabled={currentPage >= Math.ceil(filteredJobs.length / itemsPerPage)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-ars-body"
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
        className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 flex items-center justify-center z-40 group"
      >
        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* View/Edit Modal */}
      {showModal && selectedJob && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {viewMode === 'view' ? (
              <>
                <div className="sticky top-0 bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white p-6 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold mb-1">{selectedJob.jobNumber}</h3>
                      <p className="text-white/90 text-sm">Job Details</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setViewMode('edit');
                          setEditForm({
                            status: selectedJob.status?._id,
                            adm: selectedJob.adm,
                            customer: selectedJob.customer?._id,
                            cashCustomer: selectedJob.cashCustomer,
                            branch: selectedJob.branch?._id,
                            valueExVat: selectedJob.valueExVat,
                            techBooked: selectedJob.techBooked?._id,
                            description: selectedJob.description?._id,
                            startDate: selectedJob.startDate,
                            dateQuoted: selectedJob.dateQuoted,
                          });
                        }}
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => setShowModal(false)}
                        className="p-2 hover:bg-white/20 rounded-lg transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Status</label>
                      <div className={`px-4 py-3 rounded-xl ${getStatusColor(selectedJob.status?.name)}`}>
                        <span className={`font-medium ${getStatusTextColor(selectedJob.status?.name)}`}>
                          {selectedJob.status?.name || 'No Status'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Branch</label>
                      <div className="px-4 py-3 bg-gray-50 rounded-xl">
                        <span className="text-ars-heading">{selectedJob.branch?.name || '-'}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Customer</label>
                      <div className="px-4 py-3 bg-gray-50 rounded-xl">
                        <span className="text-ars-heading">{selectedJob.customer?.name || selectedJob.cashCustomer || '-'}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Admin (ADM)</label>
                      <div className="px-4 py-3 bg-gray-50 rounded-xl">
                        <span className="text-ars-heading">{selectedJob.adm || '-'}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Value (ex VAT)</label>
                      <div className="px-4 py-3 bg-gray-50 rounded-xl">
                        <span className="text-ars-heading font-medium">{formatCurrency(selectedJob.valueExVat)}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Technician</label>
                      <div className="px-4 py-3 bg-gray-50 rounded-xl">
                        <span className="text-ars-heading">{selectedJob.techBooked?.name || '-'}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Start Date</label>
                      <div className="px-4 py-3 bg-gray-50 rounded-xl">
                        <span className="text-ars-heading">{formatDate(selectedJob.startDate)}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Date Quoted</label>
                      <div className="px-4 py-3 bg-gray-50 rounded-xl">
                        <span className="text-ars-heading">{formatDate(selectedJob.dateQuoted)}</span>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-ars-body mb-2">Description</label>
                      <div className="px-4 py-3 bg-gray-50 rounded-xl">
                        <span className="text-ars-heading">{selectedJob.description?.name || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="sticky top-0 bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white p-6 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold mb-1">Edit: {selectedJob.jobNumber}</h3>
                      <p className="text-white/90 text-sm">Update job details</p>
                    </div>
                    <button
                      onClick={() => setShowModal(false)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Status</label>
                      <select
                        value={editForm.status as string || ''}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      >
                        <option value="">Select Status</option>
                        {statuses.map((status) => (
                          <option key={status._id} value={status._id}>
                            {status.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Admin (ADM)</label>
                      <input
                        type="text"
                        value={editForm.adm || ''}
                        onChange={(e) => setEditForm({ ...editForm, adm: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                        placeholder="e.g., AS, ER, HT"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Customer</label>
                      <select
                        value={editForm.customer as string || ''}
                        onChange={(e) => setEditForm({ ...editForm, customer: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      >
                        <option value="">Select Customer</option>
                        {customers.map((customer) => (
                          <option key={customer._id} value={customer._id}>
                            {customer.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Cash Customer</label>
                      <input
                        type="text"
                        value={editForm.cashCustomer || ''}
                        onChange={(e) => setEditForm({ ...editForm, cashCustomer: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Branch</label>
                      <select
                        value={editForm.branch as string || ''}
                        onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      >
                        <option value="">Select Branch</option>
                        {branches.map((branch) => (
                          <option key={branch._id} value={branch._id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Value (ex VAT)</label>
                      <input
                        type="number"
                        value={editForm.valueExVat || ''}
                        onChange={(e) => setEditForm({ ...editForm, valueExVat: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Technician</label>
                      <select
                        value={editForm.techBooked as string || ''}
                        onChange={(e) => setEditForm({ ...editForm, techBooked: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      >
                        <option value="">Select Technician</option>
                        {technicians.map((tech) => (
                          <option key={tech._id} value={tech._id}>
                            {tech.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Start Date</label>
                      <input
                        type="date"
                        value={editForm.startDate ? (typeof editForm.startDate === 'string' ? editForm.startDate.split('T')[0] : new Date(editForm.startDate).toISOString().split('T')[0]) : ''}
                        onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ars-body mb-2">Date Quoted</label>
                      <input
                        type="date"
                        value={editForm.dateQuoted ? (typeof editForm.dateQuoted === 'string' ? editForm.dateQuoted.split('T')[0] : new Date(editForm.dateQuoted).toISOString().split('T')[0]) : ''}
                        onChange={(e) => setEditForm({ ...editForm, dateQuoted: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setViewMode('view');
                        setEditForm({});
                      }}
                      className="px-6 py-3 border border-gray-300 rounded-xl font-medium text-ars-body hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
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
