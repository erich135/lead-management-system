/**
 * BouwaMachineSpecLibrary
 *
 * Read-only browse of consolidated `bouwaspeclibraryrecords` via the wizard
 * library API. Supports search, source-type filter and pagination.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Info,
  RefreshCw,
  Search,
  ShieldAlert,
} from 'lucide-react';
import {
  browseSpecLibrary,
} from '../wizard/wizardApi';
import type { WizardSpecEquipmentType, WizardSpecRecord } from '../wizard/wizardTypes';

const SOURCE_FILTERS: Array<{ id: string; label: string }> = [
  { id: '', label: 'All sources' },
  { id: 'cagi_directory', label: 'CAGI directory' },
  { id: 'cagi_verified_datasheet', label: 'CAGI / pack verified' },
  { id: 'oem_datasheet', label: 'OEM datasheet' },
];

const EQUIPMENT_FILTERS: Array<{ id: string; label: string }> = [
  { id: '', label: 'All equipment' },
  { id: 'air_compressor', label: 'Air compressor' },
  { id: 'air_dryer', label: 'Air dryer' },
  { id: 'air_receiver', label: 'Air receiver' },
  { id: 'filtration', label: 'Filtration' },
  { id: 'reference_drawing', label: 'Reference drawing' },
  { id: 'other', label: 'Other' },
];

function na(value: unknown, unit?: string): string {
  if (value === undefined || value === null || value === '') return 'Not available';
  const text = String(value);
  return unit ? `${text} ${unit}` : text;
}

function formatNumber(value: number | null | undefined, decimals = 2, unit?: string): string {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return 'Not available';
  }
  const text = Number(value).toFixed(decimals);
  return unit ? `${text} ${unit}` : text;
}

function sourceLabel(record: WizardSpecRecord): string {
  const title = record.source?.sourceTitle?.trim();
  const org = record.source?.sourceOrganisation?.trim();
  if (title && org) return `${title} (${org})`;
  return title || org || record.source?.sourceType || 'Not available';
}

function equipmentLabel(value: string | undefined): string {
  const match = EQUIPMENT_FILTERS.find((option) => option.id === value);
  return match?.label || value || 'Not available';
}

interface BouwaMachineSpecLibraryProps {
  pageSize?: number;
}

export function BouwaMachineSpecLibrary({
  pageSize = 50,
}: BouwaMachineSpecLibraryProps) {
  const [records, setRecords] = useState<WizardSpecRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [equipmentType, setEquipmentType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch, sourceType, equipmentType]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await browseSpecLibrary({
        search: debouncedSearch || undefined,
        sourceType: sourceType || undefined,
        equipmentType: equipmentType
          ? (equipmentType as WizardSpecEquipmentType)
          : undefined,
        limit: pageSize,
        offset,
      });
      setRecords(page.records);
      setTotal(page.total);
    } catch (err: unknown) {
      setRecords([]);
      setTotal(0);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, sourceType, equipmentType, offset, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + records.length, total);
  const canPrev = offset > 0;
  const canNext = offset + pageSize < total;

  return (
    <section className="space-y-4">
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

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800">
          This list reads the consolidated active library. Unavailable published values show as
          &quot;Not available&quot;. Records are not editable from this screen.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search manufacturer / model…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ars-primary/30"
          />
        </div>
        <select
          value={equipmentType}
          onChange={(event) => setEquipmentType(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          {EQUIPMENT_FILTERS.map((option) => (
            <option key={option.id || 'all-equipment'} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={sourceType}
          onChange={(event) => setSourceType(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          {SOURCE_FILTERS.map((option) => (
            <option key={option.id || 'all'} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Reload
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-3 py-16 text-ars-body">
          <RefreshCw className="w-5 h-5 animate-spin text-ars-primary" />
          <span className="text-sm">Loading machine specifications…</span>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-900">
              Machine specification data is not available.
            </p>
            <p className="text-sm text-amber-800">
              Confirm your account is an active Super Admin and try again.
            </p>
            <p className="text-xs text-amber-700 font-mono mt-2 bg-amber-100 rounded px-2 py-1">
              {error}
            </p>
          </div>
        </div>
      )}

      {!loading && !error && total === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-ars-body">
          <Cpu className="w-10 h-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No active machine specifications match.</p>
          <p className="text-xs text-slate-400 max-w-sm text-center">
            The consolidated library may be empty for this filter, or search terms may be too narrow.
          </p>
        </div>
      )}

      {!loading && !error && total > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-ars-body">
              Showing{' '}
              <span className="font-medium text-ars-heading">
                {pageStart}-{pageEnd}
              </span>{' '}
              of <span className="font-medium text-ars-heading">{total}</span> active specifications
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!canPrev}
                onClick={() => setOffset((current) => Math.max(0, current - pageSize))}
                className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                type="button"
                disabled={!canNext}
                onClick={() => setOffset((current) => current + pageSize)}
                className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs disabled:opacity-40"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-slate-400 italic">Read-only</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 whitespace-nowrap">Manufacturer</th>
                  <th className="px-4 py-3 whitespace-nowrap">Model</th>
                  <th className="px-4 py-3 whitespace-nowrap">Equipment</th>
                  <th className="px-4 py-3 whitespace-nowrap">Control</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">Pressure</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">FAD</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">Power</th>
                  <th className="px-4 py-3 whitespace-nowrap">Source</th>
                  <th className="px-4 py-3 whitespace-nowrap">Provenance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record) => (
                  <tr key={record.recordId} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-ars-heading">
                      {na(record.manufacturer)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-ars-primary">{na(record.model)}</div>
                      {record.modelVariant && (
                        <div className="text-xs text-slate-500">{record.modelVariant}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">
                      {equipmentLabel(record.equipmentType)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{na(record.controlMethod)}</td>
                    <td className="px-4 py-2.5 text-right">
                      {formatNumber(record.ratedPressureBarG, 2, 'bar(g)')}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {formatNumber(record.ratedFadM3PerMin, 3, 'm³/min')}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {formatNumber(
                        record.packageInputPowerKw ?? record.motorShaftPowerKw,
                        1,
                        'kW',
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600 max-w-[18rem]">
                      {sourceLabel(record)}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-slate-500">
                      {record.source?.sourceSha256
                        ? `${record.source.sourceSha256.slice(0, 12)}…`
                        : 'Not available'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
