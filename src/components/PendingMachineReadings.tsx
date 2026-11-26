import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Wrench,
  Image as ImageIcon,
  RefreshCw,
  Clock,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  approveMachineReadingSubmission,
  getMachineReadingPhotoUrl,
  listMachineReadingSubmissions,
  rejectMachineReadingSubmission,
  type MachineReadingSubmission,
} from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { canAccessMachineReadingWorkflow } from '../lib/readingAccess';
import { ChecklistReadingReport } from './ChecklistReadingReport';
import { checklistDetailsStartOpen, checklistReportDocument, checklistReview, correctedApprovedHours, type ChecklistReview } from './officeReadingReview';

type Tab = 'pending' | 'approved' | 'rejected';

/**
 * Verification queue for customer-submitted machine hour readings.
 *
 * ARS-READINGS-ACCESS-001 (temporary policy): visible to every authenticated
 * user until a final authorised-user list is supplied. See
 * `../lib/readingAccess` for how to restrict this later.
 */
export function PendingMachineReadings() {
  const { user } = useAuth();
  const canVerify = canAccessMachineReadingWorkflow(user);

  const [query, setQuery] = useState({ tab: 'pending' as Tab, search: '', page: 1 });
  const { tab, page } = query;
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 20 });
  const [reloadKey, setReloadKey] = useState(0);
  const requestNumber = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const searchPending = searchText.trim() !== query.search;
  const [items, setItems] = useState<MachineReadingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [previewSub, setPreviewSub] = useState<MachineReadingSubmission | null>(null);

  const invalidateRequest = () => {
    requestNumber.current += 1;
    activeRequest.current?.abort();
    setLoading(true);
    setError(null);
  };

  useEffect(() => {
    if (searchText.trim() === query.search) return;
    const timer = window.setTimeout(() => {
      setQuery(previous => ({ ...previous, search: searchText.trim(), page: 1 }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchText, query.search]);

  useEffect(() => {
    if (!canVerify) return;
    setLoading(true);
    setError(null);
    if (searchPending) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    const request = ++requestNumber.current;
    void listMachineReadingSubmissions(query.tab, { search: query.search, page: query.page, limit: 20 }, controller.signal)
      .then(({ submissions, pagination: result }) => {
        if (request !== requestNumber.current || controller.signal.aborted) return;
        if (!result) throw new Error('Unable to load the submission list. Refresh and try again.');
        if (query.page > result.pages) {
          requestNumber.current += 1;
          setQuery(previous => ({ ...previous, page: Math.max(1, result.pages) }));
          return;
        }
        setItems(submissions);
        setPagination(result);
      })
      .catch((e: unknown) => {
        if (request !== requestNumber.current || controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : 'Failed to load submissions');
      })
      .finally(() => {
        if (request === requestNumber.current && !controller.signal.aborted) setLoading(false);
      });
    return () => { controller.abort(); if (request === requestNumber.current) requestNumber.current += 1; };
  }, [query, canVerify, searchPending, reloadKey]);

  const changeSearch = (value: string) => {
    if (value.trim() !== query.search) { invalidateRequest(); setLoading(true); }
    setSearchText(value);
  };
  const clearSearch = () => {
    invalidateRequest();
    setSearchText('');
    setQuery(previous => ({ ...previous, search: '', page: 1 }));
  };
  const refresh = () => { invalidateRequest(); setReloadKey(previous => previous + 1); };

  if (!canVerify) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Sign in required</p>
            <p className="text-sm text-amber-800">
              You need to be signed in to an ARS account to access this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleApprove = async (sub: MachineReadingSubmission, hoursOverride?: number) => {
    setActing(sub._id);
    try {
      await approveMachineReadingSubmission(sub._id, {
        approvedHours: hoursOverride,
      });
      setItems((prev) => prev.filter((s) => s._id !== sub._id));
      setPreviewSub(null);
      setReloadKey(previous => previous + 1);
    } catch (e: any) {
      alert(e?.message || 'Failed to approve');
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (sub: MachineReadingSubmission) => {
    const reason = window.prompt('Reason for rejection:');
    if (!reason || !reason.trim()) return;
    setActing(sub._id);
    try {
      await rejectMachineReadingSubmission(sub._id, reason.trim());
      setItems((prev) => prev.filter((s) => s._id !== sub._id));
      setPreviewSub(null);
      setReloadKey(previous => previous + 1);
    } catch (e: any) {
      alert(e?.message || 'Failed to reject');
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Machine Reading Submissions</h1>
          <p className="text-sm text-slate-500">
            Verify customer-submitted hour-meter readings.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="mb-4">
        <label htmlFor="machine-reading-search" className="block text-sm font-medium text-slate-700 mb-1">Search submissions</label>
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" aria-hidden="true" />
          <input id="machine-reading-search" type="search" maxLength={200} value={searchText}
            onChange={event => changeSearch(event.target.value)}
            placeholder="Customer, machine, serial, asset, ID, reference or hours"
            className="w-full pl-10 pr-12 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {searchText && <button type="button" onClick={clearSearch} aria-label="Clear search"
            className="absolute right-2 top-1 p-2 text-slate-500 hover:text-slate-800 rounded"><X className="w-4 h-4" /></button>}
        </div>
      </div>

      {/* Tabs retain the same search text and reset only the result page. */}
      <div className="flex border-b border-slate-200 mb-4">
        {(['pending', 'approved', 'rejected'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              if (t === tab && !searchPending) return;
              invalidateRequest();
              setQuery(previous => ({ ...previous, tab: t, search: searchText.trim(), page: 1 }));
            }}
            aria-pressed={tab === t}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition ${
              tab === t
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="sr-only">Loading submissions</span>
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">{query.search ? `No ${tab} submissions match “${query.search}”.` : `No ${tab} submissions.`}</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-3">
          {items.map((sub) => (
            <SubmissionCard
              key={sub._id}
              submission={sub}
              busy={acting === sub._id}
              onApprove={(hours) => handleApprove(sub, hours)}
              onReject={() => handleReject(sub)}
              onPreview={() => setPreviewSub(sub)}
              tab={tab}
            />
          ))}
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 text-sm text-slate-600">
          <p role="status" aria-live="polite">
            {pagination.total === 0 ? '0' : `${(page - 1) * pagination.limit + 1}–${Math.min(page * pagination.limit, pagination.total)}`} of {pagination.total} {tab} {query.search ? 'matches' : 'submissions'}
          </p>
          {pagination.total > 0 && <nav aria-label="Submission pages" className="flex items-center gap-3">
            <button type="button" aria-label="Previous page" disabled={page <= 1}
              onClick={() => { invalidateRequest(); setQuery(previous => ({ ...previous, page: previous.page - 1 })); }}
              className="p-2 border rounded-lg disabled:opacity-40 hover:bg-slate-50"><ChevronLeft className="w-4 h-4" /></button>
            <span>Page {page} of {pagination.pages}</span>
            <button type="button" aria-label="Next page" disabled={page >= pagination.pages}
              onClick={() => { invalidateRequest(); setQuery(previous => ({ ...previous, page: previous.page + 1 })); }}
              className="p-2 border rounded-lg disabled:opacity-40 hover:bg-slate-50"><ChevronRight className="w-4 h-4" /></button>
          </nav>}
        </div>
      )}

      {previewSub && (
        <PhotoModal submission={previewSub} onClose={() => setPreviewSub(null)} />
      )}
    </div>
  );
}

interface CardProps {
  submission: MachineReadingSubmission;
  busy: boolean;
  onApprove: (hoursOverride?: number) => void;
  onReject: () => void;
  onPreview: () => void;
  tab: Tab;
}

function SubmissionCard({ submission, busy, onApprove, onReject, onPreview, tab }: CardProps) {
  const machine = submission.machine;
  const delta = submission.submittedHours - submission.previousHours;
  const approvedReading = correctedApprovedHours(submission);
  const review = checklistReview(submission.checklist);
  const report = checklistReportDocument(submission);
  const [editing, setEditing] = useState(false);
  const [editHours, setEditHours] = useState(String(submission.submittedHours));
  const [reportMode, setReportMode] = useState<null | 'view' | 'print'>(null);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Photo thumbnail */}
        <button
          type="button"
          onClick={onPreview}
          className="w-full md:w-32 h-32 flex-shrink-0 bg-slate-100 border border-slate-200 rounded-lg overflow-hidden hover:opacity-90 relative group"
          title="Click to view full photo"
        >
          <img
            src={getMachineReadingPhotoUrl(submission._id)}
            alt="Hour meter"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <ImageIcon className="w-6 h-6 text-slate-300 absolute inset-0 m-auto opacity-0 group-hover:opacity-100" />
        </button>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-2 mb-1">
            <span className="text-xs font-medium text-slate-500" title={`Submission ID: ${submission._id}`}>ARS-{submission._id.slice(-6).toUpperCase()}</span>
            <h3 className="font-semibold text-slate-800 truncate">
              {machine?.make} {machine?.model}
            </h3>
            <span className="text-xs text-slate-500">S/N {machine?.serialNumber}</span>
            {machine?.assetNumber && (
              <span className="text-xs text-slate-500">Asset {machine.assetNumber}</span>
            )}
          </div>
          <p className="text-sm text-slate-600 mb-2">
            {machine?.customer?.name || machine?.cashCustomer || '—'}
            {machine?.currentLocation && (
              <span className="text-slate-400"> · {machine.currentLocation}</span>
            )}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Metric label="Previous" value={`${submission.previousHours.toLocaleString()} hrs`} />
            <Metric
              label="Submitted"
              value={`${submission.submittedHours.toLocaleString()} hrs`}
              highlight
            />
            {approvedReading !== null && (
              <Metric
                label="Approved"
                value={`${approvedReading.toLocaleString()} hrs`}
              />
            )}
            <Metric
              label="Delta"
              value={`${delta >= 0 ? '+' : ''}${delta.toLocaleString()}`}
              warn={delta < 0 || delta > 1000}
            />
            <Metric
              label="Submitted"
              value={new Date(submission.submittedAt).toLocaleString()}
              icon={<Clock className="w-3 h-3" />}
            />
          </div>

          {submission.faultReported && (
            <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded p-2">
              <Wrench className="w-4 h-4 text-amber-700 mt-0.5" />
              <div className="text-sm text-amber-900">
                <span className="font-semibold">Fault reported:</span>{' '}
                {submission.faultDescription || '(no description)'}
              </div>
            </div>
          )}

          {(submission.submitterName || submission.submitterPhone) && (
            <p className="mt-2 text-xs text-slate-500">
              From: {submission.submitterName || '—'}{' '}
              {submission.submitterPhone && `· ${submission.submitterPhone}`}
            </p>
          )}

          {review && <ChecklistPanel review={review} />}

          {report && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setReportMode('view')}
                className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-sm font-medium rounded"
              >
                View Report
              </button>
              <button
                type="button"
                onClick={() => setReportMode('print')}
                className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-sm font-medium rounded"
              >
                Print
              </button>
            </div>
          )}

          {tab !== 'pending' && (
            <div className="mt-2 text-xs text-slate-500">
              {tab === 'approved' && (
                <>
                  Approved
                  {submission.approvedHours !== undefined &&
                    submission.approvedHours !== submission.submittedHours &&
                    ` (corrected to ${submission.approvedHours.toLocaleString()} hrs)`}{' '}
                  by {submission.verifiedBy?.firstName} {submission.verifiedBy?.lastName}
                </>
              )}
              {tab === 'rejected' && (
                <>
                  Rejected by {submission.verifiedBy?.firstName} {submission.verifiedBy?.lastName} —{' '}
                  {submission.rejectionReason}
                </>
              )}
            </div>
          )}

          {tab === 'pending' && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {editing ? (
                <>
                  <input
                    type="number"
                    value={editHours}
                    min={machine?.machineHours ?? 0}
                    onChange={(e) => setEditHours(e.target.value)}
                    aria-label="Corrected hour reading"
                    className="w-32 px-3 py-1.5 border border-slate-300 rounded text-sm"
                  />
                  <span className="text-xs text-slate-500">
                    Submitted reading remains {submission.submittedHours.toLocaleString()} hrs
                  </span>
                  <button
                    onClick={() => {
                      const n = Number(editHours);
                      if (!Number.isFinite(n)) return;
                      onApprove(n);
                    }}
                    disabled={busy}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium rounded inline-flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve with corrected hours
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onApprove()}
                    disabled={busy}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium rounded inline-flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => setEditing(true)}
                    disabled={busy}
                    className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-sm font-medium rounded"
                  >
                    Edit hours
                  </button>
                  <button
                    onClick={onReject}
                    disabled={busy}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium rounded inline-flex items-center gap-1"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {report && reportMode && (
        <ChecklistReadingReport
          submissionId={submission._id}
          report={report}
          printOnOpen={reportMode === 'print'}
          onClose={() => setReportMode(null)}
        />
      )}
    </div>
  );
}

function ChecklistPanel({ review }: { review: ChecklistReview }) {
  const [open, setOpen] = useState(() => checklistDetailsStartOpen(review));
  return (
    <div className="mt-3 border border-slate-200 rounded-lg">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 rounded-lg"
      >
        <span className="font-semibold text-slate-800">Checklist</span>
        <span className="ml-2 text-slate-500">
          {review.notOkCount > 0 ? `${review.notOkCount} Not OK` : 'All OK'}
          {review.operatorName ? ` · ${review.operatorName}` : ''}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <ol className="space-y-2">
            {review.items.map((item, index) => (
              <li key={item.id} className="text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-800">
                    {index + 1}. {item.prompt}
                  </span>
                  <span
                    className={`shrink-0 font-semibold ${
                      item.answer === 'not-ok' ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {item.answer === 'not-ok' ? 'Not OK' : 'OK'}
                  </span>
                </div>
                {item.answer === 'not-ok' && item.explanation && (
                  <p className="mt-1 text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    {item.explanation}
                  </p>
                )}
              </li>
            ))}
          </ol>
          <p className="text-sm text-slate-700">
            <span className="font-semibold">Out of commission:</span>{' '}
            {review.outOfCommission ? 'Yes' : 'No'}
            {review.outOfCommission && review.outOfCommissionReason
              ? ` — ${review.outOfCommissionReason}`
              : ''}
          </p>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
  warn,
  icon,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-400 font-semibold flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p
        className={`font-semibold ${
          warn ? 'text-amber-700' : highlight ? 'text-blue-700' : 'text-slate-800'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function PhotoModal({
  submission,
  onClose,
}: {
  submission: MachineReadingSubmission;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-3xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={getMachineReadingPhotoUrl(submission._id)}
          alt="Hour meter reading"
          className="max-w-full max-h-[80vh] object-contain"
        />
        <div className="p-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 border border-slate-300 rounded text-sm hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default PendingMachineReadings;
