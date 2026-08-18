/**
 * Two ways of telling an operator where a number came from.
 *
 * `BackendOwnedOutputs` stands where the proposal builder used to compute a
 * scientific result in the browser. The accepted backend owns those outputs and
 * releases them only when the audit intake supports them, so the builder states
 * what is owned elsewhere instead of producing a second answer that nobody
 * reconciled.
 *
 * `HistoricalWorkbookEvidence` wraps figures that come from the original
 * spreadsheets and slide decks. They are kept deliberately: the specification
 * requires the historical outputs to remain available for comparison. They are
 * not a customer result and were never produced by the accepted backend, and
 * the banner says so wherever they appear.
 */

import { AlertTriangle, Server } from 'lucide-react';

export interface BackendOwnedOutputsProps {
  /** The outputs this part of the screen used to show. */
  outputs: readonly string[];
  /** Why the backend does not release them here, if something specific applies. */
  note?: string;
}

export function BackendOwnedOutputs({ outputs, note }: BackendOwnedOutputsProps) {
  return (
    <div className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <Server className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <div className="space-y-2">
          <p className="text-sm font-semibold text-ars-heading">
            Produced by the accepted backend, not by this screen
          </p>
          <p className="text-xs leading-relaxed text-ars-body">
            The proposal builder no longer calculates these values. They are
            released by the backend from a measured audit, and only once the
            evidence each one depends on is present. Open{' '}
            <span className="font-semibold">Air Audit Workflow</span> to upload a
            logger export, complete the audit intake, and see which outputs are
            available and which remain blocked, with the reason for each.
          </p>
          <ul className="grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
            {outputs.map(output => (
              <li key={output} className="flex items-start gap-1.5">
                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                <span>{output}</span>
              </li>
            ))}
          </ul>
          {note && <p className="text-xs italic text-slate-500">{note}</p>}
        </div>
      </div>
    </div>
  );
}

export interface HistoricalWorkbookEvidenceProps {
  /** Which workbook, deck or sheet the figures below were taken from. */
  source: string;
  children: React.ReactNode;
}

export function HistoricalWorkbookEvidence({
  source,
  children,
}: HistoricalWorkbookEvidenceProps) {
  return (
    <section className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/40 p-4">
      <div className="mb-3 flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-bold text-amber-900">
            Historical workbook figures — comparison evidence only
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">
            Everything below was taken from {source}. It is retained so the
            original figures can be compared against the accepted backend, and
            it is not a customer result, not a current calculation, and not
            authority for any saving, payback or return.
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}
