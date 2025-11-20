/**
 * DashboardHero component renders the hero banner and quick stat cards
 * for the dashboard landing view. This isolates high-impact styling
 * areas so designers can iterate without touching business logic.
 */
import {
  Ticket,
  Sparkles,
  FileText,
  TrendingUp,
  AlertCircle,
  Banknote,
} from 'lucide-react';
import type { JobStats } from '../lib/api';

interface DashboardHeroProps {
  stats: JobStats;
  dateRangeLabel: string;
  canViewFinancials: boolean;
  onCreateJob: () => void;
  onShowJobList: () => void;
  onShowReports: () => void;
  onShowNotifications: () => void;
}

/**
 * Renders the dashboard hero block with CTA and quick metrics.
 */
export function DashboardHero({
  stats,
  dateRangeLabel,
  canViewFinancials,
  onCreateJob,
  onShowJobList,
  onShowReports,
  onShowNotifications,
}: DashboardHeroProps) {
  const needsAttentionClass =
    stats.overdueReminders > 0
      ? 'bg-red-500/30 border-red-400/50 hover:bg-red-500/40'
      : stats.approachingReminders > 0
      ? 'bg-orange-500/30 border-orange-400/50 hover:bg-orange-500/40'
      : 'bg-white/10 border-white/20 hover:bg-white/15';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0969a9] via-[#0a7bc4] to-[#0c8dd9] p-8 text-white shadow-2xl">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      ></div>

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
              Manage your jobs efficiently • {dateRangeLabel}
            </p>
          </div>
          <button
            onClick={onCreateJob}
            className="group relative overflow-hidden bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
            <span>New Job</span>
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={onShowJobList}
            className="text-left bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/80 text-xs font-medium">Total Jobs</p>
              <FileText className="w-4 h-4 text-white/60" />
            </div>
            <p className="text-2xl font-bold">{stats.totalJobs}</p>
          </button>

          <button
            onClick={onShowJobList}
            className="text-left bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/80 text-xs font-medium">Active</p>
              <TrendingUp className="w-4 h-4 text-[#f7c12b]" />
            </div>
            <p className="text-2xl font-bold">{stats.activeJobs}</p>
          </button>

          <button
            onClick={onShowNotifications}
            className={`text-left backdrop-blur-md rounded-xl p-4 border transition-all duration-300 hover:scale-105 cursor-pointer ${needsAttentionClass}`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/80 text-xs font-medium">Needs Attention</p>
              <AlertCircle
                className={`w-4 h-4 ${
                  stats.overdueReminders > 0
                    ? 'text-red-200'
                    : stats.approachingReminders > 0
                    ? 'text-orange-200'
                    : 'text-white/60'
                }`}
              />
            </div>
            <p className="text-2xl font-bold">
              {stats.overdueReminders + stats.approachingReminders}
            </p>
            {stats.overdueReminders > 0 && (
              <p className="text-xs text-red-200 mt-1">
                {stats.overdueReminders} overdue
              </p>
            )}
          </button>

          {canViewFinancials && (
            <button
              onClick={onShowReports}
              className="text-left bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/80 text-xs font-medium">Total Value</p>
                <Banknote className="w-4 h-4 text-[#f7c12b]" />
              </div>
              <p className="text-2xl font-bold">
                R{stats.totalValue.toLocaleString()}
              </p>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

