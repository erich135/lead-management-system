export const OPERATING_ASSUMPTIONS_ELECTRICITY_KEYS = [
  'annualOperatingHours',
  'hoursAreEstimated',
  'averageLoadPercent',
] as const;

export const OPERATING_ASSUMPTIONS_AUDIT_KEYS = ['hasAirAudit'] as const;

export const SITE_MAP_KEYS = [
  'latitude',
  'longitude',
  'address',
  'locality',
  'municipality',
  'province',
  'postcode',
  'country',
  'altitudeMetres',
] as const;

export const SITE_INTAKE_KEYS = [
  'intakeAirTemperatureC',
  'intakeAirTemperatureKind',
] as const;

export const SITE_NAME_KEYS = ['name'] as const;

export function projectOwned<T extends object>(
  current: T,
  incoming: T,
  owned: readonly (keyof T)[],
): T {
  const next = { ...current };
  for (const key of owned) {
    next[key] = incoming[key];
  }
  return next;
}

export function ownershipCovers<T extends object>(
  owners: readonly (readonly (keyof T)[])[],
  keys: readonly (keyof T)[],
): { missing: (keyof T)[]; duplicated: (keyof T)[] } {
  const seen = new Map<keyof T, number>();
  for (const group of owners) {
    for (const key of group) seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return {
    missing: keys.filter((key) => !seen.has(key)),
    duplicated: keys.filter((key) => (seen.get(key) ?? 0) > 1),
  };
}
