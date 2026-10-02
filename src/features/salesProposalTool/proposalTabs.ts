export const PROPOSAL_TABS = [
  { id: 'customer-site', label: 'Customer & Site' },
  { id: 'current-equipment', label: 'Current Equipment' },
  { id: 'air-audit', label: 'Air Audit' },
  { id: 'proposed-equipment', label: 'Proposed Equipment' },
  { id: 'electricity', label: 'Electricity & Tariffs' },
  { id: 'price-offer', label: 'Price & Offer' },
] as const;

export type ProposalTabId = (typeof PROPOSAL_TABS)[number]['id'];

export function isProposalTabId(value: string | undefined): value is ProposalTabId {
  return PROPOSAL_TABS.some((tab) => tab.id === value);
}

export function proposalTabIndex(id: ProposalTabId): number {
  return PROPOSAL_TABS.findIndex((tab) => tab.id === id);
}
