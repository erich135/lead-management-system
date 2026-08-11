import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  listSalesRequests,
  type SalesRequest,
  type SalesRequestStatus,
} from '../lib/api';
import {
  SALES_REQUEST_PERMISSIONS,
  SALES_REQUEST_STATUS_LABELS,
  SALES_REQUEST_TYPE_LABELS,
} from '../constants/salesRequestPermissions';
import SalesRequestWorkspace from './SalesRequestWorkspace';
import SalesRequestReviewModal from './SalesRequestReviewModal';
import {
  EmptyState,
  FloatingActionButton,
  PageHeader,
  StatusBadge,
  type StatusBadgeTone,
  SurfaceCard,
} from './ui';

type StatusFilter = 'all' | SalesRequestStatus;

interface SalesRequestsTabProps {
  refreshKey?: number;
}

const STATUS_SIDEBAR_ITEMS: Array<{
  id: StatusFilter;
  label: string;
  description: string;
  tone: StatusBadgeTone;
}> = [
  {
    id: 'all',
    label: 'All',
    description: 'Every request',
    tone: 'neutral',
  },
  {
    id: 'draft',
    label: SALES_REQUEST_STATUS_LABELS.draft,
    description: 'Still being filled in',
    tone: 'draft',
  },
  {
    id: 'pending',
    label: SALES_REQUEST_STATUS_LABELS.pending,
    description: 'Waiting for admin',
    tone: 'pending',
  },
  {
    id: 'approved',
    label: SALES_REQUEST_STATUS_LABELS.approved,
    description: 'Approved — job created',
    tone: 'approved',
  },
  {
    id: 'declined',
    label: SALES_REQUEST_STATUS_LABELS.declined,
    description: 'Returned to the rep',
    tone: 'declined',
  },
];

/**
 * Sales Requests list with a clear left-side status filter for Pending and related states.
 */
const SalesRequestsTab: React.FC<SalesRequestsTabProps> = ({ refreshKey = 0 }) => {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canCreate = hasPermission(SALES_REQUEST_PERMISSIONS.CREATE);
  const canRead = hasPermission(SALES_REQUEST_PERMISSIONS.READ);
  const canReviewPending =
    isSuperAdmin || hasPermission(SALES_REQUEST_PERMISSIONS.REVIEW);

  const [requests, setRequests] = useState<SalesRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    canReviewPending ? 'pending' : 'all',
  );
  const [statusCounts, setStatusCounts] = useState<Record<StatusFilter, number>>({
    all: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    declined: 0,
  });
  const [workspaceRequestId, setWorkspaceRequestId] = useState<string | undefined>();
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [reviewRequestId, setReviewRequestId] = useState<string | undefined>();
  const [search, setSearch] = useState('');

  /**
   * Loads counts for the side status filters.
   */
  const loadStatusCounts = useCallback(async () => {
    if (!canRead) return;

    try {
      const statuses: SalesRequestStatus[] = [
        'draft',
        'pending',
        'approved',
        'declined',
      ];
      const results = await Promise.all(
        statuses.map((status) =>
          listSalesRequests({ status, limit: 1 }).then((result) => ({
            status,
            total: result.pagination?.total || 0,
          })),
        ),
      );

      const next: Record<StatusFilter, number> = {
        all: 0,
        draft: 0,
        pending: 0,
        approved: 0,
        declined: 0,
      };
      for (const item of results) {
        next[item.status] = item.total;
        next.all += item.total;
      }
      setStatusCounts(next);
    } catch {
      // Counts are non-critical — keep previous values.
    }
  }, [canRead]);

  /**
   * Loads sales requests from the API for the current filter.
   */
  const loadRequests = useCallback(async () => {
    if (!canRead) return;

    setLoading(true);
    setError(null);
    try {
      const { requests: items } = await listSalesRequests({
        status: statusFilter === 'all' ? undefined : statusFilter,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        limit: 100,
      });
      setRequests(items);
    } catch (loadError: unknown) {
      const message =
        loadError instanceof Error ? loadError.message : 'Failed to load requests';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [canRead, statusFilter]);

  useEffect(() => {
    void loadRequests();
    void loadStatusCounts();
  }, [loadRequests, loadStatusCounts, refreshKey]);

  /**
   * Handles a successful rep submit: shows confirmation and reloads the list.
   */
  function handleSubmitted(request: SalesRequest): void {
    setSuccessMessage(
      `Request ${request.requestNumber} submitted successfully. Status is now Pending Approval.`,
    );
    setShowNewWorkspace(false);
    setWorkspaceRequestId(undefined);
    setStatusFilter('pending');
    void loadRequests();
    void loadStatusCounts();
  }

  /**
   * Handles admin Approve / Reject: closes modal, shows status, refreshes list.
   */
  function handleReviewComplete(payload: {
    request: SalesRequest;
    job?: { _id: string; jobNumber?: string };
  }): void {
    const request = payload.request;
    const label = SALES_REQUEST_STATUS_LABELS[request.status] || request.status;
    if (payload.job?.jobNumber) {
      setSuccessMessage(
        `Request ${request.requestNumber} is now ${label}. Job ${payload.job.jobNumber} was created automatically and is available in Jobs.`,
      );
    } else {
      setSuccessMessage(`Request ${request.requestNumber} is now ${label}.`);
    }
    setReviewRequestId(undefined);
    void loadRequests();
    void loadStatusCounts();
  }

  /**
   * Opens the correct editor/reviewer for a list row.
   */
  function handleRowClick(item: SalesRequest): void {
    setSuccessMessage(null);

    if (item.status === 'draft' || item.status === 'declined') {
      setWorkspaceRequestId(item._id);
      return;
    }

    if (item.status === 'pending' && canReviewPending) {
      setReviewRequestId(item._id);
      return;
    }

    if (item.status === 'pending' || item.status === 'approved') {
      setReviewRequestId(item._id);
    }
  }

  /**
   * Returns whether a list row should look clickable.
   */
  function isRowClickable(item: SalesRequest): boolean {
    if (item.status === 'draft' || item.status === 'declined') return true;
    return item.status === 'pending' || item.status === 'approved';
  }

  /**
   * Formats a date string for the request list.
   */
  function formatDate(value?: string): string {
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
   * Maps request status to design-system badge tone.
   */
  function statusTone(status: SalesRequestStatus): StatusBadgeTone {
    switch (status) {
      case 'draft':
        return 'draft';
      case 'pending':
        return 'pending';
      case 'approved':
        return 'approved';
      case 'declined':
        return 'declined';
      default:
        return 'neutral';
    }
  }

  /**
   * Client-side search over the already-loaded request list.
   */
  const visibleRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((item) => {
      const haystack = [
        item.requestNumber,
        item.customerCompanyName,
        item.customerContactPerson,
        SALES_REQUEST_TYPE_LABELS[item.requestType],
        SALES_REQUEST_STATUS_LABELS[item.status],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [requests, search]);

  if (!canRead) {
    return (
      <div className="p-6">
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-900">Permission required</p>
            <p className="text-sm text-amber-800">
              You need the <code className="rounded bg-amber-100 px-1">sales_requests.read</code>{' '}
              permission to view requests.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const activeSidebarLabel =
    STATUS_SIDEBAR_ITEMS.find((item) => item.id === statusFilter)?.label || 'Requests';

  return (
    <div className="relative flex h-full flex-col">
      <div className="crm-glass sticky top-0 z-10 border-b border-line px-4 py-4 sm:px-6">
        <PageHeader
          title="Sales Requests"
          subtitle={
            canReviewPending
              ? 'Use the status list on the left. Pending Approval needs review.'
              : 'Use the status list on the left to find Draft, Pending Approval, Approved, or Rejected.'
          }
          className="!mb-3"
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void loadRequests();
                  void loadStatusCounts();
                }}
                disabled={loading}
                className="crm-btn-secondary !px-3"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              {canCreate && (
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMessage(null);
                    setShowNewWorkspace(true);
                  }}
                  className="crm-btn-primary hidden !bg-accent !text-ink hover:!brightness-95 sm:inline-flex"
                >
                  <Plus className="h-4 w-4" />
                  New request
                </button>
              )}
            </div>
          }
        />

        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by number, customer, or type..."
            className="crm-input !pl-10"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Status filters — clear on the side */}
        <aside className="shrink-0 border-b border-line bg-white md:w-56 md:border-b-0 md:border-r md:overflow-y-auto">
          <div className="px-3 py-3">
            <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wide text-ink-subtle">
              Status
            </p>
            <nav className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-1 md:overflow-visible md:pb-0">
              {STATUS_SIDEBAR_ITEMS.map((item) => {
                const active = statusFilter === item.id;
                const count = statusCounts[item.id] || 0;
                const idleStyles =
                  item.id === 'pending'
                    ? 'border border-amber-300 bg-amber-50 text-amber-950'
                    : item.id === 'declined'
                      ? 'border border-rose-300 bg-rose-50 text-rose-950'
                      : item.id === 'approved'
                        ? 'border border-emerald-300 bg-emerald-50 text-emerald-950'
                        : item.id === 'draft'
                          ? 'border border-slate-300 bg-slate-50 text-slate-900'
                          : 'border border-slate-200 bg-white text-slate-900';
                const activeStyles =
                  item.id === 'pending'
                    ? 'border border-amber-600 bg-amber-500 text-white shadow-sm'
                    : item.id === 'declined'
                      ? 'border border-rose-700 bg-rose-600 text-white shadow-sm'
                      : item.id === 'approved'
                        ? 'border border-emerald-700 bg-emerald-600 text-white shadow-sm'
                        : item.id === 'draft'
                          ? 'border border-slate-600 bg-slate-700 text-white shadow-sm'
                          : 'border border-slate-500 bg-slate-800 text-white shadow-sm';
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSuccessMessage(null);
                      setStatusFilter(item.id);
                    }}
                    className={`flex min-w-[9.5rem] items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition md:min-w-0 ${
                      active ? activeStyles : idleStyles
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">{item.label}</span>
                      <span
                        className={`mt-0.5 hidden text-[11px] md:block ${
                          active ? 'text-white/85' : 'opacity-80'
                        }`}
                      >
                        {item.description}
                      </span>
                    </span>
                    <span
                      className={`inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                        active
                          ? 'bg-white/25 text-white'
                          : item.id === 'pending'
                            ? 'bg-amber-500 text-white'
                            : item.id === 'declined'
                              ? 'bg-rose-600 text-white'
                              : item.id === 'approved'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-700 text-white'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-ink">{activeSidebarLabel}</h3>
            {statusFilter === 'pending' && statusCounts.pending > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                {statusCounts.pending} waiting for approval
              </span>
            )}
          </div>

          {successMessage && (
            <div className="mb-4 flex items-start gap-2 rounded-crm border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 animate-crm-fade-up">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">{successMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-700 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-crm border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
            </div>
          ) : visibleRequests.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={`No ${activeSidebarLabel.toLowerCase()} requests`}
              description={
                statusFilter === 'pending'
                  ? 'New submissions waiting for approval will appear here.'
                  : canCreate
                    ? 'Tap New request to start your first submission.'
                    : 'No requests match this filter.'
              }
              action={
                canCreate ? (
                  <button
                    type="button"
                    onClick={() => setShowNewWorkspace(true)}
                    className="crm-btn-primary"
                  >
                    <Plus className="h-4 w-4" />
                    New request
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {visibleRequests.map((item) => {
                const clickable = isRowClickable(item);
                return (
                  <SurfaceCard
                    key={item._id}
                    as="button"
                    interactive={clickable}
                    padding="md"
                    onClick={() => {
                      if (clickable) handleRowClick(item);
                    }}
                    className={`w-full text-left ${clickable ? '' : 'cursor-default opacity-95'}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-ink">{item.requestNumber}</p>
                        <p className="text-sm text-ink-muted">
                          {SALES_REQUEST_TYPE_LABELS[item.requestType]}
                        </p>
                      </div>
                      <StatusBadge
                        label={SALES_REQUEST_STATUS_LABELS[item.status]}
                        tone={statusTone(item.status)}
                      />
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                      {item.customerCompanyName && (
                        <span className="font-medium text-ink">{item.customerCompanyName}</span>
                      )}
                      {item.submittedAt ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Submitted {formatDate(item.submittedAt)}
                        </span>
                      ) : (
                        <span>Updated {formatDate(item.updatedAt)}</span>
                      )}
                    </div>
                    {item.status === 'pending' && canReviewPending && (
                      <p className="mt-2 text-xs font-medium text-amber-800">
                        Tap to open, edit, Approve or Reject
                      </p>
                    )}
                    {item.status === 'pending' && !canReviewPending && (
                      <p className="mt-2 text-xs font-medium text-ink-muted">
                        Tap to view your submission and download attachments.
                      </p>
                    )}
                    {item.status === 'approved' && !canReviewPending && (
                      <p className="mt-2 text-xs text-ink-subtle">
                        Tap to view approved submission and download attachments.
                      </p>
                    )}
                    {item.status === 'declined' && (
                      <p className="mt-2 text-xs font-medium text-rose-700">
                        Rejected — tap to correct and submit again
                      </p>
                    )}
                  </SurfaceCard>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {canCreate && (
        <FloatingActionButton
          label="New request"
          onClick={() => {
            setSuccessMessage(null);
            setShowNewWorkspace(true);
          }}
          className="sm:hidden"
        />
      )}

      {showNewWorkspace && (
        <SalesRequestWorkspace
          onClose={() => {
            setShowNewWorkspace(false);
            void loadRequests();
            void loadStatusCounts();
          }}
          onSaved={() => {
            void loadRequests();
            void loadStatusCounts();
          }}
          onSubmitted={handleSubmitted}
        />
      )}

      {workspaceRequestId && (
        <SalesRequestWorkspace
          requestId={workspaceRequestId}
          onClose={() => {
            setWorkspaceRequestId(undefined);
            void loadRequests();
            void loadStatusCounts();
          }}
          onSaved={() => {
            void loadRequests();
            void loadStatusCounts();
          }}
          onSubmitted={handleSubmitted}
        />
      )}

      {reviewRequestId && (
        <SalesRequestReviewModal
          requestId={reviewRequestId}
          canDecide={canReviewPending}
          onClose={() => setReviewRequestId(undefined)}
          onDecisionComplete={handleReviewComplete}
        />
      )}
    </div>
  );
};

export default SalesRequestsTab;
