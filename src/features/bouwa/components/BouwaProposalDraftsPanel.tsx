/**
 * BouwaProposalDraftsPanel
 *
 * Read-only internal screen listing Bouwa proposal drafts.
 *
 * IMPORTANT:
 * - Does NOT create, edit, archive, or export proposal drafts.
 * - Does NOT include save buttons, forms, or approval actions.
 * - Does NOT expose customer-safe outputs (no PDF/export).
 * - customerQuoteSafe is displayed as read-only status only — never set in payloads.
 * - Only accessible from the hidden /bouwa route (behind BouwaRouteGuard).
 * - If the backend feature flag or permissions are not yet enabled, a safe
 *   informational message is shown instead.
 *
 * Phase 4C-8: read-only list only.
 */

import { useState, useEffect } from 'react';
import { FileText, AlertTriangle, RefreshCw, FileSearch, ShieldAlert } from 'lucide-react';
import { listBouwaProposalDrafts } from '../api/bouwaApi';
import type { BouwaProposalDraft } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCESS_BLOCKED_MSG =
  'Proposal draft data is not available yet. This may be because Bouwa ' +
  'Bouwa access requires an active Super Admin account.';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  return String(value);
}

function fmtDate(value: unknown): string {
  if (!value) return '—';
  try {
    return new Date(String(value)).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(value);
  }
}

function statusBadgeClass(status: string | undefined): string {
  switch (status) {
    case 'approved_internal':
    case 'internal_review':    return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'customer_blocked':   return 'bg-red-50 text-red-700 border-red-200';
    case 'archived':           return 'bg-slate-50 text-slate-500 border-slate-200';
    case 'exported':           return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'customer_ready':     return 'bg-green-50 text-green-700 border-green-200';
    default:                   return 'bg-amber-50 text-amber-700 border-amber-200';
  }
}

function fmtStatus(status: string | undefined): string {
  if (!status) return '—';
  const labels: Record<string, string> = {
    draft: 'Draft',
    internal_review: 'Internal Review',
    in_review: 'In Review',
    approved_internal: 'Approved (Internal)',
    customer_blocked: 'Customer Blocked',
    customer_ready: 'Customer Ready',
    exported: 'Exported',
    archived: 'Archived',
  };
  return labels[status] ?? status;
}

function fmtProposalMode(mode: string | undefined): string {
  if (!mode) return '—';
  const labels: Record<string, string> = {
    SPECIFICATION: 'Specification-Based',
    AIR_AUDIT: 'Air Audit-Based',
  };
  return labels[mode] ?? mode;
}

// ---------------------------------------------------------------------------
// Sub-components: generic states
// ---------------------------------------------------------------------------

function LoadingRow() {
  return (
    <div className="flex items-center justify-center gap-3 py-14 text-ars-body">
      <RefreshCw className="w-5 h-5 animate-spin text-ars-primary" />
      <span className="text-sm">Loading proposal drafts…</span>
    </div>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-amber-900">{ACCESS_BLOCKED_MSG}</p>
        {message && (
          <p className="text-xs text-amber-700 font-mono mt-2 bg-amber-100 rounded px-2 py-1">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyBlock() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <FileSearch className="w-8 h-8 text-slate-300" />
      <p className="text-sm text-ars-body">No proposal drafts found.</p>
      <p className="text-xs text-slate-400">
        Records will appear here once they are created via the Bouwa backend.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: single proposal draft card
// ---------------------------------------------------------------------------

function ProposalDraftCard({ draft }: { draft: BouwaProposalDraft }) {
  const readiness = draft.readinessSummary;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 text-sm">
      {/* Row 1: proposal number + status */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold text-ars-heading">
            {fmt(draft.proposalNumber ?? draft.title ?? draft._id)}
          </p>
          {draft.customerName && (
            <p className="text-xs text-ars-body mt-0.5">Customer: {draft.customerName}</p>
          )}
          {(draft.customerId ?? draft.customer) && (
            <p className="text-xs text-slate-400 font-mono">
              Customer ID: {fmt(draft.customerId ?? draft.customer)}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={`rounded-md border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(draft.status)}`}
          >
            {fmtStatus(draft.status)}
          </span>
          {/* customerQuoteSafe — read-only display only */}
          {draft.customerQuoteSafe !== undefined && (
            <span
              className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
                draft.customerQuoteSafe
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}
            >
              {draft.customerQuoteSafe ? 'Customer Safe' : 'Not Customer Safe'}
            </span>
          )}
        </div>
      </div>

      {/* Row 2: mode + proposal number */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
        <span className="text-ars-body">Proposal Mode</span>
        <span className="text-ars-heading font-medium">{fmtProposalMode(draft.proposalMode)}</span>

        {draft.proposalNumber && (
          <>
            <span className="text-ars-body">Proposal #</span>
            <span className="text-ars-heading font-medium">{draft.proposalNumber}</span>
          </>
        )}

        {draft.totalSavingsKwh !== undefined && (
          <>
            <span className="text-ars-body">Savings (kWh)</span>
            <span className="text-ars-heading font-medium">{fmt(draft.totalSavingsKwh)}</span>
          </>
        )}

        {draft.totalSavingsRand !== undefined && (
          <>
            <span className="text-ars-body">Savings (R)</span>
            <span className="text-ars-heading font-medium">R {fmt(draft.totalSavingsRand)}</span>
          </>
        )}

        {draft.paybackPeriodMonths !== undefined && (
          <>
            <span className="text-ars-body">Payback</span>
            <span className="text-ars-heading font-medium">{fmt(draft.paybackPeriodMonths)} months</span>
          </>
        )}
      </div>

      {/* Readiness summary */}
      {readiness && (
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 space-y-1 text-xs">
          <p className="font-medium text-ars-heading mb-0.5">Readiness Summary</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
            <span className="text-ars-body">Internal Calc</span>
            <span className={readiness.readyForInternalCalculation ? 'text-green-700 font-medium' : 'text-red-600'}>
              {readiness.readyForInternalCalculation ? 'Ready' : 'Not Ready'}
            </span>
            <span className="text-ars-body">Blockers</span>
            <span className="text-ars-heading font-medium">{readiness.totalBlockers ?? 0}</span>
            <span className="text-ars-body">Warnings</span>
            <span className="text-ars-heading font-medium">{readiness.totalWarnings ?? 0}</span>
          </div>
          {readiness.blockerKeys && readiness.blockerKeys.length > 0 && (
            <div className="rounded border border-red-100 bg-red-50 px-2 py-1 mt-1">
              <p className="font-medium text-red-800 mb-0.5">Blockers</p>
              <ul className="list-disc list-inside space-y-0.5">
                {readiness.blockerKeys.map((k, i) => (
                  <li key={i} className="text-red-700">{k}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Blockers / warnings on draft itself */}
      {draft.blockers && draft.blockers.length > 0 && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs">
          <p className="font-medium text-red-800 mb-1">Blockers</p>
          <ul className="list-disc list-inside space-y-0.5">
            {draft.blockers.map((b, i) => (
              <li key={i} className="text-red-700">{b}</li>
            ))}
          </ul>
        </div>
      )}
      {draft.warnings && draft.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs">
          <p className="font-medium text-amber-800 mb-1">Warnings</p>
          <ul className="list-disc list-inside space-y-0.5">
            {draft.warnings.map((w, i) => (
              <li key={i} className="text-amber-700">{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes + timestamps */}
      {draft.notes && (
        <p className="text-xs text-ars-body italic border-t border-slate-100 pt-2">{draft.notes}</p>
      )}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400 border-t border-slate-100 pt-2">
        <span>Created: {fmtDate(draft.createdAt)}</span>
        <span>Updated: {fmtDate(draft.updatedAt)}</span>
        <span className="font-mono opacity-60">{String(draft._id)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel component
// ---------------------------------------------------------------------------

export function BouwaProposalDraftsPanel() {
  const [drafts, setDrafts] = useState<BouwaProposalDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBouwaProposalDrafts({ limit: 100 })
      .then((data) => setDrafts(data))
      .catch((err: unknown) => {
        const msg =
          err instanceof Error
            ? err.message
            : 'Bouwa proposal draft request failed.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <FileText className="w-5 h-5 text-ars-primary shrink-0" />
        <div>
          <h2 className="text-base font-semibold text-ars-heading">Proposal Drafts</h2>
          <p className="text-xs text-ars-body mt-0.5">
            Internal working copies of energy-saving proposals. Read-only.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>Internal only</span>
        </div>
      </div>

      {/* Content */}
      {loading && <LoadingRow />}
      {!loading && error && <ErrorBlock message={error} />}
      {!loading && !error && drafts.length === 0 && <EmptyBlock />}
      {!loading && !error && drafts.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-ars-body">
            Showing {drafts.length} draft{drafts.length !== 1 ? 's' : ''}.
          </p>
          {drafts.map((d) => (
            <ProposalDraftCard key={String(d._id)} draft={d} />
          ))}
        </div>
      )}
    </section>
  );
}
