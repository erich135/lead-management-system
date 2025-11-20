/**
 * JobFiltersPanel contains the advanced filtering controls that sit above the
 * overdue jobs table. Designers can iterate on layout/spacing here without
 * touching dashboard logic.
 */
import { Zap, Clock, CheckCircle2 } from 'lucide-react';

export interface JobFiltersState {
  jobNumber: string;
  status: string[];
  customer: string;
  admin: string[];
  rep: string[];
}

interface JobFiltersPanelProps {
  filters: JobFiltersState;
  statusOptions: string[];
  adminOptions: string[];
  repOptions: string[];
  onFilterInputChange: (key: keyof JobFiltersState, value: string) => void;
  onAddFilterItem: (filterType: 'status' | 'admin' | 'rep', value: string) => void;
  onRemoveFilterItem: (filterType: 'status' | 'admin' | 'rep', value: string) => void;
  onClearAll: () => void;
}

/**
 * Renders text inputs, dropdowns, and active-filter chips for overdue job filtering.
 */
export function JobFiltersPanel({
  filters,
  statusOptions,
  adminOptions,
  repOptions,
  onFilterInputChange,
  onAddFilterItem,
  onRemoveFilterItem,
  onClearAll,
}: JobFiltersPanelProps) {
  const hasActiveFilters =
    filters.jobNumber ||
    filters.customer ||
    filters.status.length > 0 ||
    filters.admin.length > 0 ||
    filters.rep.length > 0;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 mb-4">
      <h3 className="text-sm font-semibold text-ars-heading mb-3">Filters</h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Job Number</label>
          <input
            type="text"
            placeholder="Filter by job number..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
            value={filters.jobNumber}
            onChange={(e) => onFilterInputChange('jobNumber', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
            value=""
            onChange={(e) => {
              const value = e.target.value;
              if (!value) return;
              onAddFilterItem('status', value);
            }}
          >
            <option value="">Select status...</option>
            {statusOptions
              .filter((status) => !filters.status.includes(status))
              .map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
          </select>
          {filters.status.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {filters.status.map((status) => (
                <span
                  key={status}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs"
                >
                  {status}
                  <button
                    onClick={() => onRemoveFilterItem('status', status)}
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
          <label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
          <input
            type="text"
            placeholder="Filter by customer..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
            value={filters.customer}
            onChange={(e) => onFilterInputChange('customer', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Admin</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
            value=""
            onChange={(e) => {
              const value = e.target.value;
              if (!value) return;
              onAddFilterItem('admin', value);
            }}
          >
            <option value="">Select admin...</option>
            {adminOptions
              .filter((admin) => !filters.admin.includes(admin))
              .map((admin) => (
                <option key={admin} value={admin}>
                  {admin}
                </option>
              ))}
          </select>
          {filters.admin.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {filters.admin.map((admin) => (
                <span
                  key={admin}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs"
                >
                  {admin}
                  <button
                    onClick={() => onRemoveFilterItem('admin', admin)}
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
          <label className="block text-xs font-medium text-gray-600 mb-1">Rep</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
            value=""
            onChange={(e) => {
              const value = e.target.value;
              if (!value) return;
              onAddFilterItem('rep', value);
            }}
          >
            <option value="">Select rep...</option>
            {repOptions
              .filter((rep) => !filters.rep.includes(rep))
              .map((rep) => (
                <option key={rep} value={rep}>
                  {rep}
                </option>
              ))}
          </select>
          {filters.rep.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {filters.rep.map((rep) => (
                <span
                  key={rep}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-xs"
                >
                  {rep}
                  <button
                    onClick={() => onRemoveFilterItem('rep', rep)}
                    className="text-purple-600 hover:text-purple-800 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
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
          <button
            onClick={onClearAll}
            className="text-xs text-ars-primary hover:text-ars-primary/80 underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

