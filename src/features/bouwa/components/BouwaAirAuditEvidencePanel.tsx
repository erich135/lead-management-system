/**
 * BouwaAirAuditEvidencePanel
 *
 * Read-only internal screen listing Bouwa air-audit sessions and evidence file
 * metadata.
 *
 * IMPORTANT:
 * - Does NOT upload files.
 * - Does NOT create, edit or delete audit records or evidence file records.
 * - Does NOT expose customer-safe outputs (no PDF/export).
 * - Does NOT include save buttons or forms.
 * - Only accessible from the hidden /bouwa route (behind BouwaRouteGuard).
 * - If the backend feature flag or permissions are not yet enabled, a safe
 *   informational message is shown instead.
 *
 * Phase 4C-7: read-only list only.
 */

import { useState, useEffect } from 'react';
import { Wind, AlertTriangle, RefreshCw, FileSearch, ShieldAlert } from 'lucide-react';
import { listBouwaAuditSessions, listBouwaEvidenceFiles } from '../api/bouwaApi';
import type { BouwaAuditSession, BouwaEvidenceFile } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCESS_BLOCKED_MSG =
  'Air audit evidence data is not available yet. This may be because Bouwa ' +
  'permissions or feature flags are not enabled on this server.';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(value: unknown, unit?: string): string {
  if (value === undefined || value === null || value === '') return '—';
  const str = String(value);
  return unit ? `${str} ${unit}` : str;
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

function fmtBytes(bytes: number | undefined): string {
  if (bytes === undefined || bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtAuditMode(mode: string | undefined): string {
  if (!mode) return '—';
  const labels: Record<string, string> = {
    NONE: 'None',
    MANUAL_CAPTURE: 'Manual Capture',
    EXCEL_IMPORT: 'Excel Import',
    LOGGER_IMPORT: 'Logger Import',
    FULL_AIR_AUDIT: 'Full Air Audit',
  };
  return labels[mode] ?? mode;
}

function fmtStatus(status: string | undefined): string {
  if (!status) return '—';
  const labels: Record<string, string> = {
    draft: 'Draft',
    ready_for_internal_review: 'Ready for Review',
    blocked: 'Blocked',
    archived: 'Archived',
  };
  return labels[status] ?? status;
}

function statusBadgeClass(status: string | undefined): string {
  switch (status) {
    case 'ready_for_internal_review': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'blocked':                   return 'bg-red-50 text-red-700 border-red-200';
    case 'archived':                  return 'bg-slate-50 text-slate-500 border-slate-200';
    default:                          return 'bg-amber-50 text-amber-700 border-amber-200';
  }
}

function approvalBadgeClass(status: string | undefined): string {
  switch (status) {
    case 'approved_internal': return 'bg-green-50 text-green-700 border-green-200';
    case 'rejected':          return 'bg-red-50 text-red-700 border-red-200';
    case 'archived':          return 'bg-slate-50 text-slate-500 border-slate-200';
    case 'pending_review':    return 'bg-blue-50 text-blue-700 border-blue-200';
    default:                  return 'bg-amber-50 text-amber-700 border-amber-200';
  }
}

// ---------------------------------------------------------------------------
// Sub-components: generic states
// ---------------------------------------------------------------------------

function LoadingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-14 text-ars-body">
      <RefreshCw className="w-5 h-5 animate-spin text-ars-primary" />
      <span className="text-sm">Loading {label}…</span>
    </div>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-amber-900">
          {ACCESS_BLOCKED_MSG}
        </p>
        {message && (
          <p className="text-xs text-amber-700 font-mono mt-2 bg-amber-100 rounded px-2 py-1">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <FileSearch className="w-8 h-8 text-slate-300" />
      <p className="text-sm text-ars-body">No {label} found.</p>
      <p className="text-xs text-slate-400">
        Records will appear here once they are created via the Bouwa backend.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: single audit session card
// ---------------------------------------------------------------------------

function AuditSessionCard({ session }: { session: BouwaAuditSession }) {
  const summary = session.auditSummary;
  const conditions = session.siteConditions;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 text-sm">
      {/* Row 1: site name + status */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold text-ars-heading">
            {fmt(session.siteName ?? session.siteAddress)}
          </p>
          {(session.siteLocation ?? session.siteAddress) && (
            <p className="text-xs text-ars-body mt-0.5">
              {fmt(session.siteLocation ?? session.siteAddress)}
            </p>
          )}
          {session.customerName && (
            <p className="text-xs text-ars-body">Customer: {session.customerName}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(session.status)}`}
        >
          {fmtStatus(session.status)}
        </span>
      </div>

      {/* Row 2: mode + period */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
        <span className="text-ars-body">Mode</span>
        <span className="text-ars-heading font-medium">{fmtAuditMode(session.auditMode)}</span>

        <span className="text-ars-body">Period</span>
        <span className="text-ars-heading font-medium">
          {session.auditPeriodStart || session.auditPeriodEnd
            ? `${fmtDate(session.auditPeriodStart)} – ${fmtDate(session.auditPeriodEnd)}`
            : fmtDate(session.auditDate)}
        </span>
      </div>

      {/* Row 3: site conditions */}
      {conditions && (
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          <span className="text-ars-body col-span-2 font-medium text-ars-heading mb-0.5">
            Site Conditions
          </span>
          <span className="text-ars-body">Altitude</span>
          <span className="text-ars-heading font-medium">
            {fmt(conditions.altitude, conditions.altitudeUnit ?? 'MASL')}
          </span>
          <span className="text-ars-body">Ambient Temp</span>
          <span className="text-ars-heading font-medium">
            {fmt(conditions.ambientTemperature, '°C')}
          </span>
          <span className="text-ars-body">Operating Pressure</span>
          <span className="text-ars-heading font-medium">
            {fmt(conditions.operatingPressureBar, 'bar')}
          </span>
        </div>
      )}

      {/* Row 4: audit summary */}
      {summary && (
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          <span className="text-ars-body col-span-2 font-medium text-ars-heading mb-0.5">
            Audit Summary
          </span>
          <span className="text-ars-body">Measured Flow</span>
          <span className="text-ars-heading font-medium">
            {fmt(summary.measuredFlowM3Min, 'm³/min')}
          </span>
          <span className="text-ars-body">Measured Pressure</span>
          <span className="text-ars-heading font-medium">
            {fmt(summary.measuredPressureBar, 'bar')}
          </span>
          <span className="text-ars-body">Measured Power</span>
          <span className="text-ars-heading font-medium">
            {fmt(summary.measuredPowerKw, 'kW')}
          </span>
          <span className="text-ars-body">Load</span>
          <span className="text-ars-heading font-medium">
            {fmt(summary.loadPercentage, '%')}
          </span>
          {summary.notes && (
            <>
              <span className="text-ars-body">Notes</span>
              <span className="text-ars-heading font-medium">{summary.notes}</span>
            </>
          )}
        </div>
      )}

      {/* Row 5: blockers/warnings */}
      {session.blockers && session.blockers.length > 0 && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs">
          <p className="font-medium text-red-800 mb-1">Blockers</p>
          <ul className="list-disc list-inside space-y-0.5">
            {session.blockers.map((b, i) => (
              <li key={i} className="text-red-700">{b}</li>
            ))}
          </ul>
        </div>
      )}
      {session.warnings && session.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs">
          <p className="font-medium text-amber-800 mb-1">Warnings</p>
          <ul className="list-disc list-inside space-y-0.5">
            {session.warnings.map((w, i) => (
              <li key={i} className="text-amber-700">{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Row 6: notes + timestamps */}
      {session.notes && (
        <p className="text-xs text-ars-body italic border-t border-slate-100 pt-2">
          {session.notes}
        </p>
      )}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400 border-t border-slate-100 pt-2">
        <span>Created: {fmtDate(session.createdAt)}</span>
        <span>Updated: {fmtDate(session.updatedAt)}</span>
        <span className="font-mono opacity-60">{String(session._id)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: evidence file row
// ---------------------------------------------------------------------------

function EvidenceFileRow({ file }: { file: BouwaEvidenceFile }) {
  return (
    <tr className="border-b border-slate-100 last:border-0 text-xs hover:bg-slate-50">
      <td className="py-2.5 pr-4 font-medium text-ars-heading max-w-[160px] truncate">
        {fmt(file.fileName)}
      </td>
      <td className="py-2.5 pr-4 text-ars-body max-w-[120px] truncate">
        {fmt(file.originalFileName)}
      </td>
      <td className="py-2.5 pr-4 text-ars-body">{fmt(file.entityType)}</td>
      <td className="py-2.5 pr-4 text-ars-body">{fmt(file.mimeType)}</td>
      <td className="py-2.5 pr-4 text-ars-body">
        {fmtBytes(file.sizeBytes ?? file.fileSizeBytes)}
      </td>
      <td className="py-2.5 pr-4 text-ars-body">{fmt(file.storageProvider)}</td>
      <td className="py-2.5 pr-4">
        {file.approvalStatus ? (
          <span
            className={`rounded-md border px-1.5 py-0.5 text-xs font-medium ${approvalBadgeClass(file.approvalStatus)}`}
          >
            {file.approvalStatus}
          </span>
        ) : (
          <span className="text-ars-body">—</span>
        )}
      </td>
      <td className="py-2.5 text-ars-body">{fmtDate(file.uploadedAt ?? file.createdAt)}</td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main panel component
// ---------------------------------------------------------------------------

export function BouwaAirAuditEvidencePanel() {
  const [sessions, setSessions] = useState<BouwaAuditSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const [evidenceFiles, setEvidenceFiles] = useState<BouwaEvidenceFile[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(true);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  useEffect(() => {
    listBouwaAuditSessions({ limit: 100 })
      .then((data) => setSessions(data))
      .catch((err: unknown) => {
        const msg =
          err instanceof Error
            ? err.message
            : 'Bouwa audit session request failed.';
        setSessionsError(msg);
      })
      .finally(() => setSessionsLoading(false));

    listBouwaEvidenceFiles({ limit: 100 })
      .then((data) => setEvidenceFiles(data))
      .catch((err: unknown) => {
        const msg =
          err instanceof Error
            ? err.message
            : 'Bouwa evidence file request failed.';
        setEvidenceError(msg);
      })
      .finally(() => setEvidenceLoading(false));
  }, []);

  return (
    <section className="space-y-6">
      {/* Section header */}
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-teal-50 p-2.5 shrink-0">
          <Wind className="w-5 h-5 text-teal-700" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-ars-heading">
            Air Audit Evidence
          </h2>
          <p className="text-xs text-ars-body mt-0.5">
            Internal read-only view of audit sessions and evidence file metadata.
            No files are uploaded or downloaded from this screen.
          </p>
        </div>
      </div>

      {/* Internal-only banner */}
      <div className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-2.5 flex items-center gap-2 text-xs text-teal-800">
        <ShieldAlert className="w-4 h-4 text-teal-700 shrink-0" />
        <span className="font-medium">Internal admin view only.</span>
        <span>No customer-facing outputs are present on this screen.</span>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Audit Sessions                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-ars-heading">
          Audit Sessions
          {!sessionsLoading && !sessionsError && sessions.length > 0 && (
            <span className="ml-2 rounded-full bg-teal-100 text-teal-700 text-xs px-2 py-0.5 font-medium">
              {sessions.length}
            </span>
          )}
        </h3>

        {sessionsLoading && <LoadingRow label="audit sessions" />}
        {!sessionsLoading && sessionsError && <ErrorBlock message={sessionsError} />}
        {!sessionsLoading && !sessionsError && sessions.length === 0 && (
          <EmptyBlock label="audit sessions" />
        )}
        {!sessionsLoading && !sessionsError && sessions.length > 0 && (
          <div className="space-y-4">
            {sessions.map((session) => (
              <AuditSessionCard key={String(session._id)} session={session} />
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Evidence Files                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-ars-heading">
          Evidence Files
          {!evidenceLoading && !evidenceError && evidenceFiles.length > 0 && (
            <span className="ml-2 rounded-full bg-teal-100 text-teal-700 text-xs px-2 py-0.5 font-medium">
              {evidenceFiles.length}
            </span>
          )}
        </h3>

        {evidenceLoading && <LoadingRow label="evidence files" />}
        {!evidenceLoading && evidenceError && <ErrorBlock message={evidenceError} />}
        {!evidenceLoading && !evidenceError && evidenceFiles.length === 0 && (
          <EmptyBlock label="evidence files" />
        )}
        {!evidenceLoading && !evidenceError && evidenceFiles.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[720px] text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {[
                    'File Name',
                    'Original Name',
                    'Entity Type',
                    'MIME',
                    'Size',
                    'Storage',
                    'Approval',
                    'Uploaded',
                  ].map((h) => (
                    <th
                      key={h}
                      className="py-2.5 pr-4 text-left text-xs font-semibold text-ars-heading first:pl-4"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evidenceFiles.map((file) => (
                  <EvidenceFileRow key={String(file._id)} file={file} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
