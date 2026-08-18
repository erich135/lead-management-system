import { CheckCircle2, ShieldQuestion } from 'lucide-react';
import type { ProposalEvaluation, ProposalMode, ProposalPackage } from '../../proposalLocalTypes';
import { displayProposalValue } from './proposalDisplay';

const MODES: Array<{ id: ProposalMode; label: string; description: string }> = [
  {
    id: 'logger_analysis',
    label: 'Logger analysis',
    description: 'Measured logger observations, subject to data quality and engineering settings.',
  },
  {
    id: 'site_survey',
    label: 'Site survey',
    description: 'Manual observations and customer information without logger measurements.',
  },
  {
    id: 'preliminary_no_measured_data',
    label: 'Preliminary',
    description: 'Explicit estimates and assumptions when measured data is unavailable.',
  },
];

export function ProposalModeSelector({
  mode,
  proposal,
  evaluation,
  onSelect,
}: {
  mode: ProposalMode;
  proposal: ProposalPackage;
  evaluation: ProposalEvaluation | null;
  onSelect: (mode: ProposalMode) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-gradient-to-r from-[#0b3555] to-[#0969a9] p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">Guided proposal readiness</p>
            <h2 className="mt-1 text-2xl font-semibold">Build the proposal that the available evidence supports</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100">
              Missing records block only affected outputs. Attached means an actual evidence-byte record exists. Measured means a parser measurement attestation or authorised exact-value measurement verification exists. Documented exact value requires compatible evidence plus authorised exact-value verification; a source reference or uploaded file alone does not verify the engineering value.
            </p>
          </div>
          {evaluation && (
            <div className="min-w-44 rounded-xl border border-white/20 bg-white/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-100">Proposal Confidence</p>
              <p className="mt-1 text-2xl font-semibold">{evaluation.confidence.score} · {evaluation.confidence.label}</p>
              <p className="mt-1 text-[11px] text-blue-100">{evaluation.confidence.modelVersion}</p>
            </div>
          )}
        </div>
      </div>
      <div role="tablist" aria-label="Proposal mode" className="grid gap-3 p-5 lg:grid-cols-3">
        {MODES.map(item => (
          <button
            key={item.id}
            id={`proposal-mode-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={mode === item.id}
            aria-controls="proposal-mode-panel"
            tabIndex={mode === item.id ? 0 : -1}
            onClick={() => onSelect(item.id)}
            onKeyDown={event => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const tabs = Array.from(
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
              );
              const currentIndex = tabs.indexOf(event.currentTarget);
              const nextIndex = event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? tabs.length - 1
                  : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
              tabs[nextIndex]?.focus();
              tabs[nextIndex]?.click();
            }}
            className={`rounded-xl border p-4 text-left transition ${
              mode === item.id ? 'border-ars-primary bg-blue-50 ring-1 ring-ars-primary' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {mode === item.id ? <CheckCircle2 className="h-4 w-4 text-ars-primary" /> : <ShieldQuestion className="h-4 w-4 text-slate-400" />}
              <span className="font-semibold text-slate-900">{item.label}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">{item.description}</p>
          </button>
        ))}
      </div>
      <div
        id="proposal-mode-panel"
        role="tabpanel"
        aria-labelledby={`proposal-mode-tab-${mode}`}
        className="border-t border-slate-200 bg-slate-50 px-5 py-4"
      >
      {evaluation ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              <span className="font-semibold text-slate-900">{evaluation.progress.percent}% resolved</span>
              <span className="ml-2 text-slate-500">{evaluation.progress.resolved} of {evaluation.progress.total} fields</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">{evaluation.progress.hardBlockers} output blockers</span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{evaluation.progress.softWarnings} disclosures</span>
              <span className="rounded-full bg-white px-3 py-1 text-slate-600">v{proposal.settingsVersion} · {displayProposalValue(proposal.status)}</span>
              {evaluation.dirty && <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">{evaluation.versionLabel}</span>}
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-ars-primary transition-all" style={{ width: `${evaluation.progress.percent}%` }} />
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-500">Preparing the selected proposal mode…</p>
      )}
      </div>
    </div>
  );
}
