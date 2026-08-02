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
 * The statement without the level name it opens with.
 *
 * Every statement begins by naming its own level, because the proposal prints
 * it as a standalone paragraph. Wherever the level is already on the badge
 * above it, repeating it is noise.
 */
export function statementBody(
  assessment: WizardEvidenceLevelAssessment,
): string {
  const opener = `${assessment.label}.`;
  return assessment.statement.startsWith(opener)
    ? assessment.statement.slice(opener.length).trimStart()
    : assessment.statement;
}

/**
 * The gap itself: neither the figure it holds up nor the guidance behind it.
 *
 * The server sends "<figure>: <reason>. <why the question is asked>". The
 * figure is listed on the review page, the guidance sits beside the question,
 * and what is left is the one thing that is missing — which is also what makes
 * two entries the same gap rather than two.
 */
function gapOnly(entry: string): string {
  const afterFigure = entry.indexOf(': ');
  const reason =
    afterFigure === -1 ? entry : entry.slice(afterFigure + 2);
  const end = reason.indexOf('. ');
  return end === -1 ? reason : reason.slice(0, end + 1);
}

/**
 * What raising the level would take, as one sentence a rep can act on.
 *
 * The server returns a reason for each output that is still blocked, and each
 * reason is followed by the guidance explaining why the field is asked for.
 * Reciting all of it reads as a wall, and the guidance belongs beside the
 * question rather than here, so only the reason is quoted.
 *
 * The count is of distinct things still outstanding. Counting the raw entries
 * said "41 more like it" where the same missing answer blocked output after
 * output, which reads as hopeless rather than as informative.
 */
export function nextLevelSentence(
  assessment: WizardEvidenceLevelAssessment,
): string | null {
  if (assessment.nextLevel === null || assessment.nextLevelLabel === null)
    return null;
  const reasons = [...new Set(assessment.toReachNextLevel.map(gapOnly))];
  if (reasons.length === 0)
    return `${assessment.nextLevelLabel} is not yet supported by the answers given.`;
  const first = reasons[0].replace(/\.$/, '');
  const more =
    reasons.length === 1 ? '' : `, and ${reasons.length - 1} more like it`;
  return `To reach ${assessment.nextLevelLabel.toLowerCase()}: ${first}${more}.`;
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
