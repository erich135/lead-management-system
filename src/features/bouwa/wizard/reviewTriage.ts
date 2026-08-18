/**
 * Sorting the review page into things a rep can do and things they cannot.
 *
 * The review page used to list every blocked output together. On a manual
 * proposal that meant a rep was shown "no logger export has been parsed" beside
 * "the tariff has not been confirmed", as though both were their fault and both
 * could be fixed. One of them can never be fixed on that proposal: a manual
 * proposal has no logger, and saying so is the honest answer rather than a
 * blocker.
 *
 * Three buckets come out of this, and the difference between them is who has to
 * act. Not applicable: nobody, and the proposal is complete without it.
 * Outstanding: the rep, on a question this page can send them to. Waiting:
 * somebody else, on a document or a calculation the wizard cannot produce.
 *
 * Nothing here decides what is blocked. Every reason is the backend's, and a
 * blocker is only ever moved between buckets, never removed.
 */

import type {
  AuditIntakeFormModel,
  AuditReadinessAssessment,
} from '../auditIntakeTypes';
import type { QuestionLocation } from './wizardState';

export interface ReviewBlocker {
  outputId: string;
  label: string;
  reason: string;
  /** The questions that would release it, in the order they are asked. */
  fixes: ReviewFix[];
}

export interface ReviewFix {
  code: string;
  label: string;
  /** Where the question lives, so "Fix now" can go there. */
  stepId: string;
  stepTitle: string;
  pageIndex: number;
}

export interface ReviewTriage {
  /** Released, and stated as such. */
  available: { outputId: string; label: string }[];
  /** Blocked on a question this proposal still has to answer. */
  outstanding: ReviewBlocker[];
  /**
   * Blocked on a document somebody must supply, or on a calculation that has no
   * accepted implementation. Not the rep's to clear on this screen.
   */
  waiting: ReviewBlocker[];
  /** Never part of this kind of proposal. Not a gap. */
  notApplicable: { outputId: string; label: string; reason: string }[];
}

export function reviewTriage(
  readiness: AuditReadinessAssessment,
  formModel: AuditIntakeFormModel,
  locations: ReadonlyMap<string, QuestionLocation>,
): ReviewTriage {
  const outputLabel = new Map(
    formModel.outputs.map(output => [output.id, output.label]),
  );
  const fieldLabel = new Map(
    readiness.fieldStatuses.map(status => [status.code, status.label]),
  );
  const applicable = new Set(
    readiness.fieldStatuses
      .filter(status => status.applicable)
      .map(status => status.code),
  );
  const triage: ReviewTriage = {
    available: readiness.permittedOutputs.map(id => ({
      outputId: id,
      label: outputLabel.get(id) ?? id,
    })),
    outstanding: [],
    waiting: [],
    notApplicable: [],
  };

  for (const output of readiness.blockedOutputs) {
    const reason = output.reasons[0] ?? 'Waiting on outstanding answers.';
    if (output.applicableToProposalType === false) {
      triage.notApplicable.push({
        outputId: output.outputId,
        label: output.label,
        reason,
      });
      continue;
    }
    const fixes: ReviewFix[] = [];
    for (const code of output.blockingFieldCodes) {
      if (!applicable.has(code)) continue;
      const where = locations.get(code);
      if (where === undefined) continue;
      fixes.push({
        code,
        label: fieldLabel.get(code) ?? code,
        stepId: where.stepId,
        stepTitle: where.stepTitle,
        pageIndex: where.pageIndex,
      });
    }
    if (fixes.length > 0) {
      // The backend's reason names the first missing field and then explains
      // why that field is asked for. Both are already on this row: the fields
      // are the buttons beneath, and the explanation belongs beside the
      // question rather than here. What is left to say is how far off the
      // figure is.
      triage.outstanding.push({
        outputId: output.outputId,
        label: output.label,
        reason:
          fixes.length === 1
            ? 'One question stands between this proposal and this figure.'
            : `${fixes.length} questions stand between this proposal and this figure.`,
        fixes,
      });
      continue;
    }
    triage.waiting.push({
      outputId: output.outputId,
      label: output.label,
      reason,
      fixes,
    });
  }

  return triage;
}

/**
 * What the last button on the wizard actually does.
 *
 * It said "Save & Finish", which was untrue twice over: nothing was finished,
 * and what happened was that the proposal closed. The answers are saved as they
 * are given, so the honest thing the button can offer at the end is a look at
 * the proposal that has been built.
 *
 * It once closed instead wherever no figure had been released, on the reasoning
 * that there was nothing to preview. That is no longer true. A proposal with no
 * released figure still names the customer, the machines and the price, and
 * states on its face what it is waiting on, which is worth more in front of a
 * customer than a rep with nothing to show. The button now offers the proposal
 * whenever there is one to open and says which of the three it is.
 */
export function finishActionLabel(
  triage: ReviewTriage,
  canPreview: boolean,
): { label: string; detail: string } {
  if (!canPreview)
    return {
      label: 'Save and close',
      detail: 'Your answers are already saved.',
    };
  if (triage.available.length === 0)
    return {
      label: 'Preview proposal',
      detail:
        'No figure has been released yet. The proposal reads as preliminary: what has been captured so far, and what it is still waiting on.',
    };
  if (triage.outstanding.length === 0)
    return {
      label: 'Preview proposal',
      detail:
        'Every question this proposal needs has been answered. The preview shows exactly what the customer would receive.',
    };
  return {
    label: 'Preview proposal',
    detail: `${triage.outstanding.length} figure${
      triage.outstanding.length === 1 ? '' : 's'
    } cannot be shown yet. The preview states which, rather than leaving them blank.`,
  };
}
