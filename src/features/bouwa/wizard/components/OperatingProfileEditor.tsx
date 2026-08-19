import { useEffect, useState } from 'react';
import { Clock3, Plus, Trash2 } from 'lucide-react';

import type {
  AuditEvidenceReference,
  AuditOperatingProfileFlowBasis,
  AuditOperatingProfileSegment,
  RecordValueProvenance,
} from '../../auditIntakeTypes';
import { EvidenceProvenanceOverrideEditor } from './EvidenceProvenanceOverrideEditor';
import {
  isSourceBackedProvenance,
  operatingSegmentBusinessProjection,
  operatingSegmentCurrentValue,
  recordOverride,
  structuredRecordChanged,
  structuredRecordIsRemovable,
} from '../recordProvenancePresentation';

function blankProvenance(): RecordValueProvenance {
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

function SegmentCard({
  segment,
  evidence,
  disabled,
  onSave,
  onRemove,
}: {
  segment: AuditOperatingProfileSegment;
  evidence: AuditEvidenceReference[];
  disabled: boolean;
  onSave: (segment: AuditOperatingProfileSegment) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(segment);
  useEffect(() => setDraft(segment), [segment]);
  const number = (value: string): number | null => (value === '' ? null : Number(value));
  const sourceBacked = isSourceBackedProvenance(segment.provenance);
  const changed = structuredRecordChanged(
    segment,
    draft,
    operatingSegmentBusinessProjection,
  );
  const removable = structuredRecordIsRemovable(segment);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Segment label">
          <input value={draft.label} disabled={disabled} onChange={event => setDraft({ ...draft, label: event.target.value })} />
        </Field>
        <Field label="Hours per day">
          <input type="number" min="0" max="24" step="any" value={draft.hoursPerDay} disabled={disabled} onChange={event => setDraft({ ...draft, hoursPerDay: Number(event.target.value) })} />
        </Field>
        <Field label="Flow basis">
          <select
            value={draft.flowBasis}
            disabled={disabled}
            onChange={event => {
              const flowBasis = event.target.value as AuditOperatingProfileFlowBasis;
              setDraft({
                ...draft,
                flowBasis,
                flowFraction: flowBasis === 'flow_fraction' ? draft.flowFraction : null,
                measuredFlowM3PerMin:
                  flowBasis === 'measured_flow_m3_per_min'
                    ? draft.measuredFlowM3PerMin
                    : null,
              });
            }}
          >
            <option value="flow_fraction">Fraction of exact rated flow</option>
            <option value="measured_flow_m3_per_min">Measured m³/min</option>
          </select>
        </Field>
        <Field label={draft.flowBasis === 'flow_fraction' ? 'Flow fraction' : 'Measured flow (m³/min)'}>
          <input
            type="number"
            min="0"
            max={draft.flowBasis === 'flow_fraction' ? 1 : undefined}
            step="any"
            value={
              (draft.flowBasis === 'flow_fraction'
                ? draft.flowFraction
                : draft.measuredFlowM3PerMin) ?? ''
            }
            disabled={disabled}
            onChange={event =>
              setDraft(
                draft.flowBasis === 'flow_fraction'
                  ? { ...draft, flowFraction: number(event.target.value) }
                  : { ...draft, measuredFlowM3PerMin: number(event.target.value) },
              )
            }
          />
        </Field>
        <Field label="Load fraction (optional)">
          <input type="number" min="0" max="1" step="any" value={draft.loadFraction ?? ''} disabled={disabled} onChange={event => setDraft({ ...draft, loadFraction: number(event.target.value) })} />
        </Field>
        <Field label="Evidence / source reference">
          <input value={draft.sourceReference} disabled={disabled || sourceBacked} onChange={event => setDraft({ ...draft, sourceReference: event.target.value })} />
        </Field>
        <label className="flex items-center gap-2 self-end py-1.5 text-[11px] text-slate-600">
          <input type="checkbox" checked={draft.confirmed} disabled={disabled} onChange={event => setDraft({ ...draft, confirmed: event.target.checked })} />
          Inputs confirmed
        </label>
        {removable ? (
          <button type="button" disabled={disabled} onClick={onRemove} className="flex items-center gap-1 self-end py-1.5 text-[11px] text-rose-600 disabled:opacity-50">
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        ) : (
          <p className="self-end text-[10px] text-slate-500">
            Source-backed records are retained; supersede through an evidenced override.
          </p>
        )}
      </div>
      <EvidenceProvenanceOverrideEditor
        provenance={{
          ...segment.provenance,
          currentValue: operatingSegmentCurrentValue(draft),
        }}
        evidence={evidence}
        disabled={disabled}
        requiresOverride={sourceBacked && changed}
        onApply={(reason, evidenceId) =>
          onSave({
            ...draft,
            provenance: recordOverride(
              segment.provenance,
              operatingSegmentCurrentValue(draft),
              reason,
              evidenceId,
              sourceBacked && changed,
            ),
          })
        }
      />
    </div>
  );
}

export function OperatingProfileEditor({
  segments,
  evidence,
  disabled,
  onChange,
}: {
  segments: AuditOperatingProfileSegment[];
  evidence: AuditEvidenceReference[];
  disabled: boolean;
  onChange: (segments: AuditOperatingProfileSegment[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newHours, setNewHours] = useState('');
  const [newBasis, setNewBasis] = useState<AuditOperatingProfileFlowBasis | ''>('');
  const [newFlow, setNewFlow] = useState('');
  const [newSource, setNewSource] = useState('');
  const newFlowNumber = Number(newFlow);
  const ready =
    newLabel.trim() !== '' &&
    Number.isFinite(Number(newHours)) &&
    Number(newHours) >= 0 &&
    Number(newHours) <= 24 &&
    newBasis !== '' &&
    Number.isFinite(newFlowNumber) &&
    newFlowNumber >= 0 &&
    (newBasis !== 'flow_fraction' || newFlowNumber <= 1) &&
    newSource.trim() !== '';
  const add = () => {
    if (!ready) return;
    onChange([
      ...segments,
      {
        segmentId: `segment-${globalThis.crypto?.randomUUID?.() ?? String(Date.now())}`,
        label: newLabel.trim(),
        hoursPerDay: Number(newHours),
        flowBasis: newBasis,
        flowFraction: newBasis === 'flow_fraction' ? newFlowNumber : null,
        measuredFlowM3PerMin:
          newBasis === 'measured_flow_m3_per_min' ? newFlowNumber : null,
        loadFraction: null,
        sourceReference: newSource.trim(),
        confirmed: false,
        provenance: blankProvenance(),
      },
    ]);
    setAdding(false);
    setNewLabel('');
    setNewHours('');
    setNewBasis('');
    setNewFlow('');
    setNewSource('');
  };
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <Clock3 className="h-4 w-4 text-ars-primary" /> Operating profile
          </p>
          <p className="text-[11px] text-slate-500">
            Choose either a fraction of exact rated flow or measured m³/min for each
            segment. The server performs all volume calculations.
          </p>
        </div>
        <div className="text-right">
          <button type="button" disabled={disabled} onClick={() => setAdding(value => !value)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium disabled:opacity-50">
            <Plus className="h-3 w-3" /> Add segment
          </button>
          <p className="mt-1 text-[11px] text-slate-500">
            The server validates the 24-hour total.
          </p>
        </div>
      </div>
      {adding && (
        <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Segment label"><input value={newLabel} onChange={event => setNewLabel(event.target.value)} /></Field>
          <Field label="Hours per day"><input type="number" min="0" max="24" step="any" value={newHours} onChange={event => setNewHours(event.target.value)} /></Field>
          <Field label="Flow basis">
            <select value={newBasis} onChange={event => setNewBasis(event.target.value as AuditOperatingProfileFlowBasis | '')}>
              <option value="">Choose basis</option>
              <option value="flow_fraction">Fraction of exact rated flow</option>
              <option value="measured_flow_m3_per_min">Measured m³/min</option>
            </select>
          </Field>
          <Field label={newBasis === 'flow_fraction' ? 'Flow fraction' : 'Measured flow (m³/min)'}>
            <input type="number" min="0" max={newBasis === 'flow_fraction' ? 1 : undefined} step="any" value={newFlow} onChange={event => setNewFlow(event.target.value)} />
          </Field>
          <Field label="Source reference"><input value={newSource} onChange={event => setNewSource(event.target.value)} /></Field>
          <button type="button" disabled={!ready} onClick={add} className="rounded-md bg-ars-primary px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-50">Record segment</button>
        </div>
      )}
      {segments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">
          Missing operating profile. No duty cycle has been assumed.
        </p>
      ) : (
        segments.map(segment => (
          <SegmentCard
            key={segment.segmentId}
            segment={segment}
            evidence={evidence}
            disabled={disabled}
            onSave={next => onChange(segments.map(item => item.segmentId === next.segmentId ? next : item))}
            onRemove={() => onChange(segments.filter(item => item.segmentId !== segment.segmentId))}
          />
        ))
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <label className="text-[11px] text-slate-500">
      {label}
      <span className="mt-0.5 block [&>*]:w-full [&>*]:rounded-md [&>*]:border [&>*]:border-slate-300 [&>*]:px-2 [&>*]:py-1.5 [&>*]:text-xs disabled:[&>*]:bg-slate-100">
        {children}
      </span>
    </label>
  );
}
