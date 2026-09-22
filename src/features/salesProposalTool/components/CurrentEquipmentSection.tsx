import { useEffect, useRef, useState } from 'react';
import { useDismissibleSearchMenu } from '../useDismissibleSearchMenu';
import { Loader2, Search, X } from 'lucide-react';
import { getMachinesByCustomer, type Machine } from '../../../lib/api';
import { readSpecLibraryRecord, searchSpecLibrary } from '../api';
import {
  describeCurrentMachineDropdown,
} from '../currentMachineSearch';
import { machineRecordId, toSearchableMachine } from '../customerMachineSearch';
import {
  applyLibrarySpec,
  applyConfirmedLibrarySpec,
  applyPhysicalMachine,
  attachHydratedLibrarySpec,
  canAddPhysicalMachine,
  currentMachineCardTitle,
  currentMachineIsComplete,
  currentMachineNeedsSpec,
  installedSpecSearchHint,
  libraryHydrationSignature,
  newCurrentEquipmentDraft,
  resetCurrentMachine,
  startManualCurrent,
  type CurrentEquipmentDraft,
} from '../equipmentState';
import { resolveDraftPublishedFlowReference, hasKnownFlowReferenceBasis, AIRFLOW_REFERENCE_NEEDS_CONFIRMATION, OPEN_ADVANCED_SPECIFICATIONS_ACTION, type PublishedFlowReference } from '../publishedFlowReference';
import {
  effectiveMotorShaft,
  effectivePackageInput,
  effectiveRatedAirflow,
  effectiveRatedPressure,
  specLibraryResultCopy,
} from '../specDisplay';
import { inferElectricalPowerKind, resolvePackageInputKw } from '../electricalPowerInput';
import { SEARCH_MENU_PANEL, searchMenuWrapClass } from '../searchOverlay';
import {
  NO_PUBLISHED_SPEC_MATCH_MESSAGE,
  POSSIBLE_SPEC_MATCHES_HEADING,
  physicalMachineLibrarySearchQuery,
  rankPublishedSpecsForPhysicalMachine,
} from '../suggestPublishedSpecs';
import type { ElectricalPowerKind, PublicMachineSpec, SourceBackedSpec } from '../types';
import { PublishedRatingFields } from './PublishedRatingFields';
import { SpecSheetCapture } from './SpecSheetCapture';
import { MachineActionRow, QuantityField } from './MachineCardControls';
import { MachineEfficiencyField } from './MachineEfficiencyField';
import { VariableSpeedDriveCheckbox } from './VariableSpeedDriveCheckbox';
import { MissingHint } from './EditorSection';
import {
  LIBRARY_ADDED_STATUS,
  LIBRARY_USING_STATUS,
  PROPOSAL_ONLY_LIBRARY_STATUS,
} from '../confirmSpecSheet';
import { efficiencyFieldsFromRow } from '../machineEfficiency';
import { inferVariableSpeedDriveFromControlType, resolveVariableSpeedDrive } from '../variableSpeedDrive';

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
  const inFlightKeys = useRef(new Set<string>());
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const hydrateSignature = libraryHydrationSignature(rows);

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
    if (rows.length > 0) return;
    onChange([newCurrentEquipmentDraft()]);
  }, [rows.length, onChange]);

  useEffect(() => {
    const missing = rowsRef.current.filter(
      (row) =>
        row.specLibraryRecordId &&
        !row.selectedSpec &&
        !row.changingSpec &&
        !inFlightKeys.current.has(row.key),
    );
    if (missing.length === 0) return;
    const keys = missing.map((row) => row.key);
    keys.forEach((key) => inFlightKeys.current.add(key));
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
      keys.forEach((key) => inFlightKeys.current.delete(key));
      if (cancelled) return;
      onChange(
        rowsRef.current.map((row) => {
          const hit = loaded.find((item) => item.key === row.key);
          if (!hit) return row;
          return attachHydratedLibrarySpec(row, hit.spec);
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [hydrateSignature, onChange]);

  function updateRow(key: string, next: CurrentEquipmentDraft) {
    onChange(rows.map((row) => (row.key === key ? next : row)));
  }

  return (
    <div className="space-y-4 overflow-visible">
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
        Add another machine
      </button>
    </div>
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
  customerId: string | null;
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
  const { menuOpen, menuRef: searchMenuRef, openMenu, closeMenu } =
    useDismissibleSearchMenu();
  const [suggestedSpecs, setSuggestedSpecs] = useState<PublicMachineSpec[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const complete = currentMachineIsComplete(row) && !row.changingSpec;
  const needsSpec = currentMachineNeedsSpec(row);

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
    closeMenu();
    const next = applyPhysicalMachine(row, machine);
    if (next.specLibraryRecordId) {
      try {
        const spec = await readSpecLibraryRecord(next.specLibraryRecordId);
        onChange({
          ...next,
          selectedSpec: spec,
          changingSpec: false,
          electricalPowerKind: inferElectricalPowerKind({
            packageInputPowerKw: spec.packageInputPowerKw,
            motorShaftPowerKw: spec.motorShaftPowerKw,
          }),
          ...resolveDraftPublishedFlowReference({
            ...next,
            selectedSpec: spec,
          }),
        });
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
    closeMenu();
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
          target="current"
          currentEquipmentId={row.key}
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
              electricalPowerKind: inferElectricalPowerKind({
                packageInputPowerKw: values.packageInputPowerKw,
                motorShaftPowerKw: values.motorShaftPowerKw,
              }),
              variableSpeedDrive:
                typeof row.variableSpeedDrive === 'boolean'
                  ? row.variableSpeedDrive
                  : inferVariableSpeedDriveFromControlType(values.controlType),
            })
          }
          onConfirmed={({ spec, sourceBacked }) =>
            onChange(applyConfirmedLibrarySpec(row, spec, sourceBacked))
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
          {complete ? ` · × ${row.quantity}` : ''}
        </p>
        <button type="button" onClick={onRemove} className="text-slate-400 hover:text-[#383838]" title="Remove machine">
          <X className="h-4 w-4" />
        </button>
      </div>

      <VariableSpeedDriveCheckbox
        checked={resolveVariableSpeedDrive(row)}
        onChange={(variableSpeedDrive) => onChange({ ...row, variableSpeedDrive })}
      />

      {complete ? (
        <SelectedCurrentMachine
          proposalId={proposalId}
          row={row}
          onSerialChange={(serialNumber) => onChange({ ...row, serialNumber })}
          onSourceChange={(sourceBacked) => onChange({ ...row, sourceBacked })}
          onElectricalPowerKindChange={(electricalPowerKind) =>
            onChange({ ...row, electricalPowerKind })
          }
          onFlowReferenceChange={(flowReference) => onChange({ ...row, ...flowReference })}
          onAdvancedOpenChange={(advancedSpecificationsOpen) =>
            onChange({ ...row, specsOpen: true, advancedSpecificationsOpen })
          }
          onChangeMachine={() => {
            onChange(resetCurrentMachine(row));
            setQuery('');
            openMenu();
          }}
          onCapture={() => onChange({ ...row, capturingSheet: true })}
          onQuantityChange={(quantity) => onChange({ ...row, quantity })}
          onEfficiencyChange={(efficiency) => onChange({ ...row, ...efficiency })}
          onToggleSpecs={() => onChange({ ...row, specsOpen: !row.specsOpen })}
          onEnterManually={() => onChange(startManualCurrent(row))}
        />
      ) : (
        <div className="overflow-visible">
          <MachineActionRow
            onLibrary={() => {
              openMenu();
              onChange({ ...row, changingSpec: true, enteringManually: false });
            }}
            onManual={() => onChange(startManualCurrent(row))}
            onUpload={() => onChange({ ...row, capturingSheet: true })}
          />
          <div className="mt-3">
            <MachineEfficiencyField
              proposalId={proposalId}
              value={efficiencyFieldsFromRow(row)}
              onChange={(efficiency) => onChange({ ...row, ...efficiency })}
            />
          </div>
          {row.enteringManually && (
            <div className="mt-3 space-y-2">
              <label className="block">
                <span className="text-xs font-medium text-slate-500">Make</span>
                <input
                  type="text"
                  value={row.make}
                  onChange={(event) => onChange({ ...row, make: event.target.value })}
                  className="mt-1 w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-500">Model</span>
                <input
                  type="text"
                  value={row.model}
                  onChange={(event) => onChange({ ...row, model: event.target.value })}
                  className="mt-1 w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
                />
              </label>
            </div>
          )}
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
                openMenu();
              }}
              onClick={openMenu}
              onFocus={openMenu}
              onKeyDown={(event) => {
                if (event.key !== 'Escape') return;
                event.preventDefault();
                closeMenu();
              }}
              placeholder="Search make, model, serial or library..."
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
                  openMenu();
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
                      {dropdown.customer.length > 0 && (
                        <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Customer machines
                        </p>
                      )}
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
                    closeMenu();
                    onChange({ ...row, capturingSheet: true });
                  }}
                >
                  Add from specification sheet
                </button>
                {' · '}
                <button
                  type="button"
                  className="font-medium text-[#0969a9] underline"
                  onClick={() => {
                    closeMenu();
                    onChange(startManualCurrent(row));
                  }}
                >
                  Enter manually
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
              onManual={() => onChange(startManualCurrent(row))}
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
  onManual,
}: {
  specs: PublicMachineSpec[];
  loading: boolean;
  open: boolean;
  onToggle: () => void;
  onSelect: (spec: PublicMachineSpec) => void;
  onCapture: () => void;
  onManual: () => void;
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
      <button
        type="button"
        className="mt-2 ml-3 text-xs font-medium text-[#0969a9] underline"
        onClick={onManual}
      >
        Enter manually
      </button>
    </div>
  );
}

function SelectedCurrentMachine({
  proposalId,
  row,
  onSerialChange,
  onSourceChange,
  onElectricalPowerKindChange,
  onFlowReferenceChange,
  onAdvancedOpenChange,
  onChangeMachine,
  onCapture,
  onQuantityChange,
  onEfficiencyChange,
  onToggleSpecs,
  onEnterManually,
}: {
  proposalId: string;
  row: CurrentEquipmentDraft;
  onSerialChange: (serialNumber: string) => void;
  onSourceChange: (sourceBacked: SourceBackedSpec) => void;
  onElectricalPowerKindChange: (kind: ElectricalPowerKind) => void;
  onFlowReferenceChange: (flowReference: PublishedFlowReference) => void;
  onAdvancedOpenChange: (open: boolean) => void;
  onChangeMachine: () => void;
  onCapture: () => void;
  onQuantityChange: (quantity: number) => void;
  onEfficiencyChange: (efficiency: ReturnType<typeof efficiencyFieldsFromRow>) => void;
  onToggleSpecs: () => void;
  onEnterManually: () => void;
}) {
  const title = currentMachineCardTitle(row);
  const source =
    row.selectedSpec?.sourceTitle ||
    row.selectedSpec?.sourceFileName ||
    row.sourceBacked?.sourceFileName ||
    null;
  const pressure = effectiveRatedPressure(row.selectedSpec, row.sourceBacked);
  const airflow = effectiveRatedAirflow(row.selectedSpec, row.sourceBacked);
  const packageInput = effectivePackageInput(row.selectedSpec, row.sourceBacked);
  const motor = effectiveMotorShaft(row.selectedSpec, row.sourceBacked);
  const missingPower =
    resolvePackageInputKw({
      storedKind: row.electricalPowerKind ?? null,
      packageInputPowerKw: packageInput.value,
      motorShaftPowerKw: motor.value,
    }).packageInputKw === null;
  const missingAirflow = airflow.value === null;
  const missingPressure = pressure.value === null;
  const flowReference = resolveDraftPublishedFlowReference(row);
  const unknownFlowReference = !hasKnownFlowReferenceBasis(flowReference.flowReferenceBasis);
  const libraryOnly = !row.arsMachineId;
  const addedFromSheet = Boolean(row.sourceBacked?.sourceFileId);

  return (
    <div>
      <p className="text-sm font-medium text-[#383838]">{title}</p>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <QuantityField value={row.quantity ?? 1} onChange={onQuantityChange} />
        <button
          type="button"
          className="text-xs font-medium text-[#0969a9] underline"
          onClick={onToggleSpecs}
        >
          {row.specsOpen ? 'Hide specifications' : 'Show specifications'}
        </button>
      </div>
      <div className="mt-3">
        <MachineEfficiencyField
          proposalId={proposalId}
          value={efficiencyFieldsFromRow(row)}
          onChange={onEfficiencyChange}
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {row.specLibraryRecordId
          ? addedFromSheet
            ? `${LIBRARY_ADDED_STATUS}. ${LIBRARY_USING_STATUS}`
            : LIBRARY_USING_STATUS
          : PROPOSAL_ONLY_LIBRARY_STATUS}
      </p>
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
        {row.specsOpen && (
          <>
            <PublishedRatingFields
              library={row.selectedSpec}
              source={row.sourceBacked}
              identity={{
                manufacturer: row.selectedSpec?.manufacturer ?? row.make,
                model: row.selectedSpec?.model ?? row.model,
                modelVariant: row.selectedSpec?.modelVariant ?? null,
              }}
              electricalPowerKind={row.electricalPowerKind ?? null}
              onSourceChange={onSourceChange}
              onElectricalPowerKindChange={onElectricalPowerKindChange}
              flowReference={flowReference}
              onFlowReferenceChange={onFlowReferenceChange}
              advancedOpen={row.advancedSpecificationsOpen === true}
              onAdvancedOpenChange={onAdvancedOpenChange}
            />
            {source && (
              <div>
                <dt className="text-xs font-medium text-slate-500">Source</dt>
                <dd className="text-sm text-[#383838]">{source}</dd>
              </div>
            )}
          </>
        )}
      </dl>
      {(missingPower || missingAirflow || missingPressure) && (
        <MissingHint>
          Enter the missing published ratings, or{' '}
          <button type="button" className="font-medium text-[#0969a9] underline" onClick={onCapture}>
            add from a specification sheet
          </button>
          .
        </MissingHint>
      )}
      {unknownFlowReference && !row.specsOpen && (
        <MissingHint>
          {AIRFLOW_REFERENCE_NEEDS_CONFIRMATION}
          {' '}
          <button
            type="button"
            className="font-medium text-[#0969a9] underline"
            onClick={() => onAdvancedOpenChange(true)}
          >
            {OPEN_ADVANCED_SPECIFICATIONS_ACTION}
          </button>
        </MissingHint>
      )}
      {!(missingPower || missingAirflow || missingPressure) && (
        <button type="button" className="mt-2 text-xs font-medium text-[#0969a9] underline" onClick={onCapture}>
          Add from specification sheet
        </button>
      )}
      <button
        type="button"
        onClick={onChangeMachine}
        className="mt-3 text-xs font-medium text-[#0969a9] underline"
      >
        Change machine
      </button>
      <div className="mt-3">
        <MachineActionRow
          onLibrary={onChangeMachine}
          onManual={onEnterManually}
          onUpload={onCapture}
        />
      </div>
    </div>
  );
}
