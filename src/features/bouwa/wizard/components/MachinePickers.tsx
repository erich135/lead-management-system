/**
 * Choosing machines from what ARS already knows.
 *
 * The mapping from a chosen machine to audit answers lives in
 * `machineSelection.ts`, so that what a selection is allowed to fill in can be
 * tested without a browser. These are the screens around it.
 */

import { useEffect, useState } from 'react';
import { Check, Cpu, Loader2, Search, Server } from 'lucide-react';

import { listBouwaMachineSpecs } from '../../api/bouwaApi';
import type { BouwaMachineSpec } from '../../types';
import type { Machine } from '../../../../lib/api';

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

export function ExistingMachinePicker({
  machines,
  customerChosen,
  selectedMachineId,
  disabled,
  onSelect,
}: {
  machines: readonly Machine[];
  customerChosen: boolean;
  selectedMachineId: string | null;
  disabled: boolean;
  onSelect: (machine: Machine) => void;
}) {
  return (
    <Panel
      title="Existing machine"
      icon={<Server className="h-4 w-4 text-ars-primary" />}
      note="From the ARS machine register. Choosing one fills its make, model and serial number. ARS holds no ratings, so the datasheet figures are still asked for below."
    >
      {!customerChosen ? (
        <p className="mt-1.5 text-xs text-slate-500">
          Choose the customer on the earlier step to see the machines ARS holds
          against them.
        </p>
      ) : machines.length === 0 ? (
        <p className="mt-1.5 text-xs text-slate-500">
          ARS holds no machines against this customer. Enter the machine below.
        </p>
      ) : (
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
          {machines.map(machine => (
            <li key={machine._id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(machine)}
                className={`flex w-full items-center justify-between gap-3 rounded-md border px-2.5 py-1.5 text-left text-xs ${
                  selectedMachineId === machine._id
                    ? 'border-ars-primary bg-blue-50'
                    : 'border-slate-200 hover:bg-slate-50'
                } disabled:opacity-50`}
              >
                <span>
                  <span className="block font-medium text-slate-800">
                    {machine.make} {machine.model}
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    Serial {machine.serialNumber}
                    {machine.currentLocation
                      ? ` · ${machine.currentLocation}`
                      : ''}
                  </span>
                </span>
                {selectedMachineId === machine._id ? (
                  <Check className="h-4 w-4 shrink-0 text-ars-primary" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function ProposedMachinePicker({
  selectedSpecId,
  disabled,
  onSelect,
}: {
  selectedSpecId: string | null;
  disabled: boolean;
  onSelect: (spec: BouwaMachineSpec) => void;
}) {
  const [search, setSearch] = useState('');
  const [specs, setSpecs] = useState<BouwaMachineSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    let live = true;
    setLoading(true);
    const timer = setTimeout(() => {
      listBouwaMachineSpecs(
        search.trim() === '' ? { limit: 25 } : { search: search.trim(), limit: 25 },
      )
        .then(found => {
          if (live) setSpecs(Array.isArray(found) ? found : []);
        })
        .catch(() => {
          if (live) setProblem('The machine spec library could not be read.');
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
    <Panel
      title="Proposed machine"
      icon={<Cpu className="h-4 w-4 text-ars-primary" />}
      note="From the Bouwa machine spec library. Choosing one fills the published capacity and power. The flow-reference basis is never filled in for you, because the library does not state it."
    >
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="search"
          disabled={disabled}
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search the spec library…"
          className="w-full rounded-md border border-slate-300 py-1.5 pl-8 pr-8 text-sm disabled:bg-slate-100"
        />
        {loading ? (
          <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-slate-400" />
        ) : null}
      </div>
      {problem === '' ? null : (
        <p className="mt-1.5 text-xs text-amber-700">{problem}</p>
      )}
      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
        {specs.map(spec => (
          <li key={spec._id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(spec)}
              className={`flex w-full items-center justify-between gap-3 rounded-md border px-2.5 py-1.5 text-left text-xs ${
                selectedSpecId === spec._id
                  ? 'border-ars-primary bg-blue-50'
                  : 'border-slate-200 hover:bg-slate-50'
              } disabled:opacity-50`}
            >
              <span>
                <span className="block font-medium text-slate-800">
                  {spec.manufacturer ?? spec.brand ?? 'Unnamed'}{' '}
                  {spec.modelName ?? spec.modelCode ?? ''}
                </span>
                <span className="block text-[11px] text-slate-500">
                  {spec.ratedCapacityM3Min === undefined
                    ? 'capacity not published'
                    : `${spec.ratedCapacityM3Min} m³/min`}
                  {spec.ratedPressureBar === undefined
                    ? ''
                    : ` · ${spec.ratedPressureBar} bar as published`}
                  {spec.packageInputKw ?? spec.motorKw
                    ? ` · ${spec.packageInputKw ?? spec.motorKw} kW`
                    : ''}
                </span>
              </span>
              {selectedSpecId === spec._id ? (
                <Check className="h-4 w-4 shrink-0 text-ars-primary" />
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
