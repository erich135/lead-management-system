/**
 * The commercial half of a proposal, itemised.
 *
 * A rep used to be asked for a unit price and a quantity, so installation,
 * electrical work, piping, delivery and commissioning all had to be folded into
 * one figure. The customer then received a number they could not check.
 *
 * The questions themselves are still the shared answer fields, so they keep
 * their guidance, their validation and their provenance. What this adds is the
 * shape around them: the price's origin asked first, the money split into what
 * it is for, a running total, and prices ARS has already quoted this customer
 * offered rather than remembered.
 */

import { Banknote, Check, Clock } from 'lucide-react';
import type { ReactNode } from 'react';

import { WizardAnswerField } from './WizardAnswerField';
import {
  PRICE_DEPENDENT_FIGURES,
  priceUnavailable,
  rands,
} from '../investmentPresentation';
import { readAnswerAtPath } from '../../auditIntakeState';
import type { AuditIntakeDocument, IntakeAnswer } from '../../auditIntakeTypes';
import type { WizardFieldView } from '../wizardState';
import type { WizardPriceSuggestion } from '../wizardTypes';

const ORDER: string[] = [
  'AUDIT.INVESTMENT.PRICING_STATUS',
  'AUDIT.INVESTMENT.PRICE_SOURCE',
  'AUDIT.INVESTMENT.ITEM_DESCRIPTION',
  'AUDIT.INVESTMENT.UNIT_PRICE',
  'AUDIT.INVESTMENT.QUANTITY',
  'AUDIT.INVESTMENT.INSTALLATION',
  'AUDIT.INVESTMENT.ELECTRICAL_WORK',
  'AUDIT.INVESTMENT.PIPING_WORK',
  'AUDIT.INVESTMENT.DELIVERY',
  'AUDIT.INVESTMENT.COMMISSIONING',
  'AUDIT.INVESTMENT.BUY_BACK',
  'AUDIT.INVESTMENT.DISCOUNT',
  'AUDIT.INVESTMENT.REFURBISHMENT',
  'AUDIT.INVESTMENT.OTHER_COSTS',
];

export function InvestmentPanel({
  fields,
  intake,
  disabled,
  suggestions,
  onAnswer,
  onOverride,
  onRestore,
  onUseSuggestion,
  children,
}: {
  fields: WizardFieldView[];
  intake: AuditIntakeDocument;
  disabled: boolean;
  suggestions: WizardPriceSuggestion[];
  onAnswer: (path: string, answer: IntakeAnswer<unknown>) => void;
  onOverride?: (path: string, answer: unknown, reason: string) => void;
  onRestore?: (path: string) => void;
  onUseSuggestion: (suggestion: WizardPriceSuggestion) => void;
  children?: ReactNode;
}) {
  const held = new Map(fields.map(view => [view.field.code, view]));
  const ordered = [
    ...ORDER.map(code => held.get(code)).filter(
      (view): view is WizardFieldView => view !== undefined,
    ),
    ...fields.filter(view => !ORDER.includes(view.field.code)),
  ];
  const answerAt = (path: string) =>
    (readAnswerAtPath(intake, path) as IntakeAnswer<unknown> | null) ?? null;
  const waiting = priceUnavailable(answerAt);

  const field = (view: WizardFieldView) => (
    <WizardAnswerField
      key={view.field.code}
      view={view}
      intake={intake}
      disabled={disabled}
      stepper={view.field.code === 'AUDIT.INVESTMENT.QUANTITY'}
      onAnswer={onAnswer}
      onOverride={onOverride}
      onRestore={onRestore}
    />
  );

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <Banknote className="h-4 w-4 text-ars-primary" />
          Proposal investment
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
          What the customer is being asked to spend, itemised. Leave a line
          blank where the proposal carries no such cost; it is then shown as not
          included rather than as zero.
        </p>

        {suggestions.length === 0 || waiting ? null : (
          <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
            <p className="text-xs font-medium text-slate-700">
              Prices ARS has already put in writing for this customer
            </p>
            <ul className="mt-1 space-y-1">
              {suggestions.map(suggestion => (
                <li key={suggestion.draftId}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onUseSuggestion(suggestion)}
                    className="flex w-full items-start justify-between gap-3 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs hover:bg-slate-50 disabled:opacity-50"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-800">
                        {rands(suggestion.unitPriceRand)} each
                        {suggestion.machineLabel === null
                          ? ''
                          : ` · ${suggestion.machineLabel}`}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        {suggestion.sourceLabel}
                      </span>
                    </span>
                    <Check className="h-4 w-4 shrink-0 text-ars-primary" />
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-[11px] text-slate-500">
              An earlier proposal is what ARS said then. Check it still holds
              before using it.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">{ordered.map(field)}</div>

      {waiting ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2">
          <p className="flex items-start gap-1 text-[11px] font-medium text-amber-800">
            <Clock className="mt-px h-3 w-3 shrink-0" />
            No price has been obtained yet.
          </p>
          <p className="mt-0.5 text-[11px] text-amber-800">
            The proposal carries on and every engineering figure is unaffected.
            These stay unavailable until a price is entered:{' '}
            {PRICE_DEPENDENT_FIGURES.join(', ')}.
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-600">
          Saved amounts are sent unchanged to the server. Totals, payback and return
          are shown only from the server calculation snapshot.
        </p>
      )}
      {children}
    </div>
  );
}
