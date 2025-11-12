/**
 * Diary component for displaying technician bookings and scheduled jobs.
 * Shows jobs with booked dates and technicians in a calendar/diary view.
 */
import { useEffect, useMemo, useState } from 'react';
import { getJobs, getTechnicians, Job, Technician } from '../lib/api';
import { Download, Calendar, Filter } from 'lucide-react';

export function Diary() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [techFilter, setTechFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  /**
   * Loads jobs and technicians from the API.
   */
  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      
      // Load all jobs with dateBooked and techBooked
      const jobsResponse = await getJobs({ allTime: 'true' });
      const jobsList = jobsResponse.jobs || [];
      
      // Filter to only jobs with dateBooked and techBooked
      const bookedJobs = jobsList.filter(job => job.dateBooked && job.techBooked);
      setJobs(bookedJobs);

      // Load technicians
      const techsResponse = await getTechnicians();
      setTechnicians(techsResponse.technicians || []);
    } catch (err: any) {
      console.error('Error loading diary data:', err);
      setError(err.message || 'Failed to load diary data');
    } finally {
      setLoading(false);
    }
  }

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
   * Filters jobs based on selected filters.
   */
  const filtered = useMemo(() => {
    if (!jobs || jobs.length === 0) return [];
    
    return jobs.filter((job) => {
      // Filter by technician
      if (techFilter !== 'all' && job.techBooked?._id !== techFilter) return false;
      
      // Filter by date range
      if (dateFrom && job.dateBooked) {
        const jobDate = typeof job.dateBooked === 'string' ? job.dateBooked.split('T')[0] : new Date(job.dateBooked).toISOString().split('T')[0];
        if (jobDate < dateFrom) return false;
      }
      
      if (dateTo && job.dateBooked) {
        const jobDate = typeof job.dateBooked === 'string' ? job.dateBooked.split('T')[0] : new Date(job.dateBooked).toISOString().split('T')[0];
        if (jobDate > dateTo) return false;
      }
      
      return true;
    }).sort((a, b) => {
      // Sort by dateBooked, then by job number
      const dateA = a.dateBooked ? new Date(a.dateBooked).getTime() : 0;
      const dateB = b.dateBooked ? new Date(b.dateBooked).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
      return (a.jobNumber || '').localeCompare(b.jobNumber || '');
    });
  }, [jobs, techFilter, dateFrom, dateTo]);

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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-ars-heading mb-2 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Technician
              </label>
              <select
                value={techFilter}
                onChange={(e) => setTechFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-transparent bg-white"
              >
                <option value="all">All Technicians</option>
                {technicians && technicians.length > 0 ? (
                  technicians.map((tech) => (
                    <option key={tech._id} value={tech._id}>
                      {tech.name}
                    </option>
                  ))
                ) : null}
              </select>
            </div>
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

          {filtered.length === 0 ? (
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
                  {filtered.map((job) => (
                    <tr key={job._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ars-heading">
                        {formatDate(job.dateBooked)}
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
