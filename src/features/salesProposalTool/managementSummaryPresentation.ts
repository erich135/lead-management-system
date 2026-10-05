import type { CommercialOffer, CustomerProposalDocument } from './types';

export function readableProposalReference(reference: string | null | undefined): string {
  if (!reference) return '—';
  if (/^[a-f0-9]{24}$/i.test(reference)) return `SPT-${reference.slice(-8).toUpperCase()}`;
  return reference;
}

/** Presentation only. Turns stored ISO timestamps into a readable date. */
export function humanizeTimestamps(text: string): string {
  return text.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, (iso) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
  });
}

export function formatStoredRand(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return `R ${Math.round(value).toLocaleString('en-ZA')}`;
}

export type OfferMode = 'purchase' | 'rental' | 'rent_to_own' | 'none';

export function offerMode(doc: CustomerProposalDocument, offer: CommercialOffer | null | undefined): OfferMode {
  return doc.financialBenefit?.mode ?? offer?.type ?? 'none';
}

/** Omit payback when the offer has no payback result. Never print "Not shown". */
export function paybackPresentation(
  doc: CustomerProposalDocument,
  mode: OfferMode,
): { label: string; value: string } | { explanation: string } | null {
  if (doc.requiresRevision) {
    return {
      explanation: 'Payback is withheld because this configuration still requires review. The Technical Report states the same restriction.',
    };
  }
  if (doc.commercial.payback) {
    return {
      label: doc.commercial.paybackHeadline || 'Payback',
      value: doc.commercial.payback,
    };
  }
  if (mode === 'rent_to_own' || mode === 'rental') {
    return {
      explanation:
        mode === 'rent_to_own'
          ? 'Payback is not the decision figure for this rent-to-own offer. Compare the electricity saving with the payments and the net position on the commercial page.'
          : 'Payback is not stated for this rental. The electricity saving and the rental payments are shown separately.',
    };
  }
  return null;
}

export function overallFinancialEffect(
  doc: CustomerProposalDocument,
): { label: string; value: string } | null {
  const value = doc.commercial.saving;
  if (!value) return null;
  const increase = /increase/i.test(doc.commercial.savingHeadline ?? '');
  const mode = doc.financialBenefit?.mode ?? 'none';
  if (mode === 'purchase') {
    return {
      label: increase
        ? 'Additional annual operating cost. The equipment investment is separate, and payments are not included'
        : 'Net annual operating saving. The equipment investment is separate, and payments are not included',
      value,
    };
  }
  if (mode === 'rental') {
    return {
      label: increase
        ? 'Additional annual cost, including rental payments'
        : 'Net annual saving, including rental payments',
      value,
    };
  }
  if (mode === 'rent_to_own') {
    return {
      label: increase
        ? 'Additional annual cost, including rent-to-own payments'
        : 'Net annual saving, including rent-to-own payments',
      value,
    };
  }
  return {
    label: increase ? 'Additional annual cost' : 'Net annual saving',
    value,
  };
}

export function finalElectricitySavingPresentation(doc: CustomerProposalDocument): {
  label: string;
  value: string;
} {
  const signed = doc.electricity.costBreakdown?.finalSaving;
  if (signed) {
    const increase = signed.startsWith('−') || signed.startsWith('-');
    return {
      label: increase ? 'Final annual electricity increase' : 'Final annual electricity saving',
      value: signed,
    };
  }
  return {
    label: 'Final annual electricity saving',
    value: doc.requiresRevision ? 'Withheld' : doc.electricity.saving ?? 'Not available',
  };
}

export function commercialPositionNote(mode: OfferMode): string | null {
  if (mode === 'rent_to_own') {
    return 'The electricity saving is only the reduction in compressor electricity. It does not mean that saving covers the rent-to-own payments. The payments and the existing net position are shown separately.';
  }
  if (mode === 'rental') {
    return 'The electricity saving is separate from the rental payments. These figures do not transfer ownership and do not say that payments stop.';
  }
  return null;
}

export function offerTermRows(
  offer: CommercialOffer | null | undefined,
  mode: OfferMode,
): Array<{ label: string; value: string }> {
  if (!offer) return [];
  const rows: Array<{ label: string; value: string | null }> = [];
  if (mode === 'rent_to_own') {
    const terms = offer.rentToOwn;
    rows.push(
      { label: 'Monthly payment', value: formatStoredRand(terms.monthlyPayment) },
      { label: 'Agreement term', value: terms.termMonths ? `${terms.termMonths} months` : null },
      {
        label: 'Annual payment escalation',
        value: terms.annualEscalationPercent == null ? null : `${terms.annualEscalationPercent}%`,
      },
      { label: 'Upfront cost', value: formatStoredRand(terms.upfrontRand) },
      { label: 'Final transfer payment', value: formatStoredRand(terms.finalTransferPaymentRand) },
      { label: 'Buy-back credit', value: formatStoredRand(terms.buyBackRand) },
      { label: 'Post-term maintenance / SLA', value: formatStoredRand(terms.postTermAnnualSlaRand) },
    );
  } else if (mode === 'rental') {
    const terms = offer.rental;
    rows.push(
      { label: 'Monthly rental', value: formatStoredRand(terms.monthlyRental) },
      { label: 'Stated rental term', value: terms.termMonths ? `${terms.termMonths} months` : null },
      { label: 'Annual SLA', value: formatStoredRand(terms.annualSla) },
      { label: 'Installation', value: formatStoredRand(terms.installation) },
      {
        label: 'Annual escalation',
        value: terms.annualEscalationPercent == null ? null : `${terms.annualEscalationPercent}%`,
      },
    );
  } else if (mode === 'purchase') {
    const terms = offer.purchase;
    rows.push(
      { label: 'Equipment price', value: formatStoredRand(terms.equipmentPrice) },
      { label: 'Installation', value: formatStoredRand(terms.installation) },
      { label: 'Delivery', value: formatStoredRand(terms.delivery) },
      { label: 'Buy-back', value: formatStoredRand(terms.buyBack) },
      { label: 'Annual SLA', value: formatStoredRand(terms.annualSla) },
    );
  }
  return rows.filter((row): row is { label: string; value: string } => Boolean(row.value));
}
