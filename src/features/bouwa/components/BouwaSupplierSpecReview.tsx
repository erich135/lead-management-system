/**
 * BouwaSupplierSpecReview
 *
 * Phase 4D-9: Internal Supplier Spec Review screen.
 *
 * SAFETY RULES — enforced in this component:
 *   - No "Approve for customer" button.
 *   - approvalStatus is NEVER included in any edit payload.
 *   - approvedBy / approvedAt are NEVER set.
 *   - No PDF / export functionality.
 *   - Not mounted in Dashboard.tsx or MobileNavigation.tsx.
 *   - Only reachable via the hidden /bouwa route behind BouwaRouteGuard.
 *
 * Features:
 *   - Filter bar: internalReviewStatus, duplicateReviewRequired,
 *     hasCriticalMissingFields, compressorType, search (modelName/code)
 *   - Table: key technical fields + review status indicators
 *   - Detail drawer: read-only provenance + editable internal review fields
 *   - "Save Internal Review" limited to whitelisted fields only
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardCheck, AlertTriangle, RefreshCw, ShieldAlert, Info,
  X, Save, ChevronDown, Search, Copy, CheckCircle2,
} from 'lucide-react';
import { listBouwaMachineSpecs, updateBouwaMachineSpecInternalReview } from '../api/bouwaApi';
import type { BouwaMachineSpec, BouwaMachineSpecInternalReviewStatus, UpdateBouwaMachineSpecInternalReviewPayload } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(value: unknown, unit?: string): string {
  if (value === undefined || value === null || value === '') return '—';
  const str = String(value);
  return unit ? `${str} ${unit}` : str;
}

function fmtNum(value: unknown, decimals = 1, unit?: string): string {
  if (value === undefined || value === null) return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return unit ? `${n.toFixed(decimals)} ${unit}` : n.toFixed(decimals);
}

const REVIEW_STATUS_LABELS: Record<BouwaMachineSpecInternalReviewStatus | string, string> = {
  needs_internal_review: 'Needs Review',
  reviewed_ok: 'Reviewed OK',
  needs_supplier_confirmation: 'Needs Supplier Confirmation',
  rejected_internal: 'Rejected (Internal)',
};

function reviewStatusBadgeClass(status: string | undefined): string {
  switch (status) {
    case 'reviewed_ok':                 return 'bg-green-50 text-green-700 border-green-200';
    case 'needs_internal_review':       return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'needs_supplier_confirmation': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'rejected_internal':           return 'bg-red-50 text-red-700 border-red-200';
    default:                            return 'bg-slate-50 text-slate-500 border-slate-200';
  }
}

// ---------------------------------------------------------------------------
// Sub-components: states
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ars-body">
      <RefreshCw className="w-5 h-5 animate-spin text-ars-primary" />
      <span className="text-sm">Loading supplier specs…</span>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-amber-900">Spec data unavailable.</p>
        <p className="text-sm text-amber-800">
          The Bouwa feature flag or permissions may not be enabled on this server.
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
      <ClipboardCheck className="w-10 h-10 text-slate-300" />
      <p className="text-sm font-medium text-slate-500">No specs match the current filters.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

interface FilterState {
  search: string;
  internalReviewStatus: string;
  duplicateReviewRequired: string;
  hasCriticalMissingFields: string;
  compressorType: string;
}

const EMPTY_FILTERS: FilterState = {
  search: '',
  internalReviewStatus: '',
  duplicateReviewRequired: '',
  hasCriticalMissingFields: '',
  compressorType: '',
};

interface FilterBarProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  total: number;
  loading: boolean;
  onRefresh: () => void;
}

function FilterBar({ filters, onChange, total, loading, onRefresh }: FilterBarProps) {
  const hasActive = Object.values(filters).some(v => v !== '');
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search model name / code…"
            value={filters.search}
            onChange={e => onChange({ ...filters, search: e.target.value })}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-ars-primary/30"
          />
        </div>

        {/* Review status */}
        <div className="relative">
          <select
            value={filters.internalReviewStatus}
            onChange={e => onChange({ ...filters, internalReviewStatus: e.target.value })}
            className="pl-3 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-ars-primary/30"
          >
            <option value="">All review statuses</option>
            <option value="needs_internal_review">Needs Review</option>
            <option value="reviewed_ok">Reviewed OK</option>
            <option value="needs_supplier_confirmation">Needs Supplier Confirmation</option>
            <option value="rejected_internal">Rejected (Internal)</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        </div>

        {/* Duplicate flag */}
        <div className="relative">
          <select
            value={filters.duplicateReviewRequired}
            onChange={e => onChange({ ...filters, duplicateReviewRequired: e.target.value })}
            className="pl-3 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-ars-primary/30"
          >
            <option value="">All duplicates</option>
            <option value="true">Duplicate review required</option>
            <option value="false">No duplicate flag</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        </div>

        {/* Critical missing fields */}
        <div className="relative">
          <select
            value={filters.hasCriticalMissingFields}
            onChange={e => onChange({ ...filters, hasCriticalMissingFields: e.target.value })}
            className="pl-3 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-ars-primary/30"
          >
            <option value="">All missing-field states</option>
            <option value="true">Has critical missing fields</option>
            <option value="false">All critical fields present</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        </div>

        {/* Compressor type */}
        <div className="relative">
          <input
            type="text"
            placeholder="Compressor type…"
            value={filters.compressorType}
            onChange={e => onChange({ ...filters, compressorType: e.target.value })}
            className="pl-3 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-ars-primary/30"
          />
        </div>

        {hasActive && (
          <button
            onClick={() => onChange(EMPTY_FILTERS)}
            className="text-xs text-slate-500 underline hover:text-ars-primary"
          >
            Clear filters
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-ars-body">
            Showing <span className="font-semibold text-ars-heading">{total}</span> spec{total !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main table
// ---------------------------------------------------------------------------

interface SpecTableProps {
  specs: BouwaMachineSpec[];
  onSelect: (spec: BouwaMachineSpec) => void;
}

function SpecTable({ specs, onSelect }: SpecTableProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-ars-body whitespace-nowrap">Model</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-ars-body whitespace-nowrap">Type</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-ars-body whitespace-nowrap">Press. (bar)</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-ars-body whitespace-nowrap">Cap. (m³/min)</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-ars-body whitespace-nowrap">kW</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-ars-body whitespace-nowrap">Dryer (m³/min)</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-ars-body whitespace-nowrap">Dew-pt (°C)</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-ars-body whitespace-nowrap">Review status</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-ars-body whitespace-nowrap">Dup?</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-ars-body whitespace-nowrap">Missing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {specs.map(spec => {
              const kw = spec.packageInputKw ?? spec.motorKw;
              const missingCount = spec.criticalMissingFields?.length ?? 0;
              return (
                <tr
                  key={spec._id}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => onSelect(spec)}
                >
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="font-medium text-ars-heading">{fmt(spec.modelName)}</div>
                    {spec.variant && <div className="text-xs text-slate-400">{spec.variant}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-ars-body whitespace-nowrap">{fmt(spec.compressorType)}</td>
                  <td className="px-4 py-2.5 text-right text-ars-body whitespace-nowrap">{fmtNum(spec.ratedPressureBar, 1)}</td>
                  <td className="px-4 py-2.5 text-right text-ars-body whitespace-nowrap">{fmtNum(spec.ratedCapacityM3Min, 2)}</td>
                  <td className="px-4 py-2.5 text-right text-ars-body whitespace-nowrap">{fmtNum(kw, 1)}</td>
                  <td className="px-4 py-2.5 text-right text-ars-body whitespace-nowrap">{fmtNum(spec.dryerCapacityM3Min, 2)}</td>
                  <td className="px-4 py-2.5 text-right text-ars-body whitespace-nowrap">{fmtNum(spec.dewPointC, 0)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${reviewStatusBadgeClass(spec.internalReviewStatus)}`}>
                      {REVIEW_STATUS_LABELS[spec.internalReviewStatus ?? ''] ?? fmt(spec.internalReviewStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center whitespace-nowrap">
                    {spec.duplicateReviewRequired
                      ? <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">Yes</span>
                      : <span className="text-xs text-slate-400">—</span>
                    }
                  </td>
                  <td className="px-4 py-2.5 text-center whitespace-nowrap">
                    {missingCount > 0
                      ? <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">{missingCount}</span>
                      : <span className="text-xs text-green-600"><CheckCircle2 className="inline w-3.5 h-3.5" /></span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail drawer
// ---------------------------------------------------------------------------

interface DrawerProps {
  spec: BouwaMachineSpec;
  onClose: () => void;
  onSaved: (updated: BouwaMachineSpec) => void;
}

function DetailDrawer({ spec, onClose, onSaved }: DrawerProps) {
  const [form, setForm] = useState<UpdateBouwaMachineSpecInternalReviewPayload>({
    ratedPressureBar: spec.ratedPressureBar,
    ratedCapacityM3Min: spec.ratedCapacityM3Min,
    packageInputKw: spec.packageInputKw,
    motorKw: spec.motorKw,
    dryerCapacityM3Min: spec.dryerCapacityM3Min,
    dewPointC: spec.dewPointC,
    internalReviewStatus: spec.internalReviewStatus,
    internalReviewNotes: spec.internalReviewNotes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const updated = await updateBouwaMachineSpecInternalReview(spec._id, form);
      setSaveSuccess(true);
      onSaved(updated);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function numField(
    label: string,
    key: keyof UpdateBouwaMachineSpecInternalReviewPayload,
    unit?: string,
    decimals = 1,
  ) {
    return (
      <div>
        <label className="block text-xs font-medium text-ars-body mb-1">
          {label}{unit && <span className="text-slate-400 ml-1">({unit})</span>}
        </label>
        <input
          type="number"
          step={decimals === 0 ? '1' : '0.01'}
          value={form[key] !== undefined ? String(form[key]) : ''}
          onChange={e => {
            const v = e.target.value;
            setForm(f => ({
              ...f,
              [key]: v === '' ? undefined : Number(v),
            }));
          }}
          className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-ars-primary/30"
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-bold text-ars-heading">{fmt(spec.modelName)}</h2>
            {spec.variant && <p className="text-xs text-slate-400">{spec.variant}</p>}
            <span className={`inline-flex items-center mt-1 rounded-full border px-2 py-0.5 text-xs font-medium ${reviewStatusBadgeClass(spec.internalReviewStatus)}`}>
              {REVIEW_STATUS_LABELS[spec.internalReviewStatus ?? ''] ?? fmt(spec.internalReviewStatus)}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 px-5 py-4 space-y-5 overflow-y-auto">
          {/* Duplicate warning */}
          {spec.duplicateReviewRequired && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 flex items-start gap-2">
              <Copy className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-orange-900">Duplicate / variant review required</p>
                {spec.duplicateReviewGroupKey && (
                  <p className="text-xs text-orange-700 mt-0.5">Group: {spec.duplicateReviewGroupKey}</p>
                )}
                <p className="text-xs text-orange-800 mt-1">
                  This record shares a group with other variants. Explain the duplicate decision
                  in Internal Review Notes before marking as <strong>Reviewed OK</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Critical missing fields */}
          {(spec.criticalMissingFields?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900">Critical missing fields</p>
                <ul className="mt-1 space-y-0.5">
                  {spec.criticalMissingFields!.map(f => (
                    <li key={f} className="text-xs text-red-700 font-mono">{f}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Read-only provenance */}
          <section>
            <h3 className="text-xs font-semibold text-ars-body uppercase tracking-wide mb-2">Provenance</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <ReadRow label="Model code" value={spec.modelCode} mono />
              <ReadRow label="Category" value={spec.specCategory} />
              <ReadRow label="Manufacturer" value={spec.manufacturer ?? spec.brand} />
              <ReadRow label="Compressor type" value={spec.compressorType} />
              <ReadRow label="Speed control" value={spec.speedControl} />
              <ReadRow label="Test standard" value={spec.testStandard} />
              <ReadRow label="Source confidence" value={spec.sourceConfidence !== undefined ? `${Math.round((spec.sourceConfidence as number) * 100)}%` : undefined} />
              <ReadRow label="Import phase" value={spec.sourceImportPhase} />
              <ReadRow label="Approval status" value={spec.approvalStatus} />
            </div>
          </section>

          {/* Editable technical fields */}
          <section>
            <h3 className="text-xs font-semibold text-ars-body uppercase tracking-wide mb-3">Technical Fields (editable)</h3>
            <div className="grid grid-cols-2 gap-3">
              {numField('Rated pressure', 'ratedPressureBar', 'bar', 1)}
              {numField('Rated capacity', 'ratedCapacityM3Min', 'm³/min', 2)}
              {numField('Package input kW', 'packageInputKw', 'kW', 1)}
              {numField('Motor kW', 'motorKw', 'kW', 1)}
              {numField('Dryer capacity', 'dryerCapacityM3Min', 'm³/min', 2)}
              {numField('Dew-point', 'dewPointC', '°C', 0)}
            </div>
          </section>

          {/* Internal review status */}
          <section>
            <h3 className="text-xs font-semibold text-ars-body uppercase tracking-wide mb-3">Internal Review (editable)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ars-body mb-1">Review status</label>
                <div className="relative">
                  <select
                    value={form.internalReviewStatus ?? ''}
                    onChange={e => setForm(f => ({ ...f, internalReviewStatus: e.target.value as BouwaMachineSpecInternalReviewStatus }))}
                    className="w-full pl-3 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-ars-primary/30"
                  >
                    <option value="needs_internal_review">Needs Review</option>
                    <option value="reviewed_ok">Reviewed OK</option>
                    <option value="needs_supplier_confirmation">Needs Supplier Confirmation</option>
                    <option value="rejected_internal">Rejected (Internal)</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ars-body mb-1">
                  Internal review notes
                  {spec.duplicateReviewRequired && (
                    <span className="ml-1 text-orange-600 font-semibold">* required for duplicate records</span>
                  )}
                </label>
                <textarea
                  rows={4}
                  value={form.internalReviewNotes ?? ''}
                  onChange={e => setForm(f => ({ ...f, internalReviewNotes: e.target.value }))}
                  placeholder="Add reviewer notes, corrections, or sign-off context…"
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-ars-primary/30 resize-y"
                />
              </div>
            </div>
          </section>

          {/* Import notes read-only */}
          {spec.notes && (
            <section>
              <h3 className="text-xs font-semibold text-ars-body uppercase tracking-wide mb-2">Import Notes (read-only)</h3>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {spec.notes as string}
              </div>
            </section>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-slate-200 sticky bottom-0 bg-white">
          {saveError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-800">{saveError}</p>
            </div>
          )}
          {saveSuccess && (
            <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-xs text-green-800 font-medium">Internal review fields saved.</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ars-primary text-white text-sm font-medium hover:bg-ars-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Internal Review
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-ars-body hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
            {/* SAFETY: no approve-for-customer button here */}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadRow({ label, value, mono }: { label: string; value: unknown; mono?: boolean }) {
  if (!value) return null;
  return (
    <>
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-xs text-ars-heading font-medium ${mono ? 'font-mono' : ''}`}>{String(value)}</span>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

export function BouwaSupplierSpecReview() {
  const [specs, setSpecs] = useState<BouwaMachineSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<BouwaMachineSpec | null>(null);

  const fetchSpecs = useCallback(async (f: FilterState) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number | boolean> = { limit: 200 };
      if (f.search.trim()) params.search = f.search.trim();
      if (f.internalReviewStatus) params.internalReviewStatus = f.internalReviewStatus;
      if (f.duplicateReviewRequired) params.duplicateReviewRequired = f.duplicateReviewRequired;
      if (f.hasCriticalMissingFields) params.hasCriticalMissingFields = f.hasCriticalMissingFields;
      if (f.compressorType.trim()) params.compressorType = f.compressorType.trim();

      const data = await listBouwaMachineSpecs(params);
      setSpecs(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void fetchSpecs(filters), 300);
    return () => clearTimeout(t);
  }, [filters, fetchSpecs]);

  function handleSaved(updated: BouwaMachineSpec) {
    setSpecs(prev => prev.map(s => s._id === updated._id ? updated : s));
    setSelected(updated);
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-ars-primary shrink-0" />
          <h2 className="text-base font-semibold text-ars-heading">Supplier Spec Review</h2>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs text-slate-600 font-medium">
          <ShieldAlert className="w-3 h-3" />
          Internal only — not customer-facing
        </span>
      </div>

      {/* Safety notice */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800">
          This screen is for internal review of imported supplier specs only.
          All records remain <strong>draft / internal-only</strong>.
          No customer-facing approval or export is available here.
        </p>
      </div>

      {/* Filters */}
      {!error && (
        <FilterBar
          filters={filters}
          onChange={setFilters}
          total={specs.length}
          loading={loading}
          onRefresh={() => void fetchSpecs(filters)}
        />
      )}

      {/* Content */}
      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && specs.length === 0 && <EmptyState />}
      {!loading && !error && specs.length > 0 && (
        <SpecTable specs={specs} onSelect={setSelected} />
      )}

      {/* Detail drawer */}
      {selected && (
        <DetailDrawer
          spec={selected}
          onClose={() => setSelected(null)}
          onSaved={handleSaved}
        />
      )}
    </section>
  );
}
