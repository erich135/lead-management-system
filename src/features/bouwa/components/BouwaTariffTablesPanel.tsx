/**
 * BouwaTariffTablesPanel
 *
 * Read-only internal screen for browsing approved Bouwa electricity tariff tables.
 *
 * IMPORTANT:
 * - Does NOT create, edit or delete tariff records.
 * - Does NOT expose customer-safe outputs.
 * - Does NOT include PDF/export functionality.
 * - Only accessible from the hidden /bouwa route (behind BouwaRouteGuard).
 * - If the backend feature flag or permissions are not yet enabled, the API
 *   call will fail and a safe informational message is shown instead.
 *
 * Phase 4C-6: read-only list only.
 */

import { useState, useEffect } from 'react';
import { DollarSign, AlertTriangle, Info, RefreshCw, ShieldAlert } from 'lucide-react';
import { listBouwaTariffTables } from '../api/bouwaApi';
import type { BouwaTariffTable, BouwaTariffRate } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(value: unknown, unit?: string): string {
  if (value === undefined || value === null || value === '') return '—';
  const str = String(value);
  return unit ? `${str} ${unit}` : str;
}

function fmtBool(value: unknown): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return '—';
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

const PROVIDER_LABELS: Record<string, string> = {
  ESKOM: 'Eskom',
  MUNICIPAL: 'Municipal',
  CUSTOMER_SPECIFIC: 'Customer Specific',
  OTHER: 'Other',
};

const CATEGORY_LABELS: Record<string, string> = {
  LDS: 'LDS',
  HDS: 'HDS',
  MIXED: 'Mixed',
  UNKNOWN: 'Unknown',
};

const TIME_BAND_LABELS: Record<string, string> = {
  PEAK: 'Peak',
  STANDARD: 'Standard',
  OFF_PEAK: 'Off-Peak',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ars-body">
      <RefreshCw className="w-5 h-5 animate-spin text-ars-primary" />
      <span className="text-sm">Loading tariff tables…</span>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-amber-900">
          Tariff table data is not available yet.
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
      <DollarSign className="w-10 h-10 text-slate-300" />
      <p className="text-sm font-medium text-slate-500">No tariff tables found.</p>
      <p className="text-xs text-slate-400 max-w-xs text-center">
        Approved tariff tables will appear here once they have been entered via the internal admin
        process.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BouwaTariffTablesPanel() {
  const [tables, setTables] = useState<BouwaTariffTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTables() {
      try {
        setLoading(true);
        setError(null);
        const data = await listBouwaTariffTables({ limit: 100 });
        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          setTables(list);
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

    void fetchTables();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-ars-primary shrink-0" />
          <h2 className="text-base font-semibold text-ars-heading">
            Tariff Tables
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
          This library contains approved electricity tariff structures used in energy savings
          calculations. No changes can be made from this screen.
        </p>
      </div>

      {/* Content area */}
      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && tables.length === 0 && <EmptyState />}
      {!loading && !error && tables.length > 0 && (
        <TariffTableList tables={tables} />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// List / cards
// ---------------------------------------------------------------------------

function TariffTableList({ tables }: { tables: BouwaTariffTable[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-ars-body">
          Showing <span className="font-medium text-ars-heading">{tables.length}</span> tariff
          table{tables.length !== 1 ? 's' : ''}
        </span>
        <span className="text-xs text-slate-400 italic">Read-only</span>
      </div>
      {tables.map((table) => (
        <TariffTableCard key={table._id} table={table} />
      ))}
    </div>
  );
}

function TariffTableCard({ table }: { table: BouwaTariffTable }) {
  const providerLabel = table.providerType
    ? (PROVIDER_LABELS[table.providerType] ?? table.providerType)
    : undefined;
  const categoryLabel = table.tariffCategory
    ? (CATEGORY_LABELS[table.tariffCategory] ?? table.tariffCategory)
    : undefined;

  const rates = Array.isArray(table.rates) ? table.rates : [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      {/* Card header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-ars-heading leading-snug">
            {fmt(table.tariffName)}
          </h3>
          {table.providerName && (
            <p className="text-xs text-ars-body mt-0.5">{table.providerName}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {providerLabel && <ProviderBadge type={table.providerType} label={providerLabel} />}
          {categoryLabel && <CategoryBadge category={table.tariffCategory} label={categoryLabel} />}
          <ApprovalBadge status={table.approvalStatus} />
        </div>
      </div>

      {/* Key fields grid */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-xs">
        <div>
          <dt className="text-slate-400 uppercase tracking-wider text-[10px] font-medium">Tariff Code</dt>
          <dd className="text-ars-body mt-0.5 font-mono">{fmt(table.tariffCode)}</dd>
        </div>
        <div>
          <dt className="text-slate-400 uppercase tracking-wider text-[10px] font-medium">Effective From</dt>
          <dd className="text-ars-body mt-0.5">{fmtDate(table.effectiveFrom)}</dd>
        </div>
        <div>
          <dt className="text-slate-400 uppercase tracking-wider text-[10px] font-medium">Effective To</dt>
          <dd className="text-ars-body mt-0.5">{fmtDate(table.effectiveTo)}</dd>
        </div>
        <div>
          <dt className="text-slate-400 uppercase tracking-wider text-[10px] font-medium">VAT Included</dt>
          <dd className="text-ars-body mt-0.5">{fmtBool(table.vatIncluded)}</dd>
        </div>
        {table.sourceReference && (
          <div className="col-span-2">
            <dt className="text-slate-400 uppercase tracking-wider text-[10px] font-medium">Source Reference</dt>
            <dd className="text-ars-body mt-0.5 truncate">{table.sourceReference}</dd>
          </div>
        )}
        <div>
          <dt className="text-slate-400 uppercase tracking-wider text-[10px] font-medium">Updated</dt>
          <dd className="text-ars-body mt-0.5">{fmtDate(table.updatedAt ?? table.createdAt)}</dd>
        </div>
      </dl>

      {/* Rate bands table (if present) */}
      {rates.length > 0 && <RateBandsTable rates={rates} />}

      {/* Notes */}
      {table.notes && (
        <p className="text-xs text-slate-500 italic border-t border-slate-100 pt-3">
          {table.notes}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rate bands inner table
// ---------------------------------------------------------------------------

function RateBandsTable({ rates }: { rates: BouwaTariffRate[] }) {
  return (
    <div className="rounded-lg border border-slate-100 overflow-hidden">
      <div className="bg-slate-50 px-3 py-2 border-b border-slate-100">
        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
          Rate Bands ({rates.length})
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              <th className="px-3 py-2 whitespace-nowrap">Time Band</th>
              <th className="px-3 py-2 whitespace-nowrap">Season</th>
              <th className="px-3 py-2 whitespace-nowrap">Day Type</th>
              <th className="px-3 py-2 whitespace-nowrap text-right">Rate / kWh</th>
              <th className="px-3 py-2 whitespace-nowrap">Currency</th>
              <th className="px-3 py-2 whitespace-nowrap text-right">Demand (R/kVA)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rates.map((rate, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium">
                  <TimeBandBadge band={rate.timeBand} />
                </td>
                <td className="px-3 py-2 text-ars-body">{fmt(rate.season)}</td>
                <td className="px-3 py-2 text-ars-body">{fmt(rate.dayType)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-ars-body">
                  {rate.ratePerKwh !== undefined ? rate.ratePerKwh.toFixed(4) : '—'}
                </td>
                <td className="px-3 py-2 text-ars-body">{fmt(rate.currency)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-ars-body">
                  {rate.demandChargeRandPerKva !== undefined
                    ? rate.demandChargeRandPerKva.toFixed(2)
                    : '—'}
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
// Badge sub-components
// ---------------------------------------------------------------------------

function ProviderBadge({ type, label }: { type?: string; label: string }) {
  const colours: Record<string, string> = {
    ESKOM:             'bg-yellow-50 text-yellow-800 border-yellow-200',
    MUNICIPAL:         'bg-blue-50 text-blue-700 border-blue-200',
    CUSTOMER_SPECIFIC: 'bg-purple-50 text-purple-700 border-purple-200',
    OTHER:             'bg-slate-100 text-slate-600 border-slate-200',
  };
  const cls = (type && colours[type]) ?? 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

function CategoryBadge({ category, label }: { category?: string; label: string }) {
  const colours: Record<string, string> = {
    LDS:     'bg-green-50 text-green-700 border-green-200',
    HDS:     'bg-orange-50 text-orange-700 border-orange-200',
    MIXED:   'bg-indigo-50 text-indigo-700 border-indigo-200',
    UNKNOWN: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  const cls = (category && colours[category]) ?? 'bg-slate-100 text-slate-500 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

function ApprovalBadge({ status }: { status?: string }) {
  if (!status) return null;
  const colours: Record<string, string> = {
    draft:             'bg-slate-100 text-slate-600 border-slate-200',
    pending_review:    'bg-yellow-50 text-yellow-700 border-yellow-200',
    approved_internal: 'bg-green-50 text-green-700 border-green-200',
    rejected:          'bg-red-50 text-red-700 border-red-200',
    archived:          'bg-slate-100 text-slate-500 border-slate-200',
  };
  // 'approved_customer' is a possible backend value — rendered as display badge only, never acted upon
  const cls = colours[status] ?? 'bg-slate-100 text-slate-500 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function TimeBandBadge({ band }: { band?: string }) {
  if (!band) return <span className="text-slate-400">—</span>;
  const colours: Record<string, string> = {
    PEAK:      'bg-red-50 text-red-700 border-red-200',
    STANDARD:  'bg-yellow-50 text-yellow-700 border-yellow-200',
    OFF_PEAK:  'bg-green-50 text-green-700 border-green-200',
  };
  const cls = colours[band] ?? 'bg-slate-100 text-slate-600 border-slate-200';
  const label = TIME_BAND_LABELS[band] ?? band;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}
