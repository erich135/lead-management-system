import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getJobStats,
  getOverdueJobs,
  getStatuses,
  getBranches,
  getCustomers,
  getRepCodes,
  getTechnicians,
  getAdminCodes,
  logViewActivity,
  type JobStats,
  type OverdueJob,
  type Status,
  type Branch,
  type Customer,
  type RepCode,
  type Technician,
  type AdminCode,
  type Job,
} from '../lib/api';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { LeadsList } from './LeadsList';
import { LeadForm } from './LeadForm';
import { LeadDetails } from './LeadDetails';
import { SystemManagement } from './SystemManagement';
import { Reports } from './Reports';
import { Diary } from './Diary';
import { Activities } from './Activities';
import { MobileNavigation } from './MobileNavigation';
import { Header } from './Header';
import { DashboardHero } from './DashboardHero';
import { PriorityFilters } from './PriorityFilters';
import { JobFiltersPanel, type JobFiltersState } from './JobFiltersPanel';
import { AllClearState, NoCategoryState } from './OverdueEmptyStates';
import { OverdueJobsTable, type OverdueSortField } from './OverdueJobsTable';
import { useIsMobile } from '../hooks/useIsMobile';

type View = 'dashboard' | 'leads' | 'reports' | 'admin' | 'diary' | 'activities';

interface DashboardProps {
  view?: View;
}

export function Dashboard({ view: initialView }: DashboardProps = {}) {
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  // Determine current view from URL path
  const getViewFromPath = (path: string): View => {
    if (path === '/jobs' || path === '/leads') return 'leads';
    if (path === '/reports') return 'reports';
    if (path === '/diary') return 'diary';
    if (path === '/admin') return 'admin';
    if (path === '/activities') return 'activities';
    return 'dashboard';
  };
  
  // Always derive view from current location to avoid sync issues
  const view = initialView || getViewFromPath(location.pathname);
  
  // Navigation helper
  const navigateToView = (newView: View) => {
    const routes: Record<View, string> = {
      dashboard: '/dashboard',
      leads: '/jobs',
      reports: '/reports',
      diary: '/diary',
      admin: '/admin',
      activities: '/activities',
    };
    navigate(routes[newView]);
  };
  const [stats, setStats] = useState<JobStats | null>(null);
  const [overdueJobs, setOverdueJobs] = useState<OverdueJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [repCodes, setRepCodes] = useState<RepCode[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [adminCodes, setAdminCodes] = useState<AdminCode[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [leadsListRefreshKey, setLeadsListRefreshKey] = useState(0);
  
  // Filter and sorting states
  const [filters, setFilters] = useState<JobFiltersState>({
    jobNumber: '',
    status: [] as string[],
    customer: '',
    admin: [] as string[],
    rep: [] as string[]
  });
  const [sortConfig, setSortConfig] = useState<{
    field: OverdueSortField | null;
    direction: 'asc' | 'desc';
  }>({ field: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const priorityCounts = useMemo(
    () => ({
      total: overdueJobs.length,
      critical: overdueJobs.filter((job) => job.severity === 'critical').length,
      warning: overdueJobs.filter((job) => job.severity === 'warning').length,
      info: overdueJobs.filter((job) => job.severity === 'info').length,
    }),
    [overdueJobs]
  );

  const statusOptions = useMemo(() => getUniqueStatuses(), [overdueJobs]);
  const adminOptions = useMemo(() => getUniqueAdmins(), [overdueJobs]);
  const repOptions = useMemo(() => getUniqueReps(), [overdueJobs]);
  const selectedPriorityCount =
    selectedPriority === 'all'
      ? priorityCounts.total
      : selectedPriority === 'critical'
      ? priorityCounts.critical
      : selectedPriority === 'warning'
      ? priorityCounts.warning
      : priorityCounts.info;
  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        filters.jobNumber ||
          filters.customer ||
          filters.status.length ||
          filters.admin.length ||
          filters.rep.length
      ),
    [filters]
  );

  const handleFilterInputChange = (key: keyof JobFiltersState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  type MultiSelectFilter = 'status' | 'admin' | 'rep';

  const addFilterItem = (filterType: MultiSelectFilter, value: string) => {
    if (!value) return;
    setFilters((prev) => {
      if (prev[filterType].includes(value)) {
        return prev;
      }
      return {
        ...prev,
        [filterType]: [...prev[filterType], value],
      };
    });
  };

  const removeFilterItem = (filterType: MultiSelectFilter, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: prev[filterType].filter((item) => item !== value),
    }));
  };

  const handleShowNotifications = () => {
    setShowNotifications(true);
    if (isMobile) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Log page view activities
  useEffect(() => {
    if (view === 'dashboard') {
      logViewActivity('view', 'Page', 'Viewed dashboard page');
    } else if (view === 'leads') {
      logViewActivity('view', 'Page', 'Viewed jobs page');
    } else if (view === 'reports') {
      logViewActivity('view', 'Page', 'Viewed reports page');
    } else if (view === 'diary') {
      logViewActivity('view', 'Page', 'Viewed diary page');
    } else if (view === 'activities') {
      logViewActivity('view', 'Page', 'Viewed activities page');
    } else if (view === 'admin') {
      logViewActivity('view', 'Page', 'Viewed system admin page');
    }
  }, [view]);

  async function loadInitialData() {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadStats(),
        loadOverdueJobs(),
        loadStatuses(),
        loadBranches(),
        loadCustomers(),
        loadRepCodes(),
        loadTechnicians(),
        loadAdminCodes(),
      ]);
    } catch (err: any) {
      console.error('Error loading initial data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const data = await getJobStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
      throw error;
    }
  }

  function getDateRangeText(): string {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const startStr = threeMonthsAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const endStr = endOfCurrentMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    return `${startStr} - ${endStr}`;
  }

  async function loadOverdueJobs() {
    try {
      const data = await getOverdueJobs({ includeApproaching: true });
      setOverdueJobs(data.jobs);
    } catch (error) {
      console.error('Error loading overdue jobs:', error);
      // Don't throw - this is not critical
    }
  }


  async function loadStatuses() {
    try {
      const data = await getStatuses();
      setStatuses(data.statuses);
    } catch (error) {
      console.error('Error loading statuses:', error);
    }
  }

  async function loadBranches() {
    try {
      const data = await getBranches();
      setBranches(data.branches);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  }

  async function loadCustomers() {
    try {
      const data = await getCustomers({ limit: 1000 });
      setCustomers(data.customers);
    } catch (error) {
      console.error('Error loading customers:', error);
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

  async function loadTechnicians() {
    try {
      const data = await getTechnicians();
      setTechnicians(data.technicians || []);
    } catch (error) {
      console.error('Error loading technicians:', error);
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
    return `R${formatted}`;
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

  function getSeverityColor(severity: 'critical' | 'warning' | 'info'): string {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 border-red-300 text-red-900';
      case 'warning':
        return 'bg-orange-100 border-orange-300 text-orange-900';
      case 'info':
        return 'bg-blue-100 border-blue-300 text-blue-900';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-900';
    }
  }

  function getSeverityIcon(severity: 'critical' | 'warning' | 'info') {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <Clock className="w-5 h-5 text-orange-600" />;
      case 'info':
        return <CheckCircle2 className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  }

  function handleLeadClick(lead: any) {
    setSelectedLead(lead);
  }

  function handleLeadSaved() {
    setShowLeadForm(false);
    loadStats();
    loadOverdueJobs(); // Refresh overdue jobs list
    setLeadsListRefreshKey(prev => prev + 1); // Trigger LeadsList refresh
  }

  function handleJobCreated(job: Job) {
    // Close the form
    setShowLeadForm(false);
    // Open the job details with the newly created job
    setSelectedLead(job);
    // Refresh stats and lists
    loadStats();
    loadOverdueJobs();
    setLeadsListRefreshKey(prev => prev + 1);
  }

  // Filter and sorting functions
  function handleSort(field: OverdueSortField) {
    const direction = sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ field, direction });
  }

  function getFilteredAndSortedJobs() {
    let filteredJobs = overdueJobs.filter(job => selectedPriority === 'all' || job.severity === selectedPriority);

    // Apply filters
    if (filters.jobNumber) {
      filteredJobs = filteredJobs.filter(job => 
        job.jobNumber.toLowerCase().includes(filters.jobNumber.toLowerCase())
      );
    }
    if (filters.status.length > 0) {
      filteredJobs = filteredJobs.filter(job => {
        const jobStatus = (job.job?.status?.name || job.currentStatus || '').toLowerCase();
        return filters.status.some(status => jobStatus.includes(status.toLowerCase()));
      });
    }
    if (filters.customer) {
      filteredJobs = filteredJobs.filter(job => {
        const customerName = job.job?.customer?.name || job.job?.cashCustomer || '';
        return customerName.toLowerCase().includes(filters.customer.toLowerCase());
      });
    }
    if (filters.admin.length > 0) {
      filteredJobs = filteredJobs.filter(job => {
        const jobAdmin = (job.job?.adm || '').toLowerCase();
        return filters.admin.some(admin => jobAdmin.includes(admin.toLowerCase()));
      });
    }
    if (filters.rep.length > 0) {
      filteredJobs = filteredJobs.filter(job => {
        const repCode = job.job ? getRepCodeFromJob(job.job) : null;
        const repCodeStr = (repCode?.code || '').toLowerCase();
        return filters.rep.some(rep => repCodeStr.includes(rep.toLowerCase()));
      });
    }

    // Apply sorting
    if (sortConfig.field) {
      filteredJobs.sort((a, b) => {
        let aValue: any = '';
        let bValue: any = '';

        switch (sortConfig.field) {
          case 'jobNumber':
            aValue = a.jobNumber;
            bValue = b.jobNumber;
            break;
          case 'status':
            aValue = a.job?.status?.name || a.currentStatus || '';
            bValue = b.job?.status?.name || b.currentStatus || '';
            break;
          case 'customer':
            aValue = a.job?.customer?.name || a.job?.cashCustomer || '';
            bValue = b.job?.customer?.name || b.job?.cashCustomer || '';
            break;
          case 'startDate':
            aValue = a.job?.startDate ? new Date(a.job.startDate).getTime() : 0;
            bValue = b.job?.startDate ? new Date(b.job.startDate).getTime() : 0;
            break;
          case 'dateQuoted':
            aValue = a.job?.dateQuoted ? new Date(a.job.dateQuoted).getTime() : 0;
            bValue = b.job?.dateQuoted ? new Date(b.job.dateQuoted).getTime() : 0;
            break;
          case 'city':
            aValue = a.job?.branch?.name || '';
            bValue = b.job?.branch?.name || '';
            break;
          case 'admin':
            aValue = a.job?.adm || '';
            bValue = b.job?.adm || '';
            break;
          case 'rep':
            const aRepCode = a.job ? getRepCodeFromJob(a.job) : null;
            const bRepCode = b.job ? getRepCodeFromJob(b.job) : null;
            aValue = aRepCode?.code || '';
            bValue = bRepCode?.code || '';
            break;
          case 'amount':
            aValue = a.job?.valueExVat || 0;
            bValue = b.job?.valueExVat || 0;
            break;
          case 'daysOverdue':
            aValue = a.daysOverdue || 0;
            bValue = b.daysOverdue || 0;
            break;
        }

        if (sortConfig.direction === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }

    return filteredJobs;
  }

  // Calculate pagination
  const filteredJobs = getFilteredAndSortedJobs();
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, selectedPriority]);

  function clearAllFilters() {
    setFilters({
      jobNumber: '',
      status: [],
      customer: '',
      admin: [],
      rep: []
    });
  }

  function getUniqueStatuses(): string[] {
    const statusSet = new Set<string>();
    overdueJobs.forEach(job => {
      const status = job.job?.status?.name || job.currentStatus;
      if (status) statusSet.add(status);
    });
    return Array.from(statusSet).sort();
  }

  function getUniqueAdmins(): string[] {
    const adminSet = new Set<string>();
    overdueJobs.forEach(job => {
      if (job.job?.adm) adminSet.add(job.job.adm);
    });
    return Array.from(adminSet).sort();
  }

  function getUniqueReps(): string[] {
    const repSet = new Set<string>();
    overdueJobs.forEach(job => {
      const repCode = job.job ? getRepCodeFromJob(job.job) : null;
      if (repCode?.code) repSet.add(repCode.code);
    });
    return Array.from(repSet).sort();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-white pb-20 md:pb-0">
      {/* Header Component - Separated for easier styling */}
      <Header
        currentView={view}
        stats={stats}
        overdueJobs={overdueJobs}
        showNotifications={showNotifications}
        onNotificationsToggle={() => setShowNotifications(!showNotifications)}
        onJobSelect={setSelectedLead}
        onNavigateToView={navigateToView}
        getSeverityColor={getSeverityColor}
        getSeverityIcon={getSeverityIcon}
      />

      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${isMobile ? 'pt-4' : ''}`}>
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-xl">
            <p className="text-red-800 font-medium">Error: {error}</p>
            <button
              onClick={loadInitialData}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Retry
            </button>
          </div>
        )}

        {view === 'dashboard' && loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ars-primary mx-auto mb-4"></div>
              <p className="text-ars-body">Loading dashboard...</p>
            </div>
          </div>
        )}

        {view === 'dashboard' && stats && !loading && (
          <div className="space-y-6">
            <DashboardHero
              stats={stats}
              dateRangeLabel={getDateRangeText()}
              canViewFinancials={isSuperAdmin || user?.role?.name?.toLowerCase() === 'manager'}
              onCreateJob={() => setShowLeadForm(true)}
              onShowJobList={() => navigateToView('leads')}
              onShowReports={() => navigateToView('reports')}
              onShowNotifications={handleShowNotifications}
            />

            <PriorityFilters
              selected={selectedPriority}
              counts={priorityCounts}
              onChange={setSelectedPriority}
            />

            {/* Job List - Table View */}
            <div className="space-y-4">
              {priorityCounts.total === 0 ? (
                <AllClearState />
              ) : selectedPriority !== 'all' && selectedPriorityCount === 0 ? (
                <NoCategoryState />
              ) : (
                <>
                  <JobFiltersPanel
                    filters={filters}
                    statusOptions={statusOptions}
                    adminOptions={adminOptions}
                    repOptions={repOptions}
                    onFilterInputChange={handleFilterInputChange}
                    onAddFilterItem={addFilterItem}
                    onRemoveFilterItem={removeFilterItem}
                    onClearAll={clearAllFilters}
                  />

                  <OverdueJobsTable
                    jobs={paginatedJobs}
                    filteredCount={filteredJobs.length}
                    hasActiveFilters={hasActiveFilters}
                    sortConfig={sortConfig}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onSort={handleSort}
                    onPageChange={setCurrentPage}
                    onJobOpen={(job) => {
                      setSelectedLead(job);
                      navigateToView('leads');
                    }}
                    onViewAllJobs={() => navigateToView('leads')}
                    getStatusColor={getStatusColor}
                    getStatusTextColor={getStatusTextColor}
                    formatDate={formatDate}
                    formatCurrency={formatCurrency}
                    getRepCodeFromJob={getRepCodeFromJob}
                  />
                </>
              )}
            </div>

            {/* Add CSS Animation */}
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
        )}

        {view === 'leads' && (
          <LeadsList
            onLeadClick={handleLeadClick}
            onCreateNew={() => setShowLeadForm(true)}
            statuses={statuses}
            branches={branches}
            refreshKey={leadsListRefreshKey}
          />
        )}

        {view === 'reports' && (isSuperAdmin || user?.role?.name?.toLowerCase() === 'manager') && (
          <Reports
            statuses={statuses}
            branches={branches}
          />
        )}
        {view === 'reports' && !isSuperAdmin && user?.role?.name?.toLowerCase() !== 'manager' && (
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
              <p className="text-slate-600 mb-6">You don't have permission to access the Reports page. This page is only available to Managers and Super Admins.</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 bg-[#0969a9] text-white rounded-xl font-medium hover:bg-[#0a7bc4] transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}

        {view === 'diary' && (
          <Diary />
        )}

        {view === 'admin' && isSuperAdmin && (
          <SystemManagement />
        )}

        {view === 'activities' && (
          <Activities />
        )}
      </main>

      {showLeadForm && (
        <LeadForm
          statuses={statuses}
          branches={branches}
          customers={customers}
          onClose={() => setShowLeadForm(false)}
          onSaved={handleLeadSaved}
          onJobCreated={handleJobCreated}
        />
      )}

      {selectedLead && (
        <LeadDetails
          lead={selectedLead}
          statuses={statuses}
          branches={branches}
          adminCodes={Array.from(new Set(overdueJobs.map(j => j.job?.adm).filter(Boolean))).sort() as string[]}
          onClose={() => setSelectedLead(null)}
          onUpdate={() => {
            loadStats();
            loadOverdueJobs();
          }}
        />
      )}

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileNavigation
          currentView={view}
          onViewChange={navigateToView}
          notificationsCount={stats ? stats.overdueReminders + stats.approachingReminders : 0}
          onNotificationsClick={() => setShowNotifications(!showNotifications)}
        />
      )}
    </div>
  );
}
