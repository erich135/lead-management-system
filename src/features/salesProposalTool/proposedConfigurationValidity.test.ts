import { describe, expect, it } from 'vitest';
import {
  customerProposalCommercialFigures,
  customerProposalElectricityFigures,
  proposalRequiresRevision,
  showsCommercialSaving,
  showsPayback,
  showsRevisionCallout,
} from './customerProposalPresentation';

const ELECTRICITY = {
  currentLabel: 'Current estimated annual electricity cost',
  proposedLabel: 'Proposed estimated annual electricity cost',
  savingLabel: 'Estimated annual electricity saving',
  current: 'R 1 000 000',
  proposed: 'R 700 000',
  saving: 'R 300 000',
};

const COMMERCIAL = {
  currentHeadline: 'Current estimated annual compressed-air cost',
  proposedHeadline: 'Proposed estimated annual compressed-air cost',
  savingHeadline: 'Estimated annual operating saving',
  investmentHeadline: 'Net investment',
  paybackHeadline: 'Estimated payback',
  current: 'R 1 000 000',
  proposed: 'R 736 000',
  saving: 'R 264 000',
  offerType: 'purchase',
  investment: 'R 815 000',
  payback: '3.09 years',
  costRows: [{ label: 'Electricity', current: 'R 1 000 000', proposed: 'R 700 000' }],
  purchaseLines: [{ label: 'Equipment', amount: 'R 850 000' }],
};

const VALID_RECOMMENDATION =
  'ARS recommends the selected BOUWA solution, subject to final site and installation confirmation.';
const CURRENT_REVISION_WORDING =
  'Proposed configuration requires revision before savings and payback can be relied on.';
const REWORDED_REVISION_WORDING = 'Selected equipment requires technical revision.';

const INVALID_CAPACITY_WARNING =
  'Highest recorded airflow exceeds the proposed published capacity.';
const INVALID_PRESSURE_WARNING =
  "The proposed machine's published pressure is below the pressure recorded during the Air Audit. Confirm the proposed configuration before relying on the comparison.";

function documentState(input: {
  requiresRevision: boolean;
  recommendation?: string;
  warnings?: string[];
}) {
  return {
    requiresRevision: input.requiresRevision,
    recommendation: input.recommendation ?? VALID_RECOMMENDATION,
    warnings: input.warnings ?? [],
    electricity: ELECTRICITY,
    commercial: COMMERCIAL,
  };
}

function presentation(doc: ReturnType<typeof documentState>) {
  const electricity = customerProposalElectricityFigures(doc);
  const commercial = customerProposalCommercialFigures(doc);
  return {
    requiresRevision: proposalRequiresRevision(doc),
    revisionCallout: showsRevisionCallout(doc),
    savingsAllowed: showsCommercialSaving(doc),
    paybackAllowed: showsPayback(doc),
    electricityLabels: electricity.map((figure) => figure.label),
    commercialLabels: commercial.map((figure) => figure.label),
    showsElectricitySaving: electricity.some(
      (figure) => figure.label === ELECTRICITY.savingLabel,
    ),
    showsCommercialSavingValue: commercial.some(
      (figure) => figure.value === COMMERCIAL.saving,
    ),
    showsPaybackValue: Boolean(
      doc.commercial.paybackHeadline && showsPayback(doc),
    ),
  };
}

describe('proposed configuration validity presentation', () => {
  it('allows normal savings and payback when the document is valid', () => {
    const doc = documentState({ requiresRevision: false, warnings: [] });
    const view = presentation(doc);

    expect(view.requiresRevision).toBe(false);
    expect(view.revisionCallout).toBe(false);
    expect(view.savingsAllowed).toBe(true);
    expect(view.paybackAllowed).toBe(true);
    expect(view.electricityLabels).toEqual([
      ELECTRICITY.currentLabel,
      ELECTRICITY.proposedLabel,
      ELECTRICITY.savingLabel,
    ]);
    expect(view.commercialLabels).toEqual([
      COMMERCIAL.currentHeadline,
      COMMERCIAL.proposedHeadline,
      COMMERCIAL.savingHeadline,
    ]);
    expect(view.showsElectricitySaving).toBe(true);
    expect(view.showsCommercialSavingValue).toBe(true);
    expect(view.showsPaybackValue).toBe(true);
  });

  it('suppresses savings and payback for an invalid-capacity document', () => {
    const doc = documentState({
      requiresRevision: true,
      recommendation: CURRENT_REVISION_WORDING,
      warnings: [INVALID_CAPACITY_WARNING],
    });
    const view = presentation(doc);

    expect(view.requiresRevision).toBe(true);
    expect(view.revisionCallout).toBe(true);
    expect(view.savingsAllowed).toBe(false);
    expect(view.paybackAllowed).toBe(false);
    expect(view.showsElectricitySaving).toBe(false);
    expect(view.showsCommercialSavingValue).toBe(false);
    expect(view.showsPaybackValue).toBe(false);
    expect(view.electricityLabels).toEqual([
      ELECTRICITY.currentLabel,
      ELECTRICITY.proposedLabel,
    ]);
    expect(view.commercialLabels).not.toContain(COMMERCIAL.savingHeadline);
  });

  it('suppresses savings and payback for an invalid-pressure document', () => {
    const doc = documentState({
      requiresRevision: true,
      recommendation: CURRENT_REVISION_WORDING,
      warnings: [INVALID_PRESSURE_WARNING],
    });
    const view = presentation(doc);

    expect(view.requiresRevision).toBe(true);
    expect(view.revisionCallout).toBe(true);
    expect(view.savingsAllowed).toBe(false);
    expect(view.paybackAllowed).toBe(false);
    expect(view.showsElectricitySaving).toBe(false);
    expect(view.showsCommercialSavingValue).toBe(false);
    expect(view.showsPaybackValue).toBe(false);
  });

  it('does not let recommendation wording change the boolean-driven result', () => {
    const capacityInvalid = documentState({
      requiresRevision: true,
      recommendation: CURRENT_REVISION_WORDING,
      warnings: [INVALID_CAPACITY_WARNING],
    });
    const reworded = documentState({
      requiresRevision: true,
      recommendation: REWORDED_REVISION_WORDING,
      warnings: [INVALID_CAPACITY_WARNING],
    });
    const emptyWording = documentState({
      requiresRevision: true,
      recommendation: '',
      warnings: [INVALID_PRESSURE_WARNING],
    });
    const validWithRevisionProse = documentState({
      requiresRevision: false,
      recommendation: CURRENT_REVISION_WORDING,
    });

    expect(presentation(reworded)).toEqual(presentation(capacityInvalid));
    expect(presentation(emptyWording).savingsAllowed).toBe(false);
    expect(presentation(emptyWording).paybackAllowed).toBe(false);
    expect(presentation(validWithRevisionProse)).toMatchObject({
      requiresRevision: false,
      savingsAllowed: true,
      paybackAllowed: true,
      showsElectricitySaving: true,
    });
    expect(customerProposalElectricityFigures(validWithRevisionProse)).toEqual(
      customerProposalElectricityFigures(
        documentState({ requiresRevision: false, recommendation: VALID_RECOMMENDATION }),
      ),
    );
  });
});
