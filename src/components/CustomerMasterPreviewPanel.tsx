import { useState } from 'react';
import type { CustomerMasterApplyResult, CustomerMasterPreview, CustomerMasterPreviewOutcome } from '../lib/api';

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
}: {
  preview: CustomerMasterPreview;
  applying: boolean;
  applyResult: CustomerMasterApplyResult | null;
  onApply: () => Promise<void>;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<CustomerMasterPreviewOutcome | 'missing' | 'all'>('all');
  const [confirming, setConfirming] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const summary = preview.summary;
  const attention = preview.rows.filter((row) => row.outcome !== 'unchanged');
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
            A missing row does not archive a customer. Invalid, conflicting, and blocked rows are not written.
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-sm font-semibold text-slate-500 hover:text-slate-800">Close</button>
      </div>

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
            : `${preview.recordsToChange} customer records will change.`}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {preview.summary.invalidRows} invalid, {preview.summary.conflicts} conflicting, and {preview.summary.blocked} blocked rows stay unchanged.
        </p>
        {applyResult && (
          <p className="mt-2 text-sm font-semibold text-green-800">
            {applyResult.alreadyApplied
              ? 'This approval was already applied. No further customer records were changed.'
              : applyResult.recordsChanged === 0
                ? 'No customer records were changed.'
                : `Updated ${applyResult.recordsChanged} customer record${applyResult.recordsChanged === 1 ? '' : 's'}.`}
          </p>
        )}
        {applyError && <p className="mt-2 text-sm font-semibold text-red-700">{applyError}</p>}
        {!applyResult && !confirming && (
          <button
            type="button"
            disabled={applying}
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
              disabled={applying}
              onClick={() => {
                setApplyError(null);
                void onApply().catch((error: Error) => {
                  setApplyError(error.message || 'Customer Master apply failed');
                  setConfirming(false);
                });
              }}
              className="rounded-[8px] bg-[#0969a9] px-3 py-2 text-[13px] font-bold text-white disabled:opacity-50"
            >
              {applying ? 'APPLYING...' : `Confirm and apply ${preview.recordsToChange} customer record${preview.recordsToChange === 1 ? '' : 's'}`}
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

      <div className="mt-4 flex flex-wrap gap-2">
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
