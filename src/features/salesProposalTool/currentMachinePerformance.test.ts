import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  customerProposalPerformanceView,
  editorPerformanceView,
} from './currentMachinePerformanceView';
import type { CurrentMachineMeasuredPerformance, CustomerProposalDocument, SitePerformanceView } from './types';

const FEATURE_ROOT = path.dirname(fileURLToPath(import.meta.url));

const SITE_HEADER_NOTE =
  'This Air Audit measures site/common-header demand and is therefore not used to assess the performance degradation of an individual compressor.';

const TITLE = 'Current machine — published vs measured';
const PUBLISHED_LABEL = 'Published airflow';
const MEASURED_LABEL = 'Highest measured airflow during Air Audit';
const DIFFERENCE_LABEL = 'Difference from published capacity';
const COMPARISON_LABEL = 'Highest measured airflow compared with published capacity';
const BELOW_LIMITATION =
  'The highest airflow recorded during the Air Audit was 30,2% below the published machine capacity. This comparison does not by itself prove a loss of compressor capacity unless the machine was operating at full load during the measurement.';
const ABOVE_LIMITATION =
  'The highest airflow recorded during the Air Audit was 1,9% above the published machine capacity. This comparison does not by itself prove a change in compressor capacity unless the machine was operating at full load during the measurement.';
const PRESSURE_CAVEAT =
  'Measured airflow is 30,2% below the published airflow figure, but the measured and published pressure conditions differ.';

const NEUTRAL_COPY = {
  title: TITLE,
  publishedLabel: PUBLISHED_LABEL,
  measuredLabel: MEASURED_LABEL,
  differenceLabel: DIFFERENCE_LABEL,
  comparisonLabel: COMPARISON_LABEL,
  comparisonDisplay: '30,2% below',
  limitationNote: BELOW_LIMITATION,
  unavailableReason: null as string | null,
};

function performanceResult(
  overrides: Partial<Omit<CurrentMachineMeasuredPerformance, 'copy'>> & {
    copy?: Partial<CurrentMachineMeasuredPerformance['copy']>;
  } = {},
): CurrentMachineMeasuredPerformance {
  const { copy, ...rest } = overrides;
  return {
    scopeType: 'single_machine',
    available: true,
    machineName: 'Atlas Copco ZT 160 VSD+-10.4',
    publishedFlowM3PerMin: 23.52,
    measuredFlowM3PerMin: 16.42,
    measuredFlowMetric: 'highest_recorded_airflow',
    absoluteDifferenceM3PerMin: -7.1,
    percentageDifference: -30.187,
    reductionPercent: 30.187,
    publishedPressureBarG: 10.34,
    recordedPressureBar: 10.3,
    pressureComparable: true,
    siteHeaderNote: null,
    comparisonCaveat: null,
    flowBasisNote:
      'Measured airflow is compared with published airflow. This is not a converted FAD test result.',
    ...rest,
    copy: {
      ...NEUTRAL_COPY,
      ...copy,
    },
  };
}

function labelsOf(
  view: ReturnType<typeof editorPerformanceView> | ReturnType<typeof customerProposalPerformanceView>,
) {
  if (view.kind === 'machine' || view.kind === 'shown') {
    return view.rows.map((row) => row.label);
  }
  return [];
}

function valueFor(
  view: Extract<
    ReturnType<typeof editorPerformanceView> | ReturnType<typeof customerProposalPerformanceView>,
    { rows: Array<{ label: string; value: string }> }
  >,
  label: string,
) {
  return view.rows.find((row) => row.label === label)?.value;
}

function presentedText(
  view: ReturnType<typeof editorPerformanceView> | ReturnType<typeof customerProposalPerformanceView>,
): string {
  const parts: string[] = [view.kind];
  if (view.kind === 'site_note') parts.push(view.title, view.note);
  if (view.kind === 'machine') {
    parts.push(
      view.title,
      view.machineName ?? '',
      ...view.rows.flatMap((row) => [row.label, row.value]),
      ...view.notes.filter((note) => !/not a converted FAD test result/i.test(note)),
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

function forbiddenClaim(text: string) {
  expect(text).not.toMatch(/Measured airflow reduction from published basis/i);
  expect(text).not.toMatch(/machine degradation/i);
  expect(text).not.toMatch(/capacity loss/i);
  expect(text).not.toMatch(/performance deterioration/i);
  expect(text).not.toMatch(/machine has lost/i);
  expect(text).not.toMatch(/efficiency loss/i);
  expect(text).not.toMatch(/electrical efficiency/i);
  expect(text).not.toMatch(/Measured machine capacity/i);
  expect(text).not.toMatch(/reduction in machine capacity/i);
}

describe('current machine published vs measured presentation', () => {
  it('does not present an individual-machine comparison for site/common-header scope', () => {
    const view = editorPerformanceView(
      performanceResult({
        scopeType: 'site_header',
        available: false,
        machineName: null,
        siteHeaderNote: SITE_HEADER_NOTE,
        absoluteDifferenceM3PerMin: null,
        percentageDifference: null,
        reductionPercent: null,
        copy: {
          ...NEUTRAL_COPY,
          comparisonLabel: null,
          comparisonDisplay: null,
          limitationNote: null,
          unavailableReason: SITE_HEADER_NOTE,
        },
      }),
    );

    expect(view.kind).toBe('site_note');
    if (view.kind !== 'site_note') return;
    expect(view.title).toBe(TITLE);
    expect(view.note).toBe(SITE_HEADER_NOTE);
    expect(view).not.toHaveProperty('rows');
    expect(customerProposalPerformanceView(null).kind).toBe('hidden');
  });

  it('shows published airflow, highest measured airflow and the difference for a named single machine', () => {
    const view = editorPerformanceView(performanceResult());
    expect(view.kind).toBe('machine');
    if (view.kind !== 'machine') return;

    expect(view.title).toBe(TITLE);
    expect(view.machineName).toBe('Atlas Copco ZT 160 VSD+-10.4');
    expect(valueFor(view, PUBLISHED_LABEL)).toBe('23,52 m³/min');
    expect(valueFor(view, MEASURED_LABEL)).toBe('16,42 m³/min');
    expect(valueFor(view, DIFFERENCE_LABEL)).toBe('-7,10 m³/min');
    expect(valueFor(view, PUBLISHED_LABEL)).not.toBe(valueFor(view, MEASURED_LABEL));
    expect(MEASURED_LABEL).toBe('Highest measured airflow during Air Audit');
    expect(labelsOf(view).join('\n')).not.toMatch(/\bFAD\b/);
    expect(labelsOf(view).join('\n')).not.toMatch(/electrical efficiency/i);
    forbiddenClaim(presentedText(view));
  });

  it('presents a lower measured value as below published capacity, not as degradation', () => {
    const view = editorPerformanceView(performanceResult());
    expect(view.kind).toBe('machine');
    if (view.kind !== 'machine') return;

    expect(valueFor(view, COMPARISON_LABEL)).toBe('30,2% below');
    expect(view.notes).toContain(BELOW_LIMITATION);
    expect(presentedText(view)).toMatch(/30,2% below/);
    forbiddenClaim(presentedText(view));
  });

  it('presents a higher measured value as above published capacity', () => {
    const view = editorPerformanceView(
      performanceResult({
        measuredFlowM3PerMin: 23.97,
        absoluteDifferenceM3PerMin: 0.45,
        percentageDifference: 1.913,
        reductionPercent: null,
        copy: {
          comparisonDisplay: '1,9% above',
          limitationNote: ABOVE_LIMITATION,
        },
      }),
    );
    expect(view.kind).toBe('machine');
    if (view.kind !== 'machine') return;
    expect(valueFor(view, COMPARISON_LABEL)).toBe('1,9% above');
    expect(view.notes).toContain(ABOVE_LIMITATION);
    expect(presentedText(view)).not.toMatch(/below/);
    forbiddenClaim(presentedText(view));
  });

  it('keeps missing measured airflow unavailable instead of fabricating zero', () => {
    expect(editorPerformanceView(null).kind).toBe('hidden');
    expect(
      editorPerformanceView(
        performanceResult({
          scopeType: 'single_machine',
          machineName: null,
          available: false,
        }),
      ).kind,
    ).toBe('hidden');

    const missingFlows = editorPerformanceView(
      performanceResult({
        available: false,
        publishedFlowM3PerMin: null,
        measuredFlowM3PerMin: null,
        absoluteDifferenceM3PerMin: null,
        percentageDifference: null,
        reductionPercent: null,
        copy: {
          comparisonLabel: null,
          comparisonDisplay: null,
          limitationNote: null,
          unavailableReason: 'Published airflow is not available for the measured machine.',
        },
      }),
    );
    expect(missingFlows.kind).toBe('machine');
    if (missingFlows.kind !== 'machine') return;
    expect(valueFor(missingFlows, PUBLISHED_LABEL)).toBe('Not available');
    expect(valueFor(missingFlows, MEASURED_LABEL)).toBe('Not available');
    expect(valueFor(missingFlows, DIFFERENCE_LABEL)).toBe('Not available');
    expect(valueFor(missingFlows, PUBLISHED_LABEL)).not.toMatch(/^0/);
    expect(valueFor(missingFlows, MEASURED_LABEL)).not.toBe('0,00 m³/min');
    expect(missingFlows.notes).toContain(
      'Published airflow is not available for the measured machine.',
    );
  });

  it('keeps the existing pressure caveat alongside the limitation note', () => {
    const view = editorPerformanceView(
      performanceResult({
        recordedPressureBar: 8.1,
        pressureComparable: false,
        comparisonCaveat: PRESSURE_CAVEAT,
      }),
    );
    expect(view.kind).toBe('machine');
    if (view.kind !== 'machine') return;
    expect(valueFor(view, 'Recorded Air Audit pressure')).toBe('8,1 bar');
    expect(valueFor(view, 'Published rated pressure')).toBe('10,3 bar');
    expect(view.notes).toContain(PRESSURE_CAVEAT);
    expect(view.notes).toContain(BELOW_LIMITATION);
  });

  it('uses the same neutral language on the customer proposal', () => {
    const proposalView = customerProposalPerformanceView({
      title: TITLE,
      machineName: 'Atlas Copco ZT 160 VSD+-10.4',
      publishedLabel: PUBLISHED_LABEL,
      publishedAirflow: '23,52 m³/min',
      estimatedLabel: null,
      estimatedAirflow: null,
      estimatedSectionTitle: null,
      estimatedBasisNote: null,
      measuredLabel: MEASURED_LABEL,
      measuredAirflow: '16,42 m³/min',
      differenceLabel: DIFFERENCE_LABEL,
      differenceAirflow: '-7,10 m³/min',
      comparisonLabel: COMPARISON_LABEL,
      comparisonValue: '30,2% below',
      limitationNote: BELOW_LIMITATION,
      caveat: PRESSURE_CAVEAT,
    } satisfies NonNullable<CustomerProposalDocument['currentMachinePerformance']>);

    expect(proposalView.kind).toBe('shown');
    if (proposalView.kind !== 'shown') return;
    expect(proposalView.title).toBe(TITLE);
    expect(valueFor(proposalView, PUBLISHED_LABEL)).toBe('23,52 m³/min');
    expect(valueFor(proposalView, MEASURED_LABEL)).toBe('16,42 m³/min');
    expect(valueFor(proposalView, DIFFERENCE_LABEL)).toBe('-7,10 m³/min');
    expect(valueFor(proposalView, COMPARISON_LABEL)).toBe('30,2% below');
    expect(proposalView.limitationNote).toBe(BELOW_LIMITATION);
    expect(proposalView.caveat).toBe(PRESSURE_CAVEAT);
    forbiddenClaim(presentedText(proposalView));
    expect(customerProposalPerformanceView(null).kind).toBe('hidden');
  });

  it('keeps the existing two-page customer proposal print structure', () => {
    const preview = readFileSync(
      path.join(FEATURE_ROOT, 'pages/CustomerProposalPreviewPage.tsx'),
      'utf8',
    );
    expect(preview).toMatch(/spt-customer-proposal-page-1/);
    expect(preview).toMatch(/spt-customer-proposal-page-2/);
    expect(preview).not.toMatch(/spt-customer-proposal-page-3/);
    expect(preview).toMatch(/limitationNote/);
    expect(preview).not.toMatch(/Measured airflow reduction from published basis/);
    expect(preview).not.toMatch(/efficiency loss/i);
  });

  it('inserts estimated site airflow between published and measured without calling it measured', () => {
    const estimated: SitePerformanceView = {
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
    const view = editorPerformanceView(performanceResult({ sitePerformance: estimated }));
    expect(view.kind).toBe('machine');
    if (view.kind !== 'machine') return;
    expect(labelsOf(view).slice(0, 3)).toEqual([
      PUBLISHED_LABEL,
      'Estimated airflow at site conditions',
      MEASURED_LABEL,
    ]);
    expect(valueFor(view, PUBLISHED_LABEL)).toBe('23,52 m³/min');
    expect(valueFor(view, 'Estimated airflow at site conditions')).toBe('19,23 m³/min');
    expect(valueFor(view, MEASURED_LABEL)).toBe('16,42 m³/min');
    expect(valueFor(view, 'Estimated airflow at site conditions')).not.toBe(
      valueFor(view, MEASURED_LABEL),
    );
    expect(valueFor(view, PUBLISHED_LABEL)).not.toBe(
      valueFor(view, 'Estimated airflow at site conditions'),
    );
    expect(view.rows.find((row) => /estimated/i.test(row.label))?.label).toMatch(/Estimated/);
    expect(view.rows.find((row) => /estimated/i.test(row.label))?.label).not.toMatch(/measured/i);
    expect(MEASURED_LABEL).toBe('Highest measured airflow during Air Audit');
    expect(presentedText(view)).not.toMatch(/14[.,]6%|degradation from site/i);
    forbiddenClaim(presentedText(view));

    const proposalView = customerProposalPerformanceView({
      title: TITLE,
      machineName: 'Atlas Copco ZT 160 VSD+-10.4',
      publishedLabel: PUBLISHED_LABEL,
      publishedAirflow: '23,52 m³/min',
      estimatedLabel: 'Estimated airflow at site conditions',
      estimatedAirflow: '19,23 m³/min',
      estimatedSectionTitle: 'Estimated performance at site conditions (1 667 m)',
      estimatedBasisNote:
        'Estimated based on published airflow, the confirmed published reference pressure and the customer site altitude.',
      measuredLabel: MEASURED_LABEL,
      measuredAirflow: '16,42 m³/min',
      differenceLabel: DIFFERENCE_LABEL,
      differenceAirflow: '-7,10 m³/min',
      comparisonLabel: COMPARISON_LABEL,
      comparisonValue: '30,2% below',
      limitationNote: BELOW_LIMITATION,
      caveat: null,
    });
    expect(proposalView.kind).toBe('shown');
    if (proposalView.kind !== 'shown') return;
    expect(labelsOf(proposalView).slice(0, 3)).toEqual([
      PUBLISHED_LABEL,
      'Estimated airflow at site conditions',
      MEASURED_LABEL,
    ]);
    expect(valueFor(proposalView, PUBLISHED_LABEL)).toBe('23,52 m³/min');
    expect(valueFor(proposalView, 'Estimated airflow at site conditions')).toBe('19,23 m³/min');
    expect(valueFor(proposalView, MEASURED_LABEL)).toBe('16,42 m³/min');
  });

  it('does not fabricate an estimated row when reference conditions are missing', () => {
    const view = editorPerformanceView(
      performanceResult({
        sitePerformance: {
          status: 'reference_basis_unconfirmed',
          publishedAirflowM3PerMin: 23.52,
          estimatedSiteAirflowM3PerMin: null,
          estimatedSiteAirflowTotalM3PerMin: null,
          siteAltitudeMetres: 1667,
          factor: null,
          basisNote: null,
          unavailableReason:
            'Site-adjusted airflow was not calculated because the published airflow reference basis is not confirmed.',
          sectionTitle: 'Estimated performance at site conditions',
          estimatedLabel: 'Estimated airflow at site conditions',
          altitudeLabel: 'Site altitude',
          altitudeDisplay: '1 667 m',
          advisory: null,
        },
      }),
    );
    expect(view.kind).toBe('machine');
    if (view.kind !== 'machine') return;
    expect(labelsOf(view)).not.toContain('Estimated airflow at site conditions');
    expect(valueFor(view, PUBLISHED_LABEL)).toBe('23,52 m³/min');
    expect(valueFor(view, MEASURED_LABEL)).toBe('16,42 m³/min');
    expect(valueFor(view, PUBLISHED_LABEL)).not.toMatch(/^0/);
  });
});
