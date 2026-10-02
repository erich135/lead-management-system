function stable(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortValue(record[key]);
        return acc;
      }, {});
  }
  return value;
}

export function samePayload(left: unknown, right: unknown): boolean {
  return stable(left) === stable(right);
}

/**
 * A returning save may adopt a field only when the rep did not change it while
 * the save was in flight. Server normalisation is kept for untouched fields.
 * Fields the rep changed stay local, so a late response cannot mark them saved.
 */
export function mergeSavePayload<T extends Record<string, unknown>>(
  submitted: T,
  current: T,
  accepted: T,
): { next: T; editedDuringSave: boolean } {
  const next = { ...current };
  for (const key of Object.keys(accepted)) {
    if (samePayload(current[key], submitted[key])) {
      next[key as keyof T] = accepted[key as keyof T];
    }
  }
  return { next, editedDuringSave: !samePayload(current, submitted) };
}
