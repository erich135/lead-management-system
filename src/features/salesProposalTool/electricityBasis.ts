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

function parseDays(text: string): number | null {
  const value = parseNonNegativeNumber(text);
  if (value === null || value > 366) return null;
  return value;
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

export { parseDays };
