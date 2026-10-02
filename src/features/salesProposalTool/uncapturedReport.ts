export interface ReportedUncapturedEntry {
  id: string;
  label: string;
  raw: string;
  reason: string;
}

export function uncapturedListChanged(
  previous: readonly ReportedUncapturedEntry[],
  next: readonly ReportedUncapturedEntry[],
): boolean {
  if (previous.length !== next.length) return true;
  return previous.some((entry, index) => {
    const other = next[index];
    return (
      entry.id !== other.id ||
      entry.label !== other.label ||
      entry.raw !== other.raw ||
      entry.reason !== other.reason
    );
  });
}

/**
 * Returns the next combined list only when this bucket's report changed.
 * An unchanged report returns null so the parent does not render again.
 */
export function commitUncapturedReport(
  buckets: Record<string, ReportedUncapturedEntry[]>,
  bucket: string,
  entries: readonly ReportedUncapturedEntry[],
): ReportedUncapturedEntry[] | null {
  const previous = buckets[bucket] ?? [];
  if (!uncapturedListChanged(previous, entries)) return null;
  buckets[bucket] = entries.slice();
  return Object.values(buckets).flat();
}
