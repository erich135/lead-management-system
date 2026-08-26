export const SALES_PROPOSAL_TOOL_PATH = '/sales-proposal-tool';
export const SALES_PROPOSAL_TOOL_LABEL = 'Sales Proposal Tool';
export const LEGACY_BOUWA_ROUTE_PREFIX = '/bouwa';

export const SHOW_SALES_PROPOSAL_TOOL_NAV = true;
export const SHOW_BOUWA_IN_NORMAL_NAV = false;

export function salesProposalEditorPath(id: string): string {
  return `${SALES_PROPOSAL_TOOL_PATH}/${id}`;
}

export function salesProposalPreviewPath(id: string): string {
  return `${SALES_PROPOSAL_TOOL_PATH}/${id}/proposal`;
}

export function isSalesProposalToolPath(pathname: string): boolean {
  return (
    pathname === SALES_PROPOSAL_TOOL_PATH ||
    pathname.startsWith(`${SALES_PROPOSAL_TOOL_PATH}/`)
  );
}

export function isCustomerProposalPreviewPath(pathname: string): boolean {
  return /\/sales-proposal-tool\/[^/]+\/proposal\/?$/.test(pathname);
}
