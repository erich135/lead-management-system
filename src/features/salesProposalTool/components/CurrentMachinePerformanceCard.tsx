import type { CurrentMachineMeasuredPerformance } from '../types';
import { editorPerformanceView } from '../currentMachinePerformanceView';

interface CurrentMachinePerformanceCardProps {
  result: CurrentMachineMeasuredPerformance | null;
}

export function CurrentMachinePerformanceCard({
  result,
}: CurrentMachinePerformanceCardProps) {
  const view = editorPerformanceView(result);
  if (view.kind === 'hidden') return null;

  if (view.kind === 'site_note') {
    return (
      <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
          {view.title}
        </h2>
        <p className="mt-3 text-sm text-slate-600">{view.note}</p>
      </section>
    );
  }

  return (
    <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
        {view.title}
      </h2>
      {view.machineName && (
        <p className="mt-3 text-sm font-semibold text-[#383838]">{view.machineName}</p>
      )}
      <dl className="mt-3">
        {view.rows.map((row) => (
          <div
            key={row.label}
            className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0"
          >
            <dt className="text-xs font-medium text-slate-500">{row.label}</dt>
            <dd className="text-sm font-semibold text-[#383838]">{row.value}</dd>
          </div>
        ))}
      </dl>
      {view.notes.map((note) => (
        <p key={note} className="mt-3 text-xs text-slate-500">
          {note}
        </p>
      ))}
    </section>
  );
}
