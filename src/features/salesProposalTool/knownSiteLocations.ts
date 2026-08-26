export function uniqueKnownLocations(
  machines: Array<{ currentLocation?: string | null }>,
): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const machine of machines) {
    const name = machine.currentLocation?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names.sort((a, b) => a.localeCompare(b));
}
