import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_SELECTION_REQUIRED_MESSAGE,
  SELECTED_CUSTOMER_FALLBACK_NAME,
  customerFromProposal,
  customerSelectionIsConfirmed,
  restoreProposalCustomer,
} from './salesProposalEditorRestore';

describe('sales proposal editor customer restore', () => {
  it('restores a confirmed customer from id even when the display name is missing', () => {
    expect(
      customerFromProposal({
        customerId: 'cust-sunbake',
        customerName: null,
      }),
    ).toEqual({
      _id: 'cust-sunbake',
      name: SELECTED_CUSTOMER_FALLBACK_NAME,
    });
    expect(customerSelectionIsConfirmed('cust-sunbake')).toBe(true);
  });

  it('does not treat search text as a saved customer selection', () => {
    expect(
      customerFromProposal({
        customerId: null,
        customerName: 'Sunbake',
      }),
    ).toBeNull();
    expect(customerSelectionIsConfirmed(null)).toBe(false);
    expect(CUSTOMER_SELECTION_REQUIRED_MESSAGE).toMatch(/typed text is not saved/i);
  });

  it('restores a manual company name when there is no linked customer', () => {
    expect(
      restoreProposalCustomer({
        customerEntry: 'manual',
        customerId: null,
        customerName: 'Sunbake',
        manualCustomer: { companyName: null, contactName: 'Sam', email: null, phone: null },
      }),
    ).toMatchObject({ entry: 'manual', companyName: 'Sunbake', contactName: 'Sam' });
  });

  it('keeps the stored display name when both identity and name are present', () => {
    expect(
      customerFromProposal({
        customerId: 'cust-sunbake',
        customerName: 'Sunbake',
      }),
    ).toEqual({
      _id: 'cust-sunbake',
      name: 'Sunbake',
    });
  });
});
