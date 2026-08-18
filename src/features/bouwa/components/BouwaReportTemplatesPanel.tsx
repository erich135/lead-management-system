/**
 * BouwaReportTemplatesPanel
 *
 * Read-only internal screen listing Bouwa report templates.
 *
 * IMPORTANT:
 * - Does NOT create, edit, save, or export report templates.
 * - Does NOT include save buttons, forms, or approval actions.
 * - customerQuoteSafe is displayed as read-only status only — never set in payloads.
 * - Customer proposal export is intentionally disabled.
 * - Only accessible from the hidden /bouwa route (behind BouwaRouteGuard).
 * - If the backend feature flag or permissions are not yet enabled, a safe
 *   informational message is shown instead.
 *
 * Phase 4C-8: read-only list only.
 */

import { useState, useEffect } from 'react';
import { LayoutTemplate, AlertTriangle, RefreshCw, FileSearch, ShieldAlert } from 'lucide-react';
import { listBouwaReportTemplates } from '../api/bouwaApi';
import type { BouwaReportTemplate, BouwaReportSection } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCESS_BLOCKED_MSG =
  'Report template data is not available yet. This may be because Bouwa ' +
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

function fmtTemplateType(type: string | undefined): string {
  if (!type) return '—';
  const labels: Record<string, string> = {
    CUSTOMER_PROPOSAL:         'Customer Proposal',
    INTERNAL_CALCULATION_PACK: 'Internal Calculation Pack',
    AUDIT_REPORT:              'Audit Report',
    OTHER:                     'Other',
  };
  return labels[type] ?? type;
}

// ---------------------------------------------------------------------------
// Sub-components: generic states
// ---------------------------------------------------------------------------

function LoadingRow() {
  return (
    <div className="flex items-center justify-center gap-3 py-14 text-ars-body">
      <RefreshCw className="w-5 h-5 animate-spin text-ars-primary" />
      <span className="text-sm">Loading report templates…</span>
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
      <p className="text-sm text-ars-body">No report templates found.</p>
      <p className="text-xs text-slate-400">
        Records will appear here once they are created via the Bouwa backend.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: sections table
// ---------------------------------------------------------------------------

function SectionsTable({ sections }: { sections: BouwaReportSection[] }) {
  if (!sections || sections.length === 0) return null;

  return (
    <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-xs">
      <p className="font-medium text-ars-heading mb-2">
        Sections ({sections.length})
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-ars-body">
              <th className="text-left py-1.5 pr-3 font-medium">Key</th>
              <th className="text-left py-1.5 pr-3 font-medium">Title</th>
              <th className="text-left py-1.5 pr-3 font-medium">Order</th>
              <th className="text-left py-1.5 pr-3 font-medium">Required</th>
              <th className="text-left py-1.5 font-medium">Customer Visible</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((s, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-white">
                <td className="py-1.5 pr-3 font-mono text-ars-heading">{fmt(s.sectionKey)}</td>
                <td className="py-1.5 pr-3 text-ars-body">{fmt(s.title)}</td>
                <td className="py-1.5 pr-3 text-ars-body">{fmt(s.order)}</td>
                <td className="py-1.5 pr-3">
                  <span className={s.isRequired ? 'text-amber-700 font-medium' : 'text-slate-400'}>
                    {s.isRequired ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="py-1.5">
                  {/* Customer visibility is read-only display only */}
                  <span className={s.isCustomerVisible ? 'text-green-700 font-medium' : 'text-slate-400'}>
                    {s.isCustomerVisible ? 'Yes' : 'No'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: single report template card
// ---------------------------------------------------------------------------

function ReportTemplateCard({ template }: { template: BouwaReportTemplate }) {
  const displayName = template.templateName ?? template.name;
  const displayApprovalStatus = template.approvalStatus ?? template.status;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 text-sm">
      {/* Row 1: name + status badges */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold text-ars-heading">{fmt(displayName)}</p>
          {template.templateType && (
            <p className="text-xs text-ars-body mt-0.5">
              {fmtTemplateType(template.templateType)}
            </p>
          )}
          {template.description && (
            <p className="text-xs text-ars-body mt-0.5">{template.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {displayApprovalStatus && (
            <span
              className={`rounded-md border px-2 py-0.5 text-xs font-medium ${approvalStatusBadgeClass(displayApprovalStatus)}`}
            >
              {displayApprovalStatus}
            </span>
          )}
          {/* customerQuoteSafe — read-only display only */}
          {template.customerQuoteSafe !== undefined && (
            <span
              className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
                template.customerQuoteSafe
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}
            >
              {template.customerQuoteSafe ? 'Customer Safe' : 'Not Customer Safe'}
            </span>
          )}
        </div>
      </div>

      {/* Row 2: metadata */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
        {template.version && (
          <>
            <span className="text-ars-body">Version</span>
            <span className="text-ars-heading font-medium">{template.version}</span>
          </>
        )}
        {template.approvedBy && (
          <>
            <span className="text-ars-body">Approved By</span>
            <span className="text-ars-heading font-mono font-medium">{fmt(template.approvedBy)}</span>
          </>
        )}
        {template.approvedAt && (
          <>
            <span className="text-ars-body">Approved At</span>
            <span className="text-ars-heading font-medium">{fmtDate(template.approvedAt)}</span>
          </>
        )}
        {template.createdBy && (
          <>
            <span className="text-ars-body">Created By</span>
            <span className="text-ars-heading font-mono font-medium">{fmt(template.createdBy)}</span>
          </>
        )}
        {template.updatedBy && (
          <>
            <span className="text-ars-body">Updated By</span>
            <span className="text-ars-heading font-mono font-medium">{fmt(template.updatedBy)}</span>
          </>
        )}
      </div>

      {/* Sections table */}
      {template.sections && template.sections.length > 0 && (
        <SectionsTable sections={template.sections} />
      )}

      {/* Notes + timestamps */}
      {template.notes && (
        <p className="text-xs text-ars-body italic border-t border-slate-100 pt-2">{template.notes}</p>
      )}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400 border-t border-slate-100 pt-2">
        <span>Created: {fmtDate(template.createdAt)}</span>
        <span>Updated: {fmtDate(template.updatedAt)}</span>
        <span className="font-mono opacity-60">{String(template._id)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel component
// ---------------------------------------------------------------------------

export function BouwaReportTemplatesPanel() {
  const [templates, setTemplates] = useState<BouwaReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBouwaReportTemplates({ limit: 100 })
      .then((data) => setTemplates(data))
      .catch((err: unknown) => {
        const msg =
          err instanceof Error
            ? err.message
            : 'Bouwa report template request failed.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <LayoutTemplate className="w-5 h-5 text-ars-primary shrink-0" />
        <div>
          <h2 className="text-base font-semibold text-ars-heading">Report Templates</h2>
          <p className="text-xs text-ars-body mt-0.5">
            Internal and customer-facing report template definitions. Read-only.
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
      {!loading && !error && templates.length === 0 && <EmptyBlock />}
      {!loading && !error && templates.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-ars-body">
            Showing {templates.length} template{templates.length !== 1 ? 's' : ''}.
          </p>
          {templates.map((t) => (
            <ReportTemplateCard key={String(t._id)} template={t} />
          ))}
        </div>
      )}
    </section>
  );
}
