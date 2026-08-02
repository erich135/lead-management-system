/**
 * What each cited answer says, and what its source said.
 *
 * A rep may restate a manufacturer's figure where that is scientifically and
 * commercially defensible. The published figure is kept regardless, because a
 * number quietly typed over a manufacturer's is indistinguishable afterwards
 * from the manufacturer's own, and a proposal has to be able to tell a reader
 * which it is reading. This arranges both for Advanced Technical Review; it
 * decides nothing and computes nothing.
 */

import type {
  AuditFieldStatus,
  AuditIntakeFormModel,
  IntakeAnswer,
} from '../auditIntakeTypes';
import type { WizardAnswerProvenance } from './wizardTypes';

export interface AnswerCitation {
  path: string;
  code: string;
  label: string;
  provenance: WizardAnswerProvenance;
  /** What this proposal now states, which may differ from the source. */
  proposalValue: string;
}

/** A value as a reader sees it, rather than as the intake stores it. */
export function citedValue(value: unknown): string {
  if (value === null || value === undefined) return 'Not published';
  if (Array.isArray(value))
    return `${value.length} point${value.length === 1 ? '' : 's'}`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function answerCitations(
  formModel: AuditIntakeFormModel,
  fieldStatuses: AuditFieldStatus[],
  answerAt: (path: string) => IntakeAnswer<unknown> | null,
  answerProvenance: Record<string, WizardAnswerProvenance>,
): AnswerCitation[] {
  const byPath = new Map(formModel.fields.map(field => [field.path, field]));
  const labels = new Map(fieldStatuses.map(status => [status.code, status.label]));
  return Object.entries(answerProvenance)
    .map(([path, provenance]) => {
      const code = byPath.get(path)?.code ?? path;
      const stored = answerAt(path);
      return {
        path,
        code,
        label: labels.get(code) ?? code,
        provenance,
        proposalValue:
          stored === null || stored.state !== 'answered'
            ? 'Not answered'
            : citedValue(stored.value),
      };
    })
    .sort((left, right) => {
      /* A restated value is what a reviewer opened this screen for. */
      const changed = (entry: AnswerCitation) =>
        entry.provenance.origin === 'changed_for_this_proposal' ? 0 : 1;
      return changed(left) - changed(right) || left.code.localeCompare(right.code);
    });
}
