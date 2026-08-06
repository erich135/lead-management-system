/**
 * BouwaSpecLibraryPage
 *
 * Super-Admin browse of the consolidated production Machine Spec Library
 * (`bouwaspeclibraryrecords` via `/api/bouwa/wizard/spec-library`).
 *
 * Counts and rows come from the authoritative API. Demo manufacturer fixtures
 * are excluded from the production experience.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ClipboardCheck,
  Database,
  Info,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import {
  browseSpecLibrary,
  type SpecLibrarySourceBreakdownEntry,
} from '../wizard/wizardApi';
import { BouwaMachineSpecLibrary } from './BouwaMachineSpecLibrary';

export function BouwaSpecLibraryPage() {
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [activeTotal, setActiveTotal] = useState(0);
  const [breakdown, setBreakdown] = useState<SpecLibrarySourceBreakdownEntry[]>([]);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const page = await browseSpecLibrary({
        equipmentType: 'air_compressor',
        limit: 1,
        offset: 0,
      });
      setActiveTotal(page.total);
      setBreakdown(page.sourceBreakdown);
    } catch (error: unknown) {
      setSummaryError(error instanceof Error ? error.message : 'Unable to load library summary.');
      setActiveTotal(0);
      setBreakdown([]);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-ars-primary/10 p-2.5 shrink-0">
          <Database className="w-6 h-6 text-ars-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-ars-heading">Machine Spec Library</h1>
          <p className="text-sm text-ars-body">
            Consolidated active library used by the guided wizard. Counts come from production
            library records, not demo placeholders.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadSummary()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`w-4 h-4 ${loadingSummary ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
              Active machine specifications
            </p>
            <p className="text-2xl font-bold text-ars-heading">
              {loadingSummary ? '…' : activeTotal.toLocaleString('en-ZA')}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs text-slate-600 font-medium">
            <ShieldAlert className="w-3 h-3" />
            Super Admin / read-only
          </span>
        </div>

        {summaryError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{summaryError}</span>
          </div>
        )}

        {!summaryError && breakdown.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {breakdown.map((entry) => (
              <span
                key={entry.sourceType}
                className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-900"
                title={entry.sourceType}
              >
                <span className="font-semibold">{entry.label}</span>
                <span className="font-mono">{entry.count}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-start gap-3">
        <ClipboardCheck className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 space-y-1">
          <p className="font-semibold text-slate-900">Supplier Spec Review scope</p>
          <p>
            Internal review editing applies only to legacy parsed OEM intake records
            (<code className="font-mono">bouwamachinespecs</code>). Production publication now
            lives in the immutable consolidated library below. When legacy intake is empty, the
            review queue correctly shows zero candidates — it does not mean the library is empty.
          </p>
        </div>
      </div>

      <BouwaMachineSpecLibrary pageSize={50} />

      {import.meta.env.DEV && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            Development note: hard-coded manufacturer demo fixtures are excluded from production.
            Use the consolidated library API for all Super-Admin browsing.
          </p>
        </div>
      )}
    </div>
  );
}
