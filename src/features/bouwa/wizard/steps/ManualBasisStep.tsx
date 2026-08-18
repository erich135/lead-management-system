/**
 * The manual path's third step: what the figures actually rest on.
 *
 * A manual proposal has no measurement, and this screen is where that is said
 * out loud rather than left for a reader to work out. The basis chosen on the
 * first screen decides how every figure entered later is described — a site
 * survey and a preliminary estimate are different claims — so it is repeated
 * here, in full, with the provenance it carries and the outputs it cannot
 * release.
 *
 * Nothing on this screen can turn a stated figure into a measured one.
 */

import { AlertCircle, PencilLine } from 'lucide-react';

import type { AuditIntakeDocument, IntakeAnswer } from '../../auditIntakeTypes';
import { WizardAnswerField } from '../components/WizardAnswerField';
import type { WizardFieldView } from '../wizardState';
import { MANUAL_BASIS_LABELS, type WizardManualBasis } from '../wizardTypes';

const BASIS_PROVENANCE: Record<WizardManualBasis, string> = {
  site_survey:
    'Figures are recorded as user input from a survey. They are not measured and are not manufacturer data.',
  customer_supplied_information:
    'Figures are recorded as business input stated by the customer.',
  manufacturer_information:
    'Figures are recorded as manufacturer specification, and carry only as much weight as the datasheet behind them.',
  preliminary_estimate:
    'Figures are recorded as estimates. Nothing in this proposal may be presented as measured or confirmed.',
};

export interface ManualBasisStepProps {
  manualBasis: WizardManualBasis | null;
  fields: WizardFieldView[];
  intake: AuditIntakeDocument;
  disabled: boolean;
  onAnswer: (path: string, answer: IntakeAnswer<unknown>) => void;
}

export function ManualBasisStep({
  manualBasis,
  fields,
  intake,
  disabled,
  onAnswer,
}: ManualBasisStepProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <PencilLine className="h-4 w-4 text-ars-primary" />
          {manualBasis === null
            ? 'No basis chosen yet'
            : MANUAL_BASIS_LABELS[manualBasis]}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          {manualBasis === null
            ? 'Go back to the first step and state what this proposal is based on.'
            : BASIS_PROVENANCE[manualBasis]}
        </p>
      </div>

      <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        No logger record exists on this proposal, so measured demand and data
        quality are unavailable. The engineering comparison and the commercial
        figures remain reachable on the answers you give here.
      </p>

      <div className="space-y-2">
        {fields.map(view => (
          <WizardAnswerField
            key={view.field.code}
            view={view}
            intake={intake}
            disabled={disabled}
            onAnswer={onAnswer}
          />
        ))}
      </div>
    </div>
  );
}
