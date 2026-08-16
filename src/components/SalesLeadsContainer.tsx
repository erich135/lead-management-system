import React, { useState } from 'react';
import {
  ClipboardList,
  Calendar,
  MapPin,
  BarChart3,
  FileText,
  Briefcase,
  TrendingUp,
} from 'lucide-react';
import { SalesLeadsList } from './SalesLeadsList';
import SalesLeadDiary from './SalesLeadDiary';
import SalesLeadReports from './SalesLeadReports';
import SalesLeadMapsTab from './SalesLeadMapsTab';
import SalesRequestsTab from './SalesRequestsTab';
import { SalesLeadForm } from './SalesLeadForm';
import { SalesLeadDetails } from './SalesLeadDetails';
import { LeadStatsWidget } from './LeadStatsWidget';
import type { SalesLead, Branch, RepCode } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { SALES_REQUEST_PERMISSIONS } from '../constants/salesRequestPermissions';

type SalesLeadTab = 'management' | 'diary' | 'maps' | 'reports' | 'requests';

interface SalesLeadsContainerProps {
  branches: Branch[];
  repCodes: RepCode[];
}

/**
 * Sales Leads workspace with Lead Management, Diary, Maps, Reports, and Requests.
 * Mobile keeps the nicer pill-tab layout; desktop keeps the classic tab bar.
 */
const SalesLeadsContainer: React.FC<SalesLeadsContainerProps> = ({ branches, repCodes }) => {
  const { hasPermission, isSuperAdmin } = useAuth();
  const isMobile = useIsMobile();
  // Super admins use Pending Approvals in the main nav — not the Sales Leads Requests tab.
  const canViewRequests =
    !isSuperAdmin &&
    (hasPermission(SALES_REQUEST_PERMISSIONS.READ) ||
      hasPermission(SALES_REQUEST_PERMISSIONS.CREATE));
  const [activeTab, setActiveTab] = useState<SalesLeadTab>('management');
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState<SalesLead | null>(null);
  const [editingLead, setEditingLead] = useState<SalesLead | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  /**
   * Opens the create-lead form.
   */
  const handleCreateLead = () => {
    setEditingLead(null);
    setShowLeadForm(true);
  };

  /**
   * Opens lead details for the selected lead.
   */
  const handleSelectLead = (lead: SalesLead) => {
    setSelectedLead(lead);
  };

  /**
   * Closes the lead details panel.
   */
  const handleCloseDetails = () => {
    setSelectedLead(null);
  };

  /**
   * Opens the edit form for a lead.
   */
  const handleEditLead = (lead: SalesLead) => {
    setEditingLead(lead);
    setShowLeadForm(true);
    setSelectedLead(null);
  };

  /**
   * Closes the lead create/edit form.
   */
  const handleCloseForm = () => {
    setShowLeadForm(false);
    setEditingLead(null);
  };

  /**
   * Refreshes the list after a successful save.
   */
  const handleFormSuccess = () => {
    setShowLeadForm(false);
    setEditingLead(null);
    setRefreshKey((prev) => prev + 1);
  };

  /**
   * Clears selection and refreshes after a lead is deleted.
   */
  const handleLeadDeleted = () => {
    setSelectedLead(null);
    setRefreshKey((prev) => prev + 1);
  };

  const tabs: Array<{
    id: SalesLeadTab;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'management', label: 'Lead Management', shortLabel: 'Leads', icon: Briefcase },
    { id: 'diary', label: 'Diary', shortLabel: 'Diary', icon: Calendar },
    { id: 'maps', label: 'Maps', shortLabel: 'Maps', icon: MapPin },
    { id: 'reports', label: 'Reports', shortLabel: 'Reports', icon: TrendingUp },
    ...(canViewRequests
      ? [
          {
            id: 'requests' as SalesLeadTab,
            label: 'Requests',
            shortLabel: 'Requests',
            icon: FileText,
          },
        ]
      : []),
  ];

  return (
    <div className={`h-full flex flex-col ${isMobile ? 'mobile-rep-rise' : ''}`}>
      {!isMobile && (
        <div className="px-6 pt-4">
          <LeadStatsWidget />
        </div>
      )}

      {isMobile ? (
        <div className="px-3 pt-3 pb-1">
          <h1 className="text-[1.65rem] font-extrabold tracking-tight text-slate-900">
            Sales Leads
          </h1>
          <p className="mt-0.5 text-sm font-medium text-slate-500">
            Manage leads, diary, maps &amp; reports
          </p>
          <div className="mt-3 flex gap-1.5 overflow-x-auto rounded-2xl bg-slate-100 p-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-white text-[#0969a9] shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  {tab.shortLabel}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white border-b border-gray-200 px-6">
          <nav className="flex space-x-8" aria-label="Sales Leads Tabs">
            {tabs.map((tab) => {
              const Icon = tab.id === 'management' ? ClipboardList : tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${
                      activeTab === tab.id
                        ? 'border-ars-primary text-ars-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      <div className={`flex-1 overflow-auto ${isMobile ? 'px-3 pb-4 pt-3' : ''}`}>
        {activeTab === 'management' && (
          <div className={isMobile ? 'mobile-rep-card overflow-hidden rounded-2xl' : ''}>
            <SalesLeadsList
              onCreateLead={handleCreateLead}
              onSelectLead={handleSelectLead}
              branches={branches}
              repCodes={repCodes}
              refreshKey={refreshKey}
            />
          </div>
        )}
        {activeTab === 'diary' && (
          <div className={isMobile ? 'mobile-rep-card overflow-hidden rounded-2xl' : ''}>
            <SalesLeadDiary />
          </div>
        )}
        {activeTab === 'maps' && (
          <div className={isMobile ? 'mobile-rep-card overflow-hidden rounded-2xl' : ''}>
            <SalesLeadMapsTab branches={branches} repCodes={repCodes} />
          </div>
        )}
        {activeTab === 'reports' && (
          <div className={isMobile ? 'mobile-rep-card overflow-hidden rounded-2xl' : ''}>
            <SalesLeadReports />
          </div>
        )}
        {activeTab === 'requests' && canViewRequests && (
          <div className={isMobile ? 'mobile-rep-card overflow-hidden rounded-2xl' : ''}>
            <SalesRequestsTab refreshKey={refreshKey} />
          </div>
        )}
      </div>

      {showLeadForm && (
        <SalesLeadForm
          lead={editingLead || undefined}
          onClose={handleCloseForm}
          onSave={handleFormSuccess}
          branches={branches}
          repCodes={repCodes}
        />
      )}

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
