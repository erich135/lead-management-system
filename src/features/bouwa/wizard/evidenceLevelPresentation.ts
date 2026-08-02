/**
 * Showing what a proposal rests on, without overstating it.
 *
 * The level itself is the server's; nothing here decides one. What is decided
 * here is how it reads: the short phrase on a badge, the colour that separates
 * an early indication from a priced one, and the single line that tells a rep
 * what the next level would take.
 *
 * The wording deliberately never promises accuracy. A proposal that is
 * commercially complete is complete in its evidence, not correct to the rand.
 */

import type {
  WizardEvidenceLevel,
  WizardEvidenceLevelAssessment,
} from './wizardTypes';

export const EVIDENCE_LEVEL_ORDER: readonly WizardEvidenceLevel[] = [
  'preliminary',
  'engineering',
  'audit_backed',
  'commercially_complete',
];

/** The one phrase a customer reads on the cover. */
export const EVIDENCE_LEVEL_SHORT: Record<WizardEvidenceLevel, string> = {
  preliminary: 'Preliminary — for discussion',
  engineering: 'Engineering comparison — manufacturer data',
  audit_backed: 'Audit-backed — measured on site',
  commercially_complete: 'Commercially complete — priced',
};

export const EVIDENCE_LEVEL_TONE: Record<WizardEvidenceLevel, string> = {
  preliminary: 'border-amber-200 bg-amber-50 text-amber-900',
  engineering: 'border-sky-200 bg-sky-50 text-sky-900',
  audit_backed: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  commercially_complete: 'border-emerald-300 bg-emerald-100 text-emerald-900',
};

/**
 * What raising the level would take, as one sentence a rep can act on.
 *
 * The server returns a reason for each output that is still blocked. Reciting
 * all of them reads as a wall; the count is stated and the first is quoted, and
 * the review page lists the rest beside the questions that would clear them.
 */
export function nextLevelSentence(
  assessment: WizardEvidenceLevelAssessment,
): string | null {
  if (assessment.nextLevel === null || assessment.nextLevelLabel === null)
    return null;
  const reasons = assessment.toReachNextLevel;
  if (reasons.length === 0)
    return `${assessment.nextLevelLabel} is not yet supported by the answers given.`;
  const more =
    reasons.length === 1 ? '' : ` and ${reasons.length - 1} more like it`;
  return `To reach ${assessment.nextLevelLabel.toLowerCase()}: ${reasons[0]}${more}`;
}

/** The levels with the one the proposal holds marked, for a progress strip. */
export function evidenceLevelSteps(
  assessment: WizardEvidenceLevelAssessment,
): { level: WizardEvidenceLevel; label: string; met: boolean; held: boolean }[] {
  return assessment.levels.map(entry => ({
    level: entry.level,
    label: entry.label,
    met: entry.met,
    held: entry.level === assessment.level,
  }));
}
