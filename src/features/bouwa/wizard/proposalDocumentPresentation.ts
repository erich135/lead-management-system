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
    return 'Preview. No version of this proposal has been generated yet.';
  if (stale)
    return `Version ${document.version} was generated on ${longDate(
      document.issuedAt,
    )}. Answers have changed since, so what is shown here is newer than that version.`;
  return `Version ${document.version}, generated on ${longDate(
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
 * The investment, as one list a reader adds up.
 *
 * The equipment, each cost and each credit are named once and the net follows
 * them. An earlier arrangement listed the costs and then repeated them as
 * subtotals, which on a proposal with one cost and one credit printed the same
 * two amounts twice and read as though it were charging for them twice.
 *
 * A net the proposal cannot state is carried by the price statement beneath
 * the table rather than as a figure, so the block never totals to nothing.
 */
export function investmentRows(
  document: WizardProposalDocument,
): ProposalTotalRow[] {
  const investment = document.investment;
  if (investment.netInitialInvestmentRand === null)
    return [
      { label: 'Net initial investment', amount: 'Not yet priced', emphasis: true },
    ];
  const units =
    investment.quantity !== null && investment.quantity > 1
      ? ` (${investment.quantity} × ${rands(investment.unitPriceRand)})`
      : '';
  return [
    {
      label: `Equipment${units}`,
      amount: rands(investment.equipmentSubtotalRand),
      emphasis: false,
    },
    ...investment.lines
      .filter(line => !line.notIncluded)
      .map(line => ({
        label: line.label,
        amount: investmentAmount(line),
        emphasis: false,
      })),
    {
      label: 'Net initial investment',
      amount: rands(investment.netInitialInvestmentRand),
      emphasis: true,
    },
  ];
}

/**
 * Whether generating another version would say anything new.
 *
 * The button is always offered under the same words, because a rep looking for
 * it should not have to find it under a different name depending on what the
 * proposal happens to contain. It is disabled where nothing has changed: the
 * backend refuses a second identical version, and a version number a customer
 * quotes has to mean that something moved.
 */
export function newVersionAction(
  document: WizardProposalDocument,
  versions: readonly WizardProposalDocumentVersion[],
  stale: boolean,
): { label: string; enabled: boolean; detail: string } {
  const latest = versions[versions.length - 1] ?? null;
  if (latest === null)
    return {
      label: 'Generate new version',
      enabled: true,
      detail: 'Produces version 1 of this proposal.',
    };
  if (!stale)
    return {
      label: 'Generate new version',
      enabled: false,
      detail: `Version ${latest.version} already says exactly this. Change an answer to generate another version.`,
    };
  return {
    label: 'Generate new version',
    enabled: true,
    detail: `Answers have changed since version ${latest.version} was generated on ${longDate(
      latest.issuedAt,
    )}. Generating version ${latest.version + 1} records what the proposal now says.`,
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
