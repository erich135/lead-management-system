import type { SalesProposal } from './types';

/**
 * A pair of reports shares one fetched proposal view.
 * Recomputation can still change later if a library record or a software
 * release changes, even at the same stored revision. Sharing one snapshot is
 * what makes the pair match. It is not a frozen historical render.
 */
let snapshot: { id: string; revision: number; proposal: SalesProposal } | null = null;

export function rememberReportSnapshot(proposal: SalesProposal): void {
  snapshot = {
    id: proposal.id,
    revision: proposal.revision ?? 1,
    proposal,
  };
}

export function readReportSnapshot(id: string, revision: number): SalesProposal | null {
  if (!snapshot || snapshot.id !== id) return null;
  if (revision > 0 && snapshot.revision !== revision) return null;
  return snapshot.proposal;
}
