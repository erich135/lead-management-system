import type { CustomerProposalDocument } from './types';

export interface CustomerProposalFigure {
  label: string;
  value: string;
}

const NOT_AVAILABLE = 'Not available';

/**
 * Validity is decided by the backend capacity/pressure rules and carried on the
 * document as requiresRevision. A document without an explicit false cannot be
 * presented as a sound commercial result, so savings and payback stay suppressed.
 */
export function proposalRequiresRevision(
  doc: Pick<CustomerProposalDocument, 'requiresRevision'>,
): boolean {
  return doc.requiresRevision !== false;
}

export function showsRevisionCallout(
  doc: Pick<CustomerProposalDocument, 'requiresRevision'>,
): boolean {
  return proposalRequiresRevision(doc);
}

export function showsCommercialSaving(
  doc: Pick<CustomerProposalDocument, 'requiresRevision'>,
): boolean {
  return !proposalRequiresRevision(doc);
}

export function showsPayback(
  doc: Pick<CustomerProposalDocument, 'requiresRevision' | 'commercial'>,
): boolean {
  return !proposalRequiresRevision(doc) && Boolean(doc.commercial.paybackHeadline);
}

export function customerProposalElectricityFigures(
  doc: Pick<CustomerProposalDocument, 'requiresRevision' | 'electricity'>,
): CustomerProposalFigure[] {
  const figures: CustomerProposalFigure[] = [];
  if (doc.electricity.currentEnergyLabel) {
    figures.push({
      label: doc.electricity.currentEnergyLabel,
      value: doc.electricity.currentEnergy ?? NOT_AVAILABLE,
    });
  }
  if (doc.electricity.proposedEnergyLabel) {
    figures.push({
      label: doc.electricity.proposedEnergyLabel,
      value: doc.electricity.proposedEnergy ?? NOT_AVAILABLE,
    });
  }
  figures.push(
    {
      label: doc.electricity.currentLabel,
      value: doc.electricity.current ?? NOT_AVAILABLE,
    },
    {
      label: doc.electricity.proposedLabel,
      value: doc.electricity.proposed ?? NOT_AVAILABLE,
    },
  );
  if (!showsCommercialSaving(doc)) return figures;
  return [
    ...figures,
    {
      label: doc.electricity.savingLabel,
      value: doc.electricity.saving ?? NOT_AVAILABLE,
    },
  ];
}

export function customerProposalCommercialFigures(
  doc: Pick<CustomerProposalDocument, 'requiresRevision' | 'commercial'>,
): CustomerProposalFigure[] {
  const figures: CustomerProposalFigure[] = [
    {
      label: doc.commercial.currentHeadline,
      value: doc.commercial.current ?? NOT_AVAILABLE,
    },
    {
      label: doc.commercial.proposedHeadline,
      value: doc.commercial.proposed ?? NOT_AVAILABLE,
    },
  ];
  if (!showsCommercialSaving(doc)) return figures;
  return [
    ...figures,
    {
      label: doc.commercial.savingHeadline,
      value: doc.commercial.saving ?? NOT_AVAILABLE,
    },
  ];
}
