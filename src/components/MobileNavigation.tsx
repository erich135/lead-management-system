import { LayoutDashboard, FileText, BarChart3, Calendar, Users, Menu, X, Bell, LogOut, Clock, Cog, Briefcase } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type View = 'dashboard' | 'leads' | 'salesLeads' | 'reports' | 'admin' | 'diary' | 'activities' | 'machines' | 'jobCardTemplates' | 'jobCardSubmissions' | 'partsReady';

interface MobileNavigationProps {
  currentView: View;
  onViewChange: (view: View) => void;
  notificationsCount: number;
  onNotificationsClick: () => void;
}

/**
 * Mobile navigation component with bottom navigation bar.
 * Provides app-like navigation experience on mobile devices.
 */
export function MobileNavigation({
  currentView,
  onViewChange,
  notificationsCount,
  onNotificationsClick,
}: MobileNavigationProps) {
  const { user, signOut, hasPermission } = useAuth();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);

  // Get current view from path
  const getViewFromPath = (): View => {
    const path = location.pathname;
    if (path === '/jobs' || path === '/leads') return 'leads';
    if (path === '/sales-leads') return 'salesLeads';
    if (path === '/reports') return 'reports';
    if (path === '/diary') return 'diary';
    if (path === '/admin') return 'admin';
    if (path === '/activities') return 'activities';
    if (path === '/machines') return 'machines';
    if (path === '/job-card-templates') return 'jobCardTemplates';
    if (path === '/job-card-submissions') return 'jobCardSubmissions';
    if (path === '/parts-ready') return 'partsReady';
    return 'dashboard';
  };

  const activeView = getViewFromPath();

  // Only show Reports to users with reports.read permission or Super Admins
  const canViewReports = user?.isSuperAdmin || hasPermission('reports.read');
  const canViewSalesLeads = user?.isSuperAdmin || hasPermission('sales_leads.read');

  const navItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'leads' as View, label: 'Jobs', icon: FileText, path: '/jobs' },
    ...(canViewSalesLeads ? [{ id: 'salesLeads' as View, label: 'Leads', icon: Briefcase, path: '/sales-leads' }] : []),
    ...(canViewReports ? [{ id: 'reports' as View, label: 'Reports', icon: BarChart3, path: '/reports' }] : []),
    { id: 'diary' as View, label: 'Diary', icon: Calendar, path: '/diary' },
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50 md:hidden safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => setShowMenu(false)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
                  isActive
                    ? 'text-ars-primary'
                    : 'text-ars-body'
                }`}
              >
                <div className={`relative ${isActive ? 'scale-110' : 'scale-100'} transition-transform`}>
                  <Icon className="w-6 h-6" />
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-ars-primary rounded-full"></div>
                  )}
                </div>
                <span className={`text-xs mt-1 ${isActive ? 'font-semibold text-ars-heading' : 'font-normal'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          
          {/* Menu/More button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
              showMenu ? 'text-ars-primary' : 'text-ars-body'
            }`}
          >
            <div className="relative">
              <Menu className="w-6 h-6" />
              {(notificationsCount > 0 || showMenu) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-ars-secondary rounded-full"></span>
              )}
            </div>
            <span className="text-xs mt-1">More</span>
          </button>
        </div>
      </nav>

      {/* Slide-up Menu Modal */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50 md:hidden"
            onClick={() => setShowMenu(false)}
          ></div>
          
          {/* Menu Panel */}
          <div className="fixed bottom-16 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 md:hidden max-h-[70vh] overflow-y-auto animate-slide-up">
            <div className="p-6">
              {/* Drag handle */}
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6"></div>
              
              {/* User Info */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                <div className="w-12 h-12 bg-ars-primary rounded-full flex items-center justify-center text-white font-bold">
                  {user?.firstName?.[0] || 'U'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-ars-heading">{user?.fullName || 'User'}</p>
                  <p className="text-sm text-ars-body capitalize">{user?.role?.name || 'user'}</p>
                </div>
              </div>

              {/* Menu Items */}
              <div className="space-y-2">
                {/* Activities */}
                <Link
                  to="/activities"
                  onClick={() => setShowMenu(false)}
                  className={`w-full flex items-center gap-4 p-4 rounded-[8px] transition-all ${
                    activeView === 'activities'
                      ? 'bg-ars-secondary/20 text-ars-heading'
                      : 'bg-gray-50 text-ars-heading hover:bg-gray-100'
                  }`}
                >
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">Activities</span>
                </Link>

                {/* Machines (if super admin) */}
                {user?.isSuperAdmin ? (
                  <Link
                    to="/machines"
                    onClick={() => setShowMenu(false)}
                    className={`w-full flex items-center gap-4 p-4 rounded-[8px] transition-all ${
                      activeView === 'machines'
                        ? 'bg-ars-secondary/20 text-ars-heading'
                        : 'bg-gray-50 text-ars-heading hover:bg-gray-100'
                    }`}
                  >
                    <Cog className="w-5 h-5" />
                    <span className="font-medium">Machines</span>
                  </Link>
                ) : null}

                {/* System Admin (if super admin) */}
                {user?.isSuperAdmin ? (
                  <Link
                    to="/admin"
                    onClick={() => setShowMenu(false)}
                    className={`w-full flex items-center gap-4 p-4 rounded-[8px] transition-all ${
                      activeView === 'admin'
                        ? 'bg-ars-secondary/20 text-ars-heading'
                        : 'bg-gray-50 text-ars-heading hover:bg-gray-100'
                    }`}
                  >
                    <Users className="w-5 h-5" />
                    <span className="font-medium">System Admin</span>
                  </Link>
                ) : null}

                {/* Notifications */}
                <button
                  onClick={() => {
                    onNotificationsClick();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-[8px] bg-gray-50 text-ars-heading hover:bg-gray-100 transition-all"
                >
                  <div className="relative">
                    <Bell className="w-5 h-5" />
                    {notificationsCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-ars-secondary text-ars-heading text-xs rounded-full flex items-center justify-center font-bold">
                        {notificationsCount > 9 ? '9+' : notificationsCount}
                      </span>
                    )}
                  </div>
                  <span className="font-medium">Notifications</span>
                </button>

                {/* Logout */}
                <button
                  onClick={() => {
                    signOut();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-[8px] bg-red-50 text-red-700 hover:bg-red-100 transition-all mt-4"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add slide-up animation */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .safe-area-inset-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </>
  );
}


