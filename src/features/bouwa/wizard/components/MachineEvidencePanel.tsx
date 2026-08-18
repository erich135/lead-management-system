/**
 * The manufacturer evidence behind the chosen machine, shown rather than asked.
 *
 * Every figure the wizard took from the library came out of one document, and
 * the proposal has to be able to name it. The rep used to be asked for that
 * document by hand, on a later screen, long after the system had already read
 * it — so the citation on the proposal was whatever was remembered, not what
 * was used. This panel states the document that was actually read.
 *
 * Changing the source is the same act as choosing the machine again, from the
 * search directly above, which is already recorded against the proposal. There
 * is deliberately no second way to do it: a source that could be edited apart
 * from the values it published would stop being evidence.
 */

import { ExternalLink, FileText } from 'lucide-react';

import { machineEvidenceLines, machineEvidenceLink } from '../machineSelection';
import type { WizardSpecSnapshot } from '../wizardTypes';

export function MachineEvidencePanel({
  snapshot,
}: {
  snapshot: WizardSpecSnapshot | null;
}) {
  if (snapshot === null) return null;

  const lines = machineEvidenceLines(snapshot);
  const link = machineEvidenceLink(snapshot);

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2.5">
      <p className="flex items-center gap-2 text-sm font-medium text-emerald-900">
        <FileText className="h-4 w-4" aria-hidden="true" />
        Manufacturer evidence
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-emerald-800">
        Taken from the specification library when this machine was chosen. The
        proposal keeps this exact document version, so a later library
        correction cannot change what it cites.
      </p>
      <dl className="mt-2 space-y-1">
        {lines.map(line => (
          <div key={line.label} className="flex gap-2 text-xs">
            <dt className="w-28 shrink-0 text-emerald-700">{line.label}</dt>
            <dd className="text-emerald-950">{line.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {link === null ? (
          <span className="text-[11px] text-emerald-700">
            No online copy of this document is held.
          </span>
        ) : (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            View document
          </a>
        )}
        <span className="text-[11px] text-emerald-700">
          To cite a different document, choose the machine again above.
        </span>
      </div>
    </div>
  );
}
