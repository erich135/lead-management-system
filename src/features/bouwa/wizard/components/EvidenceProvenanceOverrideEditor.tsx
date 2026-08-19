import { useState } from 'react';
import { FileCheck2, ShieldAlert } from 'lucide-react';

import type {
  AuditEvidenceReference,
  RecordValueProvenance,
} from '../../auditIntakeTypes';
import {
  isSourceBackedProvenance,
  provenanceNeedsOverride,
} from '../recordProvenancePresentation';

export function EvidenceProvenanceOverrideEditor({
  provenance,
  evidence,
  disabled,
  requiresOverride,
  onApply,
  label = 'Save changes',
}: {
  provenance: RecordValueProvenance;
  evidence: AuditEvidenceReference[];
  disabled: boolean;
  requiresOverride?: boolean;
  onApply: (reason: string, evidenceId: string) => void;
  label?: string;
}) {
  const hasSource = isSourceBackedProvenance(provenance);
  const sourceBacked =
    requiresOverride ?? provenanceNeedsOverride(provenance);
  const [reason, setReason] = useState('');
  const [evidenceId, setEvidenceId] = useState('');
  const ready = !sourceBacked || (reason.trim() !== '' && evidenceId !== '');

  return (
    <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
      <div className="flex items-start gap-2 text-[11px] text-slate-600">
        {hasSource ? (
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
        ) : (
          <FileCheck2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        )}
        <div className="min-w-0">
          <p>
            {sourceBacked
              ? 'The source value remains visible and unchanged. Record why this proposal differs and cite supporting evidence.'
              : hasSource
                ? 'The current value matches the displayed source. No override reason is required.'
                : 'No source value is being replaced. Evidence may still be linked.'}
          </p>
          {provenance.sourceValue !== null && (
            <p className="mt-1 font-medium text-slate-700">
              Source value: {String(provenance.sourceValue)}
            </p>
          )}
          {(provenance.sourceReference ?? provenance.sourceFilename) !== null && (
            <p className="truncate text-slate-500">
              Source: {provenance.sourceReference ?? provenance.sourceFilename}
            </p>
          )}
        </div>
      </div>
      {sourceBacked && (
        <textarea
          value={reason}
          disabled={disabled}
          onChange={event => setReason(event.target.value)}
          placeholder="Reason for changing the source-backed value"
          className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs disabled:bg-slate-100"
        />
      )}
      <select
        value={evidenceId}
        disabled={disabled}
        onChange={event => setEvidenceId(event.target.value)}
        className="mt-1.5 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs disabled:bg-slate-100"
      >
        <option value="">{sourceBacked ? 'Choose supporting evidence' : 'No evidence link'}</option>
        {evidence.map(entry => (
          <option key={entry.id} value={entry.id}>
            {entry.filename ?? entry.documentReference ?? entry.evidenceType}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={disabled || !ready}
        onClick={() => onApply(reason, evidenceId)}
        className="mt-2 rounded-md bg-ars-primary px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-50"
      >
        {label}
      </button>
    </div>
  );
}
