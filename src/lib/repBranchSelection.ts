/**
 * Same rule as direct job creation: the selected rep's first linked branch.
 * Several linked branches use the first one. No linked branch returns null
 * so a default branch is not invented.
 */
export function firstLinkedBranchId(branches: unknown): string | null {
  if (!Array.isArray(branches) || branches.length === 0) {
    return null;
  }

  const first = branches[0];
  if (typeof first === 'string') {
    const trimmed = first.trim();
    return trimmed || null;
  }

  if (first && typeof first === 'object' && '_id' in first && first._id) {
    return String(first._id);
  }

  return null;
}

/**
 * Resolves the branch for the rep selected on New Appointment / Create New Client.
 */
export function branchIdForSelectedRep(
  repCodes: Array<{ _id: string; branches?: unknown }>,
  repId: string | undefined,
): string | null {
  if (!repId) {
    return null;
  }

  const rep = repCodes.find((item) => item._id === repId);
  return firstLinkedBranchId(rep?.branches);
}
