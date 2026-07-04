/**
 * BouwaFormulaApprovalsPanel
 *
 * Read-only internal screen listing Bouwa formula approval records.
 *
 * IMPORTANT:
 * - Does NOT create, edit, approve, or reject formula approval records.
 * - Does NOT include save buttons, forms, or approve/reject actions.
 * - customerQuoteSafe and VERIFIED_CUSTOMER_SAFE are displayed as read-only
 *   status only — never set in payloads.
 * - Only accessible from the hidden /bouwa route (behind BouwaRouteGuard).
 * - If the backend feature flag or permissions are not yet enabled, a safe
 *   informational message is shown instead.
 *
 * Phase 4C-8: read-only list only.
 */

import { useState, useEffect } from 'react';
import { ClipboardCheck, AlertTriangle, RefreshCw, FileSearch, ShieldAlert } from 'lucide-react';
import { listBouwaFormulaApprovals } from '../api/bouwaApi';
import type { BouwaFormulaApproval } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCESS_BLOCKED_MSG =
  'Formula approval data is not available yet. This may be because Bouwa ' +
  'permissions or feature flags are not enabled.';

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

function currentStatusBadgeClass(status: string | undefined): string {
  switch (status) {
    case 'VERIFIED_INTERNAL_ONLY':    return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'VERIFIED_CUSTOMER_SAFE':    return 'bg-green-50 text-green-700 border-green-200';
    case 'REJECTED':                  return 'bg-red-50 text-red-700 border-red-200';
    case 'NEEDS_MANUAL_CONFIRMATION': return 'bg-amber-50 text-amber-700 border-amber-200';
    default:                          return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

function fmtCurrentStatus(status: string | undefined): string {
  if (!status) return '—';
  const labels: Record<string, string> = {
    EXTRACTED_FROM_WORKBOOK:   'Extracted from Workbook',
    NEEDS_MANUAL_CONFIRMATION: 'Needs Manual Confirmation',
    VERIFIED_INTERNAL_ONLY:    'Verified (Internal Only)',
    VERIFIED_CUSTOMER_SAFE:    'Verified (Customer Safe)',
    REJECTED:                  'Rejected',
    // Legacy aliases
    pending:           'Pending',
    under_review:      'Under Review',
    approved_internal: 'Approved (Internal)',
    rejected:          'Rejected',
    archived:          'Archived',
  };
  return labels[status] ?? status;
}

// ---------------------------------------------------------------------------
// Sub-components: generic states
// ---------------------------------------------------------------------------

function LoadingRow() {
  return (
    <div className="flex items-center justify-center gap-3 py-14 text-ars-body">
      <RefreshCw className="w-5 h-5 animate-spin text-ars-primary" />
      <span className="text-sm">Loading formula approvals…</span>
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
      <p className="text-sm text-ars-body">No formula approval records found.</p>
      <p className="text-xs text-slate-400">
        Records will appear here once they are created via the Bouwa backend.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: single formula approval card
// ---------------------------------------------------------------------------

function FormulaApprovalCard({ record }: { record: BouwaFormulaApproval }) {
  const displayKey = record.calculationKey ?? record.formulaKey;
  const displayStatus = record.currentStatus ?? record.status;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 text-sm">
      {/* Row 1: key + status */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold text-ars-heading font-mono">{fmt(displayKey)}</p>
          {record.formulaName && (
            <p className="text-xs text-ars-body mt-0.5">{record.formulaName}</p>
          )}
          {record.description && (
            <p className="text-xs text-ars-body">{record.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={`rounded-md border px-2 py-0.5 text-xs font-medium ${currentStatusBadgeClass(displayStatus)}`}
          >
            {fmtCurrentStatus(displayStatus)}
          </span>
          {/* customerQuoteSafe — read-only display only */}
          {record.customerQuoteSafe !== undefined && (
            <span
              className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
                record.customerQuoteSafe
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}
            >
              {record.customerQuoteSafe ? 'Customer Safe' : 'Not Customer Safe'}
            </span>
          )}
        </div>
      </div>

      {/* Row 2: source fields */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
        {record.sourceWorkbook && (
          <>
            <span className="text-ars-body">Workbook</span>
            <span className="text-ars-heading font-medium">{record.sourceWorkbook}</span>
          </>
        )}
        {record.sourceSheet && (
          <>
            <span className="text-ars-body">Sheet</span>
            <span className="text-ars-heading font-medium">{record.sourceSheet}</span>
          </>
        )}
        {record.sourceCell && (
          <>
            <span className="text-ars-body">Cell</span>
            <span className="text-ars-heading font-mono font-medium">{record.sourceCell}</span>
          </>
        )}
        {(record.formulaVersion ?? record.version) && (
          <>
            <span className="text-ars-body">Version</span>
            <span className="text-ars-heading font-medium">{fmt(record.formulaVersion ?? record.version)}</span>
          </>
        )}
        {record.approvedBy && (
          <>
            <span className="text-ars-body">Approved By</span>
            <span className="text-ars-heading font-mono font-medium">{fmt(record.approvedBy)}</span>
          </>
        )}
        {record.approvedAt && (
          <>
            <span className="text-ars-body">Approved At</span>
            <span className="text-ars-heading font-medium">{fmtDate(record.approvedAt)}</span>
          </>
        )}
      </div>

      {/* Formula text */}
      {record.formulaText && (
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-xs">
          <p className="font-medium text-ars-heading mb-1">Formula</p>
          <code className="block text-ars-body font-mono whitespace-pre-wrap break-all">
            {record.formulaText}
          </code>
        </div>
      )}

      {/* Rejection reason */}
      {record.rejectionReason && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs">
          <p className="font-medium text-red-800 mb-0.5">Rejection Reason</p>
          <p className="text-red-700">{record.rejectionReason}</p>
        </div>
      )}

      {/* Approval notes */}
      {record.approvalNotes && (
        <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs">
          <p className="font-medium text-blue-800 mb-0.5">Approval Notes</p>
          <p className="text-blue-700">{record.approvalNotes}</p>
        </div>
      )}

      {/* Blockers / warnings */}
      {record.blockers && record.blockers.length > 0 && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs">
          <p className="font-medium text-red-800 mb-1">Blockers</p>
          <ul className="list-disc list-inside space-y-0.5">
            {record.blockers.map((b, i) => (
              <li key={i} className="text-red-700">{b}</li>
            ))}
          </ul>
        </div>
      )}
      {record.warnings && record.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs">
          <p className="font-medium text-amber-800 mb-1">Warnings</p>
          <ul className="list-disc list-inside space-y-0.5">
            {record.warnings.map((w, i) => (
              <li key={i} className="text-amber-700">{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Test case references */}
      {record.testCaseReferences && record.testCaseReferences.length > 0 && (
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-xs">
          <p className="font-medium text-ars-heading mb-0.5">Test Case References</p>
          <ul className="list-disc list-inside space-y-0.5">
            {record.testCaseReferences.map((r, i) => (
              <li key={i} className="text-ars-body font-mono">{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes + timestamps */}
      {record.notes && (
        <p className="text-xs text-ars-body italic border-t border-slate-100 pt-2">{record.notes}</p>
      )}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400 border-t border-slate-100 pt-2">
        <span>Created: {fmtDate(record.createdAt)}</span>
        <span>Updated: {fmtDate(record.updatedAt)}</span>
        <span className="font-mono opacity-60">{String(record._id)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel component
// ---------------------------------------------------------------------------

export function BouwaFormulaApprovalsPanel() {
  const [records, setRecords] = useState<BouwaFormulaApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBouwaFormulaApprovals({ limit: 100 })
      .then((data) => setRecords(data))
      .catch((err: unknown) => {
        const msg =
          err instanceof Error
            ? err.message
            : 'Bouwa formula approval request failed.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <ClipboardCheck className="w-5 h-5 text-ars-primary shrink-0" />
        <div>
          <h2 className="text-base font-semibold text-ars-heading">Formula Approvals</h2>
          <p className="text-xs text-ars-body mt-0.5">
            Formulas extracted from the Bouwa workbook pending internal review. Read-only.
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
      {!loading && !error && records.length === 0 && <EmptyBlock />}
      {!loading && !error && records.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-ars-body">
            Showing {records.length} formula record{records.length !== 1 ? 's' : ''}.
          </p>
          {records.map((r) => (
            <FormulaApprovalCard key={String(r._id)} record={r} />
          ))}
        </div>
      )}
    </section>
  );
}
