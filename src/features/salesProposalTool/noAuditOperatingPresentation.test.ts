import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  customerProposalPerformanceView,
  editorPerformanceView,
} from './currentMachinePerformanceView';
import {
  proposalRequiresRevision,
  showsCommercialSaving,
  showsPayback,
  showsRevisionCallout,
} from './customerProposalPresentation';
import {
  ANNUAL_OPERATING_HOURS_HELPER,
  AUDIT_ELECTRICITY_BASIS_INFO,
  AVERAGE_LOAD_HELPER,
  buildOperatingAssumptions,
  parseAnnualOperatingHours,
  parseAverageLoadPercent,
} from './operatingAssumptions';
import { buildSalesProposalSavePayload } from './salesProposalPersistence';
import { emptyProposedDraft } from './equipmentState';
import { displayOrUnavailable, formatMeasuredNumber } from './formatMeasured';
import {
  EMPTY_COMMERCIAL_OFFER,
  EMPTY_OPERATING_ASSUMPTIONS,
  EMPTY_SITE,
  type CurrentMachineMeasuredPerformance,
  type CustomerProposalDocument,
  type SitePerformanceView,
} from './types';
import { DEFAULT_AIR_AUDIT_SCOPE } from './airAuditScope';

const FEATURE_ROOT = path.dirname(fileURLToPath(import.meta.url));

const PUBLISHED_CAPACITY_FALLBACK_NOTE =
  'Estimated based on published airflow because a site-adjusted airflow could not be established from the available reference data.';

const SITE_UNAVAILABLE_REASON =
  'Site-adjusted airflow was not calculated because the published airflow reference basis is not confirmed.';

const ESTIMATED_SITE: SitePerformanceView = {
  status: 'estimated',
  publishedAirflowM3PerMin: 23.52,
  estimatedSiteAirflowM3PerMin: 19.23,
  estimatedSiteAirflowTotalM3PerMin: 19.23,
  siteAltitudeMetres: 1667,
  factor: 0.81754,
  basisNote:
    'Estimated based on published airflow, the confirmed published reference pressure and the customer site altitude.',
  unavailableReason: null,
  sectionTitle: 'Estimated performance at site conditions (1 667 m)',
  estimatedLabel: 'Estimated airflow at site conditions',
  altitudeLabel: 'Site altitude',
  altitudeDisplay: '1 667 m',
  advisory: null,
};

function noAuditPerformance(
  overrides: Partial<Omit<CurrentMachineMeasuredPerformance, 'copy'>> & {
    copy?: Partial<CurrentMachineMeasuredPerformance['copy']>;
  } = {},
): CurrentMachineMeasuredPerformance {
  const { copy, ...rest } = overrides;
  return {
    scopeType: 'single_machine',
    presentation: 'estimated_operating',
    available: true,
    machineName: 'Atlas Copco ZT 160 VSD+-10.4',
    publishedFlowM3PerMin: 23.52,
    measuredFlowM3PerMin: null,
    measuredFlowMetric: 'highest_recorded_airflow',
    absoluteDifferenceM3PerMin: null,
    percentageDifference: null,
    reductionPercent: null,
    publishedPressureBarG: 10.34,
    recordedPressureBar: null,
    pressureComparable: false,
    siteHeaderNote: null,
    comparisonCaveat: null,
    flowBasisNote: null,
    sitePerformance: {
      status: 'reference_basis_unconfirmed',
      publishedAirflowM3PerMin: 23.52,
      estimatedSiteAirflowM3PerMin: null,
      estimatedSiteAirflowTotalM3PerMin: null,
      siteAltitudeMetres: null,
      factor: null,
      basisNote: null,
      unavailableReason: SITE_UNAVAILABLE_REASON,
      sectionTitle: 'Estimated performance at site conditions',
      estimatedLabel: 'Estimated airflow at site conditions',
      altitudeLabel: 'Site altitude',
      altitudeDisplay: null,
      advisory: null,
    },
    annualOperatingHours: 4000,
    averageLoadPercent: 70,
    operatingCapacityM3PerMin: 23.52,
    estimatedAverageOperatingAirflowM3PerMin: 16.464,
    publishedCapacityFallbackNote: PUBLISHED_CAPACITY_FALLBACK_NOTE,
    ...rest,
    copy: {
      title: 'Current machine — estimated operating basis',
      publishedLabel: 'Published airflow',
      measuredLabel: null,
      differenceLabel: null,
      comparisonLabel: null,
      comparisonDisplay: null,
      limitationNote: PUBLISHED_CAPACITY_FALLBACK_NOTE,
      unavailableReason: null,
      annualOperatingHoursLabel: 'Annual operating hours',
      averageLoadLabel: 'Average load',
      estimatedAverageOperatingAirflowLabel: 'Estimated average operating airflow',
      ...copy,
    },
  };
}

function presentedText(
  view: ReturnType<typeof editorPerformanceView> | ReturnType<typeof customerProposalPerformanceView>,
): string {
  const parts: string[] = [view.kind];
  if (view.kind === 'machine') {
    parts.push(
      view.title,
      view.machineName ?? '',
      ...view.rows.flatMap((row) => [row.label, row.value]),
      ...view.notes,
    );
  }
  if (view.kind === 'shown') {
    parts.push(
      view.title,
      view.machineName ?? '',
      ...view.rows.flatMap((row) => [row.label, row.value]),
      view.limitationNote ?? '',
      view.caveat ?? '',
      view.estimatedBasisNote ?? '',
    );
  }
  return parts.join('\n');
}

describe('no-Air-Audit operating assumptions presentation', () => {
  it('shows the two operating-assumption inputs when no Air Audit is attached', () => {
    const section = readFileSync(
      path.join(FEATURE_ROOT, 'components/OperatingAssumptionsSection.tsx'),
      'utf8',
    );
    const editor = readFileSync(
      path.join(FEATURE_ROOT, 'pages/SalesProposalEditorPage.tsx'),
      'utf8',
    );
    expect(section).toMatch(/Annual operating hours/);
    expect(section).toMatch(/Average load \(%\)/);
    expect(section).toMatch(/ANNUAL_OPERATING_HOURS_HELPER/);
    expect(section).toMatch(/AVERAGE_LOAD_HELPER/);
    const helpers = readFileSync(path.join(FEATURE_ROOT, 'operatingAssumptions.ts'), 'utf8');
    expect(helpers).toContain(ANNUAL_OPERATING_HOURS_HELPER);
    expect(helpers).toContain(AVERAGE_LOAD_HELPER);
    expect(section).not.toMatch(/hours\/day|days\/week|shifts|duty cycle|schedule builder/i);
    expect(editor).toMatch(/OperatingAssumptionsSection/);
    expect(editor).toMatch(/airAuditPresent=\{Boolean\(proposal\.airAudit\)\}/);
  });

  it('does not require operating assumptions when an Air Audit is present', () => {
    const section = readFileSync(
      path.join(FEATURE_ROOT, 'components/OperatingAssumptionsSection.tsx'),
      'utf8',
    );
    expect(section).toMatch(/if \(airAuditPresent\)/);
    expect(section).toMatch(/AUDIT_ELECTRICITY_BASIS_INFO/);
    const helpers = readFileSync(path.join(FEATURE_ROOT, 'operatingAssumptions.ts'), 'utf8');
    expect(helpers).toContain(AUDIT_ELECTRICITY_BASIS_INFO);
    expect(section).not.toMatch(/required/);
  });

  it('rejects missing and invalid assumptions instead of inventing defaults', () => {
    expect(parseAnnualOperatingHours('')).toBeNull();
    expect(parseAnnualOperatingHours('0')).toBeNull();
    expect(parseAnnualOperatingHours('8761')).toBeNull();
    expect(parseAverageLoadPercent('')).toBeNull();
    expect(parseAverageLoadPercent('0')).toBeNull();
    expect(parseAverageLoadPercent('101')).toBeNull();
    expect(parseAnnualOperatingHours('4000')).toBe(4000);
    expect(parseAverageLoadPercent('70')).toBe(70);
    expect(buildOperatingAssumptions({ hoursText: '', loadText: '' })).toEqual({
      annualOperatingHours: null,
      averageLoadPercent: null,
    });
    expect(buildOperatingAssumptions({ hoursText: '4000', loadText: '70' })).toEqual({
      annualOperatingHours: 4000,
      averageLoadPercent: 70,
    });
    const source = readFileSync(path.join(FEATURE_ROOT, 'operatingAssumptions.ts'), 'utf8');
    expect(source).not.toMatch(/8 hours|24 hours|365-day|averageLoadPercent:\s*50|averageLoadPercent:\s*100/);
    expect(EMPTY_OPERATING_ASSUMPTIONS).toEqual({
      annualOperatingHours: null,
      averageLoadPercent: null,
    });
  });

  it('never shows Measured wording on the no-audit current-machine presentation', () => {
    const view = editorPerformanceView(noAuditPerformance());
    expect(view.kind).toBe('machine');
    if (view.kind !== 'machine') return;
    expect(view.title).toBe('Current machine — estimated operating basis');
    expect(presentedText(view)).not.toMatch(/Measured/);
    expect(presentedText(view)).not.toMatch(/Highest measured airflow during Air Audit/);
    expect(view.rows.map((row) => row.label)).not.toContain(
      'Highest measured airflow during Air Audit',
    );
  });

  it('displays estimated average operating airflow from capacity × load', () => {
    const view = editorPerformanceView(noAuditPerformance());
    expect(view.kind).toBe('machine');
    if (view.kind !== 'machine') return;
    expect(
      view.rows.find((row) => row.label === 'Estimated average operating airflow')?.value,
    ).toBe(displayOrUnavailable(`${formatMeasuredNumber(16.464)} m³/min`));
    expect(view.rows.find((row) => row.label === 'Annual operating hours')?.value).toBe(
      displayOrUnavailable(formatMeasuredNumber(4000, 0)),
    );
    expect(view.rows.find((row) => row.label === 'Average load')?.value).toBe('70%');
  });

  it('keeps published airflow distinct from a site-estimated airflow', () => {
    const view = editorPerformanceView(
      noAuditPerformance({
        sitePerformance: ESTIMATED_SITE,
        operatingCapacityM3PerMin: 19.23,
        estimatedAverageOperatingAirflowM3PerMin: 13.461,
        publishedCapacityFallbackNote: null,
        copy: { limitationNote: null },
      }),
    );
    expect(view.kind).toBe('machine');
    if (view.kind !== 'machine') return;
    expect(view.rows[0]).toEqual({ label: 'Published airflow', value: '23,52 m³/min' });
    expect(view.rows[1]).toEqual({
      label: 'Estimated airflow at site conditions',
      value: '19,23 m³/min',
    });
    expect(view.rows[0]?.value).not.toBe(view.rows[1]?.value);
    expect(view.notes.join('\n')).toMatch(/^Estimated based on/);
    expect(presentedText(view)).not.toMatch(/Measured/);
  });

  it('keeps the site-adjustment unavailable reason when published FAD is the operating basis', () => {
    const view = editorPerformanceView(noAuditPerformance());
    expect(view.kind).toBe('machine');
    if (view.kind !== 'machine') return;
    expect(view.notes).toContain(SITE_UNAVAILABLE_REASON);
    expect(view.notes).toContain(PUBLISHED_CAPACITY_FALLBACK_NOTE);
    expect(view.rows.map((row) => row.label)).not.toContain(
      'Estimated airflow at site conditions',
    );
  });

  it('shows the known compressor amount as reference when a rate is also supplied', () => {
    const electricity = readFileSync(
      path.join(FEATURE_ROOT, 'components/ElectricityBasisSection.tsx'),
      'utf8',
    );
    const result = readFileSync(
      path.join(FEATURE_ROOT, 'components/ElectricityResultCard.tsx'),
      'utf8',
    );
    const preview = readFileSync(
      path.join(FEATURE_ROOT, 'pages/CustomerProposalPreviewPage.tsx'),
      'utf8',
    );
    expect(electricity).toMatch(/Known compressor electricity amount supplied:/);
    expect(electricity).toMatch(/shown for reference/);
    expect(electricity).toMatch(/like-for-like estimate/);
    expect(electricity).toMatch(/not the whole-site bill/);
    expect(result).toMatch(/suppliedAmountReferenceNote/);
    expect(preview).toMatch(/suppliedAmountReference/);
  });

  it('includes the latest hours and load in the save-before-preview payload', () => {
    const payload = buildSalesProposalSavePayload({
      customerId: 'cust-1',
      site: { ...EMPTY_SITE, name: 'John Thompson' },
      currentEquipment: [],
      proposed: emptyProposedDraft(),
      electricityBasis: {
        type: 'flat_rate',
        flatRateRandPerKwh: 2.5,
        tariffRecordId: null,
        suppliedCurrentAmount: null,
        suppliedCurrentPeriod: null,
      },
      operatingAssumptions: {
        annualOperatingHours: 4000,
        averageLoadPercent: 70,
      },
      commercialOffer: EMPTY_COMMERCIAL_OFFER,
      airAuditScope: DEFAULT_AIR_AUDIT_SCOPE,
    });
    expect(payload.operatingAssumptions).toEqual({
      annualOperatingHours: 4000,
      averageLoadPercent: 70,
    });
    const editor = readFileSync(
      path.join(FEATURE_ROOT, 'pages/SalesProposalEditorPage.tsx'),
      'utf8',
    );
    const persistence = readFileSync(
      path.join(FEATURE_ROOT, 'salesProposalPersistence.ts'),
      'utf8',
    );
    expect(editor).toMatch(/operatingAssumptions,/);
    expect(editor).toMatch(/saveThenPreviewCustomerProposal/);
    expect(persistence).toMatch(/operatingAssumptions: state\.operatingAssumptions/);
  });

  it('uses no-audit conclusion wording and hides the Air Audit summary without a source file', () => {
    const preview = readFileSync(
      path.join(FEATURE_ROOT, 'pages/CustomerProposalPreviewPage.tsx'),
      'utf8',
    );
    expect(preview).toMatch(/\{doc\.conclusion\}/);
    expect(preview).toMatch(/doc\.airAudit\.sourceFile && \(/);
    expect(preview).toMatch(/Highest measured airflow during Air Audit/);
    expect(preview).toMatch(
      /presentation !== 'estimated_operating'/,
    );
    const proposalView = customerProposalPerformanceView({
      title: 'Current machine — estimated operating basis',
      presentation: 'estimated_operating',
      machineName: 'Atlas Copco ZT 160 VSD+-10.4',
      publishedLabel: 'Published airflow',
      publishedAirflow: '23,52 m³/min',
      estimatedLabel: null,
      estimatedAirflow: null,
      estimatedSectionTitle: null,
      estimatedBasisNote: PUBLISHED_CAPACITY_FALLBACK_NOTE,
      measuredLabel: null,
      measuredAirflow: null,
      differenceLabel: null,
      differenceAirflow: null,
      comparisonLabel: null,
      comparisonValue: null,
      limitationNote: PUBLISHED_CAPACITY_FALLBACK_NOTE,
      caveat: null,
      annualOperatingHoursLabel: 'Annual operating hours',
      annualOperatingHours: '4 000',
      averageLoadLabel: 'Average load',
      averageLoad: '70%',
      estimatedAverageOperatingAirflowLabel: 'Estimated average operating airflow',
      estimatedAverageOperatingAirflow: '16,46 m³/min',
    } satisfies NonNullable<CustomerProposalDocument['currentMachinePerformance']>);
    expect(proposalView.kind).toBe('shown');
    if (proposalView.kind !== 'shown') return;
    expect(presentedText(proposalView)).not.toMatch(/Measured/);
    expect(proposalView.title).toBe('Current machine — estimated operating basis');
  });

  it('keeps Step 1 requiresRevision suppression unchanged', () => {
    expect(proposalRequiresRevision({ requiresRevision: false })).toBe(false);
    expect(proposalRequiresRevision({ requiresRevision: true })).toBe(true);
    expect(showsRevisionCallout({ requiresRevision: true })).toBe(true);
    expect(showsCommercialSaving({ requiresRevision: true })).toBe(false);
    expect(showsPayback).toBeTypeOf('function');
    const editor = readFileSync(
      path.join(FEATURE_ROOT, 'pages/SalesProposalEditorPage.tsx'),
      'utf8',
    );
    expect(editor).not.toMatch(/test\(doc\.recommendation\)/);
  });

  it('keeps Step 6 Air Audit wording when an Air Audit does exist', () => {
    const preview = readFileSync(
      path.join(FEATURE_ROOT, 'pages/CustomerProposalPreviewPage.tsx'),
      'utf8',
    );
    expect(preview).toMatch(/Air Audit summary/);
    expect(preview).toMatch(/doc\.airAudit\.measuredHeading/);
    expect(preview).toMatch(/Mean measured airflow/);
    expect(preview).toMatch(/P90 measured airflow/);
    expect(preview).toMatch(/Highest measured airflow during Air Audit/);
    expect(preview).toMatch(/limitationNote/);
  });
});
