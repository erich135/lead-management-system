import { useEffect, useState } from 'react';
import { BookOpenCheck, Plus, Trash2 } from 'lucide-react';

import type {
  AuditEvidenceReference,
  SourceStatedValueRecord,
} from '../../auditIntakeTypes';
import { EvidenceProvenanceOverrideEditor } from './EvidenceProvenanceOverrideEditor';
import {
  isSourceBackedProvenance,
  recordOverride,
  sourceStatedValueBusinessProjection,
  sourceStatedValueCurrentValue,
  structuredRecordChanged,
  structuredRecordIsRemovable,
} from '../recordProvenancePresentation';

export function SourceStatedValuesEditor({
  values,
  evidence,
  disabled,
  onChange,
}: {
  values: SourceStatedValueRecord[];
  evidence: AuditEvidenceReference[];
  disabled: boolean;
  onChange: (values: SourceStatedValueRecord[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [numeric, setNumeric] = useState(true);
  const ready =
    label.trim() !== '' &&
    value.trim() !== '' &&
    unit.trim() !== '' &&
    sourceReference.trim() !== '' &&
    (!numeric || Number.isFinite(Number(value)));

  function add() {
    if (!ready) return;
    const sourceValue = numeric ? Number(value) : value.trim();
    onChange([...values, {
      valueId: `source-value-${globalThis.crypto?.randomUUID?.() ?? String(Date.now())}`,
      label: label.trim(),
      value: sourceValue,
      unit: unit.trim(),
      provenance: {
        sourceValue,
        currentValue: sourceValue,
        sourceReference: sourceReference.trim(),
        sourceFilename: null,
        sourceSha256: null,
        sourcePage: null,
        sourceText: null,
        evidenceIds: [],
        verificationStatus: 'confirmation_required',
        overrideReason: null,
        actor: null,
        recordedAt: null,
      },
    }]);
    setAdding(false);
    setLabel('');
    setValue('');
    setUnit('');
    setSourceReference('');
  }

  return (
    <section className="space-y-2">
      <div className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-slate-800"><BookOpenCheck className="h-4 w-4 text-ars-primary" /> Source-stated values</p>
          <p className="text-[11px] text-slate-500">Transcribe source claims exactly. Any proposal override is stored alongside the source value, never over it.</p>
        </div>
        <button type="button" disabled={disabled} onClick={() => setAdding(value => !value)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium disabled:opacity-50"><Plus className="h-3 w-3" /> Add value</button>
      </div>
      {adding && (
        <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Source label" value={label} onChange={setLabel} />
          <Input label="Value as stated" value={value} onChange={setValue} />
          <Input label="Unit as stated" value={unit} onChange={setUnit} />
          <Input label="Source reference" value={sourceReference} onChange={setSourceReference} />
          <label className="flex items-center gap-2 text-[11px] text-slate-600"><input type="checkbox" checked={numeric} onChange={event => setNumeric(event.target.checked)} /> Numeric source value</label>
          <button type="button" disabled={!ready} onClick={add} className="rounded-md bg-ars-primary px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-50">Record source value</button>
        </div>
      )}
      {values.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">No source-stated value supplied.</p>
      ) : values.map(entry => (
        <SourceValue key={entry.valueId} entry={entry} evidence={evidence} disabled={disabled} onSave={next => onChange(values.map(item => item.valueId === next.valueId ? next : item))} onRemove={() => onChange(values.filter(item => item.valueId !== entry.valueId))} />
      ))}
    </section>
  );
}

function SourceValue({ entry, evidence, disabled, onSave, onRemove }: { entry: SourceStatedValueRecord; evidence: AuditEvidenceReference[]; disabled: boolean; onSave: (entry: SourceStatedValueRecord) => void; onRemove: () => void }) {
  const [currentValue, setCurrentValue] = useState(String(entry.provenance.currentValue ?? entry.value));
  useEffect(
    () => setCurrentValue(String(entry.provenance.currentValue ?? entry.value)),
    [entry],
  );
  const converted = typeof entry.value === 'number' ? Number(currentValue) : currentValue;
  const candidate = { ...entry, value: converted };
  const sourceBacked = isSourceBackedProvenance(entry.provenance);
  const changed = structuredRecordChanged(
    entry,
    candidate,
    sourceStatedValueBusinessProjection,
  );
  const removable = structuredRecordIsRemovable(entry);
  const displayedSource = entry.provenance.sourceValue ?? entry.value;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-800">{entry.label}</p>
          <p className="text-sm font-medium text-blue-800">Source: {String(displayedSource)} {entry.unit}</p>
          <p className="text-[11px] text-slate-500">{entry.provenance.sourceReference ?? entry.provenance.sourceFilename}</p>
        </div>
        {removable ? (
          <button type="button" disabled={disabled} onClick={onRemove} className="text-rose-600 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
        ) : (
          <p className="max-w-60 text-right text-[10px] text-slate-500">Source-backed records are retained; supersede through an evidenced override.</p>
        )}
      </div>
      <Input label="Current proposal value (optional override)" value={currentValue} onChange={setCurrentValue} disabled={disabled} />
      <EvidenceProvenanceOverrideEditor
        provenance={{
          ...entry.provenance,
          currentValue: sourceStatedValueCurrentValue(candidate),
        }}
        evidence={evidence}
        disabled={disabled || (typeof entry.value === 'number' && !Number.isFinite(converted))}
        requiresOverride={sourceBacked && changed}
        onApply={(reason, evidenceId) => onSave({
          ...candidate,
          provenance: recordOverride(
            entry.provenance,
            sourceStatedValueCurrentValue(candidate),
            reason,
            evidenceId,
            sourceBacked && changed,
          ),
        })}
      />
    </div>
  );
}

function Input({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return <label className="text-[11px] text-slate-500">{label}<input value={value} disabled={disabled} onChange={event => onChange(event.target.value)} className="mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs disabled:bg-slate-100" /></label>;
}
