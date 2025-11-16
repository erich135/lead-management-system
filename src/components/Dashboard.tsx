import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getJobStats,
  getOverdueJobs,
  getStatuses,
  getBranches,
  getCustomers,
  logViewActivity,
  type JobStats,
  type OverdueJob,
  type Status,
  type Branch,
  type Customer,
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
  Ticket,
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
} from 'lucide-react';
import { LeadsList } from './LeadsList';
import { LeadForm } from './LeadForm';
import { LeadDetails } from './LeadDetails';
import { SystemManagement } from './SystemManagement';
import { Reports } from './Reports';
import { Diary } from './Diary';
import { Activities } from './Activities';
import { MobileNavigation } from './MobileNavigation';
import { useIsMobile } from '../hooks/useIsMobile';

type View = 'dashboard' | 'leads' | 'reports' | 'admin' | 'diary' | 'activities';

interface DashboardProps {
  view?: View;
}

export function Dashboard({ view: initialView }: DashboardProps = {}) {
  const { user, signOut, isSuperAdmin } = useAuth();
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
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [leadsListRefreshKey, setLeadsListRefreshKey] = useState(0);

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
    setSelectedLead(null);
    loadStats();
    loadOverdueJobs(); // Refresh overdue jobs list
    setLeadsListRefreshKey(prev => prev + 1); // Trigger LeadsList refresh
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-white pb-20 md:pb-0">
      {/* Desktop Navigation */}
      <nav className="relative bg-gradient-to-r from-[#0969a9] via-[#0a7bc4] to-[#0c8dd9] shadow-xl sticky top-0 z-40 hidden md:block backdrop-blur-md">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v22H0v-2h20zM0 20h2v20H0V20zm4 0h2v20H4V20zm4 0h2v20H8V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2z'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-8">
              {/* Logo Section */}
              <div className="flex items-center gap-3 group">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg p-2 transition-all duration-300 group-hover:bg-white/30 group-hover:scale-105">
                  <img src="/Logo.png" alt="ARS Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white tracking-tight">ARS Management</h1>
                  <p className="text-xs text-white/70">Job Management System</p>
                </div>
              </div>

              {/* Navigation Pills */}
              <div className="hidden md:flex gap-2 bg-white/10 backdrop-blur-sm rounded-xl p-1.5 border border-white/20">
                <Link
                  to="/dashboard"
                  className={`group relative px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                    view === 'dashboard'
                      ? 'bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] shadow-lg scale-105'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <LayoutDashboard className={`w-4 h-4 transition-transform ${view === 'dashboard' ? 'scale-110' : ''}`} />
                  <span>Dashboard</span>
                  {view === 'dashboard' && (
                    <div className="absolute inset-0 bg-white/20 rounded-lg animate-pulse"></div>
                  )}
                </Link>
                <Link
                  to="/jobs"
                  className={`group relative px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                    view === 'leads'
                      ? 'bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] shadow-lg scale-105'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <FileText className={`w-4 h-4 transition-transform ${view === 'leads' ? 'scale-110' : ''}`} />
                  <span>Jobs</span>
                  {view === 'leads' && (
                    <div className="absolute inset-0 bg-white/20 rounded-lg animate-pulse"></div>
                  )}
                </Link>
                <Link
                  to="/reports"
                  className={`group relative px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                    view === 'reports'
                      ? 'bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] shadow-lg scale-105'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <BarChart3 className={`w-4 h-4 transition-transform ${view === 'reports' ? 'scale-110' : ''}`} />
                  <span>Reports</span>
                  {view === 'reports' && (
                    <div className="absolute inset-0 bg-white/20 rounded-lg animate-pulse"></div>
                  )}
                </Link>
                <Link
                  to="/diary"
                  className={`group relative px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                    view === 'diary'
                      ? 'bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] shadow-lg scale-105'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Calendar className={`w-4 h-4 transition-transform ${view === 'diary' ? 'scale-110' : ''}`} />
                  <span>Diary</span>
                  {view === 'diary' && (
                    <div className="absolute inset-0 bg-white/20 rounded-lg animate-pulse"></div>
                  )}
                </Link>
                <Link
                  to="/activities"
                  className={`group relative px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                    view === 'activities'
                      ? 'bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] shadow-lg scale-105'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Clock className={`w-4 h-4 transition-transform ${view === 'activities' ? 'scale-110' : ''}`} />
                  <span>Activities</span>
                  {view === 'activities' && (
                    <div className="absolute inset-0 bg-white/20 rounded-lg animate-pulse"></div>
                  )}
                </Link>
                {isSuperAdmin && (
                  <Link
                    to="/admin"
                    className={`group relative px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                      view === 'admin'
                        ? 'bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] shadow-lg scale-105'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Shield className={`w-4 h-4 transition-transform ${view === 'admin' ? 'scale-110' : ''}`} />
                    <span>System Admin</span>
                    {view === 'admin' && (
                      <div className="absolute inset-0 bg-white/20 rounded-lg animate-pulse"></div>
                    )}
                  </Link>
                )}
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="group relative p-2.5 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl transition-all duration-300 border border-white/20 hover:border-white/30 hover:scale-105"
                >
                  <Bell className="w-5 h-5 text-white transition-transform group-hover:scale-110" />
                  {stats && (stats.overdueReminders > 0 || stats.approachingReminders > 0) && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <span className="text-xs font-bold text-white">
                        {stats.overdueReminders + stats.approachingReminders}
                      </span>
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 py-4 max-h-96 overflow-y-auto z-50 backdrop-blur-md">
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
                            className={`px-3 py-3 mb-2 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${getSeverityColor(overdue.severity)}`}
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
                )}
              </div>

              {/* User Profile */}
              <div className="flex items-center gap-3 pl-4 border-l border-white/20">
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{user?.fullName || 'User'}</p>
                  <p className="text-xs text-white/70 capitalize">{user?.role?.name || 'user'}</p>
                </div>
                <button
                  onClick={signOut}
                  className="p-2.5 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl transition-all duration-300 border border-white/20 hover:border-white/30 hover:scale-105 group"
                  title="Sign out"
                >
                  <LogOut className="w-5 h-5 text-white transition-transform group-hover:scale-110" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Top Bar */}
      {isMobile && (
        <div className="relative bg-gradient-to-r from-[#0969a9] via-[#0a7bc4] to-[#0c8dd9] shadow-xl sticky top-0 z-40 md:hidden backdrop-blur-md">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v22H0v-2h20zM0 20h2v20H0V20zm4 0h2v20H4V20zm4 0h2v20H8V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
          <div className="relative flex items-center justify-between h-16 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg p-2">
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
                className="relative p-2.5 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl transition-all duration-300 border border-white/20"
              >
                <Bell className="w-5 h-5 text-white" />
                {stats && (stats.overdueReminders > 0 || stats.approachingReminders > 0) && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
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
                  className={`px-3 py-3 mb-2 rounded-lg border-2 ${getSeverityColor(overdue.severity)}`}
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
            {/* Header with Gradient Background */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0969a9] via-[#0a7bc4] to-[#0c8dd9] p-8 text-white shadow-2xl">
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat'
              }}></div>
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Ticket className="w-8 h-8" />
                      </div>
                      Job Management
                    </h1>
                    <p className="text-white/90 text-sm md:text-base">
                      Manage your jobs efficiently • {getDateRangeText()}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowLeadForm(true)}
                    className="group relative overflow-hidden bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
                  >
                    <Sparkles className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
                    <span>New Job</span>
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                  </button>
                </div>

                {/* Quick Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 cursor-pointer" onClick={() => navigateToView('leads')}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/80 text-xs font-medium">Total Jobs</p>
                      <FileText className="w-4 h-4 text-white/60" />
                    </div>
                    <p className="text-2xl font-bold">{stats.totalJobs}</p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 cursor-pointer" onClick={() => navigateToView('leads')}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/80 text-xs font-medium">Active</p>
                      <TrendingUp className="w-4 h-4 text-[#f7c12b]" />
                    </div>
                    <p className="text-2xl font-bold">{stats.activeJobs}</p>
                  </div>

                  <div 
                    className={`backdrop-blur-md rounded-xl p-4 border transition-all duration-300 hover:scale-105 cursor-pointer ${
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
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/80 text-xs font-medium">Needs Attention</p>
                      <AlertCircle className={`w-4 h-4 ${
                        stats.overdueReminders > 0 ? 'text-red-200' : stats.approachingReminders > 0 ? 'text-orange-200' : 'text-white/60'
                      }`} />
                    </div>
                    <p className="text-2xl font-bold">{stats.overdueReminders + stats.approachingReminders}</p>
                    {stats.overdueReminders > 0 && (
                      <p className="text-xs text-red-200 mt-1">{stats.overdueReminders} overdue</p>
                    )}
                  </div>

                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 cursor-pointer" onClick={() => navigateToView('reports')}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/80 text-xs font-medium">Total Value</p>
                      <Banknote className="w-4 h-4 text-[#f7c12b]" />
                    </div>
                    <p className="text-2xl font-bold">R{stats.totalValue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Priority Filter Tabs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-ars-heading mb-1">Filter by Priority</h3>
                  <p className="text-xs text-ars-body">
                    Show jobs that need attention based on how overdue they are. 
                    Reminders are calculated from the date the status was last changed (or when follow-up was set).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setSelectedPriority('all')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-300 ${
                    selectedPriority === 'all'
                      ? 'bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white shadow-lg scale-105'
                      : 'bg-white text-ars-body hover:bg-gray-50 border border-gray-200'
                  }`}
                  title="Show all jobs that need attention"
                >
                  All Jobs ({overdueJobs.length})
                </button>
                <button
                  onClick={() => setSelectedPriority('critical')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${
                    selectedPriority === 'critical'
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg scale-105'
                      : 'bg-white text-ars-body hover:bg-red-50 border border-gray-200'
                  }`}
                  title="Jobs that are past their deadline (overdue)"
                >
                  <Zap className="w-4 h-4" />
                  Overdue ({overdueJobs.filter(j => j.severity === 'critical').length})
                </button>
                <button
                  onClick={() => setSelectedPriority('warning')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${
                    selectedPriority === 'warning'
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg scale-105'
                      : 'bg-white text-ars-body hover:bg-orange-50 border border-gray-200'
                  }`}
                  title="Jobs approaching their deadline (80% of time limit reached)"
                >
                  <Clock className="w-4 h-4" />
                  Approaching ({overdueJobs.filter(j => j.severity === 'warning').length})
                </button>
                <button
                  onClick={() => setSelectedPriority('info')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${
                    selectedPriority === 'info'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                      : 'bg-white text-ars-body hover:bg-blue-50 border border-gray-200'
                  }`}
                  title="Jobs that are being monitored but not yet urgent"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Monitored ({overdueJobs.filter(j => j.severity === 'info').length})
                </button>
              </div>
            </div>

            {/* Job List / Cards */}
            <div className="space-y-4">
              {overdueJobs.length === 0 ? (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-12 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4 animate-pulse">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-green-900 mb-2">All Clear! 🎉</h3>
                  <p className="text-green-700 mb-4">No jobs need attention right now. Great job!</p>
                  <div className="mt-6 p-4 bg-white/60 rounded-lg text-left max-w-md mx-auto">
                    <p className="text-sm text-green-800 font-medium mb-2">What does this mean?</p>
                    <p className="text-xs text-green-700">
                      This means all your jobs are either on track or have already moved to their next status within the expected timeframes. 
                      The system automatically tracks when jobs should move to the next status based on your conditional formatting rules.
                    </p>
                  </div>
                </div>
              ) : overdueJobs.filter(job => selectedPriority === 'all' || job.severity === selectedPriority).length === 0 ? (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-12 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                    <FileText className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-blue-900 mb-2">No Jobs in This Category</h3>
                  <p className="text-blue-700 mb-4">Try selecting a different priority filter above.</p>
                </div>
              ) : (
                <>
                  {overdueJobs
                    .filter(job => selectedPriority === 'all' || job.severity === selectedPriority)
                    .slice(0, 5)
                    .map((overdue, index) => (
                      <div
                        key={overdue.jobId}
                        className={`group relative overflow-hidden rounded-xl border-2 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] cursor-pointer ${
                          overdue.severity === 'critical'
                            ? 'bg-gradient-to-r from-red-50 via-red-50 to-orange-50 border-red-300 hover:border-red-400'
                            : overdue.severity === 'warning'
                            ? 'bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 border-orange-300 hover:border-orange-400'
                            : 'bg-gradient-to-r from-blue-50 via-cyan-50 to-sky-50 border-blue-300 hover:border-blue-400'
                        }`}
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
                        {/* Animated gradient overlay on hover */}
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                          overdue.severity === 'critical'
                            ? 'bg-gradient-to-r from-red-400/10 to-orange-400/10'
                            : overdue.severity === 'warning'
                            ? 'bg-gradient-to-r from-orange-400/10 to-yellow-400/10'
                            : 'bg-gradient-to-r from-blue-400/10 to-cyan-400/10'
                        }`}></div>

                        <div className="relative p-6">
                          <div className="flex items-start gap-4">
                            {/* Priority Indicator */}
                            <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                              overdue.severity === 'critical'
                                ? 'bg-gradient-to-br from-red-500 to-red-600'
                                : overdue.severity === 'warning'
                                ? 'bg-gradient-to-br from-orange-500 to-orange-600'
                                : 'bg-gradient-to-br from-blue-500 to-blue-600'
                            }`}>
                              {getSeverityIcon(overdue.severity)}
                            </div>

                            {/* Ticket Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-bold text-ars-heading group-hover:text-ars-primary transition-colors">
                                      {overdue.jobNumber}
                                    </h3>
                                    {overdue.isOverdue && (
                                      <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-md animate-pulse">
                                        {overdue.daysOverdue} days overdue
                                      </span>
                                    )}
                                    {overdue.isApproaching && !overdue.isOverdue && (
                                      <span className="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">
                                        Approaching
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-ars-body font-medium mb-1">
                                    {overdue.job?.customer?.name || overdue.job?.cashCustomer || 'No customer'}
                                  </p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-ars-body group-hover:text-ars-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                              </div>

                              {/* Status Flow */}
                              <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm ${
                                  overdue.severity === 'critical'
                                    ? 'bg-red-100 text-red-800 border border-red-200'
                                    : overdue.severity === 'warning'
                                    ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                                }`}>
                                  {overdue.currentStatus}
                                </span>
                                <ArrowRight className="w-4 h-4 text-ars-body" />
                                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white shadow-sm">
                                  {overdue.expectedNextStatus}
                                </span>
                              </div>

                              {/* Metadata */}
                              <div className="flex items-center gap-4 text-xs text-ars-body">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>
                                    {overdue.isOverdue 
                                      ? `${overdue.daysOverdue} days overdue` 
                                      : `${overdue.daysInStatus}/${overdue.maxDaysAllowed} days`}
                                  </span>
                                </div>
                                {overdue.followUpLevel && (
                                  <div className="flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    <span>Follow-up {overdue.followUpLevel}</span>
                                  </div>
                                )}
                                {overdue.job?.branch && (
                                  <div className="flex items-center gap-1">
                                    <LayoutDashboard className="w-3 h-3" />
                                    <span>{overdue.job.branch.name}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  {/* Show "more" link if there are more than 5 jobs */}
                  {overdueJobs.filter(job => selectedPriority === 'all' || job.severity === selectedPriority).length > 5 && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => navigateToView('leads')}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
                      >
                        <FileText className="w-5 h-5" />
                        View All {overdueJobs.filter(job => selectedPriority === 'all' || job.severity === selectedPriority).length - 5} More Jobs
                        <ArrowRight className="w-5 h-5" />
                      </button>
                      <p className="mt-2 text-sm text-ars-body">
                        Showing 5 of {overdueJobs.filter(job => selectedPriority === 'all' || job.severity === selectedPriority).length} jobs that need attention
                      </p>
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

        {view === 'reports' && (
          <Reports
            statuses={statuses}
            branches={branches}
          />
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
