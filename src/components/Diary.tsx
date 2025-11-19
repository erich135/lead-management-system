/**
 * Diary component for displaying technician bookings and scheduled jobs.
 * Shows jobs with booked dates and technicians in a calendar/diary view.
 * Role-based: Super Admin must select technician, Admin/Rep see linked technicians, Technician sees own jobs.
 */
import { useEffect, useMemo, useState } from 'react';
import { getJobs, getTechnicians, Job, Technician } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Download, Calendar, Filter, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export function Diary() {
  const { user: currentUser } = useAuth();
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allTechnicians, setAllTechnicians] = useState<Technician[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [techFilter, setTechFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [bookedDateOnly, setBookedDateOnly] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(50);

  useEffect(() => {
    loadData();
  }, []);

  /**
   * Loads jobs and technicians from the API based on user role.
   * Paginates through all pages to get all jobs (like LeadsList does).
   */
  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      
      // Load all jobs by paginating through all pages (backend will filter based on role)
      let allJobsList: Job[] = [];
      let currentPage = 1;
      let hasMore = true;
      const pageSize = 1000; // Large page size to minimize requests
      
      while (hasMore) {
        const jobsResponse = await getJobs({
          allTime: 'true',
          page: currentPage,
          limit: pageSize,
          sortBy: 'startDate',
          sortOrder: 'desc',
        });
        
        const jobsList = jobsResponse.jobs || [];
        allJobsList = [...allJobsList, ...jobsList];
        
        // Check if there are more pages
        const totalPages = jobsResponse.pagination?.pages || 1;
        hasMore = currentPage < totalPages && jobsList.length === pageSize;
        currentPage++;
        
        // Safety limit: don't fetch more than 10 pages (10,000 jobs)
        if (currentPage > 10) break;
      }
      
      // Filter to only jobs with techBooked
      const jobsWithTechnician = allJobsList.filter(job => job.techBooked);
      setAllJobs(jobsWithTechnician);

      // Load all technicians
      const techsResponse = await getTechnicians();
      const allTechs = techsResponse.technicians || [];
      setAllTechnicians(allTechs);

      // Filter technicians and jobs based on user role
      const roleName = currentUser?.role?.name?.toLowerCase();
      
      if (roleName === 'technician') {
        // Technician: Auto-select their own technician ID and show their jobs
        const userTechnician = allTechs.find(t => {
          const techUser = (t as any).user;
          return techUser && (typeof techUser === 'object' ? techUser._id === currentUser?.id : techUser === currentUser?.id);
        });
        if (userTechnician) {
          setTechFilter(userTechnician._id);
          const techJobs = jobsWithTechnician.filter(job => {
            const techId = typeof job.techBooked === 'object' && job.techBooked !== null
              ? (job.techBooked as any)._id
              : job.techBooked;
            return techId === userTechnician._id;
          });
          setJobs(techJobs);
          setTechnicians([userTechnician]); // Only show themselves
        } else {
          setJobs([]);
          setTechnicians([]);
        }
      } else if (roleName === 'admin' || roleName === 'rep') {
        // Admin/Rep: Show only technicians linked to their jobs
        const userJobs = jobsWithTechnician;
        const techIds = new Set<string>();
        userJobs.forEach(job => {
          if (job.techBooked) {
            const techId = typeof job.techBooked === 'object' && job.techBooked !== null
              ? (job.techBooked as any)._id
              : job.techBooked;
            if (techId) techIds.add(techId);
          }
        });
        const linkedTechnicians = allTechs.filter(t => techIds.has(t._id));
        setTechnicians(linkedTechnicians);
        setJobs(userJobs); // Show all their jobs initially
      } else {
        // Super Admin or Manager: Show all technicians, but no jobs until technician is selected
        setTechnicians(allTechs);
        setJobs([]); // Don't show jobs until technician is selected
      }
    } catch (err: any) {
      console.error('Error loading diary data:', err);
      setError(err.message || 'Failed to load diary data');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Updates jobs when technician filter changes.
   */
  useEffect(() => {
    if (!allJobs || allJobs.length === 0) return;

    const roleName = currentUser?.role?.name?.toLowerCase();
    
    if (roleName === 'technician') {
      // Technician: Always show their own jobs
      const userTechnician = allTechnicians.find(t => {
        const techUser = (t as any).user;
        return techUser && (typeof techUser === 'object' ? techUser._id === currentUser?.id : techUser === currentUser?.id);
      });
      if (userTechnician) {
        const techJobs = allJobs.filter(job => {
          const techId = typeof job.techBooked === 'object' && job.techBooked !== null
            ? (job.techBooked as any)._id
            : job.techBooked;
          return techId === userTechnician._id;
        });
        setJobs(techJobs);
      }
    } else if (techFilter === 'all') {
      // Show all jobs for admin/rep, or no jobs for super admin
      if (roleName === 'admin' || roleName === 'rep') {
        setJobs(allJobs);
      } else {
        // Super Admin: Don't show jobs until technician is selected
        setJobs([]);
      }
    } else {
      // Filter by selected technician - handle both string ID and object formats
      const filtered = allJobs.filter(job => {
        const techId = typeof job.techBooked === 'object' && job.techBooked !== null
          ? String((job.techBooked as any)._id)
          : String(job.techBooked || '');
        const filterId = String(techFilter);
        return techId === filterId;
      });
      setJobs(filtered);
    }
  }, [techFilter, allJobs, allTechnicians, currentUser]);

  /**
   * Formats a date string for display.
   */
  function formatDate(date: string | Date | undefined): string {
    if (!date) return '';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return '';
    }
  }

  /**
   * Formats time from date or returns empty string.
   */
  function formatTime(date: string | Date | undefined): string {
    if (!date) return '';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '';
    }
  }

  /**
   * Filters jobs based on selected filters and search term.
   */
  const filtered = useMemo(() => {
    if (!jobs || jobs.length === 0) return [];
    
    let result = jobs.filter((job) => {
      // Filter by technician - handle both string ID and object formats
      if (techFilter !== 'all') {
        const techId = typeof job.techBooked === 'object' && job.techBooked !== null
          ? String((job.techBooked as any)._id)
          : String(job.techBooked || '');
        const filterId = String(techFilter);
        if (techId !== filterId) {
          return false;
        }
      }
      
      // If "Booked Date Only" toggle is checked, only show jobs with dateBooked
      if (bookedDateOnly && !job.dateBooked) {
        return false;
      }
      
      // Filter by date range (only applies to jobs WITH dateBooked)
      // Jobs without dateBooked will pass the date filter if dateFrom/dateTo are set
      if (dateFrom && job.dateBooked) {
        const jobDate = typeof job.dateBooked === 'string' ? job.dateBooked.split('T')[0] : new Date(job.dateBooked).toISOString().split('T')[0];
        if (jobDate < dateFrom) {
          return false;
        }
      }
      
      if (dateTo && job.dateBooked) {
        const jobDate = typeof job.dateBooked === 'string' ? job.dateBooked.split('T')[0] : new Date(job.dateBooked).toISOString().split('T')[0];
        if (jobDate > dateTo) {
          return false;
        }
      }
      
      // Search filter - search in customer name, cash customer, job number
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const customerName = typeof job.customer === 'object' && job.customer !== null
          ? (job.customer as any).name?.toLowerCase() || ''
          : '';
        const cashCustomer = job.cashCustomer?.toLowerCase() || '';
        const jobNumber = job.jobNumber?.toLowerCase() || '';
        
        if (!customerName.includes(searchLower) && 
            !cashCustomer.includes(searchLower) && 
            !jobNumber.includes(searchLower)) {
          return false;
        }
      }
      
      return true;
    });
    
    // Sort by dateBooked (if exists), then by job number
    result = result.sort((a, b) => {
      const dateA = a.dateBooked ? new Date(a.dateBooked).getTime() : 0;
      const dateB = b.dateBooked ? new Date(b.dateBooked).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
      return (a.jobNumber || '').localeCompare(b.jobNumber || '');
    });
    
    return result;
  }, [jobs, techFilter, dateFrom, dateTo, bookedDateOnly, searchTerm]);

  /**
   * Paginated jobs based on current page.
   */
  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  }, [filtered, currentPage, itemsPerPage]);

  /**
   * Total pages for pagination.
   */
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  /**
   * Resets to page 1 when filters change.
   */
  useEffect(() => {
    setCurrentPage(1);
  }, [techFilter, dateFrom, dateTo, bookedDateOnly, searchTerm]);

  /**
   * Exports filtered bookings to CSV.
   */
  function toCSV() {
    const header = ['Date Booked', 'Job #', 'Customer', 'Technician', 'Branch', 'Status', 'Description'];
    const rows = filtered.map((job) => [
      formatDate(job.dateBooked),
      job.jobNumber || '',
      job.customer?.name || job.cashCustomer || '',
      job.techBooked?.name || '',
      job.branch?.name || '',
      job.status?.name || '',
      job.description?.name || '',
    ]);
    const csv = [header, ...rows].map((r) => r.map((x) => `"${(x || '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diary-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Exports filtered bookings to PDF (via print dialog).
   */
  async function toPDF() {
    const printWindow = window.open('', 'PRINT', 'height=650,width=900,top=100,left=150');
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Technician Diary</title>`);
    printWindow.document.write(`<style>table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;font:12px Arial}</style>`);
    printWindow.document.write(`</head><body>`);
    printWindow.document.write(`<h3>Technician Diary</h3>`);
    printWindow.document.write(`<table><thead><tr><th>Date Booked</th><th>Job #</th><th>Customer</th><th>Technician</th><th>Branch</th><th>Status</th><th>Description</th></tr></thead><tbody>`);
    filtered.forEach((job) => {
      printWindow!.document.write(`<tr><td>${formatDate(job.dateBooked)}</td><td>${job.jobNumber || ''}</td><td>${job.customer?.name || job.cashCustomer || ''}</td><td>${job.techBooked?.name || ''}</td><td>${job.branch?.name || ''}</td><td>${job.status?.name || ''}</td><td>${job.description?.name || ''}</td></tr>`);
    });
    printWindow.document.write(`</tbody></table>`);
    printWindow.document.write(`</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ars-primary mx-auto mb-4"></div>
          <p className="text-ars-body">Loading diary...</p>
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
            onClick={loadData}
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-ars-heading flex items-center gap-2">
              <Calendar className="w-6 h-6 text-ars-primary" />
              Technician Diary
            </h3>
            <div className="flex gap-2">
              <button
                onClick={toCSV}
                className="px-4 py-2 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={toPDF}
                className="px-4 py-2 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-all flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                PDF
              </button>
            </div>
          </div>

          <div className={`grid grid-cols-1 ${currentUser?.role?.name?.toLowerCase() === 'technician' ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4 mb-6`}>
            {/* Technician Filter - Hidden for technicians, required for super admin */}
            {currentUser?.role?.name?.toLowerCase() !== 'technician' && (
              <div>
                <label className="block text-sm font-semibold text-ars-heading mb-2 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Technician
                  {currentUser?.isSuperAdmin && (
                    <span className="text-xs text-red-600 font-normal">(Required)</span>
                  )}
                </label>
                <select
                  value={techFilter}
                  onChange={(e) => setTechFilter(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
                >
                  <option value="all">
                    {currentUser?.isSuperAdmin ? 'Select Technician' : 'All Technicians'}
                  </option>
                  {technicians && technicians.length > 0 ? (
                    technicians.map((tech) => (
                      <option key={tech._id} value={tech._id}>
                        {tech.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No technicians available</option>
                  )}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-ars-heading mb-2">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ars-heading mb-2">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={loadData}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Booked Date Only Toggle */}
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={bookedDateOnly}
                onChange={(e) => setBookedDateOnly(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-ars-primary focus:ring-ars-primary cursor-pointer"
              />
              <span className="text-sm text-ars-body group-hover:text-ars-heading transition-colors">
                Display Booked Date Only
              </span>
            </label>
            <p className="text-xs text-ars-body mt-1 ml-8">
              {bookedDateOnly 
                ? 'Showing only jobs with booking dates' 
                : 'Showing all jobs assigned to technicians'}
            </p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-ars-heading mb-2 flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer, cash customer, or job number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
              />
            </div>
          </div>

          {/* Show calendar view when no technician is selected (for super admin) */}
          {techFilter === 'all' && currentUser?.isSuperAdmin && allJobs.length > 0 ? (
            <CalendarView jobs={allJobs} />
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-semibold text-ars-heading mb-2">No bookings found</p>
              <p className="text-sm text-ars-body">Try adjusting your filters or check back later</p>
            </div>
          ) : (
            <div className="overflow-auto rounded-xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-[#0969a9] to-[#0a7bc4]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Date Booked</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Job #</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Technician</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Branch</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Description</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedJobs.map((job) => {
                    const formattedDate = job.dateBooked 
                      ? new Date(job.dateBooked).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '-';
                    return (
                    <tr key={job._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ars-heading">
                        {formattedDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ars-body font-semibold">
                        {job.jobNumber || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ars-body">
                        {job.customer?.name || job.cashCustomer || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ars-body">
                        {job.techBooked?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ars-body">
                        {job.branch?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium">
                          {job.status?.name || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-ars-body">
                        {job.description?.name || '-'}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filtered.length > 0 && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
              <div className="text-sm text-ars-body">
                Showing <span className="font-semibold text-ars-heading">
                  {((currentPage - 1) * itemsPerPage) + 1}
                </span> to <span className="font-semibold text-ars-heading">
                  {Math.min(currentPage * itemsPerPage, filtered.length)}
                </span> of <span className="font-semibold text-ars-heading">
                  {filtered.length}
                </span> jobs
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
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
                        className={`px-3 py-2 rounded-lg font-medium transition-all ${
                          currentPage === pageNum
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
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Calendar View Component
 * Displays technician bookings in a monthly calendar format
 */
interface CalendarViewProps {
  jobs: Job[];
}

function CalendarView({ jobs }: CalendarViewProps) {
  console.log('CalendarView received jobs:', jobs.length);
  console.log('Jobs with dateBooked:', jobs.filter(j => j.dateBooked).map(j => ({
    id: j._id,
    dateBooked: j.dateBooked,
    techBooked: j.techBooked
  })));
  
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Get the first and last day of the current month
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  // Get the day of week for the first day (0 = Sunday)
  const firstDayWeekday = firstDayOfMonth.getDay();
  
  // Calculate days to show from previous month
  const daysInMonth = lastDayOfMonth.getDate();
  const totalCells = Math.ceil((daysInMonth + firstDayWeekday) / 7) * 7;
  
  // Navigate to previous month
  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  // Navigate to next month
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  
  // Go to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Get bookings for a specific date
  const getBookingsForDate = (date: Date): Job[] => {
    const dateStr = date.toISOString().split('T')[0];
    return jobs.filter(job => {
      if (!job.dateBooked) return false;
      const jobDateStr = typeof job.dateBooked === 'string' 
        ? job.dateBooked.split('T')[0] 
        : new Date(job.dateBooked).toISOString().split('T')[0];
      return jobDateStr === dateStr;
    });
  };
  
  // Generate calendar cells
  const calendarCells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNumber = i - firstDayWeekday + 1;
    const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
    const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
    const isToday = isCurrentMonth && 
      cellDate.toDateString() === new Date().toDateString();
    const bookings = isCurrentMonth ? getBookingsForDate(cellDate) : [];
    
    calendarCells.push(
      <div
        key={i}
        className={`min-h-[120px] border border-gray-200 p-2 ${
          isCurrentMonth ? 'bg-white' : 'bg-gray-50'
        } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
      >
        <div className={`text-sm font-semibold mb-1 ${
          isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
        } ${isToday ? 'text-blue-600' : ''}`}>
          {isCurrentMonth ? dayNumber : ''}
        </div>
        <div className="space-y-1 overflow-y-auto max-h-[90px]">
          {bookings.map((job, idx) => {
            const techName = typeof job.techBooked === 'object' && job.techBooked !== null
              ? (job.techBooked as any).name || 'Unknown Tech'
              : 'Unknown Tech';
            const time = job.dateBooked ? formatTimeShort(new Date(job.dateBooked)) : '';
            
            return (
              <div
                key={idx}
                className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800 cursor-default hover:bg-purple-200 transition-colors"
                title={`${time} ${techName} - ${job.jobNumber}`}
              >
                <div className="font-semibold">{time} {techName}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-2xl font-bold text-gray-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h4>
        <div className="flex items-center gap-2">
          <button
            onClick={previousMonth}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-0 border-t border-l border-gray-200">
        {/* Week day headers */}
        {weekDays.map(day => (
          <div
            key={day}
            className="bg-gray-100 border-r border-b border-gray-200 px-2 py-3 text-center font-semibold text-sm text-gray-700"
          >
            {day}
          </div>
        ))}
        {/* Calendar cells */}
        {calendarCells}
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        Showing all technician bookings for {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
      </div>
    </div>
  );
}

function formatTimeShort(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

