import { useState } from 'react';
import { FileWarning, Plus, Trash2 } from 'lucide-react';

import type { ClaimAssessmentInput } from '../../auditIntakeTypes';

export function ClaimAssessmentEditor({
  claims,
  disabled,
  onChange,
}: {
  claims: ClaimAssessmentInput[];
  disabled: boolean;
  onChange: (claims: ClaimAssessmentInput[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [claim, setClaim] = useState('');
  const [filename, setFilename] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const canAdd = claim.trim() !== '' && excerpt.trim() !== '';

  function addClaim() {
    if (!canAdd) return;
    onChange([...claims, {
      claimId: `claim-${globalThis.crypto?.randomUUID?.() ?? String(Date.now())}`,
      claim: claim.trim(),
      source: {
        sourceFilename: filename.trim() || 'User-supplied',
        sourceSha256: '0'.repeat(64),
        page: null,
        text: excerpt.trim(),
      },
      evidenceIds: [],
      independentResult: null,
      sourceValue: null,
      sourceUnit: null,
      materiality: 'Recorded source claim.',
      status: 'supported',
      reviewerStatus: 'pending_review',
      reviewerName: null,
      reviewerNotes: null,
    }]);
    setAdding(false);
    setClaim('');
    setFilename('');
    setExcerpt('');
  }

  return (
    <section className="space-y-2">
      <div className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-slate-800"><FileWarning className="h-4 w-4 text-ars-primary" /> Source claims</p>
          <p className="text-[11px] text-slate-500">Record what the source says. Ordinary inputs are accepted unless they conflict with supplied technical documentation.</p>
        </div>
        <button type="button" disabled={disabled} onClick={() => setAdding(value => !value)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium disabled:opacity-50"><Plus className="h-3 w-3" /> Add claim</button>
      </div>
      {adding && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Claim"><textarea value={claim} onChange={event => setClaim(event.target.value)} /></Field>
            <Field label="Source filename (optional)"><input value={filename} onChange={event => setFilename(event.target.value)} /></Field>
            <div className="sm:col-span-2"><Field label="Source excerpt"><textarea value={excerpt} onChange={event => setExcerpt(event.target.value)} /></Field></div>
          </div>
          <button type="button" disabled={!canAdd} onClick={addClaim} className="mt-2 rounded-md bg-ars-primary px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-50">Record claim</button>
        </div>
      )}
      {claims.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">No source claim has been recorded.</p>
      ) : claims.map(item => (
        <div key={item.claimId} className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800">{item.claim}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{item.source.sourceFilename}{item.source.page === null ? '' : ` · page ${item.source.page}`}</p>
              <blockquote className="mt-1 border-l-2 border-slate-300 pl-2 text-[11px] italic text-slate-600">{item.source.text}</blockquote>
            </div>
            <button type="button" disabled={disabled} onClick={() => onChange(claims.filter(held => held.claimId !== item.claimId))} className="text-rose-600 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactElement }) {
  return <label className="text-[11px] text-slate-500">{label}<span className="mt-0.5 block [&>*]:w-full [&>*]:rounded-md [&>*]:border [&>*]:border-slate-300 [&>*]:px-2 [&>*]:py-1.5 [&>*]:text-xs disabled:[&>*]:bg-slate-100">{children}</span></label>;
}
