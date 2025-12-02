import { LayoutDashboard, FileText, BarChart3, Calendar, Users, Menu, X, Bell, LogOut, Clock } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type View = 'dashboard' | 'leads' | 'reports' | 'admin' | 'diary' | 'activities';

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
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);

  // Get current view from path
  const getViewFromPath = (): View => {
    const path = location.pathname;
    if (path === '/jobs' || path === '/leads') return 'leads';
    if (path === '/reports') return 'reports';
    if (path === '/diary') return 'diary';
    if (path === '/admin') return 'admin';
    if (path === '/activities') return 'activities';
    return 'dashboard';
  };

  const activeView = getViewFromPath();

  // Only show Reports to Managers and Super Admins
  const isManagerOrSuperAdmin = user?.isSuperAdmin || user?.role?.name?.toLowerCase() === 'manager';

  const navItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'leads' as View, label: 'Jobs', icon: FileText, path: '/jobs' },
    ...(isManagerOrSuperAdmin ? [{ id: 'reports' as View, label: 'Reports', icon: BarChart3, path: '/reports' }] : []),
    { id: 'diary' as View, label: 'Diary', icon: Calendar, path: '/diary' },
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 md:hidden safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => setShowMenu(false)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 ${
                  isActive
                    ? 'text-[#f7c12b]'
                    : 'text-[#727272]'
                }`}
              >
                <div className={`${isActive ? 'scale-110' : 'scale-100'} transition-transform duration-300`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className={`text-xs mt-1 ${isActive ? 'font-bold text-[#383838]' : 'font-normal'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          
          {/* Menu/More button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 ${
              showMenu ? 'text-[#f7c12b]' : 'text-[#727272]'
            }`}
          >
            <div className="relative">
              <Menu className="w-6 h-6" />
              {notificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] text-[10px] font-bold rounded-full flex items-center justify-center shadow-md px-1">
                  {notificationsCount > 9 ? '9+' : notificationsCount}
                </span>
              )}
            </div>
            <span className={`text-xs mt-1 ${showMenu ? 'font-bold text-[#383838]' : 'font-normal'}`}>More</span>
          </button>
        </div>
      </nav>

      {/* Slide-up Menu Modal */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setShowMenu(false)}
            style={{ bottom: '64px' }}
          ></div>
          
          {/* Menu Panel */}
          <div className="fixed bottom-16 left-0 right-0 bg-white rounded-t-3xl z-50 md:hidden max-h-[70vh] overflow-y-auto animate-slide-up">
            <div className="p-6">
              {/* Drag handle */}
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6"></div>
              
              {/* User Info */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                <div className="w-12 h-12 bg-gradient-to-br from-[#0969a9] to-[#0856] rounded-full flex items-center justify-center text-white font-bold shadow-md">
                  {user?.firstName?.[0] || 'U'}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[#383838]">{user?.fullName || 'User'}</p>
                  <p className="text-sm text-[#727272] capitalize">{user?.role?.name || 'user'}</p>
                </div>
              </div>

              {/* Menu Items */}
              <div className="space-y-2">
                {/* Activities */}
                <Link
                  to="/activities"
                  onClick={() => setShowMenu(false)}
                  className={`w-full flex items-center gap-4 p-4 rounded-[8px] transition-all duration-300 ${
                    activeView === 'activities'
                      ? 'bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] shadow-lg hover:brightness-95'
                      : 'bg-gray-50 text-[#383838] hover:bg-gray-100'
                  }`}
                >
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">Activities</span>
                </Link>

                {/* System Admin (if super admin) */}
                {user?.isSuperAdmin ? (
                  <Link
                    to="/admin"
                    onClick={() => setShowMenu(false)}
                    className={`w-full flex items-center gap-4 p-4 rounded-[8px] transition-all duration-300 ${
                      activeView === 'admin'
                        ? 'bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] shadow-lg hover:brightness-95'
                        : 'bg-gray-50 text-[#383838] hover:bg-gray-100'
                    }`}
                  >
                    <Users className="w-5 h-5" />
                    <span className="font-semibold">System Admin</span>
                  </Link>
                ) : null}

                {/* Logout */}
                <button
                  onClick={() => {
                    signOut();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-[8px] bg-red-50 text-red-700 hover:bg-red-100 transition-all duration-300 mt-4 border border-red-200"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-semibold">Sign Out</span>
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


