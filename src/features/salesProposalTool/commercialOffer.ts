import { parseNonNegativeNumber } from './electricityBasis.ts';
import {
  EMPTY_COMMERCIAL_OFFER,
  type CommercialOffer,
  type CommercialOfferType,
} from './types.ts';

function parsePositiveInteger(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const number = Number(trimmed);
  return number >= 1 ? number : null;
}

function parseOptionalPercent(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const number = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(number) || number < 0) return null;
  return number;
}

export function moneyText(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

export function commercialOfferOrEmpty(
  value: CommercialOffer | null | undefined,
): CommercialOffer {
  if (!value) return EMPTY_COMMERCIAL_OFFER;
  return {
    type:
      value.type === 'purchase' || value.type === 'rental' || value.type === 'rent_to_own'
        ? value.type
        : 'none',
    current: {
      monthlyRental: value.current?.monthlyRental ?? null,
      annualSla: value.current?.annualSla ?? null,
      financeEndMonth: value.current?.financeEndMonth ?? null,
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
      termMonths: value.rental?.termMonths ?? null,
      annualEscalationPercent: value.rental?.annualEscalationPercent ?? null,
    },
    rentToOwn: {
      monthlyPayment: value.rentToOwn?.monthlyPayment ?? null,
      termMonths: value.rentToOwn?.termMonths ?? null,
      annualEscalationPercent: value.rentToOwn?.annualEscalationPercent ?? null,
      finalTransferPaymentRand: value.rentToOwn?.finalTransferPaymentRand ?? null,
      upfrontRand: value.rentToOwn?.upfrontRand ?? null,
      buyBackRand: value.rentToOwn?.buyBackRand ?? null,
      postTermAnnualSlaRand: value.rentToOwn?.postTermAnnualSlaRand ?? null,
      projectionYears: value.rentToOwn?.projectionYears ?? 10,
      ownershipConfirmed: value.rentToOwn?.ownershipConfirmed === true,
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
  rentalTerm?: string;
  rentalEscalation?: string;
  rentToOwnMonthly?: string;
  rentToOwnTerm?: string;
  rentToOwnEscalation?: string;
  rentToOwnFinal?: string;
  rentToOwnUpfront?: string;
  rentToOwnBuyBack?: string;
  rentToOwnPostSla?: string;
  rentToOwnYears?: string;
  rentToOwnOwnership?: boolean;
}): CommercialOffer {
  return {
    type: input.type,
    current: {
      monthlyRental: parseNonNegativeNumber(input.currentMonthlyRental),
      annualSla: parseNonNegativeNumber(input.currentAnnualSla),
      financeEndMonth: null,
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
      termMonths: parsePositiveInteger(input.rentalTerm ?? ''),
      annualEscalationPercent: parseOptionalPercent(input.rentalEscalation ?? ''),
    },
    rentToOwn: {
      monthlyPayment: parseNonNegativeNumber(input.rentToOwnMonthly ?? ''),
      termMonths: parsePositiveInteger(input.rentToOwnTerm ?? ''),
      annualEscalationPercent: parseOptionalPercent(input.rentToOwnEscalation ?? ''),
      finalTransferPaymentRand: parseNonNegativeNumber(input.rentToOwnFinal ?? ''),
      upfrontRand: parseNonNegativeNumber(input.rentToOwnUpfront ?? ''),
      buyBackRand: parseNonNegativeNumber(input.rentToOwnBuyBack ?? ''),
      postTermAnnualSlaRand: parseNonNegativeNumber(input.rentToOwnPostSla ?? ''),
      projectionYears: parsePositiveInteger(input.rentToOwnYears ?? '') ?? 10,
      ownershipConfirmed: input.rentToOwnOwnership === true,
    },
  };
}
