import type { Customer } from '../../lib/api';
import type { SalesProposal } from './types';

export const CUSTOMER_SELECTION_REQUIRED_MESSAGE =
  'Search, then choose the customer from the list. Typed text is not saved.';

export const SELECTED_CUSTOMER_FALLBACK_NAME = 'Selected customer';

export function customerFromProposal(
  proposal: Pick<SalesProposal, 'customerId' | 'customerName'>,
): Customer | null {
  const customerId = proposal.customerId?.trim() || null;
  if (!customerId) return null;
  const name = proposal.customerName?.trim() || SELECTED_CUSTOMER_FALLBACK_NAME;
  return { _id: customerId, name };
}

export function customerSelectionIsConfirmed(
  customerId: string | null | undefined,
): boolean {
  return Boolean(customerId?.trim());
}
