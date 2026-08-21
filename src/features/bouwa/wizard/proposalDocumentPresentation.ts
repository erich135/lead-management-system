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
  WizardProposalNumericFigure,
  WizardProposalDetailedSectionId,
} from './wizardTypes';
/* Rands are formatted once, by the module the investment panel uses, so the
   figure a rep watches add up and the figure the customer reads are written the
   same way. The extension is explicit because this module is also loaded
   directly by the check scripts under Node's ESM resolver, which does not
   guess one. */
import { rands } from './investmentPresentation.ts';

export const PROPOSAL_DETAILED_SECTION_IDS: WizardProposalDetailedSectionId[] = [
  'customer_site',
  'evidence',
  'fleet_spec_condition',
  'existing_vs_proposed',
  'existing_performance_sensitivity',
  'cagi_reference',
  'logger_manual_basis',
  'electricity_tariff',
  'existing_energy_cost',
  'proposed_energy_cost',
  'proposed_scope',
  'source_scenario',
  'independent_scenario',
  'component_comparison',
  'five_year',
  'savings_roi',
  'assumptions',
  'missing_evidence',
  'discrepancies',
  'professional_conclusion',
];

/** Prints an accepted value or its backend blocker; missing never becomes zero. */
export function proposalNumericFigureText(
  figure: WizardProposalNumericFigure,
): string {
  if (!figure.available || figure.value === null)
    return figure.blockedReason?.trim() || 'No accepted calculation result is available.';
  const isCurrency = figure.unit.startsWith('R/');
  const value = figure.value.toLocaleString('en-ZA', {
    maximumFractionDigits: isCurrency ? 2 : 6,
  });
  return `${value}${figure.unit === '' ? '' : ` ${figure.unit}`}`;
}

/** Customer-quote status printed on the document. It does not gate Print or Download. */
export function proposalReleaseState(document: WizardProposalDocument): {
  allowed: boolean;
  label: string;
  reason: string | null;
} {
  if (document.preliminaryNotice)
    return {
      allowed: false,
      label: 'Preliminary estimate',
      reason:
        'Based on supplied customer, site and machine information. Subject to final technical confirmation.',
    };
  if (document.internalOnlyNotice !== null)
    return { allowed: false, label: 'Internal only', reason: document.internalOnlyNotice };
  if (!document.customerQuoteSafe)
    return {
      allowed: false,
      label: 'Customer release blocked',
      reason: 'The server has not released this document as customer-quote safe.',
    };
  return { allowed: true, label: 'Customer release allowed', reason: null };
}

/**
 * Whether the preview is looking at a generated version that still matches the
 * current answers. Print and download follow this, not customer-quote release:
 * a preliminary proposal is a real generated document and may be printed as
 * one. What it may claim is already written on the page.
 */
export type ProposalVersionUiState = 'never_generated' | 'current' | 'stale';

export function proposalVersionUiState(
  document: WizardProposalDocument,
  versions: readonly WizardProposalDocumentVersion[],
  stale: boolean,
): ProposalVersionUiState {
  if (document.version === 0 || versions.length === 0) return 'never_generated';
  return stale ? 'stale' : 'current';
}

export function proposalPrintDownloadEnabled(
  state: ProposalVersionUiState,
): boolean {
  return state === 'current';
}

export function proposalPrintDownloadReason(
  state: ProposalVersionUiState,
): string {
  if (state === 'never_generated')
    return 'Generate a proposal version first. Print and download use that generated version.';
  if (state === 'stale')
    return 'Current answers have changed since the last generated version. Generate an updated version before printing or downloading the current proposal.';
  return 'Print and download the current generated proposal.';
}

/** Text that must survive the same DOM-to-PDF capture used by the preview. */
export function proposalPdfContentContract(document: WizardProposalDocument): string[] {
  const release = proposalReleaseState(document);
  return [
    document.reference,
    document.calculationSnapshotId,
    document.calculationConfigurationSha256,
    release.label,
    ...(release.reason === null ? [] : [release.reason]),
    ...(document.internalOnlyNotice === null ? [] : [document.internalOnlyNotice]),
    ...(document.sensitivityNotice === null ? [] : [document.sensitivityNotice]),
    ...document.detailedSections.flatMap(section => [
      section.title,
      ...section.figures.flatMap(figure => [
        figure.label,
        proposalNumericFigureText(figure),
        ...(figure.hypothetical ? ['Hypothetical'] : []),
        ...(figure.source === null ? [] : [figure.source]),
      ]),
      ...section.statements,
    ]),
    ...(document.sourceCalculatorComparison?.rows
      .filter(row => row.clientFacing)
      .flatMap(row => [
        row.item,
        row.baofnClaim,
        row.bouwaResult,
        row.difference ?? '',
        row.finding,
        row.remark,
      ]) ?? []),
    ...(document.sourceCalculatorComparison?.performanceSensitivity
      ? [
          'EXISTING EQUIPMENT PERFORMANCE SENSITIVITY',
          document.sourceCalculatorComparison.performanceSensitivity
            .customerExplanation,
          document.sourceCalculatorComparison.performanceSensitivity.factorMeaning,
          document.sourceCalculatorComparison.performanceSensitivity
            .estimateDisclaimer,
          ...document.sourceCalculatorComparison.performanceSensitivity.scenarios.flatMap(
            scenario => [
              `${scenario.percent}% — ${scenario.label} (estimate)`,
              String(scenario.estimatedExistingFlowM3PerMin),
            ],
          ),
        ]
      : []),
  ];
}

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
    return 'No proposal version has been generated yet. Generate one to print or download.';
  if (stale)
    return `Current answers have changed since Version ${document.version} (generated on ${longDate(
      document.issuedAt,
    )}). Generate an updated proposal version before printing or downloading the current proposal.`;
  return `Version ${document.version}, generated on ${longDate(
    document.issuedAt,
  )} by ${document.issuedByName ?? 'ARS'}. Print and download are available.`;
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
 * The generate action for the current version state.
 *
 * Never generated and stale are different jobs, so they are labelled
 * differently: the first produces version 1, the second updates a version the
 * answers have moved on from. An unchanged current version is not offered
 * again, because the backend refuses an identical fingerprint.
 */
export function newVersionAction(
  document: WizardProposalDocument,
  versions: readonly WizardProposalDocumentVersion[],
  stale: boolean,
): { label: string; enabled: boolean; detail: string } {
  const state = proposalVersionUiState(document, versions, stale);
  const latest = versions[versions.length - 1] ?? null;
  if (state === 'never_generated' || latest === null)
    return {
      label: 'Generate proposal',
      enabled: true,
      detail:
        'Produces version 1 of this proposal. Print and download become available afterwards.',
    };
  if (state === 'current')
    return {
      label: 'Generate new version',
      enabled: false,
      detail: `Version ${latest.version} already matches the current answers. Print and download are available.`,
    };
  return {
    label: 'Generate updated version',
    enabled: true,
    detail: `Current answers have changed since Version ${latest.version} (generated on ${longDate(
      latest.issuedAt,
    )}). Generating Version ${latest.version + 1} records what the proposal now says, then Print and Download become available.`,
  };
}

/** The line under the heading, naming the customer and the site. */
export function addressBlock(document: WizardProposalDocument): string[] {
  return [
    document.customerName,
    document.siteAddress ?? document.siteName,
    document.siteGps === null || document.siteGps === ''
      ? null
      : `GPS: ${document.siteGps}`,
    document.siteLocationRemark,
  ].filter((line): line is string => typeof line === 'string' && line !== '');
}
