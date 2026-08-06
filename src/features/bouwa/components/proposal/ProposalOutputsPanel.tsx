import { CheckCircle2, FileWarning, Gauge, LockKeyhole } from 'lucide-react';
import type { ProposalEvaluation } from '../../proposalLocalTypes';
import { displayProposalValue } from './proposalDisplay';

export function ProposalOutputsPanel({ evaluation }: { evaluation: ProposalEvaluation }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-slate-900">Proposal outputs</h3>
      <p className="mt-1 text-sm text-slate-500">Every output shows its derived nature, source, basis, availability, and reason.</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {evaluation.outputs.map(output => (
          <article key={output.id} className={`rounded-xl border p-4 ${
            output.status === 'available'
              ? 'border-emerald-200 bg-emerald-50/50'
              : output.status === 'available_with_caveat'
                ? 'border-amber-200 bg-amber-50/50'
                : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-start gap-3">
              {output.status === 'available'
                ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                : output.status === 'available_with_caveat'
                  ? <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  : <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />}
              <div>
                <h4 className="font-semibold text-slate-900">{output.name}</h4>
                <p className="mt-1 text-xs leading-5 text-slate-600">{output.description}</p>
                <dl className="mt-3 grid gap-1 text-xs text-slate-600">
                  <div><dt className="inline font-semibold">Status:</dt> <dd className="inline">{displayProposalValue(output.status)}</dd></div>
                  <div><dt className="inline font-semibold">Nature:</dt> <dd className="inline">{displayProposalValue(output.nature)}</dd></div>
                  <div><dt className="inline font-semibold">Source:</dt> <dd className="inline">{output.source}</dd></div>
                  <div><dt className="inline font-semibold">Basis:</dt> <dd className="inline">{output.basis}</dd></div>
                </dl>
                <p className="mt-3 rounded-lg bg-white/80 p-2 text-xs leading-5 text-slate-700">{output.reason}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-950">
          <Gauge className="h-4 w-4" /> Proposal Confidence breakdown
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {evaluation.confidence.categories.map(category => (
            <div key={category.id} className="rounded-lg bg-white p-3">
              <p className="text-xs font-semibold text-slate-700">{category.label}</p>
              <p className="mt-1 text-xl font-semibold text-ars-primary">{category.score}</p>
              <p className="text-[10px] text-slate-500">Weight {category.weight}%</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-blue-900">{evaluation.confidence.disclaimer}</p>
      </div>
    </div>
  );
}
