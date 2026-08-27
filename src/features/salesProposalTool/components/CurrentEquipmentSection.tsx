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
import {
  NO_PUBLISHED_SPEC_MATCH_MESSAGE,
  POSSIBLE_SPEC_MATCHES_HEADING,
  physicalMachineLibrarySearchQuery,
  rankPublishedSpecsForPhysicalMachine,
} from '../suggestPublishedSpecs';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [suggestedSpecs, setSuggestedSpecs] = useState<PublicMachineSpec[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const searchMenuRef = useRef<HTMLDivElement>(null);
  const complete = currentMachineIsComplete(row) && !row.changingSpec;
  const needsSpec = currentMachineNeedsSpec(row);

  useEffect(() => {
    if (!menuOpen) return;

    function closeOnPointerAway(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !searchMenuRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      const active = document.activeElement;
      if (active instanceof HTMLElement && searchMenuRef.current?.contains(active)) {
        active.blur();
      }
    }

    document.addEventListener('pointerdown', closeOnPointerAway);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerAway);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (complete || row.capturingSheet || !menuOpen) {
      setLibrarySpecs([]);
      setLibraryLoading(false);
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
  }, [query, complete, row.capturingSheet, menuOpen]);

  useEffect(() => {
    if (!needsSpec || row.capturingSheet) {
      setSuggestedSpecs([]);
      setSuggestionsLoading(false);
      return;
    }
    const term = physicalMachineLibrarySearchQuery(row.make, row.model);
    setSuggestedSpecs([]);
    setSuggestionsOpen(true);
    if (term === '') {
      setSuggestionsLoading(false);
      return;
    }
    let cancelled = false;
    setSuggestionsLoading(true);
    void searchSpecLibrary(term, 'all')
      .then((specs) => {
        if (cancelled) return;
        setSuggestedSpecs(
          rankPublishedSpecsForPhysicalMachine(
            { make: row.make, model: row.model },
            specs,
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setSuggestedSpecs([]);
      })
      .finally(() => {
        if (!cancelled) setSuggestionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [needsSpec, row.capturingSheet, row.arsMachineId, row.make, row.model]);

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
    setMenuOpen(false);
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
    setMenuOpen(false);
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
            setMenuOpen(true);
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
          <div ref={searchMenuRef} className={searchMenuWrapClass(menuOpen)}>
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setMenuOpen(true);
              }}
              onFocus={() => setMenuOpen(true)}
              onKeyDown={(event) => {
                if (event.key !== 'Escape') return;
                event.preventDefault();
                setMenuOpen(false);
                event.currentTarget.blur();
              }}
              placeholder="Search make, model or serial..."
              autoComplete="off"
              aria-expanded={menuOpen}
              className="w-full rounded-[8px] border border-slate-300 py-2 pl-9 pr-9 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
            />
            {query !== '' && (
              <button
                type="button"
                className="absolute right-2 top-2 text-slate-400 hover:text-[#383838]"
                title="Clear search"
                onClick={() => {
                  setQuery('');
                  setMenuOpen(true);
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {menuOpen && (
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
                  onClick={() => {
                    setMenuOpen(false);
                    onChange({ ...row, capturingSheet: true });
                  }}
                >
                  Add from specification sheet
                </button>
              </div>
              </div>
            )}
          </div>
          {needsSpec && (
            <PhysicalMachineSpecSuggestions
              specs={suggestedSpecs}
              loading={suggestionsLoading}
              open={suggestionsOpen}
              onToggle={() => {
                if (suggestionsOpen) setSuggestionsOpen(false);
                else setSuggestionsOpen(true);
              }}
              onSelect={handleSelectSpec}
              onCapture={() => onChange({ ...row, capturingSheet: true })}
            />
          )}
        </div>
      )}
    </div>
  );
}

function PhysicalMachineSpecSuggestions({
  specs,
  loading,
  open,
  onToggle,
  onSelect,
  onCapture,
}: {
  specs: PublicMachineSpec[];
  loading: boolean;
  open: boolean;
  onToggle: () => void;
  onSelect: (spec: PublicMachineSpec) => void;
  onCapture: () => void;
}) {
  return (
    <div className="mt-3 rounded-[8px] border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {POSSIBLE_SPEC_MATCHES_HEADING}
        </p>
        <button
          type="button"
          className="shrink-0 text-xs font-medium text-[#0969a9] underline"
          onClick={onToggle}
        >
          {open ? 'Hide matches' : 'Show possible specification matches'}
        </button>
      </div>
      {open && (
        <div className="mt-2">
          {loading && (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" /> Searching the Machine
              Specification Library…
            </p>
          )}
          {!loading && specs.length > 0 && (
            <ul>
              {specs.map((item) => {
                const copy = specLibraryResultCopy(item);
                return (
                  <li key={item.recordId}>
                    <button
                      type="button"
                      className="w-full rounded-[8px] px-2 py-2 text-left hover:bg-white"
                      onClick={() => onSelect(item)}
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
          )}
          {!loading && specs.length === 0 && (
            <p className="text-sm text-slate-600">{NO_PUBLISHED_SPEC_MATCH_MESSAGE}</p>
          )}
        </div>
      )}
      <button
        type="button"
        className="mt-2 text-xs font-medium text-[#0969a9] underline"
        onClick={onCapture}
      >
        Add from specification sheet
      </button>
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
