import { parseNonNegativeNumber } from './electricityBasis.ts';
import {
  EMPTY_COMMERCIAL_OFFER,
  type CommercialOffer,
  type CommercialOfferType,
} from './types.ts';

export function moneyText(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

export function commercialOfferOrEmpty(
  value: CommercialOffer | null | undefined,
): CommercialOffer {
  if (!value) return EMPTY_COMMERCIAL_OFFER;
  return {
    type: value.type === 'purchase' || value.type === 'rental' ? value.type : 'none',
    current: {
      monthlyRental: value.current?.monthlyRental ?? null,
      annualSla: value.current?.annualSla ?? null,
    },
    purchase: {
      equipmentPrice: value.purchase?.equipmentPrice ?? null,
      installation: value.purchase?.installation ?? null,
      delivery: value.purchase?.delivery ?? null,
      buyBack: value.purchase?.buyBack ?? null,
      annualSla: value.purchase?.annualSla ?? null,
    },
    rental: {
      monthlyRental: value.rental?.monthlyRental ?? null,
      annualSla: value.rental?.annualSla ?? null,
      installation: value.rental?.installation ?? null,
    },
  };
}

export function buildCommercialOffer(input: {
  type: CommercialOfferType;
  currentMonthlyRental: string;
  currentAnnualSla: string;
  equipmentPrice: string;
  installation: string;
  delivery: string;
  buyBack: string;
  purchaseAnnualSla: string;
  rentalMonthly: string;
  rentalAnnualSla: string;
  rentalInstallation: string;
}): CommercialOffer {
  return {
    type: input.type,
    current: {
      monthlyRental: parseNonNegativeNumber(input.currentMonthlyRental),
      annualSla: parseNonNegativeNumber(input.currentAnnualSla),
    },
    purchase: {
      equipmentPrice: parseNonNegativeNumber(input.equipmentPrice),
      installation: parseNonNegativeNumber(input.installation),
      delivery: parseNonNegativeNumber(input.delivery),
      buyBack: parseNonNegativeNumber(input.buyBack),
      annualSla: parseNonNegativeNumber(input.purchaseAnnualSla),
    },
    rental: {
      monthlyRental: parseNonNegativeNumber(input.rentalMonthly),
      annualSla: parseNonNegativeNumber(input.rentalAnnualSla),
      installation: parseNonNegativeNumber(input.rentalInstallation),
    },
  };
}
