import React from 'react';
import { Briefcase, Cog, Home, TrendingUp, Clock } from 'lucide-react';
import type { MobileRepTab } from './mobileRepUtils';

interface MobileRepBottomNavProps {
  activeTab: MobileRepTab;
  onChange: (tab: MobileRepTab) => void;
  notificationCount?: number;
}

const TABS: Array<{
  id: MobileRepTab;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'sales_leads', label: 'Sales Leads', icon: TrendingUp },
  { id: 'jobs', label: 'Jobs', icon: Briefcase },
  { id: 'activities', label: 'Activities', icon: Clock },
  { id: 'machines', label: 'Machines', icon: Cog },
];

/**
 * Bottom tab bar for the Representative mobile website layout.
 */
const MobileRepBottomNav: React.FC<MobileRepBottomNavProps> = ({
  activeTab,
  onChange,
  notificationCount = 0,
}) => {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
      <div className="mx-auto flex h-[4.25rem] max-w-lg items-stretch justify-around rounded-[1.35rem] border border-white/70 bg-white/95 px-1.5 shadow-[0_-2px_24px_rgba(9,105,169,0.12),0_8px_28px_rgba(15,23,42,0.1)] backdrop-blur-xl">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-semibold transition-all duration-200 ${
                isActive ? 'text-[#0969a9]' : 'text-slate-400'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-[#0969a9]/12 text-[#0969a9] shadow-sm'
                    : 'bg-transparent text-slate-400'
                }`}
              >
                <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={isActive ? 2.4 : 2} />
              </span>
              <span className={`truncate ${isActive ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
              {tab.id === 'home' && notificationCount > 0 && (
                <span className="absolute right-2 top-1.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-4 text-white shadow-sm">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileRepBottomNav;
