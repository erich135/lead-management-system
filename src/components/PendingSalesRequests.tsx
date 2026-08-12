import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  Eye,
  FileText,
  History,
  Loader2,
  Paperclip,
  Pencil,
  RefreshCw,
  Search,
  Settings2,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  listSalesRequests,
  getSalesRequest,
  type SalesRequest,
  type SalesRequestStatus,
  type Job,
} from '../lib/api';
import {
  SALES_REQUEST_PERMISSIONS,
  SALES_REQUEST_TYPE_LABELS,
} from '../constants/salesRequestPermissions';
import SalesRequestReviewModal from './SalesRequestReviewModal';
import SalesRequestAttachmentsSheet from './SalesRequestAttachmentsSheet';
import PlannerFormEditorModal from './diary/PlannerFormEditorModal';
import { EmptyState } from './ui';
import {
  resolveAttachmentDownloadAction,
  triggerFileDownload,
  downloadStoredAttachment,
  collectRequestDownloadUrls,
} from '../utils/repApprovalsDownload';

type AdminQueueTab = 'pending' | 'history' | 'rep_diaries';
type StatusFilter = 'all' | SalesRequestStatus;

/** Display labels for the Rep Approvals page (UI only). */
const REP_APPROVAL_STATUS_LABELS: Record<string, string> = {
  pending: 'Waiting Review',
  approved: 'Approved',
  declined: 'Rejected',
  draft: 'Draft',
};

interface PendingSalesRequestsProps {
  /**
   * Phase 3: when a request is approved, a new Job is created.
   * Provide a callback to open/redirect the UI to that job.
   */
  onJobCreated?: (job: { _id: string; jobNumber: string } | Job) => void;
}

interface QueueStats {
  pendingReviews: number;
  approvedToday: number;
  rejected: number;
  totalRequests: number;
}

/**
 * Extracts a readable error message from API / unknown thrown values.
 */
function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

/**
 * Resolves a populated user reference to a display name.
 */
function userName(
  user?: string | { firstName?: string; lastName?: string; email?: string },
): string {
  if (!user) return '—';
  if (typeof user === 'string') return user;
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return full || user.email || '—';
}

/**
 * Formats a date for display on approval cards.
 */
function formatSubmittedDate(value?: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Returns true when a timestamp falls on the current local calendar day.
 */
function isToday(value?: string): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/**
 * Resolves the rep name shown on an approval card.
 */
function repDisplayName(item: SalesRequest): string {
  return userName(item.submittedBy || item.createdBy);
}

/**
 * Resolves the request title line (type + customer).
 */
function requestTitle(item: SalesRequest): string {
  const type = SALES_REQUEST_TYPE_LABELS[item.requestType] || item.requestType;
  const customer = item.customerCompanyName?.trim();
  return customer ? `${type} · ${customer}` : type;
}

/**
 * Returns Tailwind classes for the enterprise status pill on approval cards.
 */
function statusPillClasses(status: SalesRequestStatus): string {
  switch (status) {
    case 'pending':
      return 'rep-approval-waiting-badge bg-amber-500 text-white ring-2 ring-amber-300/70 shadow-sm shadow-amber-500/25';
    case 'approved':
      return 'bg-emerald-600 text-white ring-1 ring-emerald-700/25';
    case 'declined':
      return 'bg-rose-600 text-white ring-1 ring-rose-800/25';
    default:
      return 'bg-slate-500 text-white ring-1 ring-slate-600/25';
  }
}

/**
 * Formats the attachment count line shown on each approval card.
 */
function attachmentCountLabel(item: SalesRequest): string {
  const count = item.attachmentCount ?? item.attachments?.length ?? 0;
  if (count <= 0) return 'No attachments';
  return `${count} attachment${count === 1 ? '' : 's'}`;
}

/**
 * Rep Approvals queue — premium CRM layout for super admin / reviewers.
 * Functionality unchanged: same API loads, same review modal, same approve/reject flow.
 */
export function PendingSalesRequests({ onJobCreated }: PendingSalesRequestsProps) {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canViewQueue =
    isSuperAdmin || hasPermission(SALES_REQUEST_PERMISSIONS.REVIEW);
  const canDecide =
    isSuperAdmin || hasPermission(SALES_REQUEST_PERMISSIONS.REVIEW);

  const [tab, setTab] = useState<AdminQueueTab>('pending');
  const [requests, setRequests] = useState<SalesRequest[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    pendingReviews: 0,
    approvedToday: 0,
    rejected: 0,
    totalRequests: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);
  const [attachmentsRequest, setAttachmentsRequest] = useState<SalesRequest | null>(null);
  const [attachmentNotice, setAttachmentNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showFormEditor, setShowFormEditor] = useState(false);

  /**
   * Loads headline statistics without altering the main queue fetch behaviour.
   */
  const loadStats = useCallback(async () => {
    if (!canViewQueue) return;
    try {
      const [pendingRes, approvedRes, declinedRes] = await Promise.all([
        listSalesRequests({ status: 'pending', limit: 1 }),
        listSalesRequests({ status: 'approved', limit: 100, sortBy: 'updatedAt', sortOrder: 'desc' }),
        listSalesRequests({ status: 'declined', limit: 1 }),
      ]);
      const approvedToday = approvedRes.requests.filter((row) =>
        isToday(row.approvedAt || row.reviewedAt || row.updatedAt),
      ).length;
      setStats({
        pendingReviews: pendingRes.pagination?.total ?? pendingRes.requests.length,
        approvedToday,
        rejected: declinedRes.pagination?.total ?? declinedRes.requests.length,
        totalRequests:
          (pendingRes.pagination?.total ?? 0) +
          (approvedRes.pagination?.total ?? 0) +
          (declinedRes.pagination?.total ?? 0),
      });
    } catch {
      // Stats are decorative — queue still works if this fails.
    }
  }, [canViewQueue]);

  /**
   * Loads sales requests for the selected queue tab.
   */
  const loadQueue = useCallback(async () => {
    if (!canViewQueue) return;
    if (tab === 'rep_diaries') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (tab === 'history') {
        const [approved, declined] = await Promise.all([
          listSalesRequests({
            status: 'approved',
            sortBy: 'updatedAt',
            sortOrder: 'desc',
            limit: 100,
          }),
          listSalesRequests({
            status: 'declined',
            sortBy: 'updatedAt',
            sortOrder: 'desc',
            limit: 100,
          }),
        ]);
        const merged = [...approved.requests, ...declined.requests].sort((left, right) => {
          const leftTime = new Date(
            left.approvedAt ||
              left.declinedAt ||
              left.reviewedAt ||
              left.updatedAt ||
              left.submittedAt ||
              0,
          ).getTime();
          const rightTime = new Date(
            right.approvedAt ||
              right.declinedAt ||
              right.reviewedAt ||
              right.updatedAt ||
              right.submittedAt ||
              0,
          ).getTime();
          return rightTime - leftTime;
        });
        setRequests(merged);
        return;
      }

      const { requests: items } = await listSalesRequests({
        status: 'pending',
        sortBy: 'submittedAt',
        sortOrder: 'asc',
        limit: 100,
      });
      setRequests(items);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, 'Failed to load requests'));
    } finally {
      setLoading(false);
    }
  }, [canViewQueue, tab]);

  useEffect(() => {
    void loadQueue();
    void loadStats();
  }, [loadQueue, loadStats]);

  useEffect(() => {
    setStatusFilter('all');
    setSearchQuery('');
  }, [tab]);

  /**
   * Handles Approve / Decline completion: close modal, show message, refresh list.
   */
  function handleDecisionComplete(payload: {
    request: SalesRequest;
    job?: Job;
  }): void {
    const { request, job } = payload;
    const label = REP_APPROVAL_STATUS_LABELS[request.status] || request.status;
    if (job?.jobNumber) {
      setSuccessMessage(
        `Request ${request.requestNumber} is now ${label}. Job ${job.jobNumber} was created — opening it now.`,
      );
    } else {
      setSuccessMessage(`Request ${request.requestNumber} is now ${label}.`);
    }
    setReviewRequestId(null);
    void loadQueue();
    void loadStats();

    if (job && onJobCreated) {
      onJobCreated(job);
    }
  }

  /**
   * Opens the existing full review modal for a request.
   */
  function openReview(requestId: string): void {
    setSuccessMessage(null);
    setReviewRequestId(requestId);
  }

  /**
   * Downloads attachments for a request without opening the review modal.
   */
  async function handleDownload(event: React.MouseEvent, item: SalesRequest): Promise<void> {
    event.stopPropagation();
    setAttachmentNotice(null);

    let request = item;
    const listedFiles = collectRequestDownloadUrls(item);
    if (
      listedFiles.length === 0 &&
      ((item.attachmentCount ?? 0) > 0 || (item.attachments?.length ?? 0) > 0)
    ) {
      try {
        request = await getSalesRequest(item._id);
      } catch {
        setAttachmentNotice('Unable to load attachments for this request.');
        return;
      }
    }

    const action = resolveAttachmentDownloadAction(request);

    if (action.kind === 'empty') {
      setAttachmentNotice('No attachments uploaded by the representative.');
      return;
    }

    if (action.kind === 'single') {
      if (action.file.url.startsWith('data:')) {
        triggerFileDownload(action.file.url, action.file.filename);
      } else {
        await downloadStoredAttachment(action.file);
      }
      return;
    }

    setAttachmentsRequest(request);
  }

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return requests.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!query) return true;
      const haystack = [
        item.requestNumber,
        item.customerCompanyName,
        item.customerContactPerson,
        SALES_REQUEST_TYPE_LABELS[item.requestType],
        repDisplayName(item),
        REP_APPROVAL_STATUS_LABELS[item.status],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [requests, searchQuery, statusFilter]);

  const sidebarItems = [
    {
      id: 'pending' as AdminQueueTab,
      label: 'Rep Approvals',
      hint: 'Waiting for review',
      icon: ClipboardList,
    },
    {
      id: 'history' as AdminQueueTab,
      label: 'Approval History',
      hint: 'Approved & rejected',
      icon: History,
    },
    {
      id: 'rep_diaries' as AdminQueueTab,
      label: 'Rep Diaries',
      hint: 'Forms & diary tools',
      icon: BookOpen,
    },
  ];

  if (!canViewQueue) {
    return (
      <div className="p-6">
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-900">Permission required</p>
            <p className="text-sm text-amber-800">
              Permission to review sales requests is required to open Rep Approvals.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rep-approvals-page flex min-h-full flex-col bg-slate-50/80">
      <style>{`
        @keyframes repApprovalFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes repApprovalWaitingPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.35); }
          50% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
        }
        .rep-approval-card-enter {
          animation: repApprovalFadeIn 0.35s ease-out forwards;
        }
        .rep-approval-waiting-badge {
          animation: repApprovalWaitingPulse 2.4s ease-in-out infinite;
        }
      `}</style>

      {/* Page header */}
      <div className="border-b border-slate-200/80 bg-white px-4 py-4 sm:px-8 sm:py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0969a9]">
              Sales · Admin
            </p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[1.75rem]">
              Rep Approvals
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-snug text-slate-600">
              {tab === 'pending'
                ? 'Review rep submissions, download attachments, and approve or reject.'
                : tab === 'history'
                  ? 'Browse approved and rejected submissions for audit and reference.'
                  : 'Manage rep diary forms used on appointments (Super Admin).'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void loadQueue();
              void loadStats();
            }}
            disabled={loading || tab === 'rep_diaries'}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col gap-0 lg:flex-row lg:gap-6 lg:p-6">
        {/* Sidebar */}
        <aside className="shrink-0 border-b border-slate-200 bg-white p-4 lg:w-60 lg:rounded-2xl lg:border lg:shadow-sm">
          <p className="mb-3 px-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Navigation
          </p>
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-2 lg:overflow-visible lg:pb-0">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSuccessMessage(null);
                    setTab(item.id);
                  }}
                  className={`flex min-w-[10rem] items-start gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-200 lg:min-w-0 ${
                    active
                      ? 'bg-[#0969a9] text-white shadow-md shadow-[#0969a9]/20'
                      : 'border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${active ? 'text-white' : 'text-[#0969a9]'}`} />
                  <span>
                    <span className="block text-sm font-bold">{item.label}</span>
                    <span
                      className={`mt-0.5 block text-[11px] ${
                        active ? 'text-white/80' : 'text-slate-500'
                      }`}
                    >
                      {item.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-white lg:shadow-sm">
          <div className="flex-1 overflow-auto p-4 sm:p-6">
            {tab === 'rep_diaries' ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                  <div className="flex items-start gap-3">
                    <span className="rounded-xl bg-white p-2 text-[#0969a9] shadow-sm">
                      <BookOpen className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-extrabold text-slate-900">Rep Diaries</h2>
                      <p className="mt-1 text-sm text-slate-600">
                        Edit the forms reps use when they start RFC, Loan Rental, or New Service
                        Level appointments.
                      </p>
                    </div>
                  </div>
                </div>

                {isSuperAdmin ? (
                  <button
                    type="button"
                    onClick={() => setShowFormEditor(true)}
                    className="flex w-full items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-[#0969a9] hover:shadow-md"
                  >
                    <span className="rounded-xl bg-[#0969a9]/10 p-3 text-[#0969a9]">
                      <Settings2 className="h-6 w-6" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-extrabold text-slate-900">
                        Form Editor
                      </span>
                      <span className="mt-1 block text-sm text-slate-600">
                        Open RFC, Loan Rental, and New Service Level. Save draft or publish for
                        reps.
                      </span>
                      <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#0969a9]/10 px-2.5 py-1 text-xs font-bold text-[#0969a9]">
                        <Pencil className="h-3.5 w-3.5" />
                        Open Form Editor
                      </span>
                    </span>
                  </button>
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Only Super Admin can open the Form Editor.
                  </div>
                )}
              </div>
            ) : (
              <>
            {/* Summary cards */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  label: 'Pending Reviews',
                  value: stats.pendingReviews,
                  accent: 'border-amber-200 bg-amber-50 text-amber-900',
                  dot: 'bg-amber-500',
                },
                {
                  label: 'Approved Today',
                  value: stats.approvedToday,
                  accent: 'border-emerald-200 bg-emerald-50 text-emerald-900',
                  dot: 'bg-emerald-500',
                },
                {
                  label: 'Rejected',
                  value: stats.rejected,
                  accent: 'border-rose-200 bg-rose-50 text-rose-900',
                  dot: 'bg-rose-500',
                },
                {
                  label: 'Total Requests',
                  value: stats.totalRequests,
                  accent: 'border-slate-200 bg-slate-50 text-slate-900',
                  dot: 'bg-[#0969a9]',
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className={`rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${card.accent}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${card.dot}`} />
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                      {card.label}
                    </p>
                  </div>
                  <p className="mt-2 text-3xl font-bold tabular-nums">{card.value}</p>
                </div>
              ))}
            </div>

            {/* Search + filter */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search requests…"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm transition focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
                aria-label="Filter by status"
              >
                <option value="all">All</option>
                {tab === 'pending' ? (
                  <option value="pending">Pending</option>
                ) : (
                  <>
                    <option value="approved">Approved</option>
                    <option value="declined">Rejected</option>
                  </>
                )}
              </select>
            </div>

            {successMessage && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="flex-1 font-medium">{successMessage}</p>
                <button
                  type="button"
                  onClick={() => setSuccessMessage(null)}
                  className="font-semibold text-emerald-700 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="flex-1">{error}</p>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="font-semibold text-red-700 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {attachmentNotice && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="flex-1">{attachmentNotice}</p>
                <button
                  type="button"
                  onClick={() => setAttachmentNotice(null)}
                  className="font-semibold text-slate-600 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-9 w-9 animate-spin text-[#0969a9]" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <EmptyState
                icon={FileText}
                title={tab === 'pending' ? 'No rep approvals waiting' : 'No approval history yet'}
                description={
                  tab === 'pending'
                    ? 'New submissions from sales reps will appear here.'
                    : 'Approved and rejected requests will appear here for reference.'
                }
              />
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((item, index) => {
                  const isPendingItem = item.status === 'pending';
                  const showDecisionActions = canDecide && tab === 'pending' && isPendingItem;
                  return (
                    <article
                      key={item._id}
                      className="rep-approval-card-enter group rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md sm:px-5 sm:py-4"
                      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[1.65rem]">
                              {item.requestNumber}
                            </h2>
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusPillClasses(item.status)}`}
                            >
                              {REP_APPROVAL_STATUS_LABELS[item.status] || item.status}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-medium leading-snug text-slate-700">
                            {requestTitle(item)}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-600">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="font-semibold text-slate-500">Rep:</span>
                              <span className="font-medium text-slate-800">{repDisplayName(item)}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              {formatSubmittedDate(
                                tab === 'pending'
                                  ? item.submittedAt
                                  : item.approvedAt ||
                                      item.declinedAt ||
                                      item.reviewedAt ||
                                      item.submittedAt,
                              )}
                            </span>
                            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                              <Paperclip className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                              {attachmentCountLabel(item)}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                          <button
                            type="button"
                            onClick={(event) => {
                              void handleDownload(event, item);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0969a9] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#085a91] active:scale-[0.98]"
                            title="Download attachment"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </button>
                          <button
                            type="button"
                            onClick={() => openReview(item._id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#0969a9]/35 bg-[#0969a9]/8 px-3.5 py-2 text-xs font-semibold text-[#0969a9] shadow-sm transition hover:border-[#0969a9]/55 hover:bg-[#0969a9]/15 active:scale-[0.98]"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                          {showDecisionActions && (
                            <>
                              <button
                                type="button"
                                onClick={() => openReview(item._id)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => openReview(item._id)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 active:scale-[0.98]"
                              >
                                <XCircle className="h-4 w-4" />
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
              </>
            )}
          </div>
        </div>
      </div>

      {reviewRequestId && (
        <SalesRequestReviewModal
          requestId={reviewRequestId}
          canDecide={canDecide && tab === 'pending'}
          onClose={() => setReviewRequestId(null)}
          onDecisionComplete={handleDecisionComplete}
        />
      )}

      <SalesRequestAttachmentsSheet
        request={attachmentsRequest}
        open={Boolean(attachmentsRequest)}
        onClose={() => setAttachmentsRequest(null)}
      />

      {isSuperAdmin ? (
        <PlannerFormEditorModal
          isOpen={showFormEditor}
          onClose={() => setShowFormEditor(false)}
        />
      ) : null}
    </div>
  );
}

export default PendingSalesRequests;
