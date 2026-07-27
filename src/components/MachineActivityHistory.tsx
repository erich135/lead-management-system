import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Clock, FileText, History, Loader2, RefreshCw } from 'lucide-react';
import { type CanonicalMachineHistoryData, type MachineHistoryRecord, getCanonicalMachineHistory } from '../lib/api';
import {
  MACHINE_HISTORY_SECTIONS,
  type MachineHistorySection,
  isCurrentMachineHistoryRequest,
  machineHistoryProvenanceText,
  mergeMachineHistoryPages,
} from '../lib/machineActivityHistory';
import { formatDateTime } from '../utils/dateFormat';

interface MachineActivityHistoryProps { machineId: string; }

const PAGE_SIZE = 25;
const sectionLabels: Record<MachineHistorySection, string> = {
  jobs: 'Jobs', rsrs: 'RSRs', readings: 'Readings', activities: 'Activity', notes: 'Notes', attachments: 'Attachments', relatedDocuments: 'Related Documents',
};
const emptyHistory: CanonicalMachineHistoryData = {
  requestedMachineId: '', canonicalMachineId: '', resolvedFromRetired: false, groupIdentities: [], section: 'jobs', records: [],
  pagination: { page: 1, limit: PAGE_SIZE, total: 0, hasMore: false },
};

function textValue(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return null;
}

function recordTitle(item: MachineHistoryRecord): string {
  const fallback = item.type === 'activity' ? 'Activity' : item.type === 'reading' ? 'Reading' : 'Retained record';
  return textValue(item.record, ['jobNumber', 'title', 'subject', 'filename', 'originalName', 'name', 'description']) || fallback;
}

function recordDetail(item: MachineHistoryRecord): string | null {
  if (item.type === 'reading') {
    const value = textValue(item.record, ['reading', 'meterReading', 'value']);
    return value ? `Reading: ${value}` : null;
  }
  if (item.type === 'activity') return textValue(item.record, ['action', 'description']);
  return textValue(item.record, ['description', 'notes', 'comment', 'status', 'contentType']);
}

function activityActor(item: MachineHistoryRecord): string | null {
  if (item.type !== 'activity') return null;
  const user = item.record.userId ?? item.record.user;
  if (!user || typeof user !== 'object') return null;
  const fields = user as Record<string, unknown>;
  const name = [fields.firstName, fields.lastName].filter((value): value is string => typeof value === 'string' && Boolean(value.trim())).join(' ');
  return name || (typeof fields.email === 'string' ? fields.email : null);
}

export function MachineActivityHistory({ machineId }: MachineActivityHistoryProps) {
  const [section, setSection] = useState<MachineHistorySection>('jobs');
  const [history, setHistory] = useState<CanonicalMachineHistoryData>(emptyHistory);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestGenerationRef = useRef(0);
  const requestInFlightRef = useRef(false);
  const failedPageRef = useRef(1);

  const loadPage = useCallback(async (page: number, replace: boolean) => {
    if (requestInFlightRef.current) return;
    const requestGeneration = ++requestGenerationRef.current;
    requestInFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const response = await getCanonicalMachineHistory(machineId, { section, page, limit: PAGE_SIZE });
      if (!isCurrentMachineHistoryRequest(requestGeneration, requestGenerationRef.current)) return;
      setHistory((current) => ({ ...response, records: mergeMachineHistoryPages(current.records, response.records, replace) }));
      failedPageRef.current = 1;
    } catch (loadError) {
      if (!isCurrentMachineHistoryRequest(requestGeneration, requestGenerationRef.current)) return;
      failedPageRef.current = page;
      setError(loadError instanceof Error ? loadError.message : 'Machine history could not be loaded.');
    } finally {
      if (isCurrentMachineHistoryRequest(requestGeneration, requestGenerationRef.current)) {
        requestInFlightRef.current = false;
        setLoading(false);
      }
    }
  }, [machineId, section]);

  useEffect(() => {
    requestGenerationRef.current += 1;
    requestInFlightRef.current = false;
    failedPageRef.current = 1;
    setHistory({ ...emptyHistory, section });
    setError(null);
    void loadPage(1, true);
    return () => {
      requestGenerationRef.current += 1;
      requestInFlightRef.current = false;
    };
  }, [machineId, section, loadPage]);

  const retry = () => void loadPage(failedPageRef.current, failedPageRef.current === 1);
  const loadMore = () => {
    if (!loading && history.pagination.hasMore) void loadPage(history.pagination.page + 1, false);
  };

  return (
    <section aria-labelledby={`machine-history-${machineId}`} className="mt-4 rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h4 id={`machine-history-${machineId}`} className="flex items-center gap-2 text-sm font-semibold text-slate-700"><History className="h-4 w-4 text-blue-600" />Canonical Machine History</h4>
        <p className="mt-0.5 text-xs text-slate-500">Read-only history for this machine and retained canonical-group records.</p>
        <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Machine history sections">
          {MACHINE_HISTORY_SECTIONS.map((option) => <button key={option} type="button" role="tab" aria-selected={section === option} onClick={() => setSection(option)} className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${section === option ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}>{sectionLabels[option]}</button>)}
        </div>
      </div>
      <div className="p-4" aria-live="polite">
        {error && <div role="alert" className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4 flex-shrink-0" /><span className="flex-1">{sectionLabels[section]} history could not be loaded. {error}</span><button type="button" onClick={retry} disabled={loading} className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Retry</button></div>}
        {loading && history.records.length === 0 ? <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500" role="status"><Loader2 className="h-5 w-5 animate-spin" />Loading {sectionLabels[section].toLowerCase()} history...</div> : history.records.length === 0 && !error ? <div className="py-6 text-center text-sm text-slate-500"><Clock className="mx-auto mb-2 h-8 w-8 text-slate-300" />No {sectionLabels[section].toLowerCase()} history is available for this machine.</div> : <div className="space-y-2">
          {history.records.map((item) => {
            const provenance = machineHistoryProvenanceText(item.provenance.machineIds, history.groupIdentities);
            const detail = recordDetail(item);
            const actor = activityActor(item);
            return <article key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3"><div className="min-w-0"><p className="font-medium text-slate-800">{recordTitle(item)}</p><div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">{item.occurredAt && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDateTime(String(item.occurredAt))}</span>}<span>{item.type}</span>{actor && <span>Actor: {actor}</span>}{item.file && <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" />Document retained</span>}</div></div></div>{detail && <p className="mt-2 text-xs text-slate-600">{detail}</p>}{provenance && <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">{provenance}</p>}</article>;
          })}
        </div>}
        {history.records.length > 0 && <div className="mt-4 flex items-center justify-between gap-3"><span className="text-xs text-slate-500" role="status">{loading && history.pagination.hasMore ? 'Loading more history...' : history.pagination.hasMore ? `More ${sectionLabels[section].toLowerCase()} history is available.` : `All ${sectionLabels[section].toLowerCase()} history is shown.`}</span>{history.pagination.hasMore && <button type="button" onClick={loadMore} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60">{loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Load more</button>}</div>}
      </div>
    </section>
  );
}
