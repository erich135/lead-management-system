import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LEGACY_BOUWA_ROUTE_PREFIX,
  SHOW_BOUWA_IN_NORMAL_NAV,
  SHOW_SALES_PROPOSAL_TOOL_NAV,
  SALES_PROPOSAL_TOOL_LABEL,
  SALES_PROPOSAL_TOOL_PATH,
  isSalesProposalToolPath,
  isCustomerProposalPreviewPath,
} from './navigation.ts';

test('Sales Proposal Tool navigation is visible and Bouwa is hidden from normal nav', () => {
  assert.equal(SHOW_SALES_PROPOSAL_TOOL_NAV, true);
  assert.equal(SHOW_BOUWA_IN_NORMAL_NAV, false);
  assert.equal(SALES_PROPOSAL_TOOL_LABEL, 'Sales Proposal Tool');
  assert.equal(SALES_PROPOSAL_TOOL_PATH, '/sales-proposal-tool');
  assert.equal(LEGACY_BOUWA_ROUTE_PREFIX, '/bouwa');
  assert.equal(isSalesProposalToolPath('/sales-proposal-tool'), true);
  assert.equal(isSalesProposalToolPath('/sales-proposal-tool/abc/proposal'), true);
  assert.equal(isCustomerProposalPreviewPath('/sales-proposal-tool/abc/proposal'), true);
  assert.equal(isCustomerProposalPreviewPath('/sales-proposal-tool/abc'), false);
});
