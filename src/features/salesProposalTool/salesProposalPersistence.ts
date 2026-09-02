import {
  toCurrentEquipmentPayload,
  toProposedEquipmentPayload,
  type CurrentEquipmentDraft,
  type ProposedEquipmentDraft,
} from './equipmentState.ts';
import { salesProposalPreviewPath } from './navigation.ts';
import type {
  AirAuditScope,
} from './airAuditScope.ts';
import type {
  CommercialOffer,
  CurrentEquipment,
  ElectricityBasis,
  OperatingAssumptions,
  ProposedEquipment,
  SalesProposal,
  SalesProposalSite,
} from './types.ts';

export const PREVIEW_SAVE_FAILED_MESSAGE =
  'Could not save the latest proposal changes. The customer proposal was not opened.';

export interface SalesProposalEditorState {
  customerId: string | null;
  site: SalesProposalSite;
  currentEquipment: CurrentEquipmentDraft[];
  proposed: ProposedEquipmentDraft;
  electricityBasis: ElectricityBasis;
  operatingAssumptions: OperatingAssumptions;
  commercialOffer: CommercialOffer;
  airAuditScope: AirAuditScope;
}

export interface SalesProposalSavePayload {
  customerId: string | null;
  site: SalesProposalSite;
  currentEquipment: CurrentEquipment[];
  proposedEquipment: ProposedEquipment[];
  electricityBasis: ElectricityBasis;
  operatingAssumptions: OperatingAssumptions;
  commercialOffer: CommercialOffer;
  airAuditScope: AirAuditScope;
}

export type PersistSalesProposal = (
  id: string,
  body: SalesProposalSavePayload,
) => Promise<SalesProposal>;

export type SaveThenPreviewResult =
  | { kind: 'open'; path: string; proposal: SalesProposal }
  | { kind: 'blocked'; error: string };

export function buildSalesProposalSavePayload(
  state: SalesProposalEditorState,
): SalesProposalSavePayload {
  return {
    customerId: state.customerId,
    site: { ...state.site, name: state.site.name },
    currentEquipment: toCurrentEquipmentPayload(state.currentEquipment),
    proposedEquipment: toProposedEquipmentPayload(state.proposed),
    electricityBasis: state.electricityBasis,
    operatingAssumptions: state.operatingAssumptions,
    commercialOffer: state.commercialOffer,
    airAuditScope: state.airAuditScope,
  };
}

export async function persistSalesProposalEditor(options: {
  proposalId: string;
  state: SalesProposalEditorState;
  save: PersistSalesProposal;
}): Promise<SalesProposal> {
  return options.save(options.proposalId, buildSalesProposalSavePayload(options.state));
}

export async function saveThenPreviewCustomerProposal(options: {
  proposalId: string | undefined;
  state: SalesProposalEditorState;
  save: PersistSalesProposal;
}): Promise<SaveThenPreviewResult> {
  if (!options.proposalId) {
    return { kind: 'blocked', error: PREVIEW_SAVE_FAILED_MESSAGE };
  }
  try {
    const proposal = await persistSalesProposalEditor({
      proposalId: options.proposalId,
      state: options.state,
      save: options.save,
    });
    return {
      kind: 'open',
      path: salesProposalPreviewPath(proposal.id),
      proposal,
    };
  } catch {
    return {
      kind: 'blocked',
      error: PREVIEW_SAVE_FAILED_MESSAGE,
    };
  }
}
