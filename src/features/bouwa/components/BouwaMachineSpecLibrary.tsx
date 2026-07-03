/**
 * BouwaMachineSpecLibrary
 *
 * Read-only internal screen for browsing the Bouwa compressor specification library.
 *
 * IMPORTANT:
 * - Does NOT create, edit or delete specs.
 * - Does NOT expose customer-safe outputs.
 * - Does NOT include PDF/export functionality.
 * - Only accessible from the hidden /bouwa route (behind BouwaRouteGuard).
 * - If the backend feature flag or permissions are not yet enabled, the API
 *   call will fail and a safe informational message is shown instead.
 *
 * Phase 4C-5: read-only list only.
 */

import { useState, useEffect } from 'react';
import { Cpu, AlertTriangle, Info, RefreshCw, ShieldAlert } from 'lucide-react';
import { listBouwaMachineSpecs } from '../api/bouwaApi';
import type { BouwaMachineSpec } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(value: unknown, unit?: string): string {
  if (value === undefined || value === null || value === '') return '—';
  const str = String(value);
  return unit ? `${str} ${unit}` : str;
}

function fmtNumber(value: unknown, decimals = 1, unit?: string): string {
  if (value === undefined || value === null) return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  const str = n.toFixed(decimals);
  return unit ? `${str} ${unit}` : str;
}

function fmtDate(value: unknown): string {
  if (!value) return '—';
  try {
    return new Date(String(value)).toLocaleDateString('en-ZA', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return String(value);
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  BOUWA: 'Bouwa',
  COMPETITOR: 'Competitor',
  EXISTING_REFERENCE: 'Existing / Reference',
};

const SPEED_LABELS: Record<string, string> = {
  FIXED_SPEED: 'Fixed Speed',
  VSD: 'VSD',
  VARIABLE_SPEED: 'Variable Speed',
  UNKNOWN: 'Unknown',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ars-body">
      <RefreshCw className="w-5 h-5 animate-spin text-ars-primary" />
      <span className="text-sm">Loading machine specifications…</span>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-amber-900">
          Machine specification data is not available yet.
        </p>
        <p className="text-sm text-amber-800">
          This may be because Bouwa permissions or the Bouwa feature flag are not yet enabled on
          this server. Once enabled, this list will populate automatically.
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ars-body">
      <Cpu className="w-10 h-10 text-slate-300" />
      <p className="text-sm font-medium text-slate-500">No machine specifications found.</p>
      <p className="text-xs text-slate-400 max-w-xs text-center">
        Machine specs will appear here once they have been entered via the internal admin process.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BouwaMachineSpecLibrary() {
  const [specs, setSpecs] = useState<BouwaMachineSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSpecs() {
      try {
        setLoading(true);
        setError(null);
        const data = await listBouwaMachineSpecs({ limit: 100 });
        if (!cancelled) {
          // listBouwaMachineSpecs may return an array or a wrapped object
          const list = Array.isArray(data) ? data : [];
          setSpecs(list);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchSpecs();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-ars-primary shrink-0" />
          <h2 className="text-base font-semibold text-ars-heading">
            Machine Specification Library
          </h2>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs text-slate-600 font-medium">
          <ShieldAlert className="w-3 h-3" />
          Internal only
        </span>
      </div>

      {/* Internal notice */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800">
          This library is internal-only. Specifications are used as the basis for energy and savings
          calculations. No customer-facing data is shown here and no changes can be made from this
          screen.
        </p>
      </div>

      {/* Content area */}
      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && specs.length === 0 && <EmptyState />}
      {!loading && !error && specs.length > 0 && (
        <SpecTable specs={specs} />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Spec table
// ---------------------------------------------------------------------------

function SpecTable({ specs }: { specs: BouwaMachineSpec[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
        <span className="text-xs text-ars-body">
          Showing <span className="font-medium text-ars-heading">{specs.length}</span> specification
          {specs.length !== 1 ? 's' : ''}
        </span>
        <span className="text-xs text-slate-400 italic">Read-only</span>
      </div>

      {/* Responsive scroll wrapper */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3 whitespace-nowrap">Manufacturer / Brand</th>
              <th className="px-4 py-3 whitespace-nowrap">Model</th>
              <th className="px-4 py-3 whitespace-nowrap">Category</th>
              <th className="px-4 py-3 whitespace-nowrap">Type / Drive</th>
              <th className="px-4 py-3 whitespace-nowrap text-right">Pressure (bar)</th>
              <th className="px-4 py-3 whitespace-nowrap text-right">Flow (m³/min)</th>
              <th className="px-4 py-3 whitespace-nowrap text-right">Power (kW)</th>
              <th className="px-4 py-3 whitespace-nowrap text-right">Confidence</th>
              <th className="px-4 py-3 whitespace-nowrap">Status</th>
              <th className="px-4 py-3 whitespace-nowrap">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {specs.map((spec) => (
              <SpecRow key={spec._id} spec={spec} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SpecRow({ spec }: { spec: BouwaMachineSpec }) {
  const displayName = [spec.manufacturer, spec.brand].filter(Boolean).join(' / ') || '—';
  const model = spec.modelName || '—';
  const category = spec.specCategory ? (CATEGORY_LABELS[spec.specCategory] ?? spec.specCategory) : '—';
  const typeAndDrive = [
    spec.compressorType,
    spec.speedControl ? SPEED_LABELS[spec.speedControl] ?? spec.speedControl : undefined,
  ].filter(Boolean).join(' · ') || '—';

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 font-medium text-ars-heading whitespace-nowrap">{displayName}</td>
      <td className="px-4 py-3 text-ars-body whitespace-nowrap">{model}</td>
      <td className="px-4 py-3">
        <CategoryBadge category={spec.specCategory} />
      </td>
      <td className="px-4 py-3 text-ars-body whitespace-nowrap">{typeAndDrive}</td>
      <td className="px-4 py-3 text-right text-ars-body tabular-nums">
        {fmtNumber(spec.ratedPressureBar, 1)}
      </td>
      <td className="px-4 py-3 text-right text-ars-body tabular-nums">
        {fmtNumber(spec.ratedCapacityM3Min, 2)}
      </td>
      <td className="px-4 py-3 text-right text-ars-body tabular-nums">
        {fmtNumber(spec.packageInputKw ?? spec.motorKw, 1)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        <ConfidenceBadge value={spec.sourceConfidence} />
      </td>
      <td className="px-4 py-3">
        <ApprovalBadge status={spec.approvalStatus} />
      </td>
      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
        {fmtDate(spec.updatedAt ?? spec.createdAt)}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Badge sub-components
// ---------------------------------------------------------------------------

function CategoryBadge({ category }: { category?: string }) {
  if (!category) return <span className="text-slate-400">—</span>;
  const colours: Record<string, string> = {
    BOUWA: 'bg-ars-primary/10 text-ars-primary border-ars-primary/20',
    COMPETITOR: 'bg-orange-50 text-orange-700 border-orange-200',
    EXISTING_REFERENCE: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  const cls = colours[category] ?? 'bg-slate-100 text-slate-600 border-slate-200';
  const label = CATEGORY_LABELS[category] ?? category;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

function ApprovalBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-slate-400 text-xs">—</span>;
  const colours: Record<string, string> = {
    draft:             'bg-slate-100 text-slate-600 border-slate-200',
    pending_review:    'bg-yellow-50 text-yellow-700 border-yellow-200',
    approved_internal: 'bg-green-50 text-green-700 border-green-200',
    rejected:          'bg-red-50 text-red-700 border-red-200',
    archived:          'bg-slate-100 text-slate-500 border-slate-200',
  };
  // 'approved_customer' rendered as internal-only notice, never acted upon
  const cls = colours[status] ?? 'bg-slate-100 text-slate-500 border-slate-200';
  const label = status.replace(/_/g, ' ');
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${cls}`}>
      {label}
    </span>
  );
}

function ConfidenceBadge({ value }: { value?: number }) {
  if (value === undefined || value === null) return <span className="text-slate-400 text-xs">—</span>;
  const pct = Math.round(value * 100);
  const colour =
    pct >= 80 ? 'text-green-700' :
    pct >= 50 ? 'text-amber-700' :
    'text-red-700';
  return <span className={`text-xs font-medium ${colour}`}>{fmt(pct, '%')}</span>;
}
