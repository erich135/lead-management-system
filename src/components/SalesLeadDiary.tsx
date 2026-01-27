import React, { useState } from 'react';
import { Calendar as CalendarIcon, MapPin, Users } from 'lucide-react';
import WeeklyPlanner from './WeeklyPlanner';
import CanvassingPlansList from './CanvassingPlansList';

type DiaryView = 'planner' | 'canvassing';

const SalesLeadDiary: React.FC = () => {
  const [view, setView] = useState<DiaryView>('planner');

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Sub-navigation */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            <button
              onClick={() => setView('planner')}
              className={`
                flex items-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-colors
                ${
                  view === 'planner'
                    ? 'bg-ars-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <CalendarIcon className="w-4 h-4" />
              Weekly Planner
            </button>

            <button
              onClick={() => setView('canvassing')}
              className={`
                flex items-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-colors
                ${
                  view === 'canvassing'
                    ? 'bg-ars-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <MapPin className="w-4 h-4" />
              Canvassing Plans
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {view === 'planner' && <WeeklyPlanner />}
        {view === 'canvassing' && <CanvassingPlansList />}
      </div>
    </div>
  );
};

export default SalesLeadDiary;
