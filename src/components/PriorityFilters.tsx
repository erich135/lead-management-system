/**
 * PriorityFilters renders the reminder severity tabs used above the overdue job list.
 * Designers can style this component independently without tracing dashboard logic.
 */
import { Zap, Clock, CheckCircle2 } from 'lucide-react';

export type PriorityOption = 'all' | 'critical' | 'warning' | 'info';

export interface PriorityCounts {
  total: number;
  critical: number;
  warning: number;
  info: number;
}

interface PriorityFiltersProps {
  selected: PriorityOption;
  counts: PriorityCounts;
  onChange: (value: PriorityOption) => void;
}

/**
 * Renders the headline, helper copy, and CTA tabs for priority filtering.
 */
export function PriorityFilters({ selected, counts, onChange }: PriorityFiltersProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ars-heading mb-1">Filter by Priority</h3>
          <p className="text-xs text-ars-body">
            Show jobs that need attention based on how overdue they are. Reminders are calculated
            from the date the status was last changed (or when a follow-up was captured).
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => onChange('all')}
          className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-300 ${
            selected === 'all'
              ? 'bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white shadow-lg scale-105'
              : 'bg-white text-ars-body hover:bg-gray-50 border border-gray-200'
          }`}
          title="Show all jobs that need attention"
        >
          All Jobs ({counts.total})
        </button>

        <button
          onClick={() => onChange('critical')}
          className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${
            selected === 'critical'
              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg scale-105'
              : 'bg-white text-ars-body hover:bg-red-50 border border-gray-200'
          }`}
          title="Jobs that are past their deadline (overdue)"
        >
          <Zap className="w-4 h-4" />
          Overdue ({counts.critical})
        </button>

        <button
          onClick={() => onChange('warning')}
          className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${
            selected === 'warning'
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg scale-105'
              : 'bg-white text-ars-body hover:bg-orange-50 border border-gray-200'
          }`}
          title="Jobs approaching their deadline (80% of time limit reached)"
        >
          <Clock className="w-4 h-4" />
          Approaching ({counts.warning})
        </button>

        <button
          onClick={() => onChange('info')}
          className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${
            selected === 'info'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
              : 'bg-white text-ars-body hover:bg-blue-50 border border-gray-200'
          }`}
          title="Jobs that are being monitored but not yet urgent"
        >
          <CheckCircle2 className="w-4 h-4" />
          Monitored ({counts.info})
        </button>
      </div>
    </div>
  );
}

