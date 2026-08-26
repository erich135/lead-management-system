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

export function buildElectricityBasis(input: {
  rateText: string;
  amountText: string;
  period: 'monthly' | 'annual';
  tariffRecordId?: string | null;
}): ElectricityBasis {
  const flatRateRandPerKwh = parseNonNegativeNumber(input.rateText);
  const suppliedCurrentAmount = parseNonNegativeNumber(input.amountText);
  let type: ElectricityBasisType = 'none';
  if (flatRateRandPerKwh !== null) type = 'flat_rate';
  else if (suppliedCurrentAmount !== null) type = 'supplied_compressor_amount';

  return {
    type,
    flatRateRandPerKwh,
    tariffRecordId: input.tariffRecordId ?? null,
    suppliedCurrentAmount,
    suppliedCurrentPeriod:
      suppliedCurrentAmount !== null ? input.period : null,
  };
}

export function electricityBasisOrEmpty(
  value: ElectricityBasis | null | undefined,
): ElectricityBasis {
  return value ?? EMPTY_ELECTRICITY_BASIS;
}
