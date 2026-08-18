/**
 * Showing a rep the investment adding up as they type it.
 *
 * This is a running total of what is on screen, and it says so. It is not the
 * proposal's net investment: that is the backend's accepted calculation, taken
 * from the saved answers, and the review page and the document both read it
 * from there. The purpose here is only that a rep entering eight figures can
 * see the ninth before they leave the page.
 *
 * The line order and the split between costs and credits mirror the backend
 * schedule deliberately, so the running total a rep sees and the figure the
 * proposal states cannot disagree about which side of the sum a discount is on.
 */

import type { IntakeAnswer } from '../auditIntakeTypes';

/** Reads the saved answer at an intake path, or null where there is none. */
export type AnswerReader = (path: string) => IntakeAnswer<unknown> | null;

export const INVESTMENT_COST_LINES: { path: string; label: string }[] = [
  { path: 'investment.installationRand', label: 'Installation' },
  { path: 'investment.electricalWorkRand', label: 'Electrical work' },
  { path: 'investment.pipingWorkRand', label: 'Piping and mechanical work' },
  { path: 'investment.deliveryRand', label: 'Delivery' },
  { path: 'investment.commissioningRand', label: 'Commissioning' },
  { path: 'investment.refurbishmentRand', label: 'Refurbishment' },
  { path: 'investment.otherCostsRand', label: 'Other approved costs' },
];

export const INVESTMENT_CREDIT_LINES: { path: string; label: string }[] = [
  { path: 'investment.buyBackRand', label: 'Buy-back or trade-in credit' },
  { path: 'investment.discountRand', label: 'Discount' },
];

export interface InvestmentRunningTotal {
  equipmentSubtotalRand: number | null;
  additionalCostsRand: number;
  creditsRand: number;
  netInitialInvestmentRand: number | null;
  /** Lines left blank, so the panel can say they are not included. */
  notIncluded: string[];
}

function amountAt(answerAt: AnswerReader, path: string): number | null {
  const answer = answerAt(path);
  if (answer === null || answer.state !== 'answered') return null;
  const value = answer.value;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function investmentRunningTotal(
  answerAt: AnswerReader,
): InvestmentRunningTotal {
  const unitPrice = amountAt(answerAt, 'investment.unitPriceRand');
  const quantity = amountAt(answerAt, 'investment.quantity');
  const notIncluded: string[] = [];
  let additionalCostsRand = 0;
  let creditsRand = 0;

  for (const line of INVESTMENT_COST_LINES) {
    const amount = amountAt(answerAt, line.path);
    if (amount === null) notIncluded.push(line.label);
    else additionalCostsRand += amount;
  }
  for (const line of INVESTMENT_CREDIT_LINES) {
    const amount = amountAt(answerAt, line.path);
    if (amount === null) notIncluded.push(line.label);
    else creditsRand += amount;
  }

  const equipmentSubtotalRand =
    unitPrice === null || quantity === null ? null : unitPrice * quantity;
  return {
    equipmentSubtotalRand,
    additionalCostsRand,
    creditsRand,
    netInitialInvestmentRand:
      equipmentSubtotalRand === null
        ? null
        : equipmentSubtotalRand + additionalCostsRand - creditsRand,
    notIncluded,
  };
}

/** Rands, as they are read aloud: no cents where there are none. */
export function rands(amount: number | null): string {
  if (amount === null) return 'Not entered yet';
  const whole = Number.isInteger(amount);
  return `R ${amount.toLocaleString('en-ZA', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function priceUnavailable(answerAt: AnswerReader): boolean {
  return answerAt('investment.pricingStatus')?.value === 'price_not_available_yet';
}

/** What a proposal cannot state while no price has been obtained. */
export const PRICE_DEPENDENT_FIGURES: readonly string[] = [
  'Net investment',
  'Simple payback',
  'Return on investment',
];
