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

export interface RestoredProposalCustomer {
  entry: 'existing' | 'manual';
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
}

export function restoreProposalCustomer(proposal: {
  customerEntry?: 'existing' | 'manual' | null;
  customerId?: string | null;
  customerName?: string | null;
  manualCustomer?: {
    companyName?: string | null;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}): RestoredProposalCustomer {
  const manual = proposal.manualCustomer;
  const linked = Boolean(proposal.customerId?.trim());
  const storedManualName = manual?.companyName?.trim() || '';
  const storedName = proposal.customerName?.trim() || '';
  const entry: 'existing' | 'manual' =
    proposal.customerEntry === 'manual' || (!linked && Boolean(storedManualName))
      ? 'manual'
      : 'existing';
  const companyName =
    entry === 'manual' ? storedManualName || storedName : storedManualName;
  return {
    entry,
    companyName,
    contactName: manual?.contactName?.trim() || '',
    email: manual?.email?.trim() || '',
    phone: manual?.phone?.trim() || '',
  };
}
