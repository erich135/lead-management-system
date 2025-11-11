import { LayoutDashboard, FileText, BarChart3, Calendar, Users, Menu, X, Bell, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

type View = 'dashboard' | 'leads' | 'reports' | 'users' | 'diary';

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
  const [showMenu, setShowMenu] = useState(false);

  const navItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads' as View, label: 'Leads', icon: FileText },
    { id: 'reports' as View, label: 'Reports', icon: BarChart3 },
    { id: 'diary' as View, label: 'Diary', icon: Calendar },
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50 md:hidden safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id);
                  setShowMenu(false);
                }}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
                  isActive
                    ? 'text-emerald-600'
                    : 'text-slate-500'
                }`}
              >
                <div className={`relative ${isActive ? 'scale-110' : 'scale-100'} transition-transform`}>
                  <Icon className="w-6 h-6" />
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-emerald-600 rounded-full"></div>
                  )}
                </div>
                <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : 'font-normal'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
          
          {/* Menu/More button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
              showMenu ? 'text-emerald-600' : 'text-slate-500'
            }`}
          >
            <div className="relative">
              <Menu className="w-6 h-6" />
              {(notificationsCount > 0 || showMenu) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full"></span>
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
              <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-6"></div>
              
              {/* User Info */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200">
                <div className="w-12 h-12 bg-gradient-to-br from-slate-700 via-emerald-600 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                  {user?.firstName?.[0] || 'U'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{user?.fullName || 'User'}</p>
                  <p className="text-sm text-slate-500 capitalize">{user?.role?.name || 'user'}</p>
                </div>
              </div>

              {/* Menu Items */}
              <div className="space-y-2">
                {/* Users (if admin) */}
                {user?.isSuperAdmin || user?.role?.name === 'admin' ? (
                  <button
                    onClick={() => {
                      onViewChange('users');
                      setShowMenu(false);
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                      currentView === 'users'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-5 h-5" />
                    <span className="font-medium">User Management</span>
                  </button>
                ) : null}

                {/* Notifications */}
                <button
                  onClick={() => {
                    onNotificationsClick();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 transition-all"
                >
                  <div className="relative">
                    <Bell className="w-5 h-5" />
                    {notificationsCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center">
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
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition-all mt-4"
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


