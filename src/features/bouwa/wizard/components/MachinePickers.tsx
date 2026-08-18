/**
 * Choosing machines from what ARS and the specification library already know.
 *
 * The mapping from a chosen record to audit answers lives in
 * `machineSelection.ts`, so what a selection is allowed to fill in can be
 * tested without a browser. These are the screens around it.
 *
 * Two rules shape the whole file. A rep never sees an internal identifier, so
 * a machine reads as its make, model, serial and location. And a search result
 * says what its source did not publish as plainly as what it did, because a
 * directory line and a full data sheet look identical in a list right up to
 * the point where an output turns out to be blocked.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Cpu,
  Loader2,
  Plus,
  Search,
  Server,
} from 'lucide-react';

import {
  listInstalledMachines,
  searchSpecLibrary,
} from '../wizardApi';
import type {
  WizardInstalledMachine,
  WizardSpecRecord,
} from '../wizardTypes';

function Panel({
  title,
  icon,
  note,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
        {icon}
        {title}
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{note}</p>
      {children}
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
  disabled,
  loading,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  loading: boolean;
}) {
  return (
    <div className="relative mt-2">
      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
      <input
        type="search"
        disabled={disabled}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 py-1.5 pl-8 pr-8 text-sm disabled:bg-slate-100"
      />
      {loading ? (
        <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-slate-400" />
      ) : null}
    </div>
  );
}

function ChoiceButton({
  chosen,
  disabled,
  onClick,
  heading,
  detail,
  caution,
}: {
  chosen: boolean;
  disabled: boolean;
  onClick: () => void;
  heading: string;
  detail: string;
  caution?: string | null;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-start justify-between gap-3 rounded-md border px-2.5 py-1.5 text-left text-xs ${
        chosen ? 'border-ars-primary bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
      } disabled:opacity-50`}
    >
      <span className="min-w-0">
        <span className="block font-medium text-slate-800">{heading}</span>
        <span className="block text-[11px] text-slate-500">{detail}</span>
        {caution ? (
          <span className="mt-0.5 flex items-start gap-1 text-[11px] text-amber-700">
            <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
            {caution}
          </span>
        ) : null}
      </span>
      {chosen ? <Check className="h-4 w-4 shrink-0 text-ars-primary" /> : null}
    </button>
  );
}

/** What a record does not publish, said once and briefly. */
function absenceCaution(record: WizardSpecRecord): string | null {
  if (record.absentPublishedValues.length === 0) return null;
  const named = record.absentPublishedValues.slice(0, 3).join(', ');
  const more =
    record.absentPublishedValues.length > 3
      ? ` and ${String(record.absentPublishedValues.length - 3)} more`
      : '';
  return `Not published by this source: ${named}${more}.`;
}

function specDetail(record: WizardSpecRecord): string {
  return `${record.summary} · ${record.source.sourceTitle}`;
}

function specHeading(record: WizardSpecRecord): string {
  return `${record.manufacturer} ${record.model}${
    record.modelVariant === null ? '' : ` ${record.modelVariant}`
  }`;
}

/* ------------------------------------------------------------------ *
 * The machine already standing on the site
 * ------------------------------------------------------------------ */

export type ExistingMachineRoute =
  | 'ars_register'
  | 'search_spec_library'
  | 'unknown_for_now';

export function ExistingMachinePicker({
  customerId,
  siteName,
  selectedMachineId,
  selectedSpecId,
  disabled,
  onSelectInstalled,
  onSelectSpec,
  onUnknown,
}: {
  customerId: string | null;
  siteName: string | null;
  selectedMachineId: string | null;
  selectedSpecId: string | null;
  disabled: boolean;
  onSelectInstalled: (machine: WizardInstalledMachine) => void;
  onSelectSpec: (record: WizardSpecRecord) => void;
  onUnknown: () => void;
}) {
  const [machines, setMachines] = useState<WizardInstalledMachine[]>([]);
  const [noneRegistered, setNoneRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState('');
  const [route, setRoute] = useState<ExistingMachineRoute>('ars_register');

  useEffect(() => {
    if (customerId === null) {
      setMachines([]);
      setNoneRegistered(false);
      return;
    }
    let live = true;
    setLoading(true);
    setProblem('');
    listInstalledMachines({
      customerId,
      site: siteName ?? undefined,
      limit: 50,
    })
      .then(found => {
        if (!live) return;
        setMachines(found.machines);
        setNoneRegistered(found.noneRegistered);
        // An empty register is not an error; it is a different set of choices,
        // so the screen moves the rep straight to the ones that apply.
        if (found.noneRegistered) setRoute('search_spec_library');
      })
      .catch(() => {
        if (live) setProblem('The ARS machine register could not be read.');
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [customerId, siteName]);

  return (
    <Panel
      title="Installed machine"
      icon={<Server className="h-4 w-4 text-ars-primary" />}
      note="Choosing a registered machine fills its make, model, serial number and location. Its published ratings come from the specification library, which is searched next."
    >
      {customerId === null ? (
        <p className="mt-1.5 text-xs text-slate-500">
          Choose the customer on the earlier step to see the machines ARS holds
          against them.
        </p>
      ) : (
        <>
          {noneRegistered ? (
            <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
              <p className="text-xs font-medium text-slate-700">
                No machines are registered for this customer
                {siteName === null ? '' : ` at ${siteName}`}.
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <RouteButton
                  active={route === 'search_spec_library'}
                  disabled={disabled}
                  onClick={() => setRoute('search_spec_library')}
                  label="Search Machine Spec Library"
                />
                <RouteButton
                  active={route === 'unknown_for_now'}
                  disabled={disabled}
                  onClick={() => {
                    setRoute('unknown_for_now');
                    onUnknown();
                  }}
                  label="Machine details unknown for now"
                />
              </div>
            </div>
          ) : (
            <>
              {loading ? (
                <p className="mt-1.5 text-xs text-slate-500">
                  Reading the ARS machine register…
                </p>
              ) : null}
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {machines.map(machine => (
                  <li key={machine.machineId}>
                    <ChoiceButton
                      chosen={selectedMachineId === machine.machineId}
                      disabled={disabled}
                      onClick={() => onSelectInstalled(machine)}
                      heading={`${machine.manufacturer} ${machine.model}`}
                      detail={[
                        machine.serialNumber === null
                          ? 'No serial recorded'
                          : `Serial ${machine.serialNumber}`,
                        machine.location,
                      ]
                        .filter(part => part !== null && part !== '')
                        .join(' · ')}
                    />
                  </li>
                ))}
              </ul>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <RouteButton
                  active={route === 'search_spec_library'}
                  disabled={disabled}
                  onClick={() => setRoute('search_spec_library')}
                  label="Add installed machine"
                />
              </div>
            </>
          )}

          {route === 'search_spec_library' ? (
            <div className="mt-2 border-t border-slate-200 pt-2">
              <SpecLibrarySearch
                title="Search Machine Spec Library"
                selectedRecordId={selectedSpecId}
                disabled={disabled}
                onSelect={onSelectSpec}
              />
            </div>
          ) : null}

          {problem === '' ? null : (
            <p className="mt-1.5 text-xs text-amber-700">{problem}</p>
          )}
        </>
      )}
    </Panel>
  );
}

function RouteButton({
  active,
  disabled,
  onClick,
  label,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium ${
        active
          ? 'border-ars-primary bg-blue-50 text-ars-primary'
          : 'border-slate-300 text-slate-600 hover:bg-slate-50'
      } disabled:opacity-50`}
    >
      <Plus className="h-3 w-3" />
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Searching the library
 * ------------------------------------------------------------------ */

export function SpecLibrarySearch({
  title,
  selectedRecordId,
  disabled,
  onSelect,
}: {
  title: string;
  selectedRecordId: string | null;
  disabled: boolean;
  onSelect: (record: WizardSpecRecord) => void;
}) {
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<WizardSpecRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    let live = true;
    setLoading(true);
    const timer = setTimeout(() => {
      searchSpecLibrary({
        equipmentType: 'air_compressor',
        search: search.trim() === '' ? undefined : search.trim(),
        limit: 25,
      })
        .then(found => {
          if (live) setRecords(found);
        })
        .catch(() => {
          if (live)
            setProblem('The machine specification library could not be read.');
        })
        .finally(() => {
          if (live) setLoading(false);
        });
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [search]);

  return (
    <>
      <p className="text-xs font-medium text-slate-700">{title}</p>
      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Make, model, or both — for example Atlas GA55"
        disabled={disabled}
        loading={loading}
      />
      {problem === '' ? null : (
        <p className="mt-1.5 text-xs text-amber-700">{problem}</p>
      )}
      {!loading && records.length === 0 ? (
        <p className="mt-1.5 text-xs text-slate-500">
          {search.trim() === ''
            ? 'The library holds no compressor records yet.'
            : `Nothing in the library matches “${search.trim()}”. Add the proposed machine below if it is not listed.`}
        </p>
      ) : null}
      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
        {records.map(record => (
          <li key={record.recordId}>
            <ChoiceButton
              chosen={selectedRecordId === record.recordId}
              disabled={disabled}
              onClick={() => onSelect(record)}
              heading={specHeading(record)}
              detail={specDetail(record)}
              caution={absenceCaution(record)}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * The machine being proposed
 * ------------------------------------------------------------------ */

export function ProposedMachinePicker({
  selectedRecordId,
  disabled,
  onSelect,
  onNotListed,
  onUnknown,
}: {
  selectedRecordId: string | null;
  disabled: boolean;
  onSelect: (record: WizardSpecRecord) => void;
  onNotListed: () => void;
  onUnknown: () => void;
}) {
  const notListed = useCallback(() => onNotListed(), [onNotListed]);
  const unknown = useCallback(() => onUnknown(), [onUnknown]);

  return (
    <Panel
      title="Proposed machine"
      icon={<Cpu className="h-4 w-4 text-ars-primary" />}
      note="Choosing a machine fills every value its source published, and leaves the rest as questions. A value the source never printed is never filled in for you."
    >
      <SpecLibrarySearch
        title="Search Machine Spec Library"
        selectedRecordId={selectedRecordId}
        disabled={disabled}
        onSelect={onSelect}
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        <RouteButton
          active={false}
          disabled={disabled}
          onClick={notListed}
          label="Add proposed machine not listed"
        />
        <RouteButton
          active={false}
          disabled={disabled}
          onClick={unknown}
          label="Unknown — confirmation required"
        />
      </div>
    </Panel>
  );
}
