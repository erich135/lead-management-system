/**
 * The proposal's evidence level, shown where it cannot be missed.
 *
 * A rep needs to know before sending a document whether it is an early
 * indication or a priced, measured case, and a customer needs to be told the
 * same thing in the same words. Both read this.
 */

import { ShieldCheck } from 'lucide-react';

import {
  EVIDENCE_LEVEL_SHORT,
  EVIDENCE_LEVEL_TONE,
  evidenceLevelSteps,
  nextLevelSentence,
  statementBody,
} from '../evidenceLevelPresentation';
import type { WizardEvidenceLevelAssessment } from '../wizardTypes';

export function EvidenceLevelBadge({
  assessment,
  compact,
}: {
  assessment: WizardEvidenceLevelAssessment;
  compact?: boolean;
}) {
  const tone = EVIDENCE_LEVEL_TONE[assessment.level];
  if (compact)
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}
      >
        <ShieldCheck className="h-3 w-3" />
        {assessment.label}
      </span>
    );

  const next = nextLevelSentence(assessment);
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${tone}`}>
      <p className="flex items-center gap-2 text-sm font-medium">
        <ShieldCheck className="h-4 w-4" />
        {EVIDENCE_LEVEL_SHORT[assessment.level]}
      </p>
      {/* The level is on the line above, so the statement is shown without the
          name it opens with. */}
      <p className="mt-1 text-[11px] leading-relaxed">
        {statementBody(assessment)}
      </p>
      <ol className="mt-2 flex flex-wrap gap-1">
        {evidenceLevelSteps(assessment).map(entry => (
          <li
            key={entry.level}
            className={`rounded-full border px-2 py-0.5 text-[10px] ${
              entry.held
                ? 'border-current font-medium'
                : entry.met
                  ? 'border-transparent bg-white/60'
                  : 'border-transparent bg-white/30 opacity-60'
            }`}
          >
            {entry.label}
            {entry.met && !entry.held ? ' ✓' : ''}
          </li>
        ))}
      </ol>
      {next === null ? null : (
        <p className="mt-1.5 text-[11px] opacity-90">{next}</p>
      )}
    </div>
  );
}
