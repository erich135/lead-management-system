/** Shorten a spec-sheet dump for a list label. The stored make and model are unchanged. */
export function machineDisplayName(make: string | null | undefined, model: string | null | undefined): string {
  const full = `${make ?? ''} ${model ?? ''}`.replace(/\s+/g, ' ').trim();
  if (full.length <= 48) return full;
  const looksExtracted = /\d+\s*kW|×|\d+\s*bar/i.test(full);
  if (!looksExtracted) return full;
  const shortened = full.split(/\d+\s*kW/i)[0]?.trim() ?? full;
  return shortened.length >= 3 && shortened.length < full.length ? shortened : full;
}
