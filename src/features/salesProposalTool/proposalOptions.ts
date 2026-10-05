import { commercialOfferOrEmpty } from './commercialOffer';
import { proposedDraftsFromProposal, type ProposedEquipmentDraft } from './equipmentState';
import type { CommercialOffer, OperatingArrangement, ProposalOptionRecord } from './types';

export interface EditorOption {
  id: string;
  name: string;
  includedInReport: boolean;
  archived: boolean;
  arrangement: OperatingArrangement;
  proposed: ProposedEquipmentDraft[];
  commercialOffer: CommercialOffer;
}

/**
 * Copies the active option and selects the copy.
 * The original option keeps its own equipment and commercial terms.
 */
export function appendProposalOption(
  options: EditorOption[],
  active: Pick<EditorOption, 'id' | 'proposed' | 'commercialOffer' | 'arrangement'>,
  newId: string,
): { options: EditorOption[]; created: EditorOption } {
  const flushed = options.map((option) =>
    option.id === active.id
      ? { ...option, proposed: active.proposed, commercialOffer: active.commercialOffer, arrangement: active.arrangement }
      : option,
  );
  const visible = flushed.filter((option) => !option.archived);
  const created: EditorOption = {
    id: newId,
    name: `Option ${visible.length + 1}`,
    includedInReport: true,
    archived: false,
    arrangement: active.arrangement,
    proposed: active.proposed.map((row) => ({
      ...row,
      key: `${row.key}-${newId}`,
      sourceBacked: row.sourceBacked ? { ...row.sourceBacked } : row.sourceBacked,
    })),
    commercialOffer: {
      ...active.commercialOffer,
      current: { ...active.commercialOffer.current },
      purchase: { ...active.commercialOffer.purchase },
      rental: { ...active.commercialOffer.rental },
      rentToOwn: { ...active.commercialOffer.rentToOwn },
    },
  };
  return { options: [...flushed, created], created };
}

export function editorOptionsFromProposal(proposal: {
  options?: ProposalOptionRecord[] | null;
  proposedEquipment: Parameters<typeof proposedDraftsFromProposal>[0];
  commercialOffer: CommercialOffer;
}): EditorOption[] {
  if (proposal.options && proposal.options.length > 0) {
    return proposal.options.map((option, index) => ({
      id: option.id || `option_${index + 1}`,
      name: option.name || `Option ${index + 1}`,
      includedInReport: option.includedInReport !== false,
      archived: option.archived === true,
      arrangement: option.arrangement === 'some_rest' ? 'some_rest' : 'all_run_together',
      proposed: proposedDraftsFromProposal(option.proposedEquipment),
      commercialOffer: commercialOfferOrEmpty(option.commercialOffer),
    }));
  }
  return [
    {
      id: 'option_1',
      name: 'Option 1',
      includedInReport: true,
      archived: false,
      arrangement: 'all_run_together',
      proposed: proposedDraftsFromProposal(proposal.proposedEquipment),
      commercialOffer: commercialOfferOrEmpty(proposal.commercialOffer),
    },
  ];
}

export function suppliedMachineCount(rows: readonly { quantity: number }[]): number {
  return rows.reduce((total, row) => total + (row.quantity >= 1 ? row.quantity : 0), 0);
}

export function operatingArrangementSentence(
  rows: readonly { quantity: number; runningQuantity?: number | null }[],
  arrangement: OperatingArrangement,
): string {
  const supplied = suppliedMachineCount(rows);
  if (supplied <= 1) return '';
  if (arrangement !== 'some_rest') {
    return `${supplied} machines supplied. All ${supplied} run together.`;
  }
  const running = rows.reduce((total, row) => {
    const count = row.quantity >= 1 ? row.quantity : 0;
    const stated =
      typeof row.runningQuantity === 'number' && Number.isFinite(row.runningQuantity)
        ? Math.min(count, Math.max(0, Math.floor(row.runningQuantity)))
        : count;
    return total + stated;
  }, 0);
  const verb = running === 1 ? 'runs' : 'run';
  return `${supplied} machines supplied. ${running} ${verb} at a time. The machines alternate equally.`;
}

export function refurbishmentSentence(
  rows: readonly ProposedEquipmentDraft[],
  arrangement: OperatingArrangement,
): string | null {
  if (arrangement !== 'some_rest' || rows.length !== 1) return null;
  const row = rows[0];
  if (row.quantity !== 2 || row.runningQuantity !== 1) return null;
  return 'With two identical machines and one running at a time, equal rotation increases the expected Refurbishment interval per machine from approximately 3 years to 6 years, based on comparable demand and operating conditions. Refurbishment is carried out at the ARS workshop and can be staggered, so the other machine can keep operating and a temporary loan unit is needed less often. Routine servicing continues. This is an ARS assumption. It is not a maintenance-cost saving and it does not guarantee zero downtime.';
}
