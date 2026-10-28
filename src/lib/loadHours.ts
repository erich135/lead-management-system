/**
 * Machine "Load Hours" helpers (V.11 Phase 3).
 * Load Hours is optional: blank stays blank (null) and is never coerced to 0.
 * 0 and decimals are valid values. Never derived from running hours.
 */
export function loadHoursPayload(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? raw : null;
  const text = String(raw).trim();
  if (text === '') return null;
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** Export cell value: the number itself (0 kept), or '' when blank. */
export function formatLoadHours(value: unknown): number | '' {
  return typeof value === 'number' && Number.isFinite(value) ? value : '';
}