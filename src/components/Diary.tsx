/**
 * Diary component for displaying technician bookings and scheduled jobs.
 * Shows jobs with booked dates and technicians in a calendar/diary view.
 * Role-based: Super Admin must select technician, Admin/Rep see linked technicians, Technician sees own jobs.
 */
import { useEffect, useMemo, useState } from 'react';
import { getDiaryJobs, getJobs, getTechnicians, getStatuses, getBranches, getCustomers, getServiceDescriptions, getRepCodes, createJob, updateJob, Job, Technician, Status, Branch, Customer, ServiceDescription, RepCode } from '../lib/api';
import { formatDate } from '../utils/dateFormat';
import { useAuth } from '../contexts/AuthContext';
import { Download, Calendar, Filter, Search, ChevronLeft, ChevronRight, Table, X, Plus, Loader2 } from 'lucide-react';
import { LeadDetails } from './LeadDetails';

export function Diary() {
  const { user: currentUser } = useAuth();
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allTechnicians, setAllTechnicians] = useState<Technician[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [techFilter, setTechFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [bookedDateOnly, setBookedDateOnly] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(50);
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar'); // Default to calendar view

  useEffect(() => {
    loadData();
  }, []);

  /**
   * Loads diary jobs (only jobs with active bookings) from the dedicated diary endpoint.
   * Single request replaces the old multi-page pagination loop.
   */
  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      
      // Load diary jobs (server returns only jobs with active bookings, minimal payload)
      const diaryResponse = await getDiaryJobs();
      const jobsWithBookings = diaryResponse.jobs || [];
      setAllJobs(jobsWithBookings);

      // Load all technicians
      const techsResponse = await getTechnicians();
      const allTechs = techsResponse.technicians || [];
      setAllTechnicians(allTechs);

      // Load statuses and branches for LeadDetails modal
      const [statusesResponse, branchesResponse] = await Promise.all([
        getStatuses(),
        getBranches()
      ]);
      setStatuses(statusesResponse.statuses || []);
      setBranches(branchesResponse.branches || []);

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
          const techJobs = jobsWithBookings.filter(job => {
            return job.bookings?.some(b => b.technicianId === userTechnician._id);
          });
          setJobs(techJobs);
          setTechnicians([userTechnician]);
        } else {
          setJobs([]);
          setTechnicians([]);
        }
      } else if (roleName === 'admin' || roleName === 'rep') {
        // Admin/Rep: Show only technicians linked to their jobs
        const userJobs = jobsWithBookings;
        const techIds = new Set<string>();
        userJobs.forEach(job => {
          if (job.bookings && Array.isArray(job.bookings)) {
            job.bookings.forEach(booking => {
              if (booking.technicianId) techIds.add(booking.technicianId);
            });
          }
        });
        const linkedTechnicians = allTechs.filter(t => techIds.has(t._id));
        setTechnicians(linkedTechnicians);
        setJobs(userJobs);
      } else {
        // Super Admin or Manager: Show all technicians, but no jobs until technician is selected
        setTechnicians(allTechs);
        setJobs([]);
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
          // Check if any booking has this technician
          return job.bookings?.some(b => b.technicianId === userTechnician._id);
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
      // Filter by selected technician using bookings array
      const filtered = allJobs.filter(job => {
        return job.bookings?.some(b => b.technicianId === techFilter);
      });
      setJobs(filtered);
    }
  }, [techFilter, allJobs, allTechnicians, currentUser]);

  /**
   * Filters jobs based on selected filters and search term.
   */
  const filtered = useMemo(() => {
    if (!jobs || jobs.length === 0) return [];
    
    let result = jobs.filter((job) => {
      // Filter by technician using bookings array
      if (techFilter !== 'all') {
        const hasMatchingTech = job.bookings?.some(b => b.technicianId === techFilter);
        if (!hasMatchingTech) {
          return false;
        }
      }
      
      // If "Booked Date Only" toggle is checked, only show jobs with bookings
      if (bookedDateOnly && (!job.bookings || job.bookings.length === 0)) {
        return false;
      }
      
      // Filter by date range (check if any booking falls within the range)
      if (dateFrom || dateTo) {
        if (!job.bookings || job.bookings.length === 0) {
          // If date filter is set but job has no bookings, exclude it
          return false;
        }
        
        const hasBookingInRange = job.bookings.some(booking => {
          // A booking is in range if its date range overlaps with the filter range
          const bookingStart = booking.startDate;
          const bookingEnd = booking.endDate;
          if (!bookingStart || !bookingEnd) return false;
          
          // Check if booking overlaps with filter range
          if (dateFrom && bookingEnd < dateFrom) return false;
          if (dateTo && bookingStart > dateTo) return false;
          return true;
        });
        
        if (!hasBookingInRange) {
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
    
    // Sort by earliest booking date (if exists), then by job number
    result = result.sort((a, b) => {
      const getEarliestDate = (job: Job) => {
        if (!job.bookings || job.bookings.length === 0) return 0;
        const dates = job.bookings.map(b => b.startDate ? new Date(b.startDate).getTime() : 0).filter(d => !isNaN(d) && d > 0);
        return dates.length > 0 ? Math.min(...dates) : 0;
      };
      
      const dateA = getEarliestDate(a);
      const dateB = getEarliestDate(b);
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
   * Jobs to display and export.
   * For Super Admin with no technician selected, applies date/search filters directly to allJobs
   * (matching the calendar view behavior). For all other cases, uses the standard filtered list.
   */
  const displayedJobs = useMemo(() => {
    if (currentUser?.isSuperAdmin && techFilter === 'all') {
      return allJobs.filter((job) => {
        // Apply date range filter using bookings
        if (dateFrom || dateTo) {
          if (!job.bookings || job.bookings.length === 0) return false;
          const hasBookingInRange = job.bookings.some(booking => {
            const bookingStart = booking.startDate;
            const bookingEnd = booking.endDate;
            if (!bookingStart || !bookingEnd) return false;
            if (dateFrom && bookingEnd < dateFrom) return false;
            if (dateTo && bookingStart > dateTo) return false;
            return true;
          });
          if (!hasBookingInRange) return false;
        }
        // Apply booked date only filter
        if (bookedDateOnly && (!job.bookings || job.bookings.length === 0)) return false;
        // Apply search filter
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
    }
    return filtered;
  }, [currentUser, techFilter, allJobs, filtered, dateFrom, dateTo, bookedDateOnly, searchTerm]);

  /**
   * Exports filtered bookings to CSV.
   */
  function toCSV() {
    const header = ['Date Booked', 'Job #', 'Customer', 'Technician', 'Branch', 'Status', 'Description'];
    const rows: string[][] = [];
    
    displayedJobs.forEach((job) => {
      if (!job.bookings || job.bookings.length === 0) {
        rows.push([
          '-',
          job.jobNumber || '',
          job.customer?.name || job.cashCustomer || '',
          '-',
          job.branch?.name || '',
          job.status?.name || '',
          (typeof job.description === 'object' ? job.description?.name : job.description) || '',
        ]);
      } else {
        job.bookings.forEach(booking => {
          const tech = allTechnicians.find(t => t._id === booking.technicianId) || technicians.find(t => t._id === booking.technicianId);
          const startDate = booking.startDate ? formatDate(booking.startDate) : '-';
          const endDate = booking.endDate ? formatDate(booking.endDate) : '-';
          const dateRange = startDate === endDate ? startDate : `${startDate} to ${endDate}`;
          rows.push([
            dateRange,
            job.jobNumber || '',
            job.customer?.name || job.cashCustomer || '',
            tech?.name || booking.technicianName || '-',
            job.branch?.name || '',
            job.status?.name || '',
            (typeof job.description === 'object' ? job.description?.name : job.description) || '',
          ]);
        });
      }
    });
    
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
    displayedJobs.forEach((job) => {
      if (!job.bookings || job.bookings.length === 0) {
        printWindow!.document.write(`<tr><td>-</td><td>${job.jobNumber || ''}</td><td>${job.customer?.name || job.cashCustomer || ''}</td><td>-</td><td>${job.branch?.name || ''}</td><td>${job.status?.name || ''}</td><td>${(typeof job.description === 'object' ? job.description?.name : job.description) || ''}</td></tr>`);
      } else {
        job.bookings.forEach(booking => {
          const tech = allTechnicians.find(t => t._id === booking.technicianId) || technicians.find(t => t._id === booking.technicianId);
          const startDate = booking.startDate ? formatDate(booking.startDate) : '-';
          const endDate = booking.endDate ? formatDate(booking.endDate) : '-';
          const dateRange = startDate === endDate ? startDate : `${startDate} to ${endDate}`;
          printWindow!.document.write(`<tr><td>${dateRange}</td><td>${job.jobNumber || ''}</td><td>${job.customer?.name || job.cashCustomer || ''}</td><td>${tech?.name || booking.technicianName || '-'}</td><td>${job.branch?.name || ''}</td><td>${job.status?.name || ''}</td><td>${(typeof job.description === 'object' ? job.description?.name : job.description) || ''}</td></tr>`);
        });
      }
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ars-primary mx-auto mb-4"></div>
          <p className="text-ars-body">Loading diary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl border border-gray-200 p-8 max-w-md">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={loadData}
            className="px-6 py-3 bg-[#0969a9] text-white rounded-[8px] font-bold text-[14px] hover:bg-[#0a7bc4] transition-all"
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-8 border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-ars-heading flex items-center gap-2">
              Technician Diary
            </h3>
            <div className="flex gap-2">
              {/* View Toggle Button */}
              <button
                onClick={() => setViewMode(viewMode === 'calendar' ? 'table' : 'calendar')}
                className="px-4 py-2 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
                title={`Switch to ${viewMode === 'calendar' ? 'table' : 'calendar'} view`}
              >
                {viewMode === 'calendar' ? (
                  <>
                    <Table className="w-4 h-4" />
                    TABLE VIEW
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    CALENDAR VIEW
                  </>
                )}
              </button>
              <button
                onClick={toCSV}
                className="px-4 py-2 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                EXPORT CSV
              </button>
              <button
                onClick={toPDF}
                className="px-4 py-2 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                EXPORT PDF
              </button>
            </div>
          </div>

          <div className={`grid grid-cols-1 ${currentUser?.role?.name?.toLowerCase() === 'technician' ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4 mb-6`}>
            {/* Technician Filter - Hidden for technicians, required for super admin */}
            {currentUser?.role?.name?.toLowerCase() !== 'technician' && (
              <div>
                <label className="text-[11px] font-medium text-gray-600 mb-1 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Technician
                  {currentUser?.isSuperAdmin && (
                    <span className="text-[11px] text-red-600 font-normal ml-1">(Required)</span>
                  )}
                </label>
                <select
                  value={techFilter}
                  onChange={(e) => setTechFilter(e.target.value)}
                  className="w-full pl-2 pr-10 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[13px] appearance-none h-[38px]"
                  style={{
                    backgroundImage: `url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3e%3cpolyline points="6 9 12 15 18 9"%3e%3c/polyline%3e%3c/svg%3e')`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.75rem center',
                    backgroundSize: '1rem 1rem'
                  }}
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
              <label className="text-[11px] font-medium text-gray-600 mb-1 block">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full pl-2 pr-2 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[13px] h-[38px]"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-600 mb-1 block">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full pl-2 pr-2 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[13px] h-[38px]"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={loadData}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-[14px] hover:shadow-lg transition-all h-[38px]"
              >
                REFRESH
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
              <span className="font-medium text-ars-heading transition-colors" style={{ fontSize: '15px' }}>
                Display Booked Date Only
              </span>
            </label>
          </div>

          {/* Search */}
          <div className="mb-6">
            <label className="text-[11px] font-medium text-gray-600 mb-1 flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer, cash customer, or job number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2 py-2.5 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white text-[13px]"
              />
            </div>
          </div>

          {/* Show calendar or table view based on viewMode */}
          {viewMode === 'calendar' ? (
            <CalendarView 
              jobs={displayedJobs} 
              statuses={statuses}
              branches={branches}
              allTechnicians={allTechnicians}
              technicians={technicians}
              onUpdate={loadData}
              selectedTechnician={techFilter !== 'all' ? techFilter : undefined}
              searchTerm={searchTerm}
            />
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
                    // Show each booking as a separate row
                    if (!job.bookings || job.bookings.length === 0) {
                      return (
                        <tr key={job._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ars-heading">-</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-ars-body font-semibold">
                            {job.jobNumber || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-ars-body">
                            {job.customer?.name || job.cashCustomer || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-ars-body">-</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-ars-body">
                            {job.branch?.name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium">
                              {job.status?.name || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-ars-body">
                            {typeof job.description === 'object' ? job.description?.name : job.description || '-'}
                          </td>
                        </tr>
                      );
                    }
                    
                    return job.bookings.map((booking, idx) => {
                      const tech = technicians.find(t => t._id === booking.technicianId);
                      const startDate = booking.startDate ? new Date(booking.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
                      const endDate = booking.endDate ? new Date(booking.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
                      const formattedDate = startDate === endDate ? startDate : `${startDate} to ${endDate}`;
                      return (
                        <tr key={`${job._id}-${idx}`} className="hover:bg-gray-50 transition-colors">
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
                            {tech?.name || booking.technicianName || '-'}
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
                            {typeof job.description === 'object' ? job.description?.name : job.description || '-'}
                          </td>
                        </tr>
                      );
                    });
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
                  className="px-4 py-2 border border-gray-300 rounded-[8px] font-bold text-[14px] hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  NEXT
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
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
  statuses: Status[];
  branches: Branch[];
  allTechnicians: Technician[];
  technicians: Technician[];
  onUpdate: () => void;
  selectedTechnician?: string; // Optional technician ID to show in description
  searchTerm?: string; // When set, auto-navigate to the month of the earliest matching booking
}

function CalendarView({ jobs, statuses, branches, allTechnicians, technicians, onUpdate, selectedTechnician, searchTerm }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [quickBookDate, setQuickBookDate] = useState<string | null>(null);

  // When a search term is active, auto-navigate to the month of the earliest matching booking
  useEffect(() => {
    if (!searchTerm || jobs.length === 0) return;
    let earliest: string | null = null;
    for (const job of jobs) {
      if (Array.isArray(job.bookings)) {
        for (const booking of job.bookings) {
          if (booking.startDate && (!earliest || booking.startDate < earliest)) {
            earliest = booking.startDate;
          }
        }
      }
    }
    if (earliest) {
      const d = new Date(earliest + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    }
  }, [searchTerm, jobs]);
  
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
  // Get bookings for a specific date (multiple bookings per job)
  const getBookingsForDate = (date: Date): Array<{ job: Job, techId: string, techName: string }> => {
    // Use local date formatting to avoid timezone issues with toISOString()
    // toISOString() converts to UTC which can shift the date by a day
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const bookings: Array<{ job: Job, techId: string, techName: string }> = [];
    jobs.forEach(job => {
      if (Array.isArray(job.bookings)) {
        job.bookings.forEach(booking => {
          // Check if the date falls within the booking range (startDate to endDate)
          if (booking.startDate && booking.endDate) {
            if (dateStr >= booking.startDate && dateStr <= booking.endDate) {
              const techName = (technicians.find(t => t._id === booking.technicianId)?.name) || 'Unknown Tech';
              bookings.push({ job, techId: booking.technicianId, techName });
            }
          }
        });
      }
    });
    return bookings;
  };
  
  // Generate calendar cells
  const calendarCells = [];
  
  for (let i = 0; i < totalCells; i++) {
    const dayNumber = i - firstDayWeekday + 1;
    const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
    const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
    const isToday = isCurrentMonth && cellDate.toDateString() === new Date().toDateString();
    const bookingsForDate = isCurrentMonth ? getBookingsForDate(cellDate) : [];

    calendarCells.push(
      <div
        key={i}
        className={`min-h-[120px] border p-2 ${
          isCurrentMonth ? 'bg-white hover:bg-gray-50 group' : 'bg-gray-50'
        } ${isToday ? 'border-[#0969a9] border-2 bg-blue-50' : 'border-gray-200'}`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className={`text-sm font-semibold ${
            isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
          } ${isToday ? 'text-[#0969a9]' : ''}`}>
            {isCurrentMonth ? dayNumber : ''}
          </div>
          {isCurrentMonth && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const y = cellDate.getFullYear();
                const m = String(cellDate.getMonth() + 1).padStart(2, '0');
                const d = String(cellDate.getDate()).padStart(2, '0');
                setQuickBookDate(`${y}-${m}-${d}`);
              }}
              className="w-5 h-5 flex items-center justify-center rounded-full bg-[#0969a9] text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#0a7bc4]"
              title="Book technician for this date"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="space-y-1 overflow-y-auto max-h-[90px]">
          {bookingsForDate.map((bookingInfo, idx) => {
            const { job, techName } = bookingInfo;
            return (
              <div
                key={idx}
                onClick={() => setSelectedJob(job)}
                className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800 cursor-pointer hover:bg-purple-200 transition-colors"
                title={`${techName} - ${job.jobNumber}`}
              >
                <div className="font-semibold truncate">{techName}</div>
                <div className="text-[10px] truncate">{job.jobNumber}</div>
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
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-bold text-[14px]"
          >
            TODAY
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
        {selectedTechnician ? (
          (() => {
            const tech = technicians.find(t => t._id === selectedTechnician);
            const techName = tech?.name || 'Selected Technician';
            return `Showing bookings for ${techName} - ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
          })()
        ) : (
          `Showing all technician bookings for ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
        )}
      </div>
      
      {/* Job Details Popup Modal */}
      {selectedJob && (
        <LeadDetails
          lead={selectedJob}
          statuses={statuses}
          branches={branches}
          onClose={() => setSelectedJob(null)}
          onUpdate={() => {
            onUpdate();
            setSelectedJob(null);
          }}
        />
      )}

      {/* Quick Book Modal */}
      {quickBookDate && (
        <QuickBookModal
          date={quickBookDate}
          branches={branches}
          allTechnicians={allTechnicians}
          onClose={() => setQuickBookDate(null)}
          onBooked={() => {
            setQuickBookDate(null);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}

/**
 * Quick Book Modal
 * Allows booking a technician for a date without needing an existing job.
 * Creates a new job and then adds the booking to it.
 */
interface QuickBookModalProps {
  date: string; // YYYY-MM-DD
  branches: Branch[];
  allTechnicians: Technician[];
  onClose: () => void;
  onBooked: () => void;
}

function QuickBookModal({ date, branches, allTechnicians, onClose, onBooked }: QuickBookModalProps) {
  const [clientName, setClientName] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [repCodeId, setRepCodeId] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [descriptionId, setDescriptionId] = useState('');
  const [notes, setNotes] = useState('');
  const [branchId, setBranchId] = useState(branches.length === 1 ? branches[0]._id : '');
  const [endDate, setEndDate] = useState(date);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [repCodes, setRepCodes] = useState<RepCode[]>([]);
  const [descriptions, setDescriptions] = useState<ServiceDescription[]>([]);
  const [loadingRef, setLoadingRef] = useState(true);

  // Load reference data on mount
  useEffect(() => {
    async function loadRef() {
      try {
        const [repRes, descRes] = await Promise.all([
          getRepCodes(),
          getServiceDescriptions(),
        ]);
        setRepCodes(repRes.repCodes || []);
        setDescriptions(descRes.descriptions || []);
      } catch (err) {
        console.error('Error loading reference data for quick book:', err);
      } finally {
        setLoadingRef(false);
      }
    }
    loadRef();
  }, []);

  // Customer search with debounce
  useEffect(() => {
    if (customerSearch.length < 2) {
      setCustomerResults([]);
      setShowCustomerDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await getCustomers({ search: customerSearch, limit: 10 });
        setCustomerResults(res.customers || []);
        setShowCustomerDropdown(true);
      } catch (err) {
        console.error('Customer search error:', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const handleSubmit = async () => {
    setErrorMsg('');

    // Validation
    if (!clientName.trim() && !selectedCustomer) {
      setErrorMsg('Client name is required');
      return;
    }
    if (!repCodeId) {
      setErrorMsg('Rep is required');
      return;
    }
    if (!technicianId) {
      setErrorMsg('Technician is required');
      return;
    }
    if (!descriptionId) {
      setErrorMsg('Job type is required');
      return;
    }
    if (!branchId) {
      setErrorMsg('Branch is required');
      return;
    }

    try {
      setSaving(true);

      // Step 1: Create the job
      const jobPayload: any = {
        branch: branchId,
        description: descriptionId,
        repCode: repCodeId,
        notes: notes.substring(0, 50), // notes field max 50 chars
        feedback: notes, // full description in feedback
        startDate: date,
        dateBooked: date,
      };

      if (selectedCustomer) {
        jobPayload.customer = selectedCustomer._id;
      } else {
        jobPayload.cashCustomer = clientName.trim();
      }

      const { job: createdJob } = await createJob(jobPayload);

      // Step 2: Update the job with booking
      await updateJob(createdJob._id, {
        bookings: [{
          technicianId,
          startDate: date,
          endDate: endDate || date,
        }],
      } as any);

      onBooked();
    } catch (err: any) {
      console.error('Quick book error:', err);
      setErrorMsg(err.message || 'Failed to create booking');
    } finally {
      setSaving(false);
    }
  };

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-white">Quick Book Technician</h3>
            <p className="text-sm text-blue-100">{displayDate}</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {loadingRef ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#0969a9]" />
              <span className="ml-2 text-sm text-gray-600">Loading...</span>
            </div>
          ) : (
            <>
              {/* Client Name — searchable customer dropdown or free text */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name <span className="text-red-500">*</span>
                </label>
                {selectedCustomer ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50">
                    <span className="text-sm flex-1">{selectedCustomer.name}</span>
                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCustomerSearch('');
                        setClientName('');
                      }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={clientName || customerSearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setClientName(val);
                        setCustomerSearch(val);
                      }}
                      onFocus={() => customerResults.length > 0 && setShowCustomerDropdown(true)}
                      placeholder="Search existing customer or type new name..."
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0969a9] focus:border-transparent"
                    />
                    {showCustomerDropdown && customerResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {customerResults.map(c => (
                          <button
                            key={c._id}
                            onClick={() => {
                              setSelectedCustomer(c);
                              setClientName(c.name);
                              setCustomerSearch('');
                              setShowCustomerDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Rep */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rep <span className="text-red-500">*</span>
                </label>
                <select
                  value={repCodeId}
                  onChange={e => setRepCodeId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0969a9] focus:border-transparent bg-white"
                >
                  <option value="">Select Rep...</option>
                  {repCodes.filter(r => r.isActive !== false).map(r => (
                    <option key={r._id} value={r._id}>
                      {r.code}{r.description ? ` - ${r.description}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Technician */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Technician <span className="text-red-500">*</span>
                </label>
                <select
                  value={technicianId}
                  onChange={e => setTechnicianId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0969a9] focus:border-transparent bg-white"
                >
                  <option value="">Select Technician...</option>
                  {allTechnicians.map(t => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Job Type (Service Description) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={descriptionId}
                  onChange={e => setDescriptionId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0969a9] focus:border-transparent bg-white"
                >
                  <option value="">Select Job Type...</option>
                  {descriptions.filter(d => (d as any).isActive !== false).map(d => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Branch */}
              {branches.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={branchId}
                    onChange={e => setBranchId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0969a9] focus:border-transparent bg-white"
                  >
                    <option value="">Select Branch...</option>
                    {branches.map(b => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  min={date}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0969a9] focus:border-transparent"
                />
              </div>

              {/* Description / Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add details about this booking..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0969a9] focus:border-transparent resize-none"
                />
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {errorMsg}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loadingRef && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white rounded-lg text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  Book Technician
                </>
              )}
            </button>
          </div>
        )}
      </div>    </div>
  );
}