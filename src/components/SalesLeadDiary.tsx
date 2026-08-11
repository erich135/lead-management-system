import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, History, MapPin } from 'lucide-react';
import WeeklyPlanner from './WeeklyPlanner';
import CanvassingPlansList from './CanvassingPlansList';
import DiaryHistoryView from './diary/DiaryHistoryView';
import { useAuth } from '../contexts/AuthContext';

type DiaryView = 'planner' | 'history' | 'canvassing';

/**
 * Sales Diary shell: Planner, History and Canvassing with compact spacing.
 * Super admins review history from Pending Approvals — History is hidden here.
 */
const SalesLeadDiary: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const [view, setView] = useState<DiaryView>('planner');

  const tabs: Array<{ id: DiaryView; label: string; icon: React.ReactNode }> = [
    { id: 'planner', label: 'Planner', icon: <CalendarIcon className="h-4 w-4" /> },
    ...(!isSuperAdmin
      ? [{ id: 'history' as DiaryView, label: 'History', icon: <History className="h-4 w-4" /> }]
      : []),
    { id: 'canvassing', label: 'Canvassing', icon: <MapPin className="h-4 w-4" /> },
  ];

  useEffect(() => {
    if (isSuperAdmin && view === 'history') {
      setView('planner');
    }
  }, [isSuperAdmin, view]);

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-4 sm:px-6">
        <div className="flex space-x-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                view === tab.id
                  ? 'bg-ars-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-4">
        {view === 'planner' && (
          <WeeklyPlanner
            hideHistoryButton={isSuperAdmin}
            onOpenHistory={isSuperAdmin ? undefined : () => setView('history')}
          />
        )}
        {view === 'history' && (
          <DiaryHistoryView onExit={() => setView('planner')} />
        )}
        {view === 'canvassing' && <CanvassingPlansList />}
      </div>
    </div>
  );
};

export default SalesLeadDiary;
