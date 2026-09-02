import { parseNonNegativeNumber } from './electricityBasis.ts';
import {
  EMPTY_OPERATING_ASSUMPTIONS,
  type OperatingAssumptions,
} from './types.ts';

export const MAX_ANNUAL_OPERATING_HOURS = 8760;

export const ANNUAL_OPERATING_HOURS_HELPER =
  'Estimated total compressor operating hours per year.';

export const AVERAGE_LOAD_HELPER =
  'Estimated average airflow demand as a percentage of the current installed capacity.';

export const AUDIT_ELECTRICITY_BASIS_INFO =
  'Electricity is estimated from the measured Air Audit demand profile.';

export function parseAnnualOperatingHours(text: string): number | null {
  const value = parseNonNegativeNumber(text);
  if (value === null || value <= 0 || value > MAX_ANNUAL_OPERATING_HOURS) return null;
  return value;
}

export function parseAverageLoadPercent(text: string): number | null {
  const value = parseNonNegativeNumber(text);
  if (value === null || value <= 0 || value > 100) return null;
  return value;
}

export function buildOperatingAssumptions(input: {
  hoursText: string;
  loadText: string;
}): OperatingAssumptions {
  return {
    annualOperatingHours: parseAnnualOperatingHours(input.hoursText),
    averageLoadPercent: parseAverageLoadPercent(input.loadText),
  };
}

export function operatingAssumptionsOrEmpty(
  value: OperatingAssumptions | null | undefined,
): OperatingAssumptions {
  return value ?? EMPTY_OPERATING_ASSUMPTIONS;
}
