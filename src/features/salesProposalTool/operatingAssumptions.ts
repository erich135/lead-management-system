import { parseNonNegativeNumber } from './electricityBasis.ts';
import {
  EMPTY_OPERATING_ASSUMPTIONS,
  type OperatingAssumptions,
} from './types.ts';

export const MAX_ANNUAL_OPERATING_HOURS = 8760;

export const ANNUAL_OPERATING_HOURS_HELPER =
  'Known or estimated total compressor operating hours per year. The same hours are used for current and proposed machines.';

export const AUDIT_ANNUAL_HOURS_HELPER =
  'Estimated total compressor operating hours per year. Used to scale the measured Air Audit period to a year.';

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
  hasAirAudit?: boolean | null;
  hoursAreEstimated?: boolean | null;
}): OperatingAssumptions {
  return {
    annualOperatingHours: parseAnnualOperatingHours(input.hoursText),
    averageLoadPercent: parseAverageLoadPercent(input.loadText),
    hasAirAudit: input.hasAirAudit ?? null,
    hoursAreEstimated: input.hoursAreEstimated ?? null,
  };
}

export function operatingAssumptionsOrEmpty(
  value: OperatingAssumptions | null | undefined,
): OperatingAssumptions {
  if (!value) return EMPTY_OPERATING_ASSUMPTIONS;
  return {
    ...EMPTY_OPERATING_ASSUMPTIONS,
    ...value,
    hasAirAudit: value.hasAirAudit ?? null,
    hoursAreEstimated: value.hoursAreEstimated ?? null,
  };
}
