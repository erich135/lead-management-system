import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { LeadsList } from '../components/LeadsList';
import { LeadForm } from '../components/LeadForm';
import {
  getBranches,
  getStatuses,
  type Branch,
  type Status,
} from '../lib/api';

/**
 * Mobile Jobs tab — reuses the existing Jobs list (rep filter already locked).
 */
const MobileRepJobs: React.FC = () => {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    /**
     * Loads filter reference data needed by LeadsList.
     */
    async function loadRefs(): Promise<void> {
      setLoading(true);
      try {
        const [statusRes, branchRes] = await Promise.all([getStatuses(), getBranches()]);
        if (cancelled) return;
        setStatuses(statusRes.statuses || []);
        setBranches(branchRes.branches || []);
      } catch {
        if (!cancelled) {
          setStatuses([]);
          setBranches([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadRefs();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="mobile-rep-rise px-3 pb-4 pt-4">
      <div className="mb-3 px-1">
        <h1 className="text-[1.65rem] font-extrabold tracking-tight text-slate-900">Jobs</h1>
        <p className="mt-0.5 text-sm font-medium text-slate-500">Your assigned field jobs</p>
      </div>
      <div className="mobile-rep-card overflow-hidden rounded-2xl">
        <LeadsList
          statuses={statuses}
          branches={branches}
          refreshKey={refreshKey}
          onLeadClick={() => undefined}
          onCreateNew={() => setShowCreate(true)}
        />
      </div>

      {showCreate && (
        <LeadForm
          statuses={statuses}
          branches={branches}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            setRefreshKey((value) => value + 1);
          }}
        />
      )}
    </div>
  );
};

export default MobileRepJobs;
