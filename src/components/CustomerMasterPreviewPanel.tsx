import { useState } from 'react';
import { recoverCustomerMaster, type CustomerMasterApplyResult, type CustomerMasterPreview, type CustomerMasterPreviewOutcome,type CustomerMasterResolution } from '../lib/api';

const FILTERS: Array<{ id: CustomerMasterPreviewOutcome | 'missing' | 'all'; label: string }> = [
  { id: 'all', label: 'Needs attention' },
  { id: 'proposed', label: 'Proposed' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'conflict', label: 'Conflicts' },
  { id: 'invalid', label: 'Invalid' },
  { id: 'missing', label: 'Missing' },
  { id: 'unchanged', label: 'Unchanged' },
];

const OUTCOME_CLASS: Record<CustomerMasterPreviewOutcome, string> = {
  proposed: 'bg-blue-100 text-blue-800',
  unchanged: 'bg-slate-100 text-slate-600',
  invalid: 'bg-red-100 text-red-800',
  conflict: 'bg-amber-100 text-amber-800',
  blocked: 'bg-orange-100 text-orange-800',
};

function displayValue(value: string): string {
  return value === '' ? '(blank)' : value;
}

function visibleProposed(preview: CustomerMasterPreview): number {
  return preview.rows.filter((row) => row.outcome === 'proposed').length;
}

export function CustomerMasterPreviewPanel({
  preview,
  applying,
  applyResult,
  onApply,
  onClose,
  onResolve,
  onWorkingCopy,
}: {
  preview: CustomerMasterPreview;
  applying: boolean;
  applyResult: CustomerMasterApplyResult | null;
  onApply: () => Promise<void>;
  onClose: () => void;
  onResolve?: (resolutions:CustomerMasterResolution[])=>Promise<void>;
  onWorkingCopy?: ()=>Promise<void>;
}) {
  const [filter, setFilter] = useState<CustomerMasterPreviewOutcome | 'missing' | 'all'>('all');
  const [confirming, setConfirming] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [recoveryId,setRecoveryId]=useState<string|null>(null);
  const [recovering,setRecovering]=useState(false);
  const [recoveryMessage,setRecoveryMessage]=useState<string|null>(null);
  const [recipientFilter,setRecipientFilter]=useState<'attention'|'all'>('attention');
  const [copyBusy,setCopyBusy]=useState(false);
  const [copyMessage,setCopyMessage]=useState<string|null>(null);
  const summary = preview.summary;
  const attention = preview.rows.filter((row) => row.outcome !== 'unchanged'||Boolean(row.fieldConflicts?.length));
  const visible = filter === 'missing'
    ? []
    : filter === 'all'
      ? attention
      : preview.rows.filter((row) => row.outcome === filter);
  const counts: Record<string, number> = {
    all: attention.length,
    proposed: visibleProposed(preview),
    blocked: summary.blocked,
    conflict: summary.conflicts,
    invalid: summary.invalidRows,
    missing: summary.missingCustomerIds,
    unchanged: summary.unchanged,
  };

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-bold text-slate-800">Customer Master preview</h4>
          <p className="mt-1 text-sm text-slate-600">
            Review every proposed change before approving it. A blank cell keeps the current value. CLEAR removes an optional value.
            A missing row does not archive a customer or remove a recipient. {preview.strictV2 ? 'Every V2 row must be valid before anything can be applied. Recipient fields require explicit values and Yes/No flags.' : 'Invalid, conflicting, and blocked rows are not written.'}
          </p>
          {preview.baseline && <p className="mt-1 text-sm text-slate-600">{preview.baseline.trusted?'Original exported values verified. Fields unchanged in Excel keep the current ARS values.':preview.baseline.reason}</p>}
        </div>
        <button type="button" disabled={applying || recovering} onClick={onClose} className="text-sm font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-50">Close</button>
      </div>

      {preview.recipients && <section className="mt-4 rounded-lg border border-slate-200 p-3" aria-label="Recipient changes">
        <h5 className="font-bold text-slate-800">Notification Recipients</h5>
        <p className="mt-1 text-sm text-slate-600">Additions {preview.recipients.summary.additions}. Updates {preview.recipients.summary.updates}. Deactivations {preview.recipients.summary.deactivations}. Unchanged {preview.recipients.summary.unchanged}. Invalid {preview.recipients.summary.invalid}. Conflicts {preview.recipients.summary.conflicts}.</p>
        <p className="mt-1 text-xs text-slate-500">Missing recipient rows stay unchanged. Global ARS recipients and notification delivery stay unchanged.</p>
        <button type="button" onClick={()=>setRecipientFilter(recipientFilter==='attention'?'all':'attention')} className="mt-2 text-sm font-semibold text-[#0969a9]">{recipientFilter==='attention'?'Show all recipient rows':'Show recipient changes and errors'}</button>
        <div className="mt-2 max-h-96 space-y-3 overflow-y-auto">
          {preview.recipients.rows.filter(row=>recipientFilter==='all'||row.outcome!=='unchanged').map(row=><article key={row.rowNumber} className="rounded-lg border border-slate-200 p-3 text-sm">
            <div className="font-bold">{row.action==='add'?'Add recipient':row.action==='deactivate'?'Deactivate recipient':row.action==='update'?'Update recipient':'Unchanged recipient'}: {row.recipientName} <span className={`ml-2 rounded px-2 text-xs ${OUTCOME_CLASS[row.outcome]}`}>{row.outcome}</span></div>
            <div>Customer: {row.customerName}</div><div className="break-all font-mono text-xs text-slate-500">Customer ID: {row.customerId}. Recipient ID: {row.recipientId||'(new)'}. Notification Recipients row {row.rowNumber}.</div>
            {row.messages.map(message=><p key={message} className="mt-1 text-amber-800">{message}</p>)}
            {row.changes.map(change=><div key={change.field} className="mt-1">{change.label}: {row.action==='add'?displayValue(change.after):`${displayValue(change.before)} → ${displayValue(change.after)}`}</div>)}
          </article>)}
          {!preview.recipients.rows.some(row=>recipientFilter==='all'||row.outcome!=='unchanged')&&<p className="text-sm text-slate-500">No recipient changes or errors.</p>}
        </div>
      </section>}

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        {[
          ['Rows', summary.totalRows],
          ['Unchanged', summary.unchanged],
          ['Detail corrections', summary.detailCorrections],
          ['Admin Code changes', summary.adminCodeChanges],
          ['Proposed archives', summary.proposedArchives],
          ['Proposed restores', summary.proposedRestores],
          ['Missing IDs', summary.missingCustomerIds],
          ['Invalid', summary.invalidRows],
          ['Conflicts', summary.conflicts],
          ['Blocked', summary.blocked],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-slate-200 px-3 py-2">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="text-lg font-bold text-slate-800">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-[#0969a9] bg-blue-50 p-3">
        <p className="text-sm font-semibold text-slate-800">
          {preview.recordsToChange === 1
            ? '1 customer record will change.'
            : `${preview.recordsToChange} customer records will change.`} {preview.recipients ? `${preview.recipients.summary.additions+preview.recipients.summary.updates+preview.recipients.summary.deactivations} recipient records proposed.` : ''}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {preview.strictV2 && !preview.applyAvailable ? 'Apply is blocked. Correct every invalid, conflicting or blocked customer and recipient row and preview again.' : `${preview.summary.invalidRows} invalid, ${preview.summary.conflicts} conflicting, and ${preview.summary.blocked} blocked customer rows stay unchanged.`}
        </p>
        {applyResult && (
          <p className="mt-2 text-sm font-semibold text-green-800">
            {applyResult.recovered
              ? 'This approval was recovered. No changes were reapplied. Preview the same workbook again before continuing.'
              : applyResult.alreadyApplied
              ? 'This approval was already applied. No further customer records were changed.'
              : applyResult.recordsChanged === 0
                ? 'No customer records were changed.'
                : `Updated ${applyResult.recordsChanged} customer record${applyResult.recordsChanged === 1 ? '' : 's'}.`}
          </p>
        )}
        {applyResult && <p className="mt-1 text-sm font-semibold text-green-800">Recipient records changed: {applyResult.recipientsChanged||0}. Approval: {applyResult.approvalId||'(none)'}.</p>}
        {applyResult&&!applyResult.recovered&&onWorkingCopy&&<div className="mt-2 text-sm"><button type="button" disabled={copyBusy||applying} className="rounded border border-[#0969a9] px-3 py-2 font-semibold text-[#0969a9]" onClick={async()=>{setCopyBusy(true);try{await onWorkingCopy();setCopyMessage('Updated working workbook downloaded. Continue with that copy so its visible values and original-value metadata stay aligned.');}catch(error){setCopyMessage(`Import completed. ${(error as Error).message}`);}finally{setCopyBusy(false);}}}>{copyBusy?'PREPARING...':'Download updated working workbook'}</button><p className="mt-1 text-slate-600">Preserves this workbook layout and permanent IDs, refreshes saved values and the baseline, and includes new Recipient IDs.</p>{copyMessage&&<p>{copyMessage}</p>}</div>}
        {applyError && <p className="mt-2 text-sm font-semibold text-red-700">{applyError}</p>}
        {recoveryMessage && <p className="mt-2 text-sm text-slate-700">{recoveryMessage}</p>}
        {recoveryId && <div className="mt-2 text-sm"><p>Recovery approval: {recoveryId}. Recovery preserves later edits; new recipient identities are retained inactive.</p><button type="button" disabled={applying||recovering} className="mt-2 rounded border border-amber-700 px-3 py-2 font-semibold text-amber-800" onClick={async()=>{
          if(!window.confirm('Restore the audited previous values for this import? Later edits will be preserved.'))return;
          setRecovering(true);
          try{const result=await recoverCustomerMaster(recoveryId);setRecoveryMessage(`Recovered ${result.restoredCustomers.length} customers and ${result.restoredRecipients?.length||0} recipients. ${result.skippedFields.length} fields or records left for review. Preview the same workbook again.`);if(!result.skippedFields.length)setRecoveryId(null);}
          catch(error){setRecoveryMessage((error as Error).message);}finally{setRecovering(false);}
        }}>{recovering?'RECOVERING...':'Restore previous import values'}</button></div>}
        {!applyResult && !confirming && (
          <button
            type="button"
            disabled={applying || recovering || !preview.applyAvailable || Boolean(recoveryId)}
            onClick={() => { setApplyError(null); setConfirming(true); }}
            className="mt-3 rounded-[8px] bg-[#0969a9] px-3 py-2 text-[13px] font-bold text-white disabled:opacity-50"
          >
            Approve and Apply Changes
          </button>
        )}
        {!applyResult && confirming && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={applying || recovering || !preview.applyAvailable || Boolean(recoveryId)}
              onClick={() => {
                setApplyError(null);
                void onApply().catch((error: Error & {report?:{approvalId?:string;recoveryAvailable?:boolean}}) => {
                  setApplyError(error.message || 'Customer Master apply failed');
                  if(error.report?.recoveryAvailable && error.report.approvalId)setRecoveryId(error.report.approvalId);
                  setConfirming(false);
                });
              }}
              className="rounded-[8px] bg-[#0969a9] px-3 py-2 text-[13px] font-bold text-white disabled:opacity-50"
            >
              {applying ? 'APPLYING...' : `Confirm and apply ${preview.recordsToChange} customers${preview.recipients ? ` and ${preview.recipients.summary.additions+preview.recipients.summary.updates+preview.recipients.summary.deactivations} recipients` : ''}`}
            </button>
            <button
              type="button"
              disabled={applying}
              onClick={() => setConfirming(false)}
              className="rounded-[8px] border border-slate-300 px-3 py-2 text-[13px] font-bold text-slate-600"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <h5 className="mt-4 font-bold text-slate-800">Customer changes</h5>
      <div className="mt-2 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === item.id ? 'border-[#0969a9] bg-blue-50 text-[#0969a9]' : 'border-slate-200 text-slate-600'}`}
          >
            {item.label} ({counts[item.id]})
          </button>
        ))}
      </div>

      <div className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto">
        {filter === 'missing' && preview.missingCustomers.map((customer) => (
          <article key={customer.customerId} className="rounded-lg border border-slate-200 p-3">
            <div className="font-semibold text-slate-800">{customer.customerName}</div>
            <div className="font-mono text-xs text-slate-500">{customer.customerId}</div>
            <p className="mt-1 text-sm text-slate-600">{customer.message}</p>
            <p className="text-sm text-slate-600">Current status: {customer.customerStatus}</p>
          </article>
        ))}
        {filter !== 'missing' && visible.length === 0 && (
          <p className="text-sm text-slate-500">Nothing to show in this group.</p>
        )}
        {filter !== 'missing' && visible.map((row) => (
          <article key={`${row.rowNumber}-${row.customerId || 'row'}`} className="rounded-lg border border-slate-200 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${OUTCOME_CLASS[row.outcome]}`}>{row.outcome}</span>
              <span className="font-semibold text-slate-800">{row.customerName || 'Unidentified row'}</span>
              <span className="text-xs text-slate-500">Row {row.rowNumber}</span>
            </div>
            {row.customerId && <div className="mt-1 font-mono text-xs text-slate-500">{row.customerId}</div>}
            {row.messages.map((message) => (
              <p key={message} className="mt-1 text-sm text-slate-700">{message}</p>
            ))}
            {(row.fieldConflicts||[]).map(field=><div key={field.field} className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
              <div className="font-bold">{field.label}: {field.requiresReview?'Review required':'Resolved'}</div>
              <div>Original: {field.original===null?'Unavailable':displayValue(field.original)}</div>
              <div>Current ARS: {displayValue(field.current)}</div><div>Proposed Excel: {displayValue(field.proposed)}</div>
              <p className="mt-1 text-slate-600">{field.reason}</p>
              {onResolve&&row.customerId&&<label className="mt-2 block font-semibold">Choose the value to keep
                <select aria-label={`${row.customerName}: ${field.label} conflict resolution`} className="ml-2 rounded border border-amber-400 bg-white p-2" disabled={applying||Boolean(applyResult)} value={field.resolution||''} onChange={async event=>{
                  const next=(preview.resolutions||[]).filter(choice=>choice.customerId!==row.customerId||choice.field!==field.field);
                  if(event.target.value)next.push({customerId:row.customerId!,field:field.field,choice:event.target.value as 'keep'|'excel',expectedCurrent:field.current});
                  try{setApplyError(null);await onResolve(next);}catch(error){setApplyError((error as Error).message);}
                }}><option value="">Select a resolution</option><option value="keep">Keep ARS value</option><option value="excel">Use Excel value</option></select>
              </label>}
            </div>)}
            {row.changes.length > 0 && (
              <table className="mt-2 w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-slate-500">
                    <th className="py-1 pr-2 font-medium">Field</th>
                    <th className="py-1 pr-2 font-medium">Current</th>
                    <th className="py-1 font-medium">Proposed</th>
                  </tr>
                </thead>
                <tbody>
                  {row.changes.map((change) => (
                    <tr key={change.field} className="border-t border-slate-100">
                      <td className="py-1 pr-2">{change.label}</td>
                      <td className="py-1 pr-2">{displayValue(change.before)}</td>
                      <td className="py-1">{displayValue(change.after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {row.archiveImpact && (
              <div className="mt-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-700">
                <div className="font-semibold">Archive impact for {row.archiveImpact.customerName}</div>
                <div>Status: {row.archiveImpact.currentStatus} to {row.archiveImpact.proposedStatus}</div>
                <div>Jobs {row.archiveImpact.linkedJobs}. Machines {row.archiveImpact.linkedMachines}. Open delivery notes {row.archiveImpact.openDeliveryNotes}.</div>
                <div>Inspections {row.archiveImpact.inspections}. Active reading reminders {row.archiveImpact.activeReadingReminders}.</div>
                <div>Sales proposals {row.archiveImpact.salesProposals}. Bouwa drafts {row.archiveImpact.bouwaDrafts}.</div>
                {row.archiveImpact.blocked && <div className="mt-1 font-semibold text-orange-800">Blocked by the existing archive protection.</div>}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
