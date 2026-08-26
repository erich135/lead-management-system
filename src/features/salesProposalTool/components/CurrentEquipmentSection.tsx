import { useEffect, useRef, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { getMachinesByCustomer, type Machine } from '../../../lib/api';
import { readSpecLibraryRecord, searchSpecLibrary } from '../api';
import {
  describeCurrentMachineDropdown,
} from '../currentMachineSearch';
import { machineRecordId, toSearchableMachine } from '../customerMachineSearch';
import {
  applyLibrarySpec,
  applyPhysicalMachine,
  canAddPhysicalMachine,
  currentMachineCardTitle,
  currentMachineIsComplete,
  currentMachineNeedsSpec,
  installedSpecSearchHint,
  newCurrentEquipmentDraft,
  resetCurrentMachine,
  type CurrentEquipmentDraft,
} from '../equipmentState';
import {
  displayedMotorRatingKw,
  effectivePackageInput,
  effectiveRatedAirflow,
  effectiveRatedPressure,
  hasUsableSourceBacked,
  MOTOR_RATING_LABEL,
  packageInputUnavailableCopy,
  PUBLISHED_PACKAGE_INPUT_LABEL,
  specLibraryResultCopy,
} from '../specDisplay';
import { formatMeasuredNumber } from '../formatMeasured';
import { SEARCH_MENU_PANEL, searchMenuWrapClass } from '../searchOverlay';
import type { PublicMachineSpec, SourceBackedSpec } from '../types';
import { SpecSheetCapture } from './SpecSheetCapture';

interface CurrentEquipmentSectionProps {
  proposalId: string;
  customerId: string | null;
  rows: CurrentEquipmentDraft[];
  onChange: (rows: CurrentEquipmentDraft[]) => void;
}

export function CurrentEquipmentSection({
  proposalId,
  customerId,
  rows,
  onChange,
}: CurrentEquipmentSectionProps) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydratedKeys = useRef(new Set<string>());

  useEffect(() => {
    if (!customerId) {
      setMachines([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getMachinesByCustomer(customerId)
      .then(({ machines: loaded }) => {
        if (cancelled) return;
        setMachines(loaded);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load customer machines.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  useEffect(() => {
    if (!customerId || rows.length > 0) return;
    onChange([newCurrentEquipmentDraft()]);
  }, [customerId, rows.length, onChange]);

  useEffect(() => {
    const missing = rows.filter(
      (row) =>
        row.specLibraryRecordId &&
        !row.selectedSpec &&
        !row.changingSpec &&
        !hydratedKeys.current.has(row.key),
    );
    if (missing.length === 0) return;
    missing.forEach((row) => hydratedKeys.current.add(row.key));
    let cancelled = false;
    void Promise.all(
      missing.map(async (row) => {
        try {
          const spec = await readSpecLibraryRecord(row.specLibraryRecordId as string);
          return { key: row.key, spec };
        } catch {
          return { key: row.key, spec: null as PublicMachineSpec | null };
        }
      }),
    ).then((loaded) => {
      if (cancelled) return;
      onChange(
        rows.map((row) => {
          const hit = loaded.find((item) => item.key === row.key);
          if (!hit) return row;
          return hit.spec
            ? { ...row, selectedSpec: hit.spec, changingSpec: false }
            : { ...row, changingSpec: true };
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [rows, onChange]);

  if (!customerId) {
    return (
      <section className="space-y-3 overflow-visible">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
          Current machine
        </h2>
        <p className="text-sm text-slate-600">Select a customer first.</p>
      </section>
    );
  }

  function updateRow(key: string, next: CurrentEquipmentDraft) {
    onChange(rows.map((row) => (row.key === key ? next : row)));
  }

  return (
    <section className="space-y-4 overflow-visible">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
        Current equipment
      </h2>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {rows.map((row) => (
        <CurrentMachineCard
          key={row.key}
          proposalId={proposalId}
          customerId={customerId}
          row={row}
          machines={machines}
          loading={loading}
          selectedIds={rows.flatMap((item) => (item.arsMachineId ? [item.arsMachineId] : []))}
          onChange={(next) => updateRow(row.key, next)}
          onRemove={() => onChange(rows.filter((item) => item.key !== row.key))}
        />
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, newCurrentEquipmentDraft()])}
        className="rounded-[8px] bg-slate-100 px-3 py-1.5 text-xs font-medium text-[#383838] hover:bg-slate-200"
      >
        Add machine
      </button>
    </section>
  );
}

function CurrentMachineCard({
  proposalId,
  customerId,
  row,
  machines,
  loading,
  selectedIds,
  onChange,
  onRemove,
}: {
  proposalId: string;
  customerId: string;
  row: CurrentEquipmentDraft;
  machines: Machine[];
  loading: boolean;
  selectedIds: string[];
  onChange: (row: CurrentEquipmentDraft) => void;
  onRemove: () => void;
}) {
  const [query, setQuery] = useState('');
  const [librarySpecs, setLibrarySpecs] = useState<PublicMachineSpec[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const complete = currentMachineIsComplete(row) && !row.changingSpec;
  const needsSpec = currentMachineNeedsSpec(row);

  useEffect(() => {
    if (complete || row.capturingSheet) {
      setLibrarySpecs([]);
      return;
    }
    const term = query.trim();
    if (term === '') {
      setLibrarySpecs([]);
      setLibraryLoading(false);
      return;
    }
    let cancelled = false;
    setLibraryLoading(true);
    const timer = window.setTimeout(() => {
      void searchSpecLibrary(term, 'all')
        .then((specs) => {
          if (!cancelled) setLibrarySpecs(specs);
        })
        .catch(() => {
          if (!cancelled) setLibrarySpecs([]);
        })
        .finally(() => {
          if (!cancelled) setLibraryLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, complete, row.capturingSheet]);

  const dropdown = describeCurrentMachineDropdown({
    customerId,
    loading,
    libraryLoading,
    customerMachines: machines.map(toSearchableMachine),
    librarySpecs,
    query,
    excludeMachineIds: selectedIds.filter((id) => id !== row.arsMachineId),
  });

  async function handleSelectPhysical(machine: Machine) {
    const id = machineRecordId(machine);
    if (id !== row.arsMachineId && !canAddPhysicalMachine(selectedIds, id)) return;
    const next = applyPhysicalMachine(row, machine);
    if (next.specLibraryRecordId) {
      try {
        const spec = await readSpecLibraryRecord(next.specLibraryRecordId);
        onChange({ ...next, selectedSpec: spec, changingSpec: false });
        setQuery('');
        return;
      } catch {
        onChange({ ...next, selectedSpec: null, changingSpec: true });
        setQuery(installedSpecSearchHint(machine.make, machine.model));
        return;
      }
    }
    onChange(next);
    setQuery(installedSpecSearchHint(machine.make, machine.model));
  }

  function handleSelectSpec(spec: PublicMachineSpec) {
    onChange(applyLibrarySpec(row, spec));
    setQuery('');
  }

  if (row.capturingSheet) {
    return (
      <div className="space-y-3 overflow-visible rounded-[8px] border border-slate-200 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Current machine
          </p>
          <button type="button" onClick={onRemove} className="text-slate-400 hover:text-[#383838]" title="Remove machine">
            <X className="h-4 w-4" />
          </button>
        </div>
        <SpecSheetCapture
          proposalId={proposalId}
          initialManufacturer={row.selectedSpec?.manufacturer || row.make}
          initialModel={row.selectedSpec?.model || row.model}
          onCancel={() => onChange({ ...row, capturingSheet: false })}
          onApply={(values: SourceBackedSpec) =>
            onChange({
              ...row,
              sourceBacked: values,
              make: row.arsMachineId ? row.make : values.manufacturer || row.make,
              model: row.arsMachineId ? row.model : values.model || row.model,
              capturingSheet: false,
              changingSpec: false,
            })
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-visible rounded-[8px] border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Current machine
        </p>
        <button type="button" onClick={onRemove} className="text-slate-400 hover:text-[#383838]" title="Remove machine">
          <X className="h-4 w-4" />
        </button>
      </div>

      {complete ? (
        <SelectedCurrentMachine
          row={row}
          onSerialChange={(serialNumber) => onChange({ ...row, serialNumber })}
          onChangeMachine={() => {
            onChange(resetCurrentMachine(row));
            setQuery('');
          }}
          onCapture={() => onChange({ ...row, capturingSheet: true })}
        />
      ) : (
        <div className="overflow-visible">
          {needsSpec && (
            <p className="mb-2 text-sm text-slate-600">
              {row.make} {row.model}
              {row.serialNumber ? ` · Serial ${row.serialNumber}` : ''}. Choose the
              specification for this machine.
            </p>
          )}
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
            Current machine
          </label>
          <div className={searchMenuWrapClass(true)}>
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search make, model or serial..."
              autoComplete="off"
              className="w-full rounded-[8px] border border-slate-300 py-2 pl-9 pr-9 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
            />
            {query !== '' && (
              <button
                type="button"
                className="absolute right-2 top-2 text-slate-400 hover:text-[#383838]"
                title="Clear search"
                onClick={() => setQuery('')}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <div className={SEARCH_MENU_PANEL}>
              {dropdown.kind === 'loading' && (
                <p className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500">
                  <Loader2 className="h-3 w-3 animate-spin" /> {dropdown.message}
                </p>
              )}
              {dropdown.kind === 'no-match' && (
                <p className="px-3 py-2 text-sm text-slate-600">{dropdown.message}</p>
              )}
              {dropdown.kind === 'results' && (
                <div>
                  {(dropdown.customerNotice || dropdown.customer.length > 0) && (
                    <div>
                      <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Customer machines
                      </p>
                      {dropdown.customerNotice && (
                        <p className="px-3 py-2 text-sm text-slate-600">{dropdown.customerNotice}</p>
                      )}
                      <ul>
                        {dropdown.customer.map((machine) => (
                          <li key={machine.id}>
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-left hover:bg-slate-50"
                              onClick={() => {
                                const full = machines.find(
                                  (item) => machineRecordId(item) === machine.id,
                                );
                                if (full) void handleSelectPhysical(full);
                              }}
                            >
                              <p className="text-sm font-medium text-[#383838]">
                                {machine.make} {machine.model}
                              </p>
                              <p className="text-xs text-slate-600">Serial {machine.serialNumber}</p>
                              {machine.currentLocation && (
                                <p className="text-xs text-slate-500">
                                  Location {machine.currentLocation}
                                </p>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {dropdown.library.length > 0 && (
                    <div>
                      <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Machine Specification Library
                      </p>
                      <ul>
                        {dropdown.library.map((spec) => {
                          const copy = specLibraryResultCopy(spec);
                          return (
                            <li key={spec.recordId}>
                              <button
                                type="button"
                                className="w-full px-3 py-2 text-left hover:bg-slate-50"
                                onClick={() => handleSelectSpec(spec)}
                              >
                                <p className="text-sm font-medium text-[#383838]">{copy.title}</p>
                                {copy.ratings && (
                                  <p className="text-xs text-slate-600">{copy.ratings}</p>
                                )}
                                {copy.source && (
                                  <p className="text-xs text-slate-500">Source: {copy.source}</p>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              <div className="border-t border-slate-100 px-3 py-2 text-xs text-slate-600">
                Can&apos;t find the machine?{' '}
                <button
                  type="button"
                  className="font-medium text-[#0969a9] underline"
                  onClick={() => onChange({ ...row, capturingSheet: true })}
                >
                  Add from specification sheet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectedCurrentMachine({
  row,
  onSerialChange,
  onChangeMachine,
  onCapture,
}: {
  row: CurrentEquipmentDraft;
  onSerialChange: (serialNumber: string) => void;
  onChangeMachine: () => void;
  onCapture: () => void;
}) {
  const title = currentMachineCardTitle(row);
  const pressure = effectiveRatedPressure(row.selectedSpec, row.sourceBacked);
  const airflow = effectiveRatedAirflow(row.selectedSpec, row.sourceBacked);
  const packageInput = effectivePackageInput(row.selectedSpec, row.sourceBacked);
  const motor = displayedMotorRatingKw(row.selectedSpec, row.sourceBacked);
  const source =
    row.selectedSpec?.sourceTitle ||
    row.selectedSpec?.sourceFileName ||
    row.sourceBacked?.sourceFileName ||
    null;
  const missingPackage = packageInput.value === null;
  const missingAirflow = airflow.value === null;
  const libraryOnly = !row.arsMachineId;

  return (
    <div>
      <p className="text-sm font-medium text-[#383838]">{title}</p>
      <dl className="mt-3 space-y-2">
        <div>
          <dt className="text-xs font-medium text-slate-500">Serial</dt>
          <dd>
            {libraryOnly ? (
              <input
                type="text"
                value={row.serialNumber}
                onChange={(event) => onSerialChange(event.target.value)}
                placeholder="Optional serial number"
                className="mt-1 w-full rounded-[8px] border border-slate-300 px-3 py-1.5 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
              />
            ) : (
              <p className="text-sm text-[#383838]">{row.serialNumber || 'Not available'}</p>
            )}
          </dd>
        </div>
        <CardValue
          label="Rated pressure"
          value={
            formatMeasuredNumber(pressure.value)
              ? `${formatMeasuredNumber(pressure.value)} bar`
              : 'Not available'
          }
        />
        <CardValue
          label="Rated airflow"
          value={
            formatMeasuredNumber(airflow.value)
              ? `${formatMeasuredNumber(airflow.value)} m³/min`
              : 'Not available'
          }
        />
        <CardValue
          label={PUBLISHED_PACKAGE_INPUT_LABEL}
          value={
            formatMeasuredNumber(packageInput.value, 1)
              ? `${formatMeasuredNumber(packageInput.value, 1)} kW`
              : packageInputUnavailableCopy({
                  hasLibrary: row.selectedSpec !== null,
                  hasSource: hasUsableSourceBacked(row.sourceBacked),
                })
          }
        />
        {motor !== null && (
          <CardValue
            label={MOTOR_RATING_LABEL}
            value={
              formatMeasuredNumber(motor, 2)
                ? `${formatMeasuredNumber(motor, 2)} kW`
                : 'Not available'
            }
          />
        )}
        {source && (
          <div>
            <dt className="text-xs font-medium text-slate-500">Source</dt>
            <dd className="text-sm text-[#383838]">{source}</dd>
          </div>
        )}
      </dl>
      {(missingPackage || missingAirflow) && (
        <p className="mt-2 text-xs text-slate-600">
          {missingPackage && row.selectedSpec && (
            <span className="block">Published package input not available in the library record.</span>
          )}
          <button type="button" className="mt-1 font-medium text-[#0969a9] underline" onClick={onCapture}>
            Add from specification sheet
          </button>
        </p>
      )}
      <button
        type="button"
        onClick={onChangeMachine}
        className="mt-3 text-xs font-medium text-[#0969a9] underline"
      >
        Change machine
      </button>
    </div>
  );
}

function CardValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-[#383838]">{value}</dd>
    </div>
  );
}
