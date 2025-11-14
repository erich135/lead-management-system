/**
 * Activities component.
 * Displays activity/audit log entries for users.
 * Super admins can see all activities with filtering options.
 * Regular users can only see their own activities.
 */
import { useState, useEffect, useRef } from 'react';
import { getActivities, getUsers, Activity, User } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Clock, User as UserIcon, Filter, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

export function Activities() {
  const { user } = useAuth();
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

  useEffect(() => {
    loadActivities();
  }, [page, filterAction, filterResourceType, filterUserId, filterStartDate, filterEndDate]);

  useEffect(() => {
    if (user?.isSuperAdmin) {
      loadUsers();
    }
  }, [user?.isSuperAdmin]);

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
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Clock className="w-8 h-8" />
                Activity Log
              </h1>
              <p className="text-blue-100">
                {user?.isSuperAdmin ? 'View all system activities' : 'View your activity history'}
              </p>
            </div>
            <button
              onClick={loadActivities}
              disabled={loading}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-800">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Search */}
            <div className="xl:col-span-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0969a9] focus:border-transparent"
                />
              </div>
            </div>

            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Action</label>
              <select
                value={filterAction}
                onChange={(e) => {
                  setFilterAction(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0969a9] focus:border-transparent"
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Resource Type</label>
              <select
                value={filterResourceType}
                onChange={(e) => {
                  setFilterResourceType(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0969a9] focus:border-transparent"
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
                <label className="block text-sm font-medium text-slate-700 mb-1">User</label>
                <select
                  value={filterUserId}
                  onChange={(e) => {
                    setFilterUserId(e.target.value);
                    setPage(1);
                  }}
                  disabled={loadingUsers}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0969a9] focus:border-transparent disabled:opacity-50"
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => {
                  setFilterStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0969a9] focus:border-transparent"
              />
            </div>

            {/* End Date Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => {
                  setFilterEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0969a9] focus:border-transparent"
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          <div className="mt-4">
            <button
              onClick={clearFilters}
              className="text-sm text-[#0969a9] hover:text-[#0a7bc4] font-medium"
            >
              Clear All Filters
            </button>
          </div>
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
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0969a9] mx-auto mb-4"></div>
              <p className="text-slate-600">Loading activities...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 text-lg">No activities found</p>
              <p className="text-slate-400 text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Time</th>
                      {user?.isSuperAdmin && (
                        <th className="px-6 py-4 text-left text-sm font-semibold">User</th>
                      )}
                      <th className="px-6 py-4 text-left text-sm font-semibold">Action</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Resource</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {activities
                      .filter((activity) => {
                        if (!searchTerm) return true;
                        const searchLower = searchTerm.toLowerCase();
                        return (
                          activity.description.toLowerCase().includes(searchLower) ||
                          activity.action.toLowerCase().includes(searchLower) ||
                          activity.resourceType.toLowerCase().includes(searchLower) ||
                          (activity.userId?.email?.toLowerCase().includes(searchLower) || false)
                        );
                      })
                      .map((activity) => (
                        <tr
                          key={activity._id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {formatDate(activity.createdAt)}
                          </td>
                          {user?.isSuperAdmin && (
                            <td className="px-6 py-4 text-sm">
                              {activity.userId && typeof activity.userId === 'object' && activity.userId.email ? (
                                <div className="flex items-center gap-2">
                                  <UserIcon className="w-4 h-4 text-slate-400" />
                                  <span className="text-slate-700">
                                    {activity.userId.firstName || ''} {activity.userId.lastName || ''}
                                  </span>
                                  <span className="text-slate-400 text-xs">
                                    ({activity.userId.email})
                                  </span>
                                </div>
                              ) : activity.userId ? (
                                <div className="flex items-center gap-2">
                                  <UserIcon className="w-4 h-4 text-slate-400" />
                                  <span className="text-slate-400 text-xs">
                                    User ID: {typeof activity.userId === 'string' ? activity.userId.slice(-8) : 'Unknown'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">System</span>
                              )}
                            </td>
                          )}
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(
                                activity.action
                              )}`}
                            >
                              {activity.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {activity.resourceType}
                            {activity.resourceId && (
                              <span className="text-slate-400 ml-1">
                                ({activity.resourceId.slice(-8)})
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {activity.description}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {total > 0 && (
                <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-200">
                  <div className="text-sm text-slate-600">
                    Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} activities
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1 || loading}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <span className="text-sm text-slate-600">
                      Page {page} of {totalPages || 1}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages || loading}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

