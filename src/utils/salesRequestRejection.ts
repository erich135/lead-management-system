/**
 * Trims a rejection reason and returns null when it is empty.
 */
export function normalizeRejectionReason(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
