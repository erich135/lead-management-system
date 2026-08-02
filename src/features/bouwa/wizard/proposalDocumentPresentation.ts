/**
 * How the proposal document reads on paper.
 *
 * Everything here is a pure decision about wording or layout, kept out of the
 * component so it can be checked without a browser. The document itself is
 * decided by the backend; this file only decides how it is set on the page.
 *
 * Two rules run through it. A figure the proposal may not state is printed as
 * the reason it is missing, never as a blank or a dash, because a blank on a
 * customer document reads as a zero. And nothing here recalculates money: the
 * amounts are printed exactly as the backend supplied them.
 */

import type {
  WizardProposalDocument,
  WizardProposalDocumentVersion,
  WizardProposalInvestmentLine,
} from './wizardTypes';
/* Rands are formatted once, by the module the investment panel uses, so the
   figure a rep watches add up and the figure the customer reads are written the
   same way. The extension is explicit because this module is also loaded
   directly by the check scripts under Node's ESM resolver, which does not
   guess one. */
import { rands } from './investmentPresentation.ts';

/** The date as a South African reader writes it: 2 August 2026. */
export function longDate(iso: string | null): string {
  if (iso === null || iso === '') return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * The name a downloaded proposal arrives under.
 *
 * The reference and the version are in the filename because a customer keeps
 * two of these in the same folder and has to be able to tell which is which
 * without opening either.
 */
export function proposalFilename(document: WizardProposalDocument): string {
  const version = document.version === 0 ? 'draft' : `v${document.version}`;
  return `${document.reference}_${version}.pdf`.replace(/\s+/g, '_');
}

/** What the top of the page says about which document this is. */
export function documentStatusLine(
  document: WizardProposalDocument,
  stale: boolean,
): string {
  if (document.version === 0)
    return 'Preview. This has not been issued to the customer.';
  if (stale)
    return `Issued as version ${document.version} on ${longDate(
      document.issuedAt,
    )}. The answers have changed since, so this preview differs from what was sent.`;
  return `Version ${document.version}, issued on ${longDate(
    document.issuedAt,
  )} by ${document.issuedByName ?? 'ARS'}.`;
}

/** The amount, or the sentence that explains why there is no amount. */
export function investmentAmount(line: WizardProposalInvestmentLine): string {
  if (line.notIncluded) return 'Not included';
  return `${line.credit ? '− ' : ''}${rands(line.amountRand)}`;
}

export interface ProposalTotalRow {
  label: string;
  amount: string;
  emphasis: boolean;
}

/**
 * The totals block, in the order a reader adds them up. A total the proposal
 * cannot state is carried as the price statement instead of a figure, so the
 * block never shows a net investment of nothing.
 */
export function totalRows(
  document: WizardProposalDocument,
): ProposalTotalRow[] {
  const investment = document.investment;
  if (investment.netInitialInvestmentRand === null)
    return [
      { label: 'Net initial investment', amount: 'Not yet priced', emphasis: true },
    ];
  return [
    {
      label: 'Equipment',
      amount: rands(investment.equipmentSubtotalRand),
      emphasis: false,
    },
    {
      label: 'Installation and related work',
      amount: rands(investment.additionalCostsRand),
      emphasis: false,
    },
    {
      label: 'Credits',
      amount: `− ${rands(investment.creditsRand)}`,
      emphasis: false,
    },
    {
      label: 'Net initial investment',
      amount: rands(investment.netInitialInvestmentRand),
      emphasis: true,
    },
  ];
}

/**
 * Whether issuing a version would be honest.
 *
 * Re-issuing an unchanged document is refused by the backend, so the button is
 * disabled rather than offered and then rejected.
 */
export function issueAction(
  document: WizardProposalDocument,
  versions: readonly WizardProposalDocumentVersion[],
  stale: boolean,
): { label: string; enabled: boolean; detail: string } {
  const latest = versions[versions.length - 1] ?? null;
  if (latest === null)
    return {
      label: 'Issue version 1',
      enabled: true,
      detail: 'Records that this document went to the customer.',
    };
  if (!stale)
    return {
      label: `Version ${latest.version} issued`,
      enabled: false,
      detail: `Nothing has changed since version ${latest.version}. Change an answer before issuing another version.`,
    };
  return {
    label: `Issue version ${latest.version + 1}`,
    enabled: true,
    detail: `The answers have changed since version ${latest.version} was issued on ${longDate(
      latest.issuedAt,
    )}.`,
  };
}

/** The line under the heading, naming the customer and the site. */
export function addressBlock(document: WizardProposalDocument): string[] {
  return [
    document.customerName,
    document.siteName,
    document.siteAddress,
  ].filter((line): line is string => typeof line === 'string' && line !== '');
}
