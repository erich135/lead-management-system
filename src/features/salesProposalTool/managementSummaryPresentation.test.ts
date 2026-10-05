import { describe, expect, it } from 'vitest';
import {
  finalElectricitySavingPresentation,
  humanizeTimestamps,
  offerTermRows,
  overallFinancialEffect,
  paybackPresentation,
  readableProposalReference,
} from './managementSummaryPresentation';
import type { CustomerProposalDocument } from './types';

describe('management summary presentation', () => {
  it('hides a database id behind a short proposal reference', () => {
    expect(readableProposalReference('6ab0ef9308b4b4dd5515172c')).toBe('SPT-5515172C');
    expect(readableProposalReference('SPT-0042')).toBe('SPT-0042');
  });

  it('renders the audit file period as a date, not an ISO timestamp', () => {
    const text = humanizeTimestamps(
      'The audit file covers 2026-08-27T11:52:00.000Z to 2026-08-29T08:32:00.000Z.',
    );
    expect(text).not.toMatch(/T11:52/);
    expect(text).toMatch(/2026/);
    expect(text).toMatch(/audit file covers/);
  });

  it('does not print Payback: Not shown for rent-to-own', () => {
    const doc = {
      requiresRevision: false,
      commercial: { payback: null, paybackHeadline: null },
    } as CustomerProposalDocument;
    const line = paybackPresentation(doc, 'rent_to_own');
    expect(line && 'explanation' in line ? line.explanation : '').not.toMatch(/Not shown/i);
    expect(line && 'value' in line ? line.value : undefined).toBeUndefined();
  });

  it('lists only rent-to-own terms that were entered', () => {
    const rows = offerTermRows(
      {
        type: 'rent_to_own',
        current: { monthlyRental: null, annualSla: null, financeEndMonth: null },
        purchase: { equipmentPrice: null, installation: null, delivery: null, buyBack: null, annualSla: null },
        rental: { monthlyRental: null, annualSla: null, installation: null, termMonths: null, annualEscalationPercent: null },
        rentToOwn: {
          monthlyPayment: 24737,
          termMonths: 60,
          annualEscalationPercent: null,
          finalTransferPaymentRand: null,
          upfrontRand: null,
          buyBackRand: null,
          postTermAnnualSlaRand: null,
          projectionYears: 10,
          ownershipConfirmed: false,
        },
      },
      'rent_to_own',
    );
    expect(rows.map((row) => row.label)).toEqual(['Monthly payment', 'Agreement term']);
    expect(rows[0]?.value?.replace(/\u00a0/g, ' ')).toBe('R 24 737');
  });

  it('labels an annual rental increase as an additional cost, including payments', () => {
    const effect = overallFinancialEffect({
      commercial: { saving: 'R 180 924', savingHeadline: 'Estimated annual increase' },
      financialBenefit: { mode: 'rental' },
    } as CustomerProposalDocument);
    expect(effect?.label).toBe('Additional annual cost, including rental payments');
    expect(effect?.value).toBe('R 180 924');
  });

  it('uses the signed final electricity figure from the saved breakdown', () => {
    const line = finalElectricitySavingPresentation({
      requiresRevision: false,
      electricity: {
        saving: 'R 142 036',
        costBreakdown: { finalSaving: 'R 239 076' },
      },
    } as CustomerProposalDocument);
    expect(line).toEqual({
      label: 'Final annual electricity saving',
      value: 'R 239 076',
    });
  });
});
