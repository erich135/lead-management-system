/**
 * OverdueJobsTable renders the paginated list of reminder jobs plus
 * pagination controls and the “View All Jobs” CTA. Designers can edit
 * layouts here without touching dashboard filtering logic.
 */
import { FileText, ArrowRight, User, Calendar, Building2, Tag, Wrench } from 'lucide-react';
import type { OverdueJob, RepCode, Job } from '../lib/api';

export type OverdueSortField =
  | 'jobNumber'
  | 'status'
  | 'customer'
  | 'startDate'
  | 'dateQuoted'
  | 'city'
  | 'admin'
  | 'rep'
  | 'amount'
  | 'daysOverdue';

interface SortConfig {
  field: OverdueSortField | null;
  direction: 'asc' | 'desc';
}

interface OverdueJobsTableProps {
  jobs: OverdueJob[];
  filteredCount: number;
  hasActiveFilters: boolean;
  sortConfig: SortConfig;
  currentPage: number;
  totalPages: number;
  onSort: (field: OverdueSortField) => void;
  onPageChange: (page: number) => void;
  onJobOpen: (job: Job) => void;
  onViewAllJobs: () => void;
  getStatusColor: (statusName?: string) => string;
  getStatusTextColor: (statusName?: string) => string;
  formatDate: (date?: string | Date) => string;
  formatCurrency: (value?: number) => string;
  getRepCodeFromJob: (job: Job) => RepCode | null;
}

/**
 * Main table + pagination block.
 */
export function OverdueJobsTable({
  jobs,
  filteredCount,
  hasActiveFilters,
  sortConfig,
  currentPage,
  totalPages,
  onSort,
  onPageChange,
  onJobOpen,
  onViewAllJobs,
  getStatusColor,
  getStatusTextColor,
  formatDate,
  formatCurrency,
  getRepCodeFromJob,
}: OverdueJobsTableProps) {
  const handlePageClick = (page: number) => {
    if (page < 1 || page > totalPages) return;
    onPageChange(page);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {TABLE_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={col.className}
                  onClick={() => col.sortField && onSort(col.sortField)}
                >
                  <div className={`flex items-center ${col.alignClass} gap-1`}>
                    {col.label}
                    {col.sortField && sortConfig.field === col.sortField && (
                      <span className="text-ars-primary">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map((overdue, index) => {
              const rowColorClass = getStatusColor(overdue.job?.status?.name);
              const textColorClass = getStatusTextColor(overdue.job?.status?.name);
              const repCode = overdue.job ? getRepCodeFromJob(overdue.job) : null;

              return (
                <tr
                  key={overdue.jobId}
                  className={`${rowColorClass} border-b border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer group`}
                  onClick={() => overdue.job && onJobOpen(overdue.job)}
                  style={{
                    animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`,
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900 group-hover:text-ars-primary transition-colors">
                      {overdue.jobNumber}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${textColorClass} bg-white/60 border border-current/20`}
                    >
                      {overdue.job?.status?.name || overdue.currentStatus || 'No Status'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {(() => {
                          if (overdue.job?.cashCustomer && overdue.job?.customer?.name) {
                            return `${overdue.job.cashCustomer} - ${overdue.job.customer.name}`;
                          }
                          return overdue.job?.customer?.name || overdue.job?.cashCustomer || 'No customer';
                        })()}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{formatDate(overdue.job?.startDate)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{formatDate(overdue.job?.dateQuoted)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {overdue.job?.branch?.name || overdue.job?.branchCode || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{overdue.job?.adm || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{repCode?.code || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-gray-900">{formatCurrency(overdue.job?.valueExVat)}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-semibold text-gray-900">
                        {overdue.daysOverdue || overdue.daysInStatus || 0}d
                      </span>
                      <span className="text-xs text-gray-500">
                        Max {overdue.maxDaysAllowed || '-'}d
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-sm text-gray-600">
              Page {currentPage} of {totalPages} • {filteredCount} result{filteredCount !== 1 ? 's' : ''}
              {hasActiveFilters && ' (filtered)'}
            </p>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => handlePageClick(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => handlePageClick(pageNum)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    pageNum === currentPage
                      ? 'z-10 bg-ars-primary text-white border-ars-primary'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
              <button
                onClick={() => handlePageClick(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      )}

      <div className="bg-white px-6 py-6 text-center border-t border-gray-100">
        <button
          onClick={onViewAllJobs}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
        >
          <FileText className="w-5 h-5" />
          View All Jobs
          <ArrowRight className="w-5 h-5" />
        </button>
        <p className="mt-2 text-sm text-ars-body">Go to Jobs page for complete job management</p>
      </div>
    </div>
  );
}

const TABLE_COLUMNS: Array<{
  key: string;
  label: string;
  sortField?: OverdueSortField;
  className: string;
  alignClass: string;
}> = [
  { key: 'jobNumber', label: 'Job Number', sortField: 'jobNumber', className: 'text-left px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors', alignClass: 'items-center' },
  { key: 'status', label: 'Status', sortField: 'status', className: 'text-left px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors', alignClass: 'items-center' },
  { key: 'customer', label: 'Customer', sortField: 'customer', className: 'text-left px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors', alignClass: 'items-center' },
  { key: 'startDate', label: 'Start Date', sortField: 'startDate', className: 'text-left px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors', alignClass: 'items-center' },
  { key: 'quoted', label: 'Quoted', sortField: 'dateQuoted', className: 'text-left px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors', alignClass: 'items-center' },
  { key: 'city', label: 'City', sortField: 'city', className: 'text-left px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors', alignClass: 'items-center' },
  { key: 'admin', label: 'Admin', sortField: 'admin', className: 'text-left px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors', alignClass: 'items-center' },
  { key: 'rep', label: 'Rep', sortField: 'rep', className: 'text-left px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors', alignClass: 'items-center' },
  { key: 'amount', label: 'Amount', sortField: 'amount', className: 'text-right px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors', alignClass: 'justify-end' },
  { key: 'daysOverdue', label: 'Days Overdue', sortField: 'daysOverdue', className: 'text-center px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors', alignClass: 'justify-center' },
];

