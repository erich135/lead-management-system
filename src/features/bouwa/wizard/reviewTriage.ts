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
import type { WizardEvidenceLevelAssessment } from './wizardTypes';

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
   * Missing evidence that would raise the proposal level. It does not block
   * the document that can be generated now.
   */
  raisesLevel: ReviewBlocker[];
  /**
   * Blocked on a document somebody must supply, or on a calculation that has no
   * accepted implementation. Not the rep's to clear on this screen.
   */
  waiting: ReviewBlocker[];
  /** Never part of this kind of proposal. Not a gap. */
  notApplicable: { outputId: string; label: string; reason: string }[];
}

function raisesEvidenceLevel(requiredStage: string): boolean {
  return (
    requiredStage === 'engineering_comparison_ready' ||
    requiredStage === 'commercial_proposal_ready'
  );
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
    raisesLevel: [],
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
    const blocker: ReviewBlocker = {
      outputId: output.outputId,
      label: output.label,
      reason:
        fixes.length === 1
          ? 'One question stands between this proposal and this figure.'
          : fixes.length > 1
            ? `${fixes.length} questions stand between this proposal and this figure.`
            : reason,
      fixes,
    };
    if (raisesEvidenceLevel(output.requiredStage) && fixes.length > 0) {
      triage.raisesLevel.push({
        ...blocker,
        reason:
          fixes.length === 1
            ? 'One question would raise the evidence level of this proposal.'
            : `${fixes.length} questions would raise the evidence level of this proposal.`,
      });
      continue;
    }
    if (fixes.length > 0) {
      triage.outstanding.push(blocker);
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

export interface ProposalOutcomeCopy {
  currentReady: boolean;
  heading: 'Ready now' | 'Not ready yet';
  readyNow: string;
  canGenerate: string;
  nextActionLabel: 'Needed now' | 'Next improvement';
  nextImprovement: string | null;
  previewLabel: string;
}

function addRequiredInput(label: string | null): string {
  if (label === null || label.trim() === '')
    return 'Add the remaining required inputs for a preliminary proposal.';
  const body = label.trim();
  const lowered = body.charAt(0).toLowerCase() + body.slice(1);
  return lowered.endsWith('.') ? `Add ${lowered}` : `Add ${lowered}.`;
}

export function firstOutstandingFieldLabel(
  readiness: AuditReadinessAssessment,
  outstandingCodes: readonly string[],
): string | null {
  const first = outstandingCodes[0];
  if (first === undefined) return null;
  return (
    readiness.fieldStatuses.find(status => status.code === first)?.label ??
    first
  );
}

/**
 * What the last button on the wizard actually does.
 *
 * The label names the document that will be produced, so the salesperson knows
 * before clicking whether this is a preliminary estimate, an engineering
 * comparison, or a priced proposal. Outstanding sales answers keep the action
 * as a draft finish rather than pretending the document is complete.
 */
export function finishActionLabel(
  triage: ReviewTriage,
  canPreview: boolean,
  evidence: WizardEvidenceLevelAssessment | null = null,
  salesOutstandingCount = 0,
): { label: string; detail: string } {
  if (!canPreview)
    return {
      label: 'Save and close',
      detail: 'Your answers are already saved.',
    };
  if (salesOutstandingCount > 0)
    return {
      label: 'Finish draft with outstanding items',
      detail: `${salesOutstandingCount} answer${
        salesOutstandingCount === 1 ? '' : 's'
      } still needed for this proposal. Preview shows what has been captured so far.`,
    };
  const level = evidence?.level ?? 'preliminary';
  if (level === 'commercially_complete')
    return {
      label: 'Generate commercially complete proposal',
      detail: 'The priced proposal is ready to generate.',
    };
  if (level === 'audit_backed')
    return {
      label: 'Generate audit-backed proposal',
      detail:
        'Measured site demand is in place. The preview is the document the customer would receive.',
    };
  if (level === 'engineering')
    return {
      label: 'Generate engineering proposal',
      detail:
        'The manufacturer-data comparison is ready. Logger measurement would raise this to an audit-backed proposal.',
    };
  return {
    label: 'Generate preliminary proposal',
    detail:
      triage.available.length === 0
        ? 'A preliminary customer proposal can be generated from the answers given so far.'
        : 'A preliminary customer proposal can be generated now. Remaining items raise the evidence level rather than blocking this document.',
  };
}

export function proposalOutcomeCopy(
  evidence: WizardEvidenceLevelAssessment,
  salesOutstandingCount = 0,
  firstOutstandingLabel: string | null = null,
): ProposalOutcomeCopy {
  if (salesOutstandingCount > 0)
    return {
      currentReady: false,
      heading: 'Not ready yet',
      readyNow: 'Draft',
      canGenerate: 'Draft only — preliminary proposal not yet ready',
      nextActionLabel: 'Needed now',
      nextImprovement: addRequiredInput(firstOutstandingLabel),
      previewLabel: 'Preview captured answers',
    };

  const next = evidence.nextLevelLabel;
  const firstGap = evidence.toReachNextLevel[0] ?? null;
  const canGenerate =
    evidence.level === 'commercially_complete'
      ? 'Commercially complete customer proposal'
      : evidence.level === 'audit_backed'
        ? 'Audit-backed customer proposal'
        : evidence.level === 'engineering'
          ? 'Engineering proposal'
          : 'Preliminary customer proposal';
  return {
    currentReady: true,
    heading: 'Ready now',
    readyNow: evidence.label,
    canGenerate,
    nextActionLabel: 'Next improvement',
    nextImprovement:
      next === null
        ? null
        : firstGap === null
          ? `Add the remaining ${next.toLowerCase()} inputs.`
          : `To reach ${next}: ${firstGap.replace(/^[^:]+:\s*/, '')}`,
    previewLabel: canGenerate,
  };
}
