import { useEffect, useState } from 'react';
import { Boxes, Plus, Trash2 } from 'lucide-react';

import type {
  AuditEquipmentGroup,
  AuditEvidenceReference,
  AuditMachineSpecProvenance,
  RecordValueProvenance,
} from '../../auditIntakeTypes';
import type { WizardSpecSnapshot } from '../wizardTypes';
import { EvidenceProvenanceOverrideEditor } from './EvidenceProvenanceOverrideEditor';
import {
  equipmentGroupBusinessProjection,
  equipmentGroupCurrentValue,
  isSourceBackedProvenance,
  recordOverride,
  structuredRecordChanged,
  structuredRecordIsRemovable,
} from '../recordProvenancePresentation';

const PROVENANCE_OPTIONS: { value: AuditMachineSpecProvenance; label: string }[] = [
  { value: 'exact_manufacturer_document', label: 'Exact manufacturer document' },
  { value: 'exact_library_match', label: 'Exact library match' },
  { value: 'customer_supplied', label: 'Customer supplied' },
  { value: 'source_document', label: 'Source document' },
  { value: 'nearest_model_reference_only', label: 'Nearest model — reference only' },
  { value: 'unconfirmed', label: 'Unknown / confirmation required' },
];

function emptyProvenance(): RecordValueProvenance {
  return {
    sourceValue: null,
    currentValue: null,
    sourceReference: null,
    sourceFilename: null,
    sourceSha256: null,
    sourcePage: null,
    sourceText: null,
    evidenceIds: [],
    verificationStatus: 'confirmation_required',
    overrideReason: null,
    actor: null,
    recordedAt: null,
  };
}

function newId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? String(Date.now())}`;
}

function GroupCard({
  group,
  evidence,
  disabled,
  onSave,
  onRemove,
}: {
  group: AuditEquipmentGroup;
  evidence: AuditEvidenceReference[];
  disabled: boolean;
  onSave: (group: AuditEquipmentGroup) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(group);
  useEffect(() => setDraft(group), [group]);
  const patch = <K extends keyof AuditEquipmentGroup>(
    key: K,
    value: AuditEquipmentGroup[K],
  ) => setDraft(current => ({ ...current, [key]: value }));
  const sourceBacked = isSourceBackedProvenance(group.provenance);
  const changed = structuredRecordChanged(
    group,
    draft,
    equipmentGroupBusinessProjection,
  );
  const removable = structuredRecordIsRemovable(group);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-800">
            {group.role === 'existing' ? 'Existing fleet group' : 'Proposed fleet group'}
          </p>
          <p className="text-[11px] text-slate-500">{group.groupId}</p>
        </div>
        <div className="text-right">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            group.exactLibraryMatch
              ? 'bg-emerald-100 text-emerald-800'
              : group.machineProvenance === 'nearest_model_reference_only' ||
                  group.specificationProvenance === 'nearest_model_reference_only'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-600'
          }`}>
            {group.exactLibraryMatch
              ? 'Exact library match'
              : group.machineProvenance === 'nearest_model_reference_only' ||
                  group.specificationProvenance === 'nearest_model_reference_only'
                ? 'Reference only'
                : 'Confirmation required'}
          </span>
          {removable ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onRemove}
              aria-label="Remove fleet group"
              className="ml-2 text-slate-400 hover:text-rose-600 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : (
            <p className="mt-1 max-w-60 text-[10px] text-slate-500">
              Source-backed records are retained; supersede through an evidenced override.
            </p>
          )}
        </div>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Input label="Manufacturer" value={draft.manufacturer} disabled={disabled} onChange={value => patch('manufacturer', value)} />
        <Input label="Model" value={draft.model} disabled={disabled} onChange={value => patch('model', value)} />
        <NumberInput label="Quantity" value={draft.quantity} disabled={disabled} required onChange={value => value !== null && patch('quantity', value)} />
        <NumberInput label="Rated flow (m³/min)" value={draft.ratedFlowM3PerMin} disabled={disabled} onChange={value => patch('ratedFlowM3PerMin', value)} />
        <NumberInput label="Rated pressure (bar(g))" value={draft.ratedPressureBarG} disabled={disabled} onChange={value => patch('ratedPressureBarG', value)} />
        <label className="text-[11px] text-slate-500">
          Specification evidence
          <select
            value={draft.specificationProvenance}
            disabled={disabled}
            onChange={event =>
              patch('specificationProvenance', event.target.value as AuditMachineSpecProvenance)
            }
            className="mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs disabled:bg-slate-100"
          >
            {PROVENANCE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>
      <EvidenceProvenanceOverrideEditor
        provenance={{
          ...group.provenance,
          currentValue: equipmentGroupCurrentValue(draft),
        }}
        evidence={evidence}
        disabled={disabled}
        requiresOverride={sourceBacked && changed}
        onApply={(reason, evidenceId) =>
          onSave({
            ...draft,
            provenance: recordOverride(
              group.provenance,
              equipmentGroupCurrentValue(draft),
              reason,
              evidenceId,
              sourceBacked && changed,
            ),
            specificationEvidenceIds: evidenceId
              ? [...new Set([...draft.specificationEvidenceIds, evidenceId])]
              : draft.specificationEvidenceIds,
          })
        }
      />
    </div>
  );
}

export function FleetGroupsEditor({
  groups,
  evidence,
  exactSelection,
  role,
  disabled,
  onChange,
}: {
  groups: AuditEquipmentGroup[];
  evidence: AuditEvidenceReference[];
  exactSelection?: WizardSpecSnapshot | null;
  role?: 'existing' | 'proposed';
  disabled: boolean;
  onChange: (groups: AuditEquipmentGroup[]) => void;
}) {
  const [pendingRole, setPendingRole] = useState<'existing' | 'proposed' | null>(null);
  const [newManufacturer, setNewManufacturer] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newProvenance, setNewProvenance] = useState<AuditMachineSpecProvenance | ''>('');
  const beginAdd = (groupRole: 'existing' | 'proposed') => {
    setPendingRole(groupRole);
    setNewManufacturer('');
    setNewModel('');
    setNewQuantity('');
    setNewProvenance('');
  };
  const explicitModel =
    exactSelection === null || exactSelection === undefined
      ? null
      : `${exactSelection.values.model}${
          exactSelection.values.modelVariant
            ? ` ${exactSelection.values.modelVariant}`
            : ''
        }`;
  const duplicatesExplicitSelection =
    explicitModel !== null &&
    Number(newQuantity) === 1 &&
    newManufacturer.trim().toLocaleLowerCase() ===
      exactSelection!.values.manufacturer.trim().toLocaleLowerCase() &&
    newModel.trim().toLocaleLowerCase() ===
      explicitModel.trim().toLocaleLowerCase();
  const add = () => {
    if (
      pendingRole === null ||
      !newManufacturer.trim() ||
      !newModel.trim() ||
      !Number.isInteger(Number(newQuantity)) ||
      Number(newQuantity) <= 0 ||
      newProvenance === ''
      || duplicatesExplicitSelection
    )
      return;
    const groupBase: AuditEquipmentGroup = {
      groupId: newId('fleet'),
      role: pendingRole,
      quantity: Number(newQuantity),
      manufacturer: newManufacturer.trim(),
      model: newModel.trim(),
      ratedFlowM3PerMin: null,
      ratedPressureBarG: null,
      machineProvenance: newProvenance,
      specificationProvenance: newProvenance,
      machineEvidenceIds: [],
      specificationEvidenceIds: [],
      exactLibraryMatch: false,
      provenance: emptyProvenance(),
    };
    onChange([...groups, groupBase]);
    setPendingRole(null);
    setNewManufacturer('');
    setNewModel('');
    setNewQuantity('');
    setNewProvenance('');
  };

  const shown = role === undefined ? groups : groups.filter(group => group.role === role);
  const replaceShown = (next: AuditEquipmentGroup[]) =>
    onChange(
      role === undefined
        ? next
        : [...groups.filter(group => group.role !== role), ...next],
    );

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <Boxes className="h-4 w-4 text-ars-primary" /> Fleet groups
          </p>
          <p className="text-[11px] text-slate-500">
            Homogeneous groups keep quantity and evidence visible. No group is inferred
            from the legacy single-machine fields.
          </p>
        </div>
        <div className="flex gap-1.5">
          {(role === undefined ? (['existing', 'proposed'] as const) : [role]).map(groupRole => (
            <button
              key={groupRole}
              type="button"
              disabled={disabled}
              onClick={() => beginAdd(groupRole)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium disabled:opacity-50"
            >
              <Plus className="h-3 w-3" /> Add {groupRole}
            </button>
          ))}
        </div>
      </div>
      {pendingRole !== null && (
        <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input label="Manufacturer" value={newManufacturer} disabled={disabled} onChange={setNewManufacturer} />
          <Input label="Model" value={newModel} disabled={disabled} onChange={setNewModel} />
          <label className="text-[11px] text-slate-500">
            Quantity
            <input type="number" min="1" step="1" value={newQuantity} disabled={disabled} onChange={event => setNewQuantity(event.target.value)} className="mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs disabled:bg-slate-100" />
          </label>
          <label className="text-[11px] text-slate-500">
            Evidence basis
            <select value={newProvenance} disabled={disabled} onChange={event => setNewProvenance(event.target.value as AuditMachineSpecProvenance | '')} className="mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs disabled:bg-slate-100">
              <option value="">Choose exact, reference, or unknown</option>
              {PROVENANCE_OPTIONS.filter(option => option.value !== 'exact_library_match').map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <button type="button" disabled={disabled || !newManufacturer.trim() || !newModel.trim() || Number(newQuantity) <= 0 || newProvenance === '' || duplicatesExplicitSelection} onClick={add} className="self-end rounded-md bg-ars-primary px-2.5 py-1.5 text-[11px] font-medium text-white disabled:opacity-50">
            Record {pendingRole} group
          </button>
          {duplicatesExplicitSelection && (
            <p className="text-[10px] text-amber-700 sm:col-span-2 lg:col-span-5">
              The explicit specification selection already populated this quantity-1 group. Edit its quantity above through an evidenced override.
            </p>
          )}
        </div>
      )}
      {shown.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">
          No fleet groups recorded. This is a valid missing state; no machine or
          quantity has been assumed.
        </p>
      ) : (
        shown.map(group => (
          <GroupCard
            key={group.groupId}
            group={group}
            evidence={evidence}
            disabled={disabled}
            onSave={next =>
              replaceShown(shown.map(item => (item.groupId === next.groupId ? next : item)))
            }
            onRemove={() => replaceShown(shown.filter(item => item.groupId !== group.groupId))}
          />
        ))
      )}
    </section>
  );
}

function Input({ label, value, disabled, onChange }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void }) {
  return (
    <label className="text-[11px] text-slate-500">
      {label}
      <input value={value} disabled={disabled} onChange={event => onChange(event.target.value)} className="mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs disabled:bg-slate-100" />
    </label>
  );
}

function NumberInput({ label, value, disabled, required, onChange }: { label: string; value: number | null; disabled: boolean; required?: boolean; onChange: (value: number | null) => void }) {
  return (
    <label className="text-[11px] text-slate-500">
      {label}
      <input
        type="number"
        min="0"
        step="any"
        value={value ?? ''}
        required={required}
        disabled={disabled}
        onChange={event => onChange(event.target.value === '' ? null : Number(event.target.value))}
        className="mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs disabled:bg-slate-100"
      />
    </label>
  );
}
