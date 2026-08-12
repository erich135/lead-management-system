import React, { useEffect, useState } from 'react';
import { Briefcase, Calendar, Loader2, Map, TrendingUp } from 'lucide-react';
import {
  getBranches,
  getRepCodes,
  getStatuses,
  type Branch,
  type RepCode,
  type Status,
} from '../lib/api';
import WeeklyPlanner from '../components/WeeklyPlanner';
import { SalesLeadsList } from '../components/SalesLeadsList';
import SalesLeadMapsTab from '../components/SalesLeadMapsTab';
import SalesLeadReports from '../components/SalesLeadReports';
import type { PlannerAppointment } from '../components/diary/DiaryDayAppointmentCard';

type SalesLeadsSubTab = 'leads' | 'diary' | 'maps' | 'reports';

interface MobileRepSalesLeadsProps {
  onOpenAppointment: (appointment: PlannerAppointment) => void;
  onOpenHistory: () => void;
  plannerKey: number;
}

const SUB_TABS: Array<{
  id: SalesLeadsSubTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'leads', label: 'Leads', icon: Briefcase },
  { id: 'diary', label: 'Diary', icon: Calendar },
  { id: 'maps', label: 'Maps', icon: Map },
  { id: 'reports', label: 'Reports', icon: TrendingUp },
];

/**
 * Mobile Sales Leads workspace with sub-tabs for Lead Management, Diary, Maps, and Reports.
 */
const MobileRepSalesLeads: React.FC<MobileRepSalesLeadsProps> = ({
  onOpenAppointment,
  onOpenHistory,
  plannerKey,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SalesLeadsSubTab>('leads');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [repCodes, setRepCodes] = useState<RepCode[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadRefs(): Promise<void> {
      setLoading(true);
      try {
        const [branchRes, repRes, statusRes] = await Promise.all([
          getBranches(),
          getRepCodes(),
          getStatuses(),
        ]);
        if (cancelled) return;
        setBranches(branchRes.branches || []);
        setRepCodes(repRes.repCodes || []);
        setStatuses(statusRes.statuses || []);
      } catch {
        if (!cancelled) {
          setBranches([]);
          setRepCodes([]);
          setStatuses([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadRefs();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="mobile-rep-rise flex flex-col px-3 pb-4 pt-4">
      <div className="mb-3 px-1">
        <h1 className="text-[1.65rem] font-extrabold tracking-tight text-slate-900">Sales Leads</h1>
        <p className="mt-0.5 text-sm font-medium text-slate-500">Manage leads, diary, maps &amp; reports</p>
      </div>

      {/* Sub-tab navigation */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto rounded-2xl bg-slate-100 p-1.5">
        {SUB_TABS.map((subTab) => {
          const Icon = subTab.icon;
          const isActive = activeSubTab === subTab.id;
          return (
            <button
              key={subTab.id}
              type="button"
              onClick={() => setActiveSubTab(subTab.id)}
              className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-white text-[#0969a9] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
              {subTab.label}
            </button>
          );
        })}
      </div>

      {/* Sub-tab content */}
      {activeSubTab === 'leads' && (
        <div className="mobile-rep-card overflow-hidden rounded-2xl">
          <SalesLeadsList
            branches={branches}
            repCodes={repCodes}
            refreshKey={refreshKey}
            onCreateLead={() => setRefreshKey((v) => v + 1)}
            onSelectLead={() => undefined}
          />
        </div>
      )}

      {activeSubTab === 'diary' && (
        <div className="mobile-rep-card overflow-hidden rounded-2xl">
          <WeeklyPlanner
            key={plannerKey}
            enableDaySwipe
            className="flex min-h-full flex-col"
            onOpenHistory={onOpenHistory}
            onAppointmentOpen={onOpenAppointment}
          />
        </div>
      )}

      {activeSubTab === 'maps' && (
        <div className="mobile-rep-card overflow-hidden rounded-2xl">
          <SalesLeadMapsTab branches={branches} repCodes={repCodes} />
        </div>
      )}

      {activeSubTab === 'reports' && (
        <div className="mobile-rep-card overflow-hidden rounded-2xl">
          <SalesLeadReports />
        </div>
      )}
    </div>
  );
};

export default MobileRepSalesLeads;
