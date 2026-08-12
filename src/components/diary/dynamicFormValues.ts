/**
 * Shared value helpers for dynamic planner forms (avoids circular imports).
 */

export type DynamicFormValues = Record<string, string | string[] | boolean | number | null>;

/**
 * Returns true when a dynamic field value is considered empty.
 */
export function isDynamicFieldEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}
