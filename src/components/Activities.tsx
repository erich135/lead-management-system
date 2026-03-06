/**
 * Activities component.
 * Displays activity/audit log entries for users.
 * Super admins can see all activities with filtering options.
 * Regular users can only see their own activities.
 */
import { useState, useEffect, useRef } from 'react';
import { getActivities, getUsers, getEmailLogs, Activity, User, EmailLog } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Clock, User as UserIcon, Filter, Search, RefreshCw, ChevronLeft, ChevronRight, Mail, CheckCircle, XCircle } from 'lucide-react';
import { formatDateTime } from '../utils/dateFormat';

export function Activities() {
  
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'activities' | 'emailLogs'>('activities');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20; // Load 20 items per page for better performance

  // Filters
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterResourceType, setFilterResourceType] = useState<string>('');
  const [filterUserId, setFilterUserId] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // For super admin: list of users for filtering
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Email logs state
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [emailLogsLoading, setEmailLogsLoading] = useState(false);
  const [emailLogsError, setEmailLogsError] = useState<string | null>(null);
  const [emailLogsPage, setEmailLogsPage] = useState(1);
  const [emailLogsTotalPages, setEmailLogsTotalPages] = useState(1);
  const [emailLogsTotal, setEmailLogsTotal] = useState(0);
  const [emailLogsStartDate, setEmailLogsStartDate] = useState<string>('');
  const [emailLogsEndDate, setEmailLogsEndDate] = useState<string>('');
  const [emailLogsEmailFilter, setEmailLogsEmailFilter] = useState<string>('');
  const [emailLogsTypeFilter, setEmailLogsTypeFilter] = useState<string>('');

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * Loads activities from the API with current filters.
   */
  const loadActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page,
        limit,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      if (filterAction) params.action = filterAction;
      if (filterResourceType) params.resourceType = filterResourceType;
      if (filterUserId) params.userId = filterUserId;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      const response = await getActivities(params);
      setActivities(response.activities);
      setTotalPages(response.pagination.pages);
      setTotal(response.pagination.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load activities');
      console.error('Error loading activities:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Loads users list for super admin filtering.
   */
  const loadUsers = async () => {
    if (!user?.isSuperAdmin) return;

    try {
      setLoadingUsers(true);
      const response = await getUsers({ page: 1, limit: 1000 });
      // apiRequest already extracts data, so response is { users, pagination }
      setUsers(response.users || []);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  /**
   * Loads email logs from the API.
   */
  const loadEmailLogs = async () => {
    if (!user?.isSuperAdmin) return;

    try {
      setEmailLogsLoading(true);
      setEmailLogsError(null);

      const params: any = {
        page: emailLogsPage,
        limit: 20,
      };
      if (emailLogsStartDate) params.startDate = emailLogsStartDate;
      if (emailLogsEndDate) params.endDate = emailLogsEndDate;
      if (emailLogsEmailFilter) params.recipientEmail = emailLogsEmailFilter;
      if (emailLogsTypeFilter) params.emailType = emailLogsTypeFilter;

      const response = await getEmailLogs(params);
      setEmailLogs(response.emailLogs);
      setEmailLogsTotalPages(response.pagination.pages);
      setEmailLogsTotal(response.pagination.total);
    } catch (err: any) {
      setEmailLogsError(err.message || 'Failed to load email logs');
      console.error('Error loading email logs:', err);
    } finally {
      setEmailLogsLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [page, filterAction, filterResourceType, filterUserId, filterStartDate, filterEndDate]);

  useEffect(() => {
    if (user?.isSuperAdmin) {
      loadUsers();
    }
  }, [user?.isSuperAdmin]);

  useEffect(() => {
    if (activeTab === 'emailLogs' && user?.isSuperAdmin) {
      loadEmailLogs();
    }
  }, [activeTab, emailLogsPage, emailLogsStartDate, emailLogsEndDate, emailLogsEmailFilter, emailLogsTypeFilter]);

  /**
   * Handles search with debounce.
   */
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      if (searchTerm) {
        // Filter activities client-side by search term
        // This is a simple implementation - you could also add server-side search
        loadActivities();
      } else {
        loadActivities();
      }
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchTerm]);

  /**
   * Gets unique actions from activities for filter dropdown.
   */
  const uniqueActions = Array.from(new Set(activities.map(a => a.action))).sort();
  const uniqueResourceTypes = Array.from(new Set(activities.map(a => a.resourceType))).sort();

  /**
   * Formats date for display.
   */
  // Date formatting moved to utils/dateFormat.ts

  /**
   * Gets action badge color.
   */
  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'bg-green-100 text-green-800';
      case 'update':
      case 'edit':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'view':
        return 'bg-gray-100 text-gray-800';
      case 'login':
        return 'bg-purple-100 text-purple-800';
      case 'logout':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  /**
   * Gets email type badge color.
   */
  const getEmailTypeBadge = (type: string) => {
    switch (type) {
      case 'lead_assigned':
        return 'bg-blue-100 text-blue-800';
      case 'lead_status_changed':
        return 'bg-yellow-100 text-yellow-800';
      case 'appointment_created':
        return 'bg-green-100 text-green-800';
      case 'appointment_updated':
        return 'bg-indigo-100 text-indigo-800';
      case 'appointment_cancelled':
        return 'bg-red-100 text-red-800';
      case 'appointment_reminder':
        return 'bg-orange-100 text-orange-800';
      case 'daily_reminder':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  /**
   * Formats email type for display.
   */
  const formatEmailType = (type: string) => {
    switch (type) {
      case 'lead_assigned': return 'Lead Assigned';
      case 'lead_status_changed': return 'Status Changed';
      case 'appointment_created': return 'Appt. Created';
      case 'appointment_updated': return 'Appt. Updated';
      case 'appointment_cancelled': return 'Appt. Cancelled';
      case 'appointment_reminder': return 'Appt. Reminder';
      case 'daily_reminder': return 'Daily Reminder';
      default: return type;
    }
  };

  /**
   * Clears all filters.
   */
  const clearFilters = () => {
    setFilterAction('');
    setFilterResourceType('');
    setFilterUserId('');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearchTerm('');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-8 border border-gray-200 rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-ars-heading flex items-center gap-2">
            {activeTab === 'activities' ? 'Activity Log' : 'Email Notifications'}
          </h3>
          <button
            onClick={activeTab === 'activities' ? loadActivities : loadEmailLogs}
            disabled={activeTab === 'activities' ? loading : emailLogsLoading}
            className="px-4 py-2 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${(activeTab === 'activities' ? loading : emailLogsLoading) ? 'animate-spin' : ''}`} />
            REFRESH
          </button>
        </div>

        {/* Tabs */}
        {user?.isSuperAdmin && (
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('activities')}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'activities'
                  ? 'border-[#0969a9] text-[#0969a9]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Clock className="w-4 h-4 inline-block mr-2 -mt-0.5" />
              Activity Log
            </button>
            <button
              onClick={() => setActiveTab('emailLogs')}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'emailLogs'
                  ? 'border-[#0969a9] text-[#0969a9]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Mail className="w-4 h-4 inline-block mr-2 -mt-0.5" />
              Email Notifications
            </button>
          </div>
        )}

        {/* ===================== EMAIL LOGS TAB ===================== */}
        {activeTab === 'emailLogs' && user?.isSuperAdmin && (
          <>
            {/* Email Logs Filters */}
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="text-[11px] font-medium text-gray-600 mb-1 block">Recipient Email</label>
                  <input
                    type="text"
                    placeholder="Filter by email..."
                    value={emailLogsEmailFilter}
                    onChange={(e) => { setEmailLogsEmailFilter(e.target.value); setEmailLogsPage(1); }}
                    className="w-full pl-2 pr-2 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[13px] h-[38px]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-600 mb-1 block">Email Type</label>
                  <select
                    value={emailLogsTypeFilter}
                    onChange={(e) => { setEmailLogsTypeFilter(e.target.value); setEmailLogsPage(1); }}
                    className="w-full pl-2 pr-10 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[13px] appearance-none h-[38px]"
                    style={{
                      backgroundImage: `url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3e%3cpolyline points="6 9 12 15 18 9"%3e%3c/polyline%3e%3c/svg%3e')`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.75rem center',
                      backgroundSize: '1rem 1rem'
                    }}
                  >
                    <option value="">All Types</option>
                    <option value="daily_reminder">Daily Reminder</option>
                    <option value="lead_assigned">Lead Assigned</option>
                    <option value="lead_status_changed">Lead Status Changed</option>
                    <option value="appointment_created">Appointment Created</option>
                    <option value="appointment_updated">Appointment Updated</option>
                    <option value="appointment_cancelled">Appointment Cancelled</option>
                    <option value="appointment_reminder">Appointment Reminder</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-600 mb-1 block">Start Date</label>
                  <input
                    type="date"
                    value={emailLogsStartDate}
                    onChange={(e) => { setEmailLogsStartDate(e.target.value); setEmailLogsPage(1); }}
                    className="w-full pl-2 pr-2 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[13px] h-[38px]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-600 mb-1 block">End Date</label>
                  <input
                    type="date"
                    value={emailLogsEndDate}
                    onChange={(e) => { setEmailLogsEndDate(e.target.value); setEmailLogsPage(1); }}
                    className="w-full pl-2 pr-2 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[13px] h-[38px]"
                  />
                </div>
              </div>
              <button
                onClick={() => { setEmailLogsEmailFilter(''); setEmailLogsStartDate(''); setEmailLogsEndDate(''); setEmailLogsTypeFilter(''); setEmailLogsPage(1); }}
                className="text-sm text-[#0969a9] hover:text-[#0a7bc4] font-medium"
              >
                Clear All Filters
              </button>
            </div>

            {/* Email Logs Error */}
            {emailLogsError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">{emailLogsError}</p>
                <button onClick={loadEmailLogs} className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium">Retry</button>
              </div>
            )}

            {/* Email Logs Table */}
            <div className="overflow-auto rounded-xl border border-gray-200">
              {emailLogsLoading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ars-primary mx-auto mb-4"></div>
                  <p className="text-ars-body">Loading email logs...</p>
                </div>
              ) : emailLogs.length === 0 ? (
                <div className="p-12 text-center">
                  <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-ars-heading mb-2">No email logs found</p>
                  <p className="text-sm text-ars-body">Email notifications will appear here once the system sends lead, appointment, or daily reminder emails.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-[#0969a9] to-[#0a7bc4]">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Date & Time Sent</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Subject / Details</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Recipient</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {emailLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ars-heading">
                            {formatDateTime(log.sentAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEmailTypeBadge(log.emailType)}`}>
                              {formatEmailType(log.emailType)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-ars-body max-w-xs">
                            {log.subject ? (
                              <div>
                                <div className="font-medium text-ars-heading truncate" title={log.subject}>{log.subject}</div>
                                {log.leadNumber && (
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {log.leadNumber}{log.companyName ? ` — ${log.companyName}` : ''}
                                  </div>
                                )}
                              </div>
                            ) : log.jobCount != null && log.jobCount > 0 ? (
                              <div>
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                                  {log.jobCount} job reminder{log.jobCount !== 1 ? 's' : ''}
                                </span>
                                {log.adminCode && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {log.adminCode}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-ars-body">
                            <div className="font-medium">{log.recipientName}</div>
                            <div className="text-xs text-gray-500">{log.recipientEmail}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {log.status === 'sent' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3" />
                                Sent
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800" title={log.errorMessage || ''}>
                                <XCircle className="w-3 h-3" />
                                Failed
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Email Logs Pagination */}
            {!emailLogsLoading && emailLogsTotal > 0 && emailLogsTotalPages > 1 && (
              <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
                <div className="text-sm text-ars-body">
                  Showing <span className="font-semibold text-ars-heading">{((emailLogsPage - 1) * 20) + 1}</span> to{' '}
                  <span className="font-semibold text-ars-heading">{Math.min(emailLogsPage * 20, emailLogsTotal)}</span> of{' '}
                  <span className="font-semibold text-ars-heading">{emailLogsTotal}</span> email logs
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEmailLogsPage(p => Math.max(1, p - 1))}
                    disabled={emailLogsPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-[8px] font-bold text-[14px] hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    PREVIOUS
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, emailLogsTotalPages) }, (_, i) => {
                      let pageNum: number;
                      if (emailLogsTotalPages <= 5) {
                        pageNum = i + 1;
                      } else if (emailLogsPage <= 3) {
                        pageNum = i + 1;
                      } else if (emailLogsPage >= emailLogsTotalPages - 2) {
                        pageNum = emailLogsTotalPages - 4 + i;
                      } else {
                        pageNum = emailLogsPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setEmailLogsPage(pageNum)}
                          className={`px-3 py-2 rounded-lg font-medium transition-all ${
                            emailLogsPage === pageNum
                              ? 'bg-ars-primary text-white'
                              : 'border border-gray-300 hover:bg-gray-50 text-ars-body'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setEmailLogsPage(p => Math.min(emailLogsTotalPages, p + 1))}
                    disabled={emailLogsPage === emailLogsTotalPages}
                    className="px-4 py-2 border border-gray-300 rounded-[8px] font-bold text-[14px] hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    NEXT
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ===================== ACTIVITY LOG TAB ===================== */}
        {activeTab === 'activities' && (
          <>
        {/* Filters */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
            {/* Search */}
            <div className="xl:col-span-5">
              <label className="text-[11px] font-medium text-gray-600 mb-1 block">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[13px] h-[38px]"
                />
              </div>
            </div>

            {/* Action Filter */}
            <div>
              <label className="text-[11px] font-medium text-gray-600 mb-1 block">Action</label>
              <select
                value={filterAction}
                onChange={(e) => {
                  setFilterAction(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-2 pr-10 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[13px] appearance-none h-[38px]"
                style={{
                  backgroundImage: `url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3e%3cpolyline points="6 9 12 15 18 9"%3e%3c/polyline%3e%3c/svg%3e')`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '1rem 1rem'
                }}
              >
                <option value="">All Actions</option>
                {uniqueActions.map((action) => (
                  <option key={action} value={action}>
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Resource Type Filter */}
            <div>
              <label className="text-[11px] font-medium text-gray-600 mb-1 block">Resource Type</label>
              <select
                value={filterResourceType}
                onChange={(e) => {
                  setFilterResourceType(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-2 pr-10 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[13px] appearance-none h-[38px]"
                style={{
                  backgroundImage: `url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3e%3cpolyline points="6 9 12 15 18 9"%3e%3c/polyline%3e%3c/svg%3e')`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '1rem 1rem'
                }}
              >
                <option value="">All Resources</option>
                {uniqueResourceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* User Filter (Super Admin Only) */}
            {user?.isSuperAdmin && (
              <div>
                <label className="text-[11px] font-medium text-gray-600 mb-1 block">User</label>
                <select
                  value={filterUserId}
                  onChange={(e) => {
                    setFilterUserId(e.target.value);
                    setPage(1);
                  }}
                  disabled={loadingUsers}
                  className="w-full pl-2 pr-10 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[13px] appearance-none h-[38px] disabled:opacity-50"
                  style={{
                    backgroundImage: `url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3e%3cpolyline points="6 9 12 15 18 9"%3e%3c/polyline%3e%3c/svg%3e')`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.75rem center',
                    backgroundSize: '1rem 1rem'
                  }}
                >
                  <option value="">All Users</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.firstName} {u.lastName} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Start Date Filter */}
            <div>
              <label className="text-[11px] font-medium text-gray-600 mb-1 block">Start Date</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => {
                  setFilterStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-2 pr-2 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[13px] h-[38px]"
              />
            </div>

            {/* End Date Filter */}
            <div>
              <label className="text-[11px] font-medium text-gray-600 mb-1 block">End Date</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => {
                  setFilterEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-2 pr-2 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[13px] h-[38px]"
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          <button
            onClick={clearFilters}
            className="text-sm text-[#0969a9] hover:text-[#0a7bc4] font-medium"
          >
            Clear All Filters
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={loadActivities}
              className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Activities List */}
        <div className="overflow-auto rounded-xl border border-gray-200">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ars-primary mx-auto mb-4"></div>
              <p className="text-ars-body">Loading activities...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-semibold text-ars-heading mb-2">No activities found</p>
              <p className="text-sm text-ars-body">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-[#0969a9] to-[#0a7bc4]">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Time</th>
                      {user?.isSuperAdmin && (
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">User</th>
                      )}
                      <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Action</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Resource</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Description</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activities
                      .filter((activity) => {
                        if (!searchTerm) return true;
                        const searchLower = searchTerm.toLowerCase();
                        return (
                          activity.description.toLowerCase().includes(searchLower) ||
                          activity.action.toLowerCase().includes(searchLower) ||
                          activity.resourceType.toLowerCase().includes(searchLower) ||
                          (typeof activity.userId === 'object' && activity.userId?.email?.toLowerCase().includes(searchLower)) || false
                        );
                      })
                      .map((activity) => (
                        <tr
                          key={activity._id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ars-heading">
                            {formatDateTime(activity.createdAt)}
                          </td>
                          {user?.isSuperAdmin && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {activity.userId && typeof activity.userId === 'object' && activity.userId.email ? (
                                <div className="flex items-center gap-2">
                                  <UserIcon className="w-4 h-4 text-gray-400" />
                                  <span className="text-ars-body">
                                    {activity.userId.firstName || ''} {activity.userId.lastName || ''}
                                  </span>
                                  <span className="text-gray-400 text-xs">
                                    ({activity.userId.email})
                                  </span>
                                </div>
                              ) : activity.userId ? (
                                <div className="flex items-center gap-2">
                                  <UserIcon className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-400 text-xs">
                                    User ID: {typeof activity.userId === 'string' ? activity.userId.slice(-8) : 'Unknown'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">System</span>
                              )}
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(
                                activity.action
                              )}`}
                            >
                              {activity.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-ars-body">
                            {activity.resourceType}
                            {activity.resourceId && (
                              <span className="text-gray-400 ml-1">
                                ({activity.resourceId.slice(-8)})
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-ars-body">
                            {activity.description}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {!loading && total > 0 && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
            <div className="text-sm text-ars-body">
              Showing <span className="font-semibold text-ars-heading">
                {((page - 1) * limit) + 1}
              </span> to <span className="font-semibold text-ars-heading">
                {Math.min(page * limit, total)}
              </span> of <span className="font-semibold text-ars-heading">
                {total}
              </span> activities
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-[8px] font-bold text-[14px] hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                PREVIOUS
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-2 rounded-lg font-medium transition-all ${
                        page === pageNum
                          ? 'bg-ars-primary text-white'
                          : 'border border-gray-300 hover:bg-gray-50 text-ars-body'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-[8px] font-bold text-[14px] hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                NEXT
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
