/**
 * BouwaAssumptionsPanel
 *
 * Read-only internal screen listing Bouwa assumption records.
 *
 * IMPORTANT:
 * - Does NOT create, edit, approve, or archive assumption records.
 * - Does NOT include save buttons, forms, or approval actions.
 * - Only accessible from the hidden /bouwa route (behind BouwaRouteGuard).
 * - If the backend feature flag or permissions are not yet enabled, a safe
 *   informational message is shown instead.
 *
 * Phase 4C-8: read-only list only.
 */

import { useState, useEffect } from 'react';
import { BookOpen, AlertTriangle, RefreshCw, FileSearch, ShieldAlert } from 'lucide-react';
import { listBouwaAssumptions } from '../api/bouwaApi';
import type { BouwaAssumption } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCESS_BLOCKED_MSG =
  'Assumption data is not available yet. This may be because Bouwa ' +
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

function approvalStatusBadgeClass(status: string | undefined): string {
  switch (status) {
    case 'approved_internal': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'approved_customer': return 'bg-green-50 text-green-700 border-green-200';
    case 'rejected':          return 'bg-red-50 text-red-700 border-red-200';
    case 'archived':          return 'bg-slate-50 text-slate-500 border-slate-200';
    case 'pending_review':    return 'bg-amber-50 text-amber-700 border-amber-200';
    default:                  return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

function confidenceBadgeClass(confidence: string | undefined): string {
  switch (confidence) {
    case 'HIGH':    return 'bg-green-50 text-green-700 border-green-200';
    case 'MEDIUM':  return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'LOW':     return 'bg-red-50 text-red-700 border-red-200';
    default:        return 'bg-slate-50 text-slate-500 border-slate-200';
  }
}

// ---------------------------------------------------------------------------
// Sub-components: generic states
// ---------------------------------------------------------------------------

function LoadingRow() {
  return (
    <div className="flex items-center justify-center gap-3 py-14 text-ars-body">
      <RefreshCw className="w-5 h-5 animate-spin text-ars-primary" />
      <span className="text-sm">Loading assumptions…</span>
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
      <p className="text-sm text-ars-body">No assumption records found.</p>
      <p className="text-xs text-slate-400">
        Records will appear here once they are created via the Bouwa backend.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: single assumption card
// ---------------------------------------------------------------------------

function AssumptionCard({ assumption }: { assumption: BouwaAssumption }) {
  const displayKey = assumption.key;
  const displayLabel = assumption.label;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 text-sm">
      {/* Row 1: key/label + status badges */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold text-ars-heading font-mono">{fmt(displayKey)}</p>
          {displayLabel && (
            <p className="text-sm text-ars-heading mt-0.5">{displayLabel}</p>
          )}
          {assumption.description && (
            <p className="text-xs text-ars-body mt-0.5">{assumption.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {assumption.approvalStatus && (
            <span
              className={`rounded-md border px-2 py-0.5 text-xs font-medium ${approvalStatusBadgeClass(assumption.approvalStatus)}`}
            >
              {assumption.approvalStatus}
            </span>
          )}
          {assumption.confidence && (
            <span
              className={`rounded-md border px-2 py-0.5 text-xs font-medium ${confidenceBadgeClass(assumption.confidence)}`}
            >
              {assumption.confidence} confidence
            </span>
          )}
          {assumption.scope && (
            <span className="rounded-md border px-2 py-0.5 text-xs font-medium bg-slate-50 text-slate-600 border-slate-200">
              {assumption.scope}
            </span>
          )}
        </div>
      </div>

      {/* Row 2: value + unit + metadata */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
        {assumption.value !== undefined && assumption.value !== null && (
          <>
            <span className="text-ars-body">Value</span>
            <span className="text-ars-heading font-medium font-mono">
              {fmt(assumption.value)}{assumption.unit ? ` ${assumption.unit}` : ''}
            </span>
          </>
        )}
        {assumption.unit && !assumption.value && (
          <>
            <span className="text-ars-body">Unit</span>
            <span className="text-ars-heading font-medium">{assumption.unit}</span>
          </>
        )}
        {assumption.appliesTo && (
          <>
            <span className="text-ars-body">Applies To</span>
            <span className="text-ars-heading font-medium">{assumption.appliesTo}</span>
          </>
        )}
        {assumption.sourceType && (
          <>
            <span className="text-ars-body">Source Type</span>
            <span className="text-ars-heading font-medium">{assumption.sourceType}</span>
          </>
        )}
        {assumption.sourceReference && (
          <>
            <span className="text-ars-body">Source Reference</span>
            <span className="text-ars-heading font-medium">{assumption.sourceReference}</span>
          </>
        )}
        {assumption.approvedBy && (
          <>
            <span className="text-ars-body">Approved By</span>
            <span className="text-ars-heading font-mono font-medium">{fmt(assumption.approvedBy)}</span>
          </>
        )}
        {assumption.approvedAt && (
          <>
            <span className="text-ars-body">Approved At</span>
            <span className="text-ars-heading font-medium">{fmtDate(assumption.approvedAt)}</span>
          </>
        )}
        {assumption.validFrom && (
          <>
            <span className="text-ars-body">Valid From</span>
            <span className="text-ars-heading font-medium">{fmtDate(assumption.validFrom)}</span>
          </>
        )}
        {assumption.validTo && (
          <>
            <span className="text-ars-body">Valid To</span>
            <span className="text-ars-heading font-medium">{fmtDate(assumption.validTo)}</span>
          </>
        )}
      </div>

      {/* Notes + timestamps */}
      {assumption.notes && (
        <p className="text-xs text-ars-body italic border-t border-slate-100 pt-2">{assumption.notes}</p>
      )}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400 border-t border-slate-100 pt-2">
        <span>Created: {fmtDate(assumption.createdAt)}</span>
        <span>Updated: {fmtDate(assumption.updatedAt)}</span>
        <span className="font-mono opacity-60">{String(assumption._id)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel component
// ---------------------------------------------------------------------------

export function BouwaAssumptionsPanel() {
  const [assumptions, setAssumptions] = useState<BouwaAssumption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBouwaAssumptions({ limit: 100 })
      .then((data) => setAssumptions(data))
      .catch((err: unknown) => {
        const msg =
          err instanceof Error
            ? err.message
            : 'Bouwa assumption request failed.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <BookOpen className="w-5 h-5 text-ars-primary shrink-0" />
        <div>
          <h2 className="text-base font-semibold text-ars-heading">Assumptions</h2>
          <p className="text-xs text-ars-body mt-0.5">
            Global and proposal-specific assumptions used in Bouwa calculations. Read-only.
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
      {!loading && !error && assumptions.length === 0 && <EmptyBlock />}
      {!loading && !error && assumptions.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-ars-body">
            Showing {assumptions.length} assumption{assumptions.length !== 1 ? 's' : ''}.
          </p>
          {assumptions.map((a) => (
            <AssumptionCard key={String(a._id)} assumption={a} />
          ))}
        </div>
      )}
    </section>
  );
}
