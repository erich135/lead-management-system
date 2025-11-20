/**
 * Header component for the application.
 * Contains desktop navigation, mobile top bar, and notification system.
 * This component is separated to make styling easier for designers.
 */
import { Link } from 'react-router-dom';
import {
  LogOut,
  Bell,
  LayoutDashboard,
  FileText,
  BarChart3,
  Calendar,
  Shield,
  CheckCircle2,
  Zap,
  Clock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import type { JobStats, OverdueJob } from '../lib/api';

type View = 'dashboard' | 'leads' | 'reports' | 'admin' | 'diary' | 'activities';

interface HeaderProps {
  currentView: View;
  stats: JobStats | null;
  overdueJobs: OverdueJob[];
  showNotifications: boolean;
  onNotificationsToggle: () => void;
  onJobSelect: (job: any) => void;
  onNavigateToView: (view: View) => void;
  getSeverityColor: (severity: string) => string;
  getSeverityIcon: (severity: string) => React.ReactNode;
}

/**
 * Header component with navigation and notifications.
 * Separated from Dashboard for easier styling and maintenance.
 */
export function Header({
  currentView,
  stats,
  overdueJobs,
  showNotifications,
  onNotificationsToggle,
  onJobSelect,
  onNavigateToView,
  getSeverityColor,
  getSeverityIcon,
}: HeaderProps) {
  const { user, signOut, isSuperAdmin } = useAuth();
  const isMobile = useIsMobile();

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="relative bg-gradient-to-r from-[#0969a9] via-[#0a7bc4] to-[#0c8dd9] shadow-xl sticky top-0 z-40 hidden md:block backdrop-blur-md">
        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v22H0v-2h20zM0 20h2v20H0V20zm4 0h2v20H4V20zm4 0h2v20H8V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
          }}
        ></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-8">
              {/* Logo Section */}
              <div className="flex items-center gap-3 group">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg p-2 transition-all duration-300 group-hover:bg-white/30 group-hover:scale-105">
                  <img src="/Logo.png" alt="ARS Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white tracking-tight">ARS Management</h1>
                  <p className="text-xs text-white/70">Job Management System</p>
                </div>
              </div>

              {/* Navigation Pills */}
              <div className="hidden md:flex gap-2 bg-white/10 backdrop-blur-sm rounded-xl p-1.5 border border-white/20">
                <Link
                  to="/dashboard"
                  className={`group relative px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                    currentView === 'dashboard'
                      ? 'bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] shadow-lg scale-105'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <LayoutDashboard
                    className={`w-4 h-4 transition-transform ${currentView === 'dashboard' ? 'scale-110' : ''}`}
                  />
                  <span>Dashboard</span>
                  {currentView === 'dashboard' && (
                    <div className="absolute inset-0 bg-white/20 rounded-lg animate-pulse"></div>
                  )}
                </Link>
                <Link
                  to="/jobs"
                  className={`group relative px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                    currentView === 'leads'
                      ? 'bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] shadow-lg scale-105'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <FileText
                    className={`w-4 h-4 transition-transform ${currentView === 'leads' ? 'scale-110' : ''}`}
                  />
                  <span>Jobs</span>
                  {currentView === 'leads' && (
                    <div className="absolute inset-0 bg-white/20 rounded-lg animate-pulse"></div>
                  )}
                </Link>
                {(isSuperAdmin || user?.role?.name?.toLowerCase() === 'manager') && (
                  <Link
                    to="/reports"
                    className={`group relative px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                      currentView === 'reports'
                        ? 'bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] shadow-lg scale-105'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <BarChart3
                      className={`w-4 h-4 transition-transform ${currentView === 'reports' ? 'scale-110' : ''}`}
                    />
                    <span>Reports</span>
                    {currentView === 'reports' && (
                      <div className="absolute inset-0 bg-white/20 rounded-lg animate-pulse"></div>
                    )}
                  </Link>
                )}
                <Link
                  to="/diary"
                  className={`group relative px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                    currentView === 'diary'
                      ? 'bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] shadow-lg scale-105'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Calendar
                    className={`w-4 h-4 transition-transform ${currentView === 'diary' ? 'scale-110' : ''}`}
                  />
                  <span>Diary</span>
                  {currentView === 'diary' && (
                    <div className="absolute inset-0 bg-white/20 rounded-lg animate-pulse"></div>
                  )}
                </Link>
                <Link
                  to="/activities"
                  className={`group relative px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                    currentView === 'activities'
                      ? 'bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] shadow-lg scale-105'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Clock
                    className={`w-4 h-4 transition-transform ${currentView === 'activities' ? 'scale-110' : ''}`}
                  />
                  <span>Activities</span>
                  {currentView === 'activities' && (
                    <div className="absolute inset-0 bg-white/20 rounded-lg animate-pulse"></div>
                  )}
                </Link>
                {isSuperAdmin && (
                  <Link
                    to="/admin"
                    className={`group relative px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                      currentView === 'admin'
                        ? 'bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] shadow-lg scale-105'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Shield
                      className={`w-4 h-4 transition-transform ${currentView === 'admin' ? 'scale-110' : ''}`}
                    />
                    <span>System Admin</span>
                    {currentView === 'admin' && (
                      <div className="absolute inset-0 bg-white/20 rounded-lg animate-pulse"></div>
                    )}
                  </Link>
                )}
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={onNotificationsToggle}
                  className="group relative p-2.5 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl transition-all duration-300 border border-white/20 hover:border-white/30 hover:scale-105"
                >
                  <Bell className="w-5 h-5 text-white transition-transform group-hover:scale-110" />
                  {stats && (stats.overdueReminders > 0 || stats.approachingReminders > 0) && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <span className="text-xs font-bold text-white">
                        {stats.overdueReminders + stats.approachingReminders}
                      </span>
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 py-4 max-h-96 overflow-y-auto z-50 backdrop-blur-md">
                    <div className="px-4 pb-3 border-b border-gray-200 mb-2">
                      <h3 className="text-sm font-bold text-ars-heading mb-1">Job Reminders</h3>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                          {stats?.overdueReminders || 0} overdue
                        </span>
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">
                          {stats?.approachingReminders || 0} approaching
                        </span>
                      </div>
                    </div>
                    {overdueJobs.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <p className="text-sm font-medium text-ars-heading mb-1">All jobs on track!</p>
                        <p className="text-xs text-ars-body">No overdue or approaching jobs</p>
                      </div>
                    ) : (
                      <div className="px-3">
                        {overdueJobs.slice(0, 10).map((overdue) => (
                          <div
                            key={overdue.jobId}
                            className={`px-3 py-3 mb-2 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${getSeverityColor(
                              overdue.severity
                            )}`}
                            onClick={() => {
                              if (overdue.job) {
                                onJobSelect(overdue.job);
                                onNavigateToView('leads');
                                onNotificationsToggle();
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-0.5">{getSeverityIcon(overdue.severity)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-sm font-bold truncate">{overdue.jobNumber}</p>
                                  {overdue.isOverdue && (
                                    <span className="text-xs font-bold bg-red-200 text-red-800 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                                      {overdue.daysOverdue}d
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-ars-body mb-2 truncate">
                                  {overdue.job?.customer?.name || overdue.job?.cashCustomer || 'No customer'}
                                </p>
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-xs font-medium px-2 py-0.5 bg-white/60 rounded">
                                    {overdue.currentStatus}
                                  </span>
                                  <span className="text-xs text-ars-body">→</span>
                                  <span className="text-xs font-medium px-2 py-0.5 bg-white/60 rounded">
                                    {overdue.expectedNextStatus}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                  <p className="text-xs font-medium">
                                    {overdue.isOverdue
                                      ? `${overdue.daysOverdue} days overdue`
                                      : `${overdue.daysInStatus}/${overdue.maxDaysAllowed} days`}
                                  </p>
                                  {overdue.followUpLevel && (
                                    <span className="text-xs bg-white/80 px-2 py-0.5 rounded">
                                      Follow-up {overdue.followUpLevel}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {overdueJobs.length > 10 && (
                          <p className="text-xs text-ars-body text-center py-2 border-t border-gray-200 mt-2">
                            +{overdueJobs.length - 10} more jobs
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User Profile */}
              <div className="flex items-center gap-3 pl-4 border-l border-white/20">
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{user?.fullName || 'User'}</p>
                  <p className="text-xs text-white/70 capitalize">{user?.role?.name || 'user'}</p>
                </div>
                <button
                  onClick={signOut}
                  className="p-2.5 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl transition-all duration-300 border border-white/20 hover:border-white/30 hover:scale-105 group"
                  title="Sign out"
                >
                  <LogOut className="w-5 h-5 text-white transition-transform group-hover:scale-110" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Top Bar */}
      {isMobile && (
        <div className="relative bg-gradient-to-r from-[#0969a9] via-[#0a7bc4] to-[#0c8dd9] shadow-xl sticky top-0 z-40 md:hidden backdrop-blur-md">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v22H0v-2h20zM0 20h2v20H0V20zm4 0h2v20H4V20zm4 0h2v20H8V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2z'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat',
            }}
          ></div>
          <div className="relative flex items-center justify-between h-16 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg p-2">
                <img src="/Logo.png" alt="ARS Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white">ARS Management</h1>
                <p className="text-xs text-white/70">Job System</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onNotificationsToggle}
                className="relative p-2.5 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl transition-all duration-300 border border-white/20"
              >
                <Bell className="w-5 h-5 text-white" />
                {stats && (stats.overdueReminders > 0 || stats.approachingReminders > 0) && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-xs font-bold text-white">
                      {stats.overdueReminders + stats.approachingReminders}
                    </span>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Notifications Dropdown */}
      {isMobile && showNotifications && (
        <div className="fixed top-14 left-0 right-0 bg-white shadow-lg z-30 md:hidden max-h-96 overflow-y-auto">
          {overdueJobs.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-ars-heading mb-1">All jobs on track!</p>
              <p className="text-xs text-ars-body">No overdue or approaching jobs</p>
            </div>
          ) : (
            <div className="px-3 py-3">
              <div className="px-2 py-2 border-b border-gray-200 mb-3">
                <h3 className="text-sm font-bold text-ars-heading mb-1">Overdue & Approaching Jobs</h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-red-600 font-medium">{stats?.overdueReminders || 0} overdue</span>
                  <span className="text-orange-600 font-medium">
                    {stats?.approachingReminders || 0} approaching
                  </span>
                </div>
              </div>
              {overdueJobs.slice(0, 10).map((overdue) => (
                <div
                  key={overdue.jobId}
                  className={`px-3 py-3 mb-2 rounded-lg border-2 ${getSeverityColor(overdue.severity)}`}
                  onClick={() => {
                    if (overdue.job) {
                      onJobSelect(overdue.job);
                      onNavigateToView('leads');
                      onNotificationsToggle();
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">{getSeverityIcon(overdue.severity)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold truncate">{overdue.jobNumber}</p>
                        {overdue.isOverdue && (
                          <span className="text-xs font-bold bg-red-200 text-red-800 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                            {overdue.daysOverdue}d
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ars-body mb-2 truncate">
                        {overdue.job?.customer?.name || overdue.job?.cashCustomer || 'No customer'}
                      </p>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-medium px-2 py-0.5 bg-white/60 rounded">
                          {overdue.currentStatus}
                        </span>
                        <span className="text-xs text-ars-body">→</span>
                        <span className="text-xs font-medium px-2 py-0.5 bg-white/60 rounded">
                          {overdue.expectedNextStatus}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs font-medium">
                          {overdue.isOverdue
                            ? `${overdue.daysOverdue} days overdue`
                            : `${overdue.daysInStatus}/${overdue.maxDaysAllowed} days`}
                        </p>
                        {overdue.followUpLevel && (
                          <span className="text-xs bg-white/80 px-2 py-0.5 rounded">
                            Follow-up {overdue.followUpLevel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

