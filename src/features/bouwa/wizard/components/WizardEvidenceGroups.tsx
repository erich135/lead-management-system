/**
 * Outstanding evidence, grouped and counted rather than listed card by card.
 *
 * Thirty open cards tell a user nothing. Seven groups with a count each tell
 * them where the work is, and opening one shows exactly what the document is,
 * why it matters and what stays blocked without it.
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, FileWarning } from 'lucide-react';

import type {
  AuditIntakeFormModel,
  AuditReadinessAssessment,
} from '../../auditIntakeTypes';
import { evidenceGroups, formatDateOnly } from '../wizardState';

export function WizardEvidenceGroups({
  readiness,
  formModel,
}: {
  readiness: AuditReadinessAssessment;
  formModel: AuditIntakeFormModel;
}) {
  const groups = evidenceGroups(readiness, formModel);
  const [open, setOpen] = useState<string | null>(null);

  if (groups.length === 0)
    return (
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
        No outstanding documents. Every answer that needs evidence has it.
      </p>
    );

  return (
    <div data-testid="wizard-evidence-groups" className="space-y-2">
      {groups.map(group => {
        const expanded = open === group.id;
        return (
          <div
            key={group.id}
            className="overflow-hidden rounded-lg border border-slate-200 bg-white"
          >
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : group.id)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-50"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
                {expanded ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
                {group.title}
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                <FileWarning className="h-3.5 w-3.5" />
                {group.outstanding} outstanding
              </span>
            </button>
            {!expanded ? null : (
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {group.items.map(item => (
                  <li key={item.code} className="px-3 py-2.5 text-xs">
                    <p className="text-sm font-medium text-slate-800">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-slate-600">{item.whyItMatters}</p>
                    <dl className="mt-1.5 grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
                      <div className="flex gap-1.5">
                        <dt className="text-slate-500">Document:</dt>
                        <dd className="text-slate-700">
                          {item.requiredDocuments.join(', ') || '—'}
                        </dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt className="text-slate-500">Status:</dt>
                        <dd className="text-slate-700">{item.documentStatus}</dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt className="text-slate-500">Responsible:</dt>
                        <dd className="text-slate-700">
                          {item.responsiblePerson ?? 'Not stated'}
                        </dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt className="text-slate-500">Expected:</dt>
                        <dd className="text-slate-700">
                          {formatDateOnly(item.expectedConfirmationDate)}
                        </dd>
                      </div>
                    </dl>
                    {item.blockedOutputs.length === 0 ? null : (
                      <p className="mt-1.5 text-slate-500">
                        Blocks: {item.blockedOutputs.join(', ')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
