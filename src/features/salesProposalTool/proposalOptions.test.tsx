import { readFileSync } from 'node:fs';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { emptyProposedDraft } from './equipmentState';
import { ProposalOptionBar } from './components/ProposalOptionControls';
import { MultiOptionManagementSummary } from './pages/ManagementSummaryPage';
import { appendProposalOption, type EditorOption } from './proposalOptions';
import { EMPTY_COMMERCIAL_OFFER, type CustomerProposalDocument, type ProposalOptionReport } from './types';

function option(id: string, price: number | null, model: string): EditorOption {
  const proposed = emptyProposedDraft();
  proposed.model = model;
  proposed.manufacturer = 'BOUWA';
  return {
    id,
    name: id,
    includedInReport: true,
    archived: false,
    arrangement: 'all_run_together',
    proposed: [proposed],
    commercialOffer: {
      ...EMPTY_COMMERCIAL_OFFER,
      type: 'rental',
      rental: { ...EMPTY_COMMERCIAL_OFFER.rental, monthlyRental: price },
    },
  };
}

describe('add another option', () => {
  it('keeps the current option and selects an independent copy', () => {
    const first = option('option_1', 1000, 'One');
    const { options, created } = appendProposalOption(
      [first],
      { id: first.id, proposed: first.proposed, commercialOffer: first.commercialOffer, arrangement: first.arrangement },
      'option_2',
    );
    created.commercialOffer.rental.monthlyRental = 2500;
    created.proposed[0].model = 'Two';

    expect(created.id).toBe('option_2');
    expect(created.name).toBe('Option 2');
    expect(options.map((item) => item.id)).toEqual(['option_1', 'option_2']);
    expect(options[0].commercialOffer.rental.monthlyRental).toBe(1000);
    expect(options[0].proposed[0].model).toBe('One');
    expect(options[0].proposed[0].key).not.toBe(created.proposed[0].key);
  });

  it('shows the new option beside Add another option instead of hiding the selector', () => {
    const first = option('option_1', null, 'One');
    const second = option('option_2', null, 'Two');
    second.name = 'Option 2';
    const markup = renderToStaticMarkup(
      <ProposalOptionBar
        options={[first, second]}
        activeOptionId="option_2"
        onSelect={() => undefined}
        onRename={() => undefined}
        onInclude={() => undefined}
        onArchive={() => undefined}
        onAdd={() => undefined}
        showAdd
      />,
    );
    expect(markup).toContain('Option 2');
    expect(markup).toContain('Option name');
    expect(markup).toContain('Add another option');

    const editor = readFileSync(
      new URL('./pages/SalesProposalEditorPage.tsx', import.meta.url),
      'utf8',
    );
    const priceOffer = editor.split("'price-offer'")[1] ?? '';
    expect(priceOffer).not.toContain('showSelector={false}');
  });

  it('prints every included option inside the exported summary, using the final electricity figure', () => {
    const markup = renderToStaticMarkup(
      <MultiOptionManagementSummary
        revision={4}
        reports={[
          report('purchase-option', 'Purchase replacement', 'purchase', 'R 239 076', 'R 80 000'),
          report('rental-option', 'Rental replacement', 'rental', 'R 239 076', 'R 180 924'),
        ]}
      />,
    );
    expect(markup).toContain('spt-customer-proposal-document');
    expect(markup.indexOf('OPTION 1 — Purchase replacement')).toBeLessThan(markup.indexOf('OPTION 2 — Rental replacement'));
    expect(markup).toContain('Final annual electricity saving');
    expect(markup).toContain('R 239 076');
    expect(markup).not.toContain('R 142 036');
    expect(markup).toContain('Additional annual cost, including rental payments');
    expect(markup).not.toContain('Financial position');
    expect(markup).not.toContain('ARS recommends');
  });
});

function report(
  id: string,
  name: string,
  mode: 'purchase' | 'rental',
  electricity: string,
  commercialSaving: string,
): ProposalOptionReport {
  const offer = {
    ...EMPTY_COMMERCIAL_OFFER,
    type: mode,
    purchase: { ...EMPTY_COMMERCIAL_OFFER.purchase, equipmentPrice: mode === 'purchase' ? 500000 : null },
    rental: { ...EMPTY_COMMERCIAL_OFFER.rental, monthlyRental: mode === 'rental' ? 35000 : null },
  };
  return {
    id,
    name,
    commercialOffer: offer,
    document: {
      preparedFor: 'Example Customer',
      siteName: 'Example Site',
      siteLocation: 'Example Town',
      date: '5 October 2026',
      reference: '6ab0ef9308b4b4dd5515172c',
      purposeLead: 'ARS evaluated the site.',
      recommendation: 'ARS recommends the selected BOUWA solution.',
      currentMachines: [{ name: 'Atlas Copco GA37', quantity: 1, publishedAirflow: '7,30 m³/min' }],
      proposed: { name: 'Bouwa SVC-RS55A-II', quantity: 1 },
      proposedMachines: [],
      technicalRows: [],
      warnings: [],
      qualifications: [],
      nextSteps: [],
      airAudit: {},
      futureCostDisclaimer: 'Actual future electricity costs will vary.',
      estimatedNote: 'Estimated at the current tariff.',
      requiresRevision: false,
      electricityCalculationBasis: 'air_audit',
      operatingArrangement: null,
      refurbishmentNote: null,
      electricity: {
        current: 'R 835 177',
        proposed: 'R 596 101',
        saving: 'R 142 036',
        averageMonthlySaving: 'R 19 923',
        savingLabel: 'Saving',
        currentLabel: 'Current',
        proposedLabel: 'Proposed',
        costBreakdown: { finalSaving: electricity },
      },
      commercial: {
        saving: commercialSaving,
        savingHeadline: mode === 'rental' ? 'Estimated annual increase' : 'Estimated annual operating saving',
        current: 'R 835 177',
        proposed: 'R 1 016 101',
        investment: mode === 'purchase' ? 'R 500 000' : null,
        payback: null,
        costRows: [],
        purchaseLines: [],
      },
      financialBenefit: { mode, figures: [], note: null, years: [] },
    } as CustomerProposalDocument,
  };
}
