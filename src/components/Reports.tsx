/**
 * Reports component for displaying job analytics and statistics.
 * Shows filtered job data with breakdowns by status, branch, and other metrics.
 */
import { useState, useEffect } from 'react';
import { getJobs, Job, Status, Branch } from '../lib/api';
import { 
  Download, 
  Filter, 
  TrendingUp, 
  Banknote,
  Search,
  Calendar
} from 'lucide-react';

interface ReportsProps {
  statuses: Status[];
  branches: Branch[];
}

export function Reports({ statuses, branches }: ReportsProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [filters, setFilters] = useState({
    status: 'all',
    branch: 'all',
    admin: 'all',
    dateFrom: '',
    dateTo: '',
  });

  // Get unique admin codes from jobs
  const adminCodes = Array.from(new Set(jobs.map(job => job.adm).filter(Boolean))).sort() as string[];

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [jobs, filters, searchTerm]);

  /**
   * Loads all jobs from the API for reporting.
   * Uses date filters if provided, otherwise loads all jobs.
   */
  async function loadJobs() {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        allTime: 'true', // Default to all time
        sortBy: 'startDate',
        sortOrder: 'desc',
      };

      // If date filters are set, use them instead of allTime
      if (filters.dateFrom || filters.dateTo) {
        delete params.allTime;
        if (filters.dateFrom) {
          params.startDate = filters.dateFrom;
        }
        if (filters.dateTo) {
          params.endDate = filters.dateTo;
        }
      }

      // Load all jobs by paginating through pages
      let allJobs: Job[] = [];
      let currentPage = 1;
      let hasMore = true;
      const pageSize = 1000;

      while (hasMore) {
        const response = await getJobs({
          ...params,
          page: currentPage,
          limit: pageSize,
        });
        
        const jobsList = response.jobs || [];
        allJobs = [...allJobs, ...jobsList];
        
        // Check if there are more pages
        if (jobsList.length < pageSize || allJobs.length >= response.pagination?.total || 0) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      setJobs(allJobs);
    } catch (err: any) {
      console.error('Error loading jobs:', err);
      setError(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Applies filters to the jobs list.
   */
  function applyFilters() {
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

    if (filters.status !== 'all') {
      filtered = filtered.filter((job) => job.status?._id === filters.status);
    }

    if (filters.branch !== 'all') {
      filtered = filtered.filter((job) => job.branch?._id === filters.branch);
    }

    if (filters.admin !== 'all') {
      filtered = filtered.filter((job) => job.adm === filters.admin);
    }

    // Date filters are already applied in loadJobs, but we can also filter client-side if needed
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom).getTime();
      filtered = filtered.filter((job) => {
        const jobDate = job.startDate ? new Date(job.startDate).getTime() : 0;
        return jobDate >= from;
      });
    }

    if (filters.dateTo) {
      const to = new Date(filters.dateTo).getTime();
      filtered = filtered.filter((job) => {
        const jobDate = job.startDate ? new Date(job.startDate).getTime() : 0;
        return jobDate <= to;
      });
    }

    // Sort by date descending
    filtered.sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return dateB - dateA;
    });

    setFilteredJobs(filtered);
  }

  /**
   * Handles applying date filters by reloading jobs.
   */
  function handleApplyDateFilters() {
    loadJobs();
  }

  /**
   * Resets all filters.
   */
  function handleResetFilters() {
    setFilters({
      status: 'all',
      branch: 'all',
      admin: 'all',
      dateFrom: '',
      dateTo: '',
    });
    setSearchTerm('');
    // Reload all jobs
    setTimeout(() => {
      loadJobs();
    }, 0);
  }

  /**
   * Calculates statistics from filtered jobs.
   */
  function calculateStats() {
    const totalValue = filteredJobs.reduce((sum, job) => sum + (job.valueExVat || 0), 0);
    const avgValue = filteredJobs.length > 0 ? totalValue / filteredJobs.length : 0;

    const statusBreakdown = filteredJobs.reduce((acc, job) => {
      const statusName = job.status?.name || 'Unknown';
      acc[statusName] = (acc[statusName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const branchBreakdown = filteredJobs.reduce((acc, job) => {
      const branchName = job.branch?.name || 'Unknown';
      acc[branchName] = (acc[branchName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const adminBreakdown = filteredJobs.reduce((acc, job) => {
      const adminCode = job.adm || 'Unassigned';
      acc[adminCode] = (acc[adminCode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalValue,
      avgValue,
      statusBreakdown,
      branchBreakdown,
      adminBreakdown,
    };
  }

  /**
   * Exports filtered jobs to CSV.
   * Matches the original document field order.
   */
  function exportToCSV() {
    const headers = [
      'Start Date',
      'Date Quoted',
      'Job #',
      'Status',
      'Customer',
      'Cash Customer',
      'Description',
      'Value ex Vat',
      'Adm',
      'Rep Code',
      'Register Date',
      'Tech Booked',
      'Date Booked',
      'RSR #',
      'Feedback',
      'Follow up 1',
      'Follow up 2',
      'Follow Up 3',
      'Follow Up 4',
      'PO Date',
      'PO Number',
      'Oil Sample #',
      'Store Pack',
      'Invoice Date',
      'Inv #',
    ];

    const formatDate = (date: string | Date | undefined): string => {
      if (!date) return '';
      try {
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
      } catch {
        return '';
      }
    };

    const rows = filteredJobs.map((job) => [
      formatDate(job.startDate),
      formatDate(job.dateQuoted),
      job.jobNumber || '',
      job.status?.name || '',
      job.customer?.name || '',
      job.cashCustomer || '',
      job.description?.name || '',
      job.valueExVat || '',
      job.adm || '',
      job.repCode?.code || '',
      formatDate(job.registerDate),
      job.techBooked?.name || '',
      formatDate(job.dateBooked),
      job.rsrNumber || '',
      job.feedback || '',
      job.followUp1?.name || '',
      job.followUp2?.name || '',
      job.followUp3?.name || '',
      job.followUp4?.name || '',
      formatDate(job.poDate),
      job.poNumber || '',
      job.oilSampleNumber || '',
      job.storePack || '',
      formatDate(job.invoiceDate),
      job.invNumber || '',
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell)}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobs-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const stats = calculateStats();

  // Calculate date range display
  const getDateRangeDisplay = () => {
    if (filters.dateFrom && filters.dateTo) {
      return `${new Date(filters.dateFrom).toLocaleDateString()} - ${new Date(filters.dateTo).toLocaleDateString()}`;
    } else if (filters.dateFrom) {
      return `From ${new Date(filters.dateFrom).toLocaleDateString()}`;
    } else if (filters.dateTo) {
      return `Until ${new Date(filters.dateTo).toLocaleDateString()}`;
    }
    return 'All time (no date restrictions)';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ars-primary mx-auto mb-4"></div>
          <p className="text-ars-body">Loading report data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-white flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl border border-gray-200 shadow-lg p-8 max-w-md">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={loadJobs}
            className="px-6 py-3 bg-gradient-to-r from-ars-primary to-ars-secondary text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-ars-heading">Reports & Analytics</h2>
          <button
            onClick={exportToCSV}
            className="bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] px-4 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Summary Cards - Full Width at Top */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-ars-body">Total Jobs</p>
              <TrendingUp className="w-5 h-5 text-ars-primary" />
            </div>
            <p className="text-3xl font-bold text-ars-heading">{filteredJobs.length.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-ars-body">Total Value</p>
              <Banknote className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-ars-heading">R{stats.totalValue.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-ars-body">Average Value</p>
              <Banknote className="w-5 h-5 text-ars-primary" />
            </div>
            <p className="text-3xl font-bold text-ars-heading">
              R{Math.round(stats.avgValue).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar - Filters */}
          <div className="w-full lg:w-80 flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-md p-6 lg:h-fit lg:sticky lg:top-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-ars-heading flex items-center gap-2">
                <Filter className="w-5 h-5 text-ars-primary" />
                Filters
              </h3>
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
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
              >
                <option value="all">All Statuses</option>
                {statuses && statuses.length > 0 ? (
                  statuses.map((status) => (
                    <option key={status._id} value={status._id}>
                      {status.name}
                    </option>
                  ))
                ) : null}
              </select>
            </div>

            {/* Branch Filter */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-ars-heading mb-2">Branch</label>
              <select
                value={filters.branch}
                onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
              >
                <option value="all">All Branches</option>
                {branches && branches.length > 0 ? (
                  branches.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name}
                    </option>
                  ))
                ) : null}
              </select>
            </div>

            {/* Admin Filter */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-ars-heading mb-2">Admin (ADM)</label>
              <select
                value={filters.admin}
                onChange={(e) => setFilters({ ...filters, admin: e.target.value })}
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

            {/* Date Filters */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-ars-heading mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date Range
              </label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-ars-body mb-1">From Date</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ars-body mb-1">To Date</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
                  />
                </div>
                <button
                  onClick={handleApplyDateFilters}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  Apply Date Filter
                </button>
                {(filters.dateFrom || filters.dateTo) && (
                  <button
                    onClick={() => {
                      setFilters({ ...filters, dateFrom: '', dateTo: '' });
                      setTimeout(() => loadJobs(), 0);
                    }}
                    className="w-full px-4 py-2.5 border border-gray-300 text-ars-body rounded-xl font-medium hover:bg-gray-50 transition-all"
                  >
                    Clear Dates
                  </button>
                )}
              </div>
            </div>

            {/* Results Count & Date Range Info */}
            <div className="pt-4 border-t border-gray-200 space-y-2">
              <p className="text-sm text-ars-body">
                <span className="font-semibold text-ars-heading">{filteredJobs.length}</span> jobs found
              </p>
              <p className="text-xs text-ars-body bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <span className="font-medium text-blue-900">Date Range:</span>{' '}
                <span className="text-blue-700">{getDateRangeDisplay()}</span>
              </p>
              {jobs.length > 0 && (
                <p className="text-xs text-ars-body">
                  Total loaded: <span className="font-medium">{jobs.length}</span> jobs
                </p>
              )}
            </div>
          </div>

          {/* Right Side - Breakdown Charts */}
          <div className="flex-1 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
              <h3 className="text-lg font-bold text-ars-heading mb-4 pb-2 border-b border-gray-200">By Status</h3>
              <div className="space-y-3">
                {Object.entries(stats.statusBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <div key={status} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-sm font-medium text-ars-body sm:min-w-[120px]">{status}</span>
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-ars-primary to-ars-secondary rounded-full transition-all duration-500"
                            style={{
                              width: `${filteredJobs.length > 0 ? (count / filteredJobs.length) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-bold text-ars-heading sm:min-w-[50px] text-right">
                          {count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
              <h3 className="text-lg font-bold text-ars-heading mb-4 pb-2 border-b border-gray-200">By Branch</h3>
              <div className="space-y-3">
                {Object.entries(stats.branchBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([branch, count]) => (
                    <div key={branch} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-sm font-medium text-ars-body sm:min-w-[120px]">{branch}</span>
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] rounded-full transition-all duration-500"
                            style={{
                              width: `${filteredJobs.length > 0 ? (count / filteredJobs.length) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-bold text-ars-heading sm:min-w-[50px] text-right">
                          {count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
              <h3 className="text-lg font-bold text-ars-heading mb-4 pb-2 border-b border-gray-200">By Admin</h3>
              <div className="space-y-3">
                {Object.entries(stats.adminBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([admin, count]) => (
                    <div key={admin} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-sm font-medium text-ars-body sm:min-w-[120px]">{admin}</span>
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                            style={{
                              width: `${filteredJobs.length > 0 ? (count / filteredJobs.length) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-bold text-ars-heading sm:min-w-[50px] text-right">
                          {count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
