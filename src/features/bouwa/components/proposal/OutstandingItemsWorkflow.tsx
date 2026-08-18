import { AlertTriangle, LockKeyhole, PencilLine } from 'lucide-react';
import type { ProposalEvaluation } from '../../proposalLocalTypes';
import { displayProposalValue } from './proposalDisplay';

export function OutstandingItemsWorkflow({
  evaluation,
  onResolveNext,
  onFix,
}: {
  evaluation: ProposalEvaluation | null;
  onResolveNext: () => void;
  onFix: (fieldId: string) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Outstanding items</h3>
          <p className="mt-1 text-sm text-slate-500">Fix the cause, provide evidence, or acknowledge each material provisional item individually.</p>
        </div>
        <button
          type="button"
          onClick={onResolveNext}
          disabled={!evaluation?.readiness.length}
          className="inline-flex items-center gap-2 rounded-xl bg-ars-primary px-4 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          <PencilLine className="h-4 w-4" /> Resolve outstanding items
        </button>
      </div>
      <div className="mt-4 grid gap-3">
        {evaluation?.readiness.map(item => (
          <article key={item.id} className={`rounded-xl border p-4 ${
            item.severity === 'hard' ? 'border-red-200 bg-red-50/60' : 'border-amber-200 bg-amber-50/60'
          }`}>
            <div className="flex items-start gap-3">
              {item.severity === 'hard'
                ? <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold text-slate-900">{item.title}</h4>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    item.severity === 'hard' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>{item.severity === 'hard' ? 'output blocker' : 'disclosure'}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-600">{item.explanation}</p>
                {!!item.affectedOutputs.length && (
                  <p className="mt-2 text-xs text-slate-500">
                    Affects only: {item.affectedOutputs.map(displayProposalValue).join(', ')}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.actions.map(action => (
                    <button
                      key={`${item.id}-${action.action}`}
                      type="button"
                      onClick={() => onFix(action.fieldId)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-ars-primary hover:text-ars-primary"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
        {!evaluation?.readiness.length && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
            No outstanding readiness item remains for the current declared scope.
          </div>
        )}
      </div>
    </div>
  );
}
