import React, { useState } from 'react';
import { ClipboardList, Calendar, BarChart3 } from 'lucide-react';
import { SalesLeadsList } from './SalesLeadsList';
import SalesLeadDiary from './SalesLeadDiary';
import SalesLeadReports from './SalesLeadReports';

type SalesLeadTab = 'management' | 'diary' | 'reports';

const SalesLeadsContainer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SalesLeadTab>('management');

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 px-6">
        <nav className="flex space-x-8" aria-label="Sales Leads Tabs">
          <button
            onClick={() => setActiveTab('management')}
            className={`
              flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'management'
                  ? 'border-ars-primary text-ars-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <ClipboardList className="w-5 h-5" />
            Lead Management
          </button>

          <button
            onClick={() => setActiveTab('diary')}
            className={`
              flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'diary'
                  ? 'border-ars-primary text-ars-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <Calendar className="w-5 h-5" />
            Diary
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`
              flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'reports'
                  ? 'border-ars-primary text-ars-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <BarChart3 className="w-5 h-5" />
            Reports
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'management' && <SalesLeadsList />}
        {activeTab === 'diary' && <SalesLeadDiary />}
        {activeTab === 'reports' && <SalesLeadReports />}
      </div>
    </div>
  );
};

export default SalesLeadsContainer;
