/**
 * The unit a person types in, where it is not the unit the intake stores.
 *
 * This is the one place in the browser that is allowed to do arithmetic on an
 * answer, and it is deliberately not science: it is two unit conversions whose
 * definitions are fixed — absolute zero, and per cent. The backend states which
 * fields need them and owns the same two functions, and independently refuses a
 * stored value that could only have arrived unconverted, so a mistake here is
 * caught rather than believed.
 *
 * Everything else stays where it belongs. No rate, no annualisation, no
 * derived engineering quantity is worked out on this side of the wire.
 */

import type { AuditEntryConversion, AuditFieldEntry } from './auditIntakeTypes';

/** Absolute zero, as the offset between the two temperature scales. */
export const KELVIN_AT_ZERO_CELSIUS = 273.15;

/** Rounds away binary artefacts, so 25 °C stores as exactly 298.15 K. */
function rounded(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** The value the intake stores, from the value a person typed. */
export function storedFromEntered(
  conversion: AuditEntryConversion,
  entered: number,
): number {
  return conversion === 'celsius_to_kelvin'
    ? rounded(entered + KELVIN_AT_ZERO_CELSIUS, 6)
    : rounded(entered / 100, 8);
}

/** The value a person sees, from the value the intake stores. */
export function enteredFromStored(
  conversion: AuditEntryConversion,
  stored: number,
): number {
  return conversion === 'celsius_to_kelvin'
    ? rounded(stored - KELVIN_AT_ZERO_CELSIUS, 6)
    : rounded(stored * 100, 6);
}

/** Why a typed value cannot be accepted, stated in the unit it was typed in. */
export function entryProblem(
  entry: AuditFieldEntry,
  entered: number,
): string | null {
  if (!Number.isFinite(entered)) return `Enter a number in ${entry.unit}.`;
  if (entered < entry.minimum || entered > entry.maximum)
    return `Enter a value between ${entry.minimum} and ${entry.maximum} ${entry.unit}.`;
  return null;
}
