import {
  EMPTY_ELECTRICITY_BASIS,
  type ElectricityBasis,
  type ElectricityBasisType,
} from './types.ts';

export function parseNonNegativeNumber(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

export function parseDays(text: string): number | null {
  const value = parseNonNegativeNumber(text);
  if (value === null || value > 366) return null;
  return value;
}

export type NumericEntry =
  | { kind: 'empty' }
  | { kind: 'valid'; value: number }
  | { kind: 'rejected'; reason: string };

/** Uses the existing parser. "2.50" and "2.5" are both valid because both parse to 2.5. */
export function classifyNumericEntry(
  raw: string,
  parse: (text: string) => number | null,
  reason: (raw: string) => string,
): NumericEntry {
  if (raw.trim() === '') return { kind: 'empty' };
  const value = parse(raw);
  if (value === null) return { kind: 'rejected', reason: reason(raw) };
  return { kind: 'valid', value };
}

export function productionDayRejection(raw: string): string {
  const parsed = parseNonNegativeNumber(raw);
  if (parsed === null) return 'Enter a number of days, or clear this field.';
  if (parsed > 366) return 'Production days cannot be more than 366. Change it, or clear the field.';
  return 'This value was not accepted. Change it, or clear the field.';
}

export function buildElectricityBasis(input: {
  rateText?: string;
  amountText: string;
  period: 'monthly' | 'annual';
  tariffRecordId?: string | null;
  touRates?: ElectricityBasis['touRates'];
  productionDays?: ElectricityBasis['productionDays'];
}): ElectricityBasis {
  const suppliedCurrentAmount = parseNonNegativeNumber(input.amountText);
  const touRates = input.touRates ?? { ...EMPTY_ELECTRICITY_BASIS.touRates };
  const single = parseNonNegativeNumber(input.rateText ?? '');
  const filledTou =
    input.touRates ??
    (single !== null
      ? {
          ldsStandard: single,
          ldsPeak: single,
          ldsOffPeak: single,
          hdsStandard: single,
          hdsPeak: single,
          hdsOffPeak: single,
        }
      : touRates);
  const values = Object.values(filledTou).filter(
    (value): value is number => typeof value === 'number',
  );
  const common =
    values.length === 6 && values.every((value) => value === values[0])
      ? values[0]
      : null;
  const flatRateRandPerKwh = common ?? single;
  let type: ElectricityBasisType = 'none';
  if (flatRateRandPerKwh !== null || values.length === 6) type = 'flat_rate';
  else if (suppliedCurrentAmount !== null) type = 'supplied_compressor_amount';

  return {
    ...EMPTY_ELECTRICITY_BASIS,
    type,
    flatRateRandPerKwh,
    tariffRecordId: input.tariffRecordId ?? null,
    suppliedCurrentAmount,
    suppliedCurrentPeriod: suppliedCurrentAmount !== null ? input.period : null,
    touRates: filledTou,
    productionDays: input.productionDays ?? EMPTY_ELECTRICITY_BASIS.productionDays,
    touHoursPerDay: null,
  };
}

export function electricityBasisOrEmpty(
  value: ElectricityBasis | null | undefined,
): ElectricityBasis {
  if (!value) return EMPTY_ELECTRICITY_BASIS;
  return {
    ...EMPTY_ELECTRICITY_BASIS,
    ...value,
    touRates: { ...EMPTY_ELECTRICITY_BASIS.touRates, ...value.touRates },
    productionDays: {
      ...EMPTY_ELECTRICITY_BASIS.productionDays,
      ...value.productionDays,
    },
    touHoursPerDay: null,
  };
}
