import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { customerProposalPerformanceView } from './currentMachinePerformanceView';
import {
  proposalRequiresRevision,
  showsCommercialSaving,
  showsPayback,
  showsRevisionCallout,
} from './customerProposalPresentation';

const FEATURE_ROOT = path.dirname(fileURLToPath(import.meta.url));

const UNAVAILABLE_REASON =
  'Site-adjusted airflow was not calculated because the published airflow reference basis is not confirmed.';

describe('site performance presentation', () => {
  it('renders an unavailable reason instead of zero when no reference conditions exist', () => {
    expect(UNAVAILABLE_REASON).not.toMatch(/^0/);
    expect(UNAVAILABLE_REASON).toMatch(/not confirmed/);
    expect(UNAVAILABLE_REASON).not.toMatch(/reference_basis_unconfirmed/);
  });

  it('keeps published, estimated and measured as distinct customer-proposal rows', () => {
    const view = customerProposalPerformanceView({
      title: 'Current machine — published vs measured',
      machineName: 'Atlas Copco ZT 160 VSD+-10.4',
      publishedLabel: 'Published airflow',
      publishedAirflow: '23,52 m³/min',
      estimatedLabel: 'Estimated airflow at site conditions',
      estimatedAirflow: '19,23 m³/min',
      estimatedSectionTitle: 'Estimated performance at site conditions (1 667 m)',
      estimatedBasisNote:
        'Estimated based on published airflow, the confirmed published reference pressure and the customer site altitude.',
      measuredLabel: 'Highest measured airflow during Air Audit',
      measuredAirflow: '16,42 m³/min',
      differenceLabel: 'Difference from published capacity',
      differenceAirflow: '-7,10 m³/min',
      comparisonLabel: 'Highest measured airflow compared with published capacity',
      comparisonValue: '30,2% below',
      limitationNote:
        'The highest airflow recorded during the Air Audit was 30,2% below the published machine capacity. This comparison does not by itself prove a loss of compressor capacity unless the machine was operating at full load during the measurement.',
      caveat: null,
    });
    expect(view.kind).toBe('shown');
    if (view.kind !== 'shown') return;
    const labels = view.rows.map((row) => row.label);
    expect(labels[0]).toBe('Published airflow');
    expect(labels[1]).toBe('Estimated airflow at site conditions');
    expect(labels[2]).toBe('Highest measured airflow during Air Audit');
    expect(view.rows[1]?.value).toBe('19,23 m³/min');
    expect(view.rows[1]?.label).toMatch(/Estimated/);
    expect(view.rows[1]?.label).not.toMatch(/measured/i);
    expect(view.rows[2]?.label).toBe('Highest measured airflow during Air Audit');
    expect(view.estimatedBasisNote).toMatch(/^Estimated based on/);
  });

  it('matches editor and customer proposal terminology on the preview page', () => {
    const preview = readFileSync(
      path.join(FEATURE_ROOT, 'pages/CustomerProposalPreviewPage.tsx'),
      'utf8',
    );
    const editorCard = readFileSync(
      path.join(FEATURE_ROOT, 'components/CurrentMachinePerformanceCard.tsx'),
      'utf8',
    );
    const summary = readFileSync(
      path.join(FEATURE_ROOT, 'components/MachineSummaryCard.tsx'),
      'utf8',
    );
    expect(preview).toMatch(/Estimated airflow at site conditions/);
    expect(preview).toMatch(/Highest measured airflow during Air Audit/);
    expect(preview).toMatch(/siteUnavailableReason/);
    expect(preview).toMatch(/siteAirflowAdvisory/);
    expect(preview).not.toMatch(/Derated capacity|Guaranteed site capacity|Corrected FAD/);
    expect(preview).not.toMatch(/2\.25577|101325\s*\*/);
    expect(editorCard).toMatch(/editorPerformanceView/);
    expect(summary).toMatch(/Published airflow/);
    expect(summary).toMatch(/sitePerformance\.sectionTitle/);
    expect(summary).toMatch(/unavailableReason/);
    expect(summary).not.toMatch(/2\.25577|isaAtmosphericPressurePa/);
  });

  it('keeps Step 6 limitation wording and Step 1 boolean-driven suppression', () => {
    const preview = readFileSync(
      path.join(FEATURE_ROOT, 'pages/CustomerProposalPreviewPage.tsx'),
      'utf8',
    );
    expect(preview).toMatch(/limitationNote/);
    expect(preview).toMatch(/showsRevisionCallout\(doc\)/);
    expect(
      proposalRequiresRevision({ requiresRevision: false }),
    ).toBe(false);
    expect(proposalRequiresRevision({ requiresRevision: true })).toBe(true);
    expect(showsRevisionCallout({ requiresRevision: true })).toBe(true);
    expect(showsCommercialSaving({ requiresRevision: true })).toBe(false);
    expect(showsPayback).toBeTypeOf('function');
  });
});
