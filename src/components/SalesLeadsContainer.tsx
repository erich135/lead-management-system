import React, { useState } from 'react';
import { ClipboardList, Calendar, BarChart3 } from 'lucide-react';
import { SalesLeadsList } from './SalesLeadsList';
import SalesLeadDiary from './SalesLeadDiary';
import SalesLeadReports from './SalesLeadReports';
import { SalesLeadForm } from './SalesLeadForm';
import { SalesLeadDetails } from './SalesLeadDetails';
import type { SalesLead, Branch, RepCode } from '../lib/api';

type SalesLeadTab = 'management' | 'diary' | 'reports';

interface SalesLeadsContainerProps {
  branches: Branch[];
  repCodes: RepCode[];
}

const SalesLeadsContainer: React.FC<SalesLeadsContainerProps> = ({ branches, repCodes }) => {
  const [activeTab, setActiveTab] = useState<SalesLeadTab>('management');
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState<SalesLead | null>(null);
  const [editingLead, setEditingLead] = useState<SalesLead | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateLead = () => {
    setEditingLead(null);
    setShowLeadForm(true);
  };

  const handleSelectLead = (lead: SalesLead) => {
    setSelectedLead(lead);
  };

  const handleCloseDetails = () => {
    setSelectedLead(null);
  };

  const handleEditLead = (lead: SalesLead) => {
    setEditingLead(lead);
    setShowLeadForm(true);
    setSelectedLead(null);
  };

  const handleCloseForm = () => {
    setShowLeadForm(false);
    setEditingLead(null);
  };

  const handleFormSuccess = () => {
    setShowLeadForm(false);
    setEditingLead(null);
    setRefreshKey(prev => prev + 1);
  };

  const handleLeadDeleted = () => {
    setSelectedLead(null);
    setRefreshKey(prev => prev + 1);
  };

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
        {activeTab === 'management' && (
          <SalesLeadsList
            onCreateLead={handleCreateLead}
            onSelectLead={handleSelectLead}
            branches={branches}
            repCodes={repCodes}
            refreshKey={refreshKey}
          />
        )}
        {activeTab === 'diary' && <SalesLeadDiary />}
        {activeTab === 'reports' && <SalesLeadReports />}
      </div>

      {/* Lead Form Modal */}
      {showLeadForm && (
        <SalesLeadForm
          lead={editingLead || undefined}
          onClose={handleCloseForm}
          onSave={handleFormSuccess}
          branches={branches}
          repCodes={repCodes}
        />
      )}

      {/* Lead Details Modal */}
      {selectedLead && (
        <SalesLeadDetails
          lead={selectedLead}
          onClose={handleCloseDetails}
          onEdit={handleEditLead}
          onRefresh={handleLeadDeleted}
          branches={branches}
          repCodes={repCodes}
        />
      )}
    </div>
  );
};

export default SalesLeadsContainer;
