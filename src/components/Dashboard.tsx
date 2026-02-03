import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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
  type SalesLead,
} from '../lib/api';
import {
  LogOut,
  Bell,
  LayoutDashboard,
  FileText,
  BarChart3,
  AlertCircle,
  TrendingUp,
  Banknote,
  Calendar,
  Clock,
  CheckCircle2,
  Shield,
  User,
  Building2,
  Tag,
  Cog,
  ChevronDown,
  ChevronUp,
  ClipboardList,
} from 'lucide-react';
import { LeadsList } from './LeadsList';
import { LeadForm } from './LeadForm';
import { LeadDetails } from './LeadDetails';
import SalesLeadsContainer from './SalesLeadsContainer';
import { LeadStatsWidget } from './LeadStatsWidget';
import { SystemManagement } from './SystemManagement';
import { Reports } from './Reports';
import { Diary } from './Diary';
import { Activities } from './Activities';
import { Machines } from './Machines';
import { MobileNavigation } from './MobileNavigation';
import { SupportTicketButton } from './SupportTicketWidget';
import { NotificationBell } from './NotificationBell';
import { NotificationPanel } from './NotificationPanel';
import { JobCardTemplates } from './JobCardTemplates';
import { JobCardSubmissions } from './JobCardSubmissions';
import { useIsMobile } from '../hooks/useIsMobile';
import { Tooltip, HelpIcon } from './ui';
import { helpContent } from '../config/helpContent';

type View = 'dashboard' | 'leads' | 'salesLeads' | 'reports' | 'admin' | 'diary' | 'activities' | 'machines' | 'jobCardTemplates' | 'jobCardSubmissions';

interface DashboardProps {
  view?: View;
}

export function Dashboard({ view: initialView }: DashboardProps = {}) {
  const { user, signOut, isSuperAdmin, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  // Determine current view from URL path
  const getViewFromPath = (path: string): View => {
    if (path === '/jobs' || path === '/leads') return 'leads';
    if (path === '/sales-leads') return 'salesLeads';
    if (path === '/reports') return 'reports';
    if (path === '/diary') return 'diary';
    if (path === '/admin') return 'admin';
    if (path === '/activities') return 'activities';
    if (path === '/machines') return 'machines';
    if (path === '/job-card-templates') return 'jobCardTemplates';
    if (path === '/job-card-submissions') return 'jobCardSubmissions';
    return 'dashboard';
  };
  
  // Always derive view from current location to avoid sync issues
  const view = initialView || getViewFromPath(location.pathname);
  
  // Navigation helper
  const navigateToView = (newView: View) => {
    const routes: Record<View, string> = {
      dashboard: '/dashboard',
      leads: '/jobs',
      salesLeads: '/sales-leads',
      reports: '/reports',
      diary: '/diary',
      admin: '/admin',
      activities: '/activities',
      machines: '/machines',
      jobCardTemplates: '/job-card-templates',
      jobCardSubmissions: '/job-card-submissions',
    };
    navigate(routes[newView]);
  };
  const [stats, setStats] = useState<JobStats | null>(null);
  const [overdueJobs, setOverdueJobs] = useState<OverdueJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [repCodes, setRepCodes] = useState<RepCode[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [_adminCodes, setAdminCodes] = useState<AdminCode[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [leadsListRefreshKey, setLeadsListRefreshKey] = useState(0);
  const [isJobsMenuExpanded, setIsJobsMenuExpanded] = useState(false);
  
  // Filter and sorting states
  const [filters, setFilters] = useState({
    jobNumber: '',
    status: [] as string[],
    customer: '',
    admin: [] as string[],
    rep: [] as string[],
    description: [] as string[],
    startDateFrom: '',
    startDateTo: ''
  });
  const [sortConfig, setSortConfig] = useState<{
    field: 'jobNumber' | 'status' | 'customer' | 'startDate' | 'dateQuoted' | 'city' | 'admin' | 'rep' | 'amount' | 'daysOverdue' | null;
    direction: 'asc' | 'desc';
  }>({ field: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    loadInitialData();

    // Add scroll listener for navigation shadow
    const handleScroll = () => {
      // Show shadow when scrolled past the navigation bar (80px height)
      setIsScrolled(window.scrollY > 80);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close Jobs menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.jobs-menu-container')) {
        setIsJobsMenuExpanded(false);
      }
    };

    if (isJobsMenuExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isJobsMenuExpanded]);

  // Scroll to top when view changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

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
    } else if (view === 'jobCardTemplates') {
      logViewActivity('view', 'Page', 'Viewed job card templates page');
    } else if (view === 'jobCardSubmissions') {
      logViewActivity('view', 'Page', 'Viewed job card submissions page');
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
  function handleSort(field: 'jobNumber' | 'status' | 'customer' | 'startDate' | 'dateQuoted' | 'city' | 'admin' | 'rep' | 'amount' | 'daysOverdue') {
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
    if (filters.description.length > 0) {
      filteredJobs = filteredJobs.filter(job => {
        const description = typeof job.job?.description === 'object' ? job.job.description?.name : (job.job?.description || '');
        const descStr = (description || '').toLowerCase();
        return filters.description.some(desc => descStr.includes(desc.toLowerCase()));
      });
    }
    if (filters.startDateFrom) {
      filteredJobs = filteredJobs.filter(job => {
        const startDate = job.job?.startDate ? new Date(job.job.startDate) : null;
        if (!startDate) return false;
        return startDate >= new Date(filters.startDateFrom);
      });
    }
    if (filters.startDateTo) {
      filteredJobs = filteredJobs.filter(job => {
        const startDate = job.job?.startDate ? new Date(job.job.startDate) : null;
        if (!startDate) return false;
        return startDate <= new Date(filters.startDateTo);
      });
    }

    // Apply sorting - default to startDate descending if no sort is selected
    const fieldToSort = sortConfig.field || 'startDate';
    const directionToSort = sortConfig.field ? sortConfig.direction : 'desc';
    
    filteredJobs.sort((a, b) => {
      if (fieldToSort) {
        let aValue: any = '';
        let bValue: any = '';

        switch (fieldToSort) {
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

        if (directionToSort === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      }
      return 0;
    });

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

  // Helper functions for multi-select filters
  // @ts-ignore - kept for potential future multi-select UI
  function _toggleFilterItem(filterType: 'status' | 'admin' | 'rep', value: string) {
    setFilters(prev => {
      const currentArray = prev[filterType] as string[];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return { ...prev, [filterType]: newArray };
    });
  }

  function clearAllFilters() {
    setFilters({
      jobNumber: '',
      status: [],
      customer: '',
      admin: [],
      rep: [],
      description: [],
      startDateFrom: '',
      startDateTo: ''
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

  function getUniqueDescriptions(): string[] {
    const descSet = new Set<string>();
    overdueJobs.forEach(job => {
      const description = typeof job.job?.description === 'object' ? job.job.description?.name : (job.job?.description || null);
      if (description) descSet.add(description);
    });
    return Array.from(descSet).sort();
  }

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      {/* Desktop Navigation */}
      <nav className={`sticky top-0 z-40 hidden md:block backdrop-blur-md bg-white ${isScrolled ? 'shadow-xl' : ''}`}>
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v22H0v-2h20zM0 20h2v20H0V20zm4 0h2v20H4V20zm4 0h2v20H8V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2z'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }}></div>
        
        <div className="relative max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo Section */}
            <div className="flex items-center gap-3 group">
              <img src="/Logo.png" alt="ARS Logo" className="w-[180px] h-auto object-contain" />
            </div>

            {/* Navigation Pills */}
            <div className="flex items-center gap-8 flex-1 justify-center">
              <div className="hidden md:flex gap-2">
                <Link
                  to="/dashboard"
                  className={`group relative px-4 py-2.5 rounded-[8px] font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                    view === 'dashboard'
                      ? 'bg-[#f7c12b] text-[#383838] shadow-lg scale-105 hover:brightness-95'
                      : 'text-[#383838] hover:text-[#f7c12b]'
                  }`}
                >
                  <LayoutDashboard className={`w-4 h-4 transition-transform ${view === 'dashboard' ? 'scale-110' : ''}`} />
                  <span>Dashboard</span>
                </Link>
                {(isSuperAdmin || hasPermission('sales_leads.read')) && (
                  <Link
                    to="/sales-leads"
                    className={`group relative px-4 py-2.5 rounded-[8px] font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                      view === 'salesLeads'
                        ? 'bg-[#f7c12b] text-[#383838] shadow-lg scale-105 hover:brightness-95'
                        : 'text-[#383838] hover:text-[#f7c12b]'
                    }`}
                  >
                    <User className={`w-4 h-4 transition-transform ${view === 'salesLeads' ? 'scale-110' : ''}`} />
                    <span>Sales Leads</span>
                  </Link>
                )}
                {/* Jobs Menu - Expandable for super admins / job card permissions */}
                {(isSuperAdmin || hasPermission('job_card_templates.read') || hasPermission('job_card_submissions.read')) ? (
                  <div className="relative group jobs-menu-container">
                    <button
                      onClick={() => setIsJobsMenuExpanded(!isJobsMenuExpanded)}
                      className={`group relative px-4 py-2.5 rounded-[8px] font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                        view === 'leads' || view === 'jobCardTemplates' || view === 'jobCardSubmissions'
                          ? 'bg-[#f7c12b] text-[#383838] shadow-lg scale-105 hover:brightness-95'
                          : 'text-[#383838] hover:text-[#f7c12b]'
                      }`}
                    >
                      <FileText className={`w-4 h-4 transition-transform ${view === 'leads' || view === 'jobCardTemplates' || view === 'jobCardSubmissions' ? 'scale-110' : ''}`} />
                      <span>Jobs</span>
                      {isJobsMenuExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                    {isJobsMenuExpanded && (
                      <div className="absolute top-full left-0 mt-2 bg-white rounded-[8px] shadow-xl border border-gray-200 py-2 min-w-[200px] z-50">
                        <Link
                          to="/jobs"
                          onClick={() => setIsJobsMenuExpanded(false)}
                          className={`block px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                            view === 'leads'
                              ? 'bg-[#f7c12b]/20 text-[#383838] font-medium'
                              : 'text-[#383838] hover:bg-gray-100'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          <span>All Jobs</span>
                        </Link>
                        {(isSuperAdmin || hasPermission('job_card_templates.read')) && (
                          <Link
                            to="/job-card-templates"
                            onClick={() => setIsJobsMenuExpanded(false)}
                            className={`block px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                              view === 'jobCardTemplates'
                                ? 'bg-[#f7c12b]/20 text-[#383838] font-medium'
                                : 'text-[#383838] hover:bg-gray-100'
                            }`}
                          >
                            <ClipboardList className="w-4 h-4" />
                            <span>Job Card Templates</span>
                          </Link>
                        )}
                        {(isSuperAdmin || hasPermission('job_card_submissions.read')) && (
                          <Link
                            to="/job-card-submissions"
                            onClick={() => setIsJobsMenuExpanded(false)}
                            className={`block px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                              view === 'jobCardSubmissions'
                                ? 'bg-[#f7c12b]/20 text-[#383838] font-medium'
                                : 'text-[#383838] hover:bg-gray-100'
                            }`}
                          >
                            <FileText className="w-4 h-4" />
                            <span>Job Card Submissions</span>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    to="/jobs"
                    className={`group relative px-4 py-2.5 rounded-[8px] font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                      view === 'leads'
                        ? 'bg-[#f7c12b] text-[#383838] shadow-lg scale-105 hover:brightness-95'
                        : 'text-[#383838] hover:text-[#f7c12b]'
                    }`}
                  >
                    <FileText className={`w-4 h-4 transition-transform ${view === 'leads' ? 'scale-110' : ''}`} />
                    <span>Jobs</span>
                  </Link>
                )}
                {(isSuperAdmin || hasPermission('reports.read')) && (
                  <Link
                    to="/reports"
                    className={`group relative px-4 py-2.5 rounded-[8px] font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                      view === 'reports'
                        ? 'bg-[#f7c12b] text-[#383838] shadow-lg scale-105 hover:brightness-95'
                        : 'text-[#383838] hover:text-[#f7c12b]'
                    }`}
                  >
                    <BarChart3 className={`w-4 h-4 transition-transform ${view === 'reports' ? 'scale-110' : ''}`} />
                    <span>Reports</span>
                  </Link>
                )}
                <Link
                  to="/diary"
                  className={`group relative px-4 py-2.5 rounded-[8px] font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                    view === 'diary'
                      ? 'bg-[#f7c12b] text-[#383838] shadow-lg scale-105 hover:brightness-95'
                      : 'text-[#383838] hover:text-[#f7c12b]'
                  }`}
                >
                  <Calendar className={`w-4 h-4 transition-transform ${view === 'diary' ? 'scale-110' : ''}`} />
                  <span>Diary</span>
                </Link>
                <Link
                  to="/activities"
                  className={`group relative px-4 py-2.5 rounded-[8px] font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                    view === 'activities'
                      ? 'bg-[#f7c12b] text-[#383838] shadow-lg scale-105 hover:brightness-95'
                      : 'text-[#383838] hover:text-[#f7c12b]'
                  }`}
                >
                  <Clock className={`w-4 h-4 transition-transform ${view === 'activities' ? 'scale-110' : ''}`} />
                  <span>Activities</span>
                </Link>
                {isSuperAdmin && (
                  <Link
                    to="/machines"
                    className={`group relative px-4 py-2.5 rounded-[8px] font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                      view === 'machines'
                        ? 'bg-[#f7c12b] text-[#383838] shadow-lg scale-105 hover:brightness-95'
                        : 'text-[#383838] hover:text-[#f7c12b]'
                    }`}
                  >
                    <Cog className={`w-4 h-4 transition-transform ${view === 'machines' ? 'scale-110' : ''}`} />
                    <span>Machines</span>
                  </Link>
                )}
                {isSuperAdmin && (
                  <Link
                    to="/admin"
                    className={`group relative px-4 py-2.5 rounded-[8px] font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                      view === 'admin'
                        ? 'bg-[#f7c12b] text-[#383838] shadow-lg scale-105 hover:brightness-95'
                        : 'text-[#383838] hover:text-[#f7c12b]'
                    }`}
                  >
                    <Shield className={`w-4 h-4 transition-transform ${view === 'admin' ? 'scale-110' : ''}`} />
                    <span>System Admin</span>
                  </Link>
                )}
              </div>
            </div>
            
            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Support Ticket Button */}
              <div className="relative top-0">
                <SupportTicketButton />
              </div>

              {/* Notification Bell - in-app notifications */}
              <NotificationBell onOpenPanel={() => setShowNotificationPanel(true)} />

              {/* User Profile */}

              <div className="flex items-center gap-3 pl-4 border-l border-white/20">
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#383838]">{user?.fullName || 'User'}</p>
                  <p className="text-xs text-[#383838]/70 capitalize">{user?.role?.name || 'user'}</p>
                </div>
                <button
                  onClick={signOut}
                  className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-[8px] transition-all duration-300 hover:scale-105 group"
                  title="Sign out"
                >
                  <LogOut className="w-5 h-5 text-[#0969a9] transition-transform group-hover:scale-110" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Desktop Notification Drawer Overlay */}
      {showNotifications && !isMobile && (
        <>
          <div 
            className="fixed inset-0 z-[60]" 
            onClick={() => setShowNotifications(false)}
          ></div>
          <div 
            className="absolute top-[70px] right-[64px] w-96 bg-white rounded-[8px] shadow-2xl border border-gray-200 py-4 max-h-96 overflow-y-auto z-[70] backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 pb-3 border-b border-gray-200 mb-2">
              <h3 className="text-sm font-bold text-ars-heading mb-1">
                Job Reminders
              </h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                  {stats?.overdueReminders || 0} overdue
                </span>
                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">
                  {stats?.approachingReminders || 0} approaching
                </span>
              </div>
            </div>
            {overdueJobs.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-ars-heading mb-1">
                  All jobs on track!
                </p>
                <p className="text-xs text-ars-body">
                  No overdue or approaching jobs
                </p>
              </div>
            ) : (
              <div className="px-3">
                {overdueJobs.slice(0, 10).map((overdue) => (
                  <div
                    key={overdue.jobId}
                    className={`px-3 py-3 mb-2 rounded-[8px] border-2 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${getSeverityColor(overdue.severity)}`}
                    onClick={() => {
                      if (overdue.job) {
                        setSelectedLead(overdue.job);
                        navigateToView('leads');
                        setShowNotifications(false);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getSeverityIcon(overdue.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-bold truncate">
                            {overdue.jobNumber}
                          </p>
                          {overdue.isOverdue && (
                            <span className="text-xs font-bold bg-red-200 text-red-800 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                              {overdue.daysOverdue}d
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ars-body mb-2 truncate">
                          {overdue.job?.customer?.name || overdue.job?.cashCustomer || 'No customer'}
                        </p>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-medium px-2 py-0.5 bg-white/60 rounded">
                            {overdue.currentStatus}
                          </span>
                          <span className="text-xs text-ars-body">→</span>
                          <span className="text-xs font-medium px-2 py-0.5 bg-white/60 rounded">
                            {overdue.expectedNextStatus}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs font-medium">
                            {overdue.isOverdue 
                              ? `${overdue.daysOverdue} days overdue` 
                              : `${overdue.daysInStatus}/${overdue.maxDaysAllowed} days`}
                          </p>
                          {overdue.followUpLevel && (
                            <span className="text-xs bg-white/80 px-2 py-0.5 rounded">
                              Follow-up {overdue.followUpLevel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {overdueJobs.length > 10 && (
                  <p className="text-xs text-ars-body text-center py-2 border-t border-gray-200 mt-2">
                    +{overdueJobs.length - 10} more jobs
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Mobile Top Bar */}
      {isMobile && (
        <div className={`sticky top-0 z-40 md:hidden backdrop-blur-md bg-gradient-to-r from-[#0969a9] via-[#0a7bc4] to-[#0c8dd9] ${isScrolled ? 'shadow-xl' : ''}`}>
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v22H0v-2h20zM0 20h2v20H0V20zm4 0h2v20H4V20zm4 0h2v20H8V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
          <div className="relative flex items-center justify-between h-16 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-[8px] flex items-center justify-center shadow-lg p-2">
                <img src="/Logo.png" alt="ARS Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white">ARS Management</h1>
                <p className="text-xs text-white/70">Job System</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-[8px] transition-all duration-300 border border-white/20"
              >
                <Bell className="w-5 h-5 text-white" />
                {stats && (stats.overdueReminders > 0 || stats.approachingReminders > 0) && (
                  <span className="absolute -top-1 -right-2 min-w-[20px] h-5 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg px-1.5">
                    <span className="text-xs font-bold text-white">
                      {stats.overdueReminders + stats.approachingReminders}
                    </span>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Notifications Dropdown */}
      {isMobile && showNotifications && (
        <div className="fixed top-14 left-0 right-0 bg-white shadow-lg z-30 md:hidden max-h-96 overflow-y-auto">
          {overdueJobs.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-ars-heading mb-1">
                All jobs on track!
              </p>
              <p className="text-xs text-ars-body">
                No overdue or approaching jobs
              </p>
            </div>
          ) : (
            <div className="px-3 py-3">
              <div className="px-2 py-2 border-b border-gray-200 mb-3">
                <h3 className="text-sm font-bold text-ars-heading mb-1">
                  Overdue & Approaching Jobs
                </h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-red-600 font-medium">
                    {stats?.overdueReminders || 0} overdue
                  </span>
                  <span className="text-orange-600 font-medium">
                    {stats?.approachingReminders || 0} approaching
                  </span>
                </div>
              </div>
              {overdueJobs.slice(0, 10).map((overdue) => (
                <div
                  key={overdue.jobId}
                  className={`px-3 py-3 mb-2 rounded-[8px] border-2 ${getSeverityColor(overdue.severity)}`}
                  onClick={() => {
                    if (overdue.job) {
                      setSelectedLead(overdue.job);
                      navigateToView('leads');
                      setShowNotifications(false);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getSeverityIcon(overdue.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold truncate">
                          {overdue.jobNumber}
                        </p>
                        {overdue.isOverdue && (
                          <span className="text-xs font-bold bg-red-200 text-red-800 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                            {overdue.daysOverdue}d
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ars-body mb-2 truncate">
                        {overdue.job?.customer?.name || overdue.job?.cashCustomer || 'No customer'}
                      </p>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-medium px-2 py-0.5 bg-white/60 rounded">
                          {overdue.currentStatus}
                        </span>
                        <span className="text-xs text-ars-body">→</span>
                        <span className="text-xs font-medium px-2 py-0.5 bg-white/60 rounded">
                          {overdue.expectedNextStatus}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs font-medium">
                          {overdue.isOverdue 
                            ? `${overdue.daysOverdue} days overdue` 
                            : `${overdue.daysInStatus}/${overdue.maxDaysAllowed} days`}
                        </p>
                        {overdue.followUpLevel && (
                          <span className="text-xs bg-white/80 px-2 py-0.5 rounded">
                            Follow-up {overdue.followUpLevel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <main className={`max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-8 ${isMobile ? 'pt-4' : ''}`}>
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-[8px]">
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
            {/* Header with Gradient Background */}
            <div className="relative overflow-hidden rounded-[16px] bg-[#0969a9] p-8 text-white">
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
                      Job Management
                    </h1>
                    <p className="text-white/90 text-sm md:text-base">
                      {getDateRangeText()}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowLeadForm(true)}
                    className="bg-[#f7c12b] text-[#383838] px-6 py-3 rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] flex items-center gap-2 hover:brightness-95"
                  >
                    <span>NEW JOB</span>
                  </button>
                </div>

                {/* Quick Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Tooltip content={helpContent.dashboard.stats.totalJobs} position="bottom">
                    <div className="bg-white/10 backdrop-blur-md rounded-[8px] p-3 sm:p-4 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 cursor-pointer" onClick={() => navigateToView('leads')}>
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <p className="text-white/80 text-[10px] sm:text-xs font-medium truncate">Total Jobs</p>
                        <FileText className="w-4 h-4 text-[#ffffff] flex-shrink-0" />
                      </div>
                      <p className="text-xl sm:text-2xl font-bold truncate">{stats.totalJobs}</p>
                    </div>
                  </Tooltip>

                  <Tooltip content={helpContent.dashboard.stats.activeJobs} position="bottom">
                    <div className="bg-white/10 backdrop-blur-md rounded-[8px] p-3 sm:p-4 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 cursor-pointer" onClick={() => navigateToView('leads')}>
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <p className="text-white/80 text-[10px] sm:text-xs font-medium truncate">Active</p>
                        <TrendingUp className="w-4 h-4 text-[#ffffff] flex-shrink-0" />
                      </div>
                      <p className="text-xl sm:text-2xl font-bold truncate">{stats.activeJobs}</p>
                    </div>
                  </Tooltip>

                  <Tooltip content={helpContent.dashboard.stats.needsAttention} position="bottom">
                    <div 
                      className={`backdrop-blur-md rounded-[8px] p-3 sm:p-4 border transition-all duration-300 hover:scale-105 cursor-pointer ${
                        stats.overdueReminders > 0
                          ? 'bg-red-500/30 border-red-400/50 hover:bg-red-500/40'
                          : stats.approachingReminders > 0
                          ? 'bg-orange-500/30 border-orange-400/50 hover:bg-orange-500/40'
                          : 'bg-white/10 border-white/20 hover:bg-white/15'
                      }`}
                      onClick={() => {
                        setShowNotifications(true);
                        if (isMobile) {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <p className="text-white/80 text-[10px] sm:text-xs font-medium truncate">Needs Attention</p>
                        <AlertCircle className={`w-4 h-4 text-[#ffffff] flex-shrink-0 ${
                          stats.overdueReminders > 0 ? 'text-red-200' : stats.approachingReminders > 0 ? 'text-orange-200' : 'text-white/60'
                        }`} />
                      </div>
                      <p className="text-xl sm:text-2xl font-bold truncate">{stats.overdueReminders + stats.approachingReminders}</p>
                      {stats.overdueReminders > 0 && (
                        <p className="text-[10px] sm:text-xs text-red-200 mt-1">{stats.overdueReminders} overdue</p>
                      )}
                    </div>
                  </Tooltip>

                  {(isSuperAdmin || hasPermission('reports.read')) && (
                    <Tooltip content={helpContent.dashboard.stats.totalValue} position="bottom">
                      <div className="bg-white/10 backdrop-blur-md rounded-[8px] p-3 sm:p-4 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 cursor-pointer" onClick={() => navigateToView('reports')}>
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <p className="text-white/80 text-[10px] sm:text-xs font-medium truncate">Total Value</p>
                          <Banknote className="w-4 h-4 text-[#ffffff] flex-shrink-0" />
                        </div>
                        <p className="text-xl sm:text-2xl font-bold truncate">R{stats.totalValue.toLocaleString()}</p>
                      </div>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>

            {/* Sales Lead Stats Widget - Only show if user has sales_leads.read permission */}
            {hasPermission('sales_leads.read') && (
              <div className="mt-6">
                <LeadStatsWidget />
              </div>
            )}

            {/* Priority Filter Tabs */}
            <div className="space-y-2 mt-[60px] pt-[30px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-[20px] font-semibold text-ars-heading mb-1">Filter by Priority</h3>
                  <HelpIcon 
                    title={helpContent.dashboard.overdueJobs.title}
                    content={helpContent.dashboard.overdueJobs.description}
                    position="right"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1.5 pb-2 -mx-1 px-1 overflow-visible">
                <button
                  onClick={() => setSelectedPriority('all')}
                  className={`px-3 py-1.5 rounded-[8px] font-medium text-xs whitespace-nowrap transition-all duration-300 ${
                    selectedPriority === 'all'
                      ? 'bg-ars-secondary text-ars-heading shadow-lg scale-105 hover:brightness-95'
                      : 'bg-white text-ars-body hover:bg-gray-50 border border-gray-200'
                  }`}
                  title="Show all jobs that need attention"
                >
                  All Jobs ({overdueJobs.length})
                </button>
                <button
                  onClick={() => setSelectedPriority('critical')}
                  className={`px-3 py-1.5 rounded-[8px] font-medium text-xs whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 ${
                    selectedPriority === 'critical'
                      ? 'bg-ars-secondary text-ars-heading shadow-lg scale-105 hover:brightness-95'
                      : 'bg-white text-ars-body hover:bg-red-50 border border-gray-200'
                  }`}
                  title="Jobs that are past their deadline (overdue)"
                >
                  Overdue ({overdueJobs.filter(j => j.severity === 'critical').length})
                </button>
                <button
                  onClick={() => setSelectedPriority('warning')}
                  className={`px-3 py-1.5 rounded-[8px] font-medium text-xs whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 ${
                    selectedPriority === 'warning'
                      ? 'bg-ars-secondary text-ars-heading shadow-lg scale-105 hover:brightness-95'
                      : 'bg-white text-ars-body hover:bg-orange-50 border border-gray-200'
                  }`}
                  title="Jobs approaching their deadline (80% of time limit reached)"
                >
                  Approaching ({overdueJobs.filter(j => j.severity === 'warning').length})
                </button>
                <button
                  onClick={() => setSelectedPriority('info')}
                  className={`px-3 py-1.5 rounded-[8px] font-medium text-xs whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 ${
                    selectedPriority === 'info'
                      ? 'bg-ars-secondary text-ars-heading shadow-lg scale-105 hover:brightness-95'
                      : 'bg-white text-ars-body hover:bg-blue-50 border border-gray-200'
                  }`}
                  title="Jobs that are being monitored but not yet urgent"
                >
                  Monitored ({overdueJobs.filter(j => j.severity === 'info').length})
                </button>
              </div>
            </div>

            {/* Job List - Table View */}
            <div className="space-y-4">
              {overdueJobs.length === 0 ? (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-[8px] p-12 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4 animate-pulse">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-green-900 mb-2">All Clear! 🎉</h3>
                  <p className="text-green-700 mb-4">No jobs need attention right now. Great job!</p>
                  <div className="mt-6 p-4 bg-white/60 rounded-[8px] text-left max-w-md mx-auto">
                    <p className="text-sm text-green-800 font-medium mb-2">What does this mean?</p>
                    <p className="text-xs text-green-700">
                      This means all your jobs are either on track or have already moved to their next status within the expected timeframes. 
                      The system automatically tracks when jobs should move to the next status based on your conditional formatting rules.
                    </p>
                  </div>
                </div>
              ) : overdueJobs.filter(job => selectedPriority === 'all' || job.severity === selectedPriority).length === 0 ? (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-[8px] p-12 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                    <FileText className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-blue-900 mb-2">No Jobs in This Category</h3>
                  <p className="text-blue-700 mb-4">Try selecting a different priority filter above.</p>
                </div>
              ) : (
                <>
                  {/* Filters */}
                  <div className="bg-white rounded-[8px] border border-gray-200 p-3 mb-4">
                    <h3 className="text-xs font-semibold text-ars-heading mb-2">Filters</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">Job Number</label>
                        <input
                          type="text"
                          placeholder="Filter by job number..."
                          className="w-full pl-2 pr-2 py-1.5 border border-gray-300 rounded-[8px] text-[13px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
                          value={filters.jobNumber}
                          onChange={(e) => setFilters({...filters, jobNumber: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">Status</label>
                        <select
                          className="w-full pl-2 pr-10 py-1.5 border border-gray-300 rounded-[8px] text-[13px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white appearance-none"
                          style={{
                            backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')",
                            backgroundPosition: 'right 0.75rem center',
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: '1rem 1rem'
                          }}
                          value=""
                          onChange={(e) => {
                            if (e.target.value && !filters.status.includes(e.target.value)) {
                              setFilters({...filters, status: [...filters.status, e.target.value]});
                            }
                          }}
                        >
                          <option value="">Select status...</option>
                          {getUniqueStatuses().filter(status => !filters.status.includes(status)).map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                        {filters.status.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {filters.status.map(status => (
                              <span key={status} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-[8px] text-xs">
                                {status}
                                <button
                                  onClick={() => setFilters({...filters, status: filters.status.filter(s => s !== status)})}
                                  className="text-blue-600 hover:text-blue-800 ml-1"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">Customer</label>
                        <input
                          type="text"
                          placeholder="Filter by customer..."
                          className="w-full pl-2 pr-2 py-1.5 border border-gray-300 rounded-[8px] text-[13px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
                          value={filters.customer}
                          onChange={(e) => setFilters({...filters, customer: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">Admin</label>
                        <select
                          className="w-full pl-2 pr-10 py-1.5 border border-gray-300 rounded-[8px] text-[13px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white appearance-none"
                          style={{
                            backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')",
                            backgroundPosition: 'right 0.75rem center',
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: '1rem 1rem'
                          }}
                          value=""
                          onChange={(e) => {
                            if (e.target.value && !filters.admin.includes(e.target.value)) {
                              setFilters({...filters, admin: [...filters.admin, e.target.value]});
                            }
                          }}
                        >
                          <option value="">Select admin...</option>
                          {getUniqueAdmins().filter(admin => !filters.admin.includes(admin)).map(admin => (
                            <option key={admin} value={admin}>{admin}</option>
                          ))}
                        </select>
                        {filters.admin.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {filters.admin.map(admin => (
                              <span key={admin} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-[8px] text-xs">
                                {admin}
                                <button
                                  onClick={() => setFilters({...filters, admin: filters.admin.filter(a => a !== admin)})}
                                  className="text-green-600 hover:text-green-800 ml-1"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">Rep</label>
                        <select
                          className="w-full pl-2 pr-10 py-1.5 border border-gray-300 rounded-[8px] text-[13px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white appearance-none"
                          style={{
                            backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')",
                            backgroundPosition: 'right 0.75rem center',
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: '1rem 1rem'
                          }}
                          value=""
                          onChange={(e) => {
                            if (e.target.value && !filters.rep.includes(e.target.value)) {
                              setFilters({...filters, rep: [...filters.rep, e.target.value]});
                            }
                          }}
                        >
                          <option value="">Select rep...</option>
                          {getUniqueReps().filter(rep => !filters.rep.includes(rep)).map(rep => (
                            <option key={rep} value={rep}>{rep}</option>
                          ))}
                        </select>
                        {filters.rep.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {filters.rep.map(rep => (
                              <span key={rep} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-[8px] text-xs">
                                {rep}
                                <button
                                  onClick={() => setFilters({...filters, rep: filters.rep.filter(r => r !== rep)})}
                                  className="text-purple-600 hover:text-purple-800 ml-1"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">Service Description</label>
                        <select
                          className="w-full pl-2 pr-10 py-1.5 border border-gray-300 rounded-[8px] text-[13px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white appearance-none"
                          style={{
                            backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')",
                            backgroundPosition: 'right 0.75rem center',
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: '1rem 1rem'
                          }}
                          value=""
                          onChange={(e) => {
                            if (e.target.value && !filters.description.includes(e.target.value)) {
                              setFilters({...filters, description: [...filters.description, e.target.value]});
                            }
                          }}
                        >
                          <option value="">Select description...</option>
                          {getUniqueDescriptions().filter(desc => !filters.description.includes(desc)).map(desc => (
                            <option key={desc} value={desc}>{desc}</option>
                          ))}
                        </select>
                        {filters.description.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {filters.description.map(desc => (
                              <span key={desc} className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 text-teal-800 rounded-[8px] text-xs">
                                {desc}
                                <button
                                  onClick={() => setFilters({...filters, description: filters.description.filter(d => d !== desc)})}
                                  className="text-teal-600 hover:text-teal-800 ml-1"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">Start Date From</label>
                        <input
                          type="date"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-[13px] focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                          value={filters.startDateFrom}
                          onChange={(e) => setFilters({...filters, startDateFrom: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">Start Date To</label>
                        <input
                          type="date"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-[13px] focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                          value={filters.startDateTo}
                          onChange={(e) => setFilters({...filters, startDateTo: e.target.value})}
                        />
                      </div>
                    </div>
                    {(Object.values(filters).some(filter => Array.isArray(filter) ? filter.length > 0 : filter)) && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-gray-600">Active filters:</span>
                        {filters.status.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            Status ({filters.status.length})
                          </span>
                        )}
                        {filters.admin.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            Admin ({filters.admin.length})
                          </span>
                        )}
                        {filters.rep.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                            Rep ({filters.rep.length})
                          </span>
                        )}
                        {filters.description.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 text-teal-800 rounded text-xs">
                            Description ({filters.description.length})
                          </span>
                        )}
                        {filters.jobNumber && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                            Job Number
                          </span>
                        )}
                        {filters.customer && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-pink-100 text-pink-800 rounded text-xs">
                            Customer
                          </span>
                        )}
                        {filters.startDateFrom && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs">
                            Start Date From
                          </span>
                        )}
                        {filters.startDateTo && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs">
                            Start Date To
                          </span>
                        )}
                        <button
                          onClick={clearAllFilters}
                          className="text-xs text-ars-primary hover:text-ars-primary/80 underline"
                        >
                          Clear all
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Table View */}
                  <div className="bg-white border border-gray-200 overflow-hidden rounded-[8px]">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th 
                              className="text-left px-2 py-2 text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => handleSort('jobNumber')}
                            >
                              <div className="flex items-center gap-1">
                                Job Number
                                {sortConfig.field === 'jobNumber' && (
                                  <span className="text-ars-primary">
                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="text-left px-2 py-2 text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => handleSort('status')}
                            >
                              <div className="flex items-center gap-1">
                                Status
                                {sortConfig.field === 'status' && (
                                  <span className="text-ars-primary">
                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="text-left px-2 py-2 text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => handleSort('customer')}
                            >
                              <div className="flex items-center gap-1">
                                Customer
                                {sortConfig.field === 'customer' && (
                                  <span className="text-ars-primary">
                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="text-left px-2 py-2 text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => handleSort('startDate')}
                            >
                              <div className="flex items-center gap-1">
                                Start Date
                                {sortConfig.field === 'startDate' && (
                                  <span className="text-ars-primary">
                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="text-left px-2 py-2 text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => handleSort('dateQuoted')}
                            >
                              <div className="flex items-center gap-1">
                                Quoted
                                {sortConfig.field === 'dateQuoted' && (
                                  <span className="text-ars-primary">
                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="text-left px-2 py-2 text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => handleSort('city')}
                            >
                              <div className="flex items-center gap-1">
                                City
                                {sortConfig.field === 'city' && (
                                  <span className="text-ars-primary">
                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="text-left px-2 py-2 text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => handleSort('admin')}
                            >
                              <div className="flex items-center gap-1">
                                Admin
                                {sortConfig.field === 'admin' && (
                                  <span className="text-ars-primary">
                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="text-left px-2 py-2 text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => handleSort('rep')}
                            >
                              <div className="flex items-center gap-1">
                                Rep
                                {sortConfig.field === 'rep' && (
                                  <span className="text-ars-primary">
                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="text-right px-2 py-2 text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => handleSort('amount')}
                            >
                              <div className="flex items-center justify-end gap-1">
                                Amount
                                {sortConfig.field === 'amount' && (
                                  <span className="text-ars-primary">
                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="text-center px-2 py-2 text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => handleSort('daysOverdue')}
                            >
                              <div className="flex items-center justify-center gap-1">
                                Days Overdue
                                {sortConfig.field === 'daysOverdue' && (
                                  <span className="text-ars-primary">
                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedJobs.map((overdue, index) => {
                              const rowColorClass = getStatusColor(overdue.job?.status?.name);
                              const textColorClass = getStatusTextColor(overdue.job?.status?.name);
                              const repCode = overdue.job ? getRepCodeFromJob(overdue.job) : null;
                              const isLastRow = index === paginatedJobs.length - 1;
                              
                              return (
                                <tr 
                                  key={overdue.jobId}
                                  className={`${rowColorClass} ${isLastRow ? '' : 'border-b border-gray-100'} hover:shadow-md transition-all duration-200 cursor-pointer group`}
                                  onClick={() => {
                                    if (overdue.job) {
                                      setSelectedLead(overdue.job);
                                      navigateToView('leads');
                                    }
                                  }}
                                  style={{
                                    animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`
                                  }}
                                >
                                  {/* Job Number */}
                                  <td className="px-2 py-2">
                                    <div className="font-semibold text-[15px] text-gray-900">
                                      {overdue.jobNumber}
                                    </div>
                                  </td>

                                  {/* Status */}
                                  <td className="px-2 py-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${textColorClass} bg-white/60 border border-current/20 whitespace-nowrap`}>
                                      {overdue.job?.status?.name || overdue.currentStatus || 'No Status'}
                                    </span>
                                  </td>

                                  {/* Customer */}
                                  <td className="px-2 py-2">
                                    <div className="flex items-center gap-1">
                                      <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                      <span className="font-medium text-[15px] text-gray-900">
                                        {(() => {
                                          if (overdue.job?.cashCustomer && overdue.job?.customer?.name) {
                                            return `${overdue.job.cashCustomer} - ${overdue.job.customer.name}`;
                                          }
                                          return overdue.job?.customer?.name || overdue.job?.cashCustomer || 'No customer';
                                        })()}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Start Date */}
                                  <td className="px-2 py-2">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                      <span className="text-xs text-gray-600 whitespace-nowrap">
                                        {formatDate(overdue.job?.startDate)}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Quoted Date */}
                                  <td className="px-2 py-2">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                      <span className="text-xs text-gray-600 whitespace-nowrap">
                                        {formatDate(overdue.job?.dateQuoted)}
                                      </span>
                                    </div>
                                  </td>

                                  {/* City/Branch */}
                                  <td className="px-2 py-2">
                                    <div className="flex items-center gap-1">
                                      <Building2 className="w-3 h-3 text-gray-400" />
                                      <span className="text-[15px] text-gray-600">
                                        {overdue.job?.branch?.name || '-'}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Admin */}
                                  <td className="px-2 py-2">
                                    <div className="flex items-center gap-1">
                                      <Shield className="w-3 h-3 text-gray-400" />
                                      <span className="text-[15px] text-gray-600">
                                        {overdue.job?.adm || '-'}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Rep */}
                                  <td className="px-2 py-2">
                                    <div className="flex items-center gap-1">
                                      <Tag className="w-3 h-3 text-gray-400" />
                                      <span className="text-[15px] text-gray-600">
                                        {repCode?.code || '-'}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Amount */}
                                  <td className="px-2 py-2 text-right">
                                    <span className="font-semibold text-[15px] text-gray-900 whitespace-nowrap">
                                      {formatCurrency(overdue.job?.valueExVat)}
                                    </span>
                                  </td>

                                  {/* Days Overdue */}
                                  <td className="px-2 py-2 text-center">
                                    {overdue.isOverdue ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 whitespace-nowrap">
                                        {overdue.daysOverdue}d
                                      </span>
                                    ) : overdue.isApproaching ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 whitespace-nowrap">
                                        Soon
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                                        0d
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="bg-white px-4 py-3 mt-4 -mx-4">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 font-bold text-[14px] rounded-[8px] text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed uppercase"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 font-bold text-[14px] rounded-[8px] text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed uppercase"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:grid sm:grid-cols-3 sm:gap-4 sm:items-center">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                            <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredJobs.length)}</span> of{' '}
                            <span className="font-medium">{filteredJobs.length}</span> results
                          </p>
                        </div>
                        <div className="flex justify-center">
                          <button
                            onClick={() => navigateToView('leads')}
                            className="bg-[#f7c12b] text-[#383838] px-6 py-3 rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] flex items-center gap-2 hover:brightness-95"
                          >
                            <span>VIEW ALL JOBS</span>
                          </button>
                        </div>
                        <div className="flex justify-end">
                          <nav className="flex items-center gap-2" aria-label="Pagination">
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              className="px-4 py-2 border border-gray-300 rounded-[8px] bg-white font-bold text-[14px] text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase"
                            >
                              Previous
                            </button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
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
                            <button
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={currentPage === totalPages}
                              className="px-4 py-2 border border-gray-300 rounded-[8px] bg-white font-bold text-[14px] text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase"
                            >
                              Next
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}

                  
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

        {view === 'reports' && (isSuperAdmin || hasPermission('reports.read')) && (
          <Reports
            statuses={statuses}
            branches={branches}
          />
        )}
        {view === 'reports' && !isSuperAdmin && !hasPermission('reports.read') && (
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-[8px] shadow-xl p-8 max-w-md w-full text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
              <p className="text-slate-600 mb-6">You don't have permission to access the Reports page. Please contact a Super Admin to grant you the "reports.read" permission.</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 bg-[#0969a9] text-white rounded-[8px] font-bold text-[14px] hover:bg-[#0a7bc4] transition-colors"
              >
                GO TO DASHBOARD
              </button>
            </div>
          </div>
        )}

        {view === 'salesLeads' && hasPermission('sales_leads.read') && (
          <SalesLeadsContainer branches={branches} repCodes={repCodes} />
        )}

        {view === 'salesLeads' && !hasPermission('sales_leads.read') && (
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-[8px] shadow-xl p-8 max-w-md w-full text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
              <p className="text-slate-600 mb-6">You don't have permission to access the Sales Leads system. Please contact a Super Admin to grant you the "sales_leads.read" permission.</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 bg-[#0969a9] text-white rounded-[8px] font-bold text-[14px] hover:bg-[#0a7bc4] transition-colors"
              >
                GO TO DASHBOARD
              </button>
            </div>
          </div>
        )}

        {view === 'diary' && (
          <Diary />
        )}

        {view === 'machines' && isSuperAdmin && (
          <Machines />
        )}

        {view === 'admin' && isSuperAdmin && (
          <SystemManagement />
        )}

        {view === 'jobCardTemplates' && (isSuperAdmin || hasPermission('job_card_templates.read')) && (
          <JobCardTemplates />
        )}

        {view === 'jobCardSubmissions' && (isSuperAdmin || hasPermission('job_card_submissions.read')) && (
          <JobCardSubmissions />
        )}

        {view === 'jobCardTemplates' && !isSuperAdmin && !hasPermission('job_card_templates.read') && (
          <div className="p-8 bg-white rounded-[8px] shadow-lg max-w-lg mx-auto mt-8">
            <h2 className="text-xl font-semibold text-[#383838] mb-2">Access restricted</h2>
            <p className="text-slate-600 mb-6">You don&apos;t have permission to view Job Card Templates. Ask a Super Admin to grant you the &quot;Job Card Templates&quot; permission in System Admin → User Management.</p>
          </div>
        )}

        {view === 'jobCardSubmissions' && !isSuperAdmin && !hasPermission('job_card_submissions.read') && (
          <div className="p-8 bg-white rounded-[8px] shadow-lg max-w-lg mx-auto mt-8">
            <h2 className="text-xl font-semibold text-[#383838] mb-2">Access restricted</h2>
            <p className="text-slate-600 mb-6">You don&apos;t have permission to view Job Card Submissions. Ask a Super Admin to grant you the &quot;Job Card Submissions&quot; permission in System Admin → User Management.</p>
          </div>
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

      {/* Notification Panel */}
      <NotificationPanel 
        isOpen={showNotificationPanel} 
        onClose={() => setShowNotificationPanel(false)}
      />

      {/* Scroll to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-8 left-8 w-14 h-14 bg-[#0969a9] text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 flex items-center justify-center z-40 group"
        title="Scroll to top"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      </button>
    </div>
  );
}
