/**
 * Step 1: how this proposal is being created.
 *
 * This is the only answer that changes the shape of the workflow, so it is
 * asked first and asked plainly. An Air Audit rests on an untouched logger
 * export; a Manual Proposal rests on something a person can name. Choosing
 * Manual does not hide the logger questions — it removes them, along with the
 * blockers that belong to them.
 *
 * A manual proposal must also say what it rests on, because a site survey and a
 * preliminary estimate are not the same claim, and the provenance recorded
 * against every later figure follows from it.
 */

import { CheckCircle2, FileSpreadsheet, PencilLine } from 'lucide-react';

import {
  MANUAL_BASIS_LABELS,
  type WizardManualBasis,
  type WizardProposalType,
} from '../wizardTypes';

const MANUAL_BASIS_ORDER: WizardManualBasis[] = [
  'site_survey',
  'customer_supplied_information',
  'manufacturer_information',
  'preliminary_estimate',
];

const MANUAL_BASIS_NOTES: Record<WizardManualBasis, string> = {
  site_survey: 'Recorded on site by an ARS engineer.',
  customer_supplied_information: 'Figures the customer stated.',
  manufacturer_information: 'Published manufacturer data.',
  preliminary_estimate: 'An estimate. Nothing will be presented as measured.',
};

function TypeCard({
  active,
  disabled,
  icon,
  title,
  summary,
  includes,
  onSelect,
}: {
  active: boolean;
  disabled: boolean;
  icon: React.ReactNode;
  title: string;
  summary: string;
  includes: string[];
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={onSelect}
      className={`flex h-full flex-col rounded-xl border-2 p-4 text-left transition-colors disabled:opacity-60 ${
        active
          ? 'border-ars-primary bg-white shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <span className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          {icon}
          {title}
        </span>
        {active ? (
          <CheckCircle2 className="h-5 w-5 text-ars-primary" />
        ) : null}
      </span>
      <span className="mt-1.5 text-xs leading-relaxed text-slate-600">
        {summary}
      </span>
      <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
        {includes.map(entry => (
          <li key={entry}>· {entry}</li>
        ))}
      </ul>
    </button>
  );
}

export interface ProposalTypeStepProps {
  proposalType: WizardProposalType;
  manualBasis: WizardManualBasis | null;
  disabled: boolean;
  /** True once a logger export has been parsed, which pins the proposal type. */
  sourceHeld: boolean;
  onChangeType: (type: WizardProposalType) => void;
  onChangeBasis: (basis: WizardManualBasis) => void;
}

export function ProposalTypeStep({
  proposalType,
  manualBasis,
  disabled,
  sourceHeld,
  onChangeType,
  onChangeBasis,
}: ProposalTypeStepProps) {
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="sr-only">How are you creating this proposal?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <TypeCard
            active={proposalType === 'air_audit'}
            disabled={disabled}
            icon={<FileSpreadsheet className="h-4 w-4 text-ars-primary" />}
            title="Air Audit Proposal"
            summary="You have an untouched logger export from the site."
            includes={[
              'The file is read and its own figures are filled in for you',
              'Logger and sensor details',
              'Measured demand and data-quality results',
            ]}
            onSelect={() => onChangeType('air_audit')}
          />
          <TypeCard
            active={proposalType === 'manual'}
            disabled={disabled || sourceHeld}
            icon={<PencilLine className="h-4 w-4 text-ars-primary" />}
            title="Manual Proposal"
            summary="No logger export exists. The proposal rests on stated information."
            includes={[
              'No file upload and no logger questions',
              'Figures keep the provenance you give them',
              'Measured results stay unavailable, because nothing was measured',
            ]}
            onSelect={() => onChangeType('manual')}
          />
        </div>
      </fieldset>

      {sourceHeld && proposalType === 'air_audit' ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          This proposal holds a parsed logger export, so it stays an Air Audit
          Proposal. Start a new proposal to work without a file.
        </p>
      ) : null}

      {proposalType !== 'manual' ? null : (
        <fieldset className="rounded-xl border border-slate-200 bg-white p-3">
          <legend className="px-1 text-sm font-semibold text-slate-800">
            What is this proposal based on?
          </legend>
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            {MANUAL_BASIS_ORDER.map(basis => (
              <label
                key={basis}
                className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                  manualBasis === basis
                    ? 'border-ars-primary bg-blue-50/40'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="manual-basis"
                  className="mt-1"
                  disabled={disabled}
                  checked={manualBasis === basis}
                  onChange={() => onChangeBasis(basis)}
                />
                <span>
                  <span className="font-medium text-slate-800">
                    {MANUAL_BASIS_LABELS[basis]}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {MANUAL_BASIS_NOTES[basis]}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {manualBasis === null ? (
            <p className="mt-2 text-xs text-amber-700">
              Choose what the figures rest on before continuing.
            </p>
          ) : null}
        </fieldset>
      )}
    </div>
  );
}
