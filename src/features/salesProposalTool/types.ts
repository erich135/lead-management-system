export interface SalesProposalSite {
  name: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  locality: string | null;
  municipality: string | null;
  province: string | null;
  postcode: string | null;
  country: string | null;
  altitudeMetres: number | null;
}
export interface SalesProposalAirAudit {
  sourceFileName: string;
  sourceFileId?: string | null;
  sourceSha256: string;
  sourceSizeBytes: number;
  analysedAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  timezone: string | null;
  coverageDays: number | null;
  coveragePercent: number | null;
  meanAirflowM3PerMin: number | null;
  p50AirflowM3PerMin: number | null;
  p90AirflowM3PerMin: number | null;
  highestAirflowM3PerMin: number | null;
  deliveredVolumeM3: number | null;
  flowingFraction: number | null;
  flowingDurationSeconds: number | null;
  recordedPressureBar: number | null;
  shortRecord: boolean;
  validRowCount: number;
  rowCount: number;
  scope?: {
    type: 'single_machine' | 'site_header';
    currentEquipmentId: string | null;
  } | null;
}

export interface SourceBackedSpec {
  manufacturer: string | null;
  model: string | null;
  modelVariant: string | null;
  ratedPressureBarG: number | null;
  ratedAirflowM3PerMin: number | null;
  packageInputPowerKw: number | null;
  motorShaftPowerKw: number | null;
  controlType: string | null;
  sourceFileName: string | null;
  sourceFileId: string | null;
  sourceSha256: string | null;
}

export interface PublicMachineSpec {
  recordId: string;
  manufacturer: string;
  model: string;
  modelVariant: string | null;
  ratedPressureBarG: number | null;
  ratedAirflowM3PerMin: number | null;
  packageInputPowerKw: number | null;
  motorShaftPowerKw: number | null;
  controlType: string | null;
  sourceTitle: string | null;
  sourceFileName: string | null;
}

export interface CurrentEquipment {
  id?: string | null;
  arsMachineId: string | null;
  make: string;
  model: string;
  serialNumber: string;
  specLibraryRecordId: string | null;
  sourceBacked: SourceBackedSpec | null;
}

export interface ProposedEquipment {
  specLibraryRecordId: string | null;
  quantity: number;
  manufacturer: string | null;
  model: string | null;
  sourceBacked: SourceBackedSpec | null;
}

export type ElectricityBasisType = 'none' | 'flat_rate' | 'supplied_compressor_amount';

export interface ElectricityBasis {
  type: ElectricityBasisType;
  flatRateRandPerKwh: number | null;
  tariffRecordId: string | null;
  suppliedCurrentAmount: number | null;
  suppliedCurrentPeriod: 'monthly' | 'annual' | null;
}

export const EMPTY_ELECTRICITY_BASIS: ElectricityBasis = {
  type: 'none',
  flatRateRandPerKwh: null,
  tariffRecordId: null,
  suppliedCurrentAmount: null,
  suppliedCurrentPeriod: null,
};

export interface AirAndElectricityComparison {
  air: {
    coverageDays: number | null;
    deliveredVolumeM3: number | null;
    meanAirflowM3PerMin: number | null;
    p90AirflowM3PerMin: number | null;
    highestAirflowM3PerMin: number | null;
    recordedPressureBar: number | null;
    shortRecord: boolean;
    annualisationFactor: number | null;
    annualisedDeliveredVolumeM3: number | null;
    annualisationFormula: string;
  } | null;
  current: {
    name: string | null;
    quantity: number;
    totalRatedFadM3PerMin: number | null;
    totalPackageInputKw: number | null;
    ratedPressureBarG: number | null;
    specificPowerKwPerM3PerMin: number | null;
    specificEnergyKwhPerM3: number | null;
    estimatedAnnualKwh: number | null;
    estimatedAnnualCostRand: number | null;
    unavailableReason: string | null;
    missingPackageInputNames: string[];
  };
  proposed: {
    name: string | null;
    quantity: number;
    totalRatedFadM3PerMin: number | null;
    totalPackageInputKw: number | null;
    ratedPressureBarG: number | null;
    specificPowerKwPerM3PerMin: number | null;
    specificEnergyKwhPerM3: number | null;
    estimatedAnnualKwh: number | null;
    estimatedAnnualCostRand: number | null;
    unavailableReason: string | null;
    missingPackageInputNames: string[];
  };
  electricity: {
    basisType: ElectricityBasisType;
    rateRandPerKwh: number | null;
    suppliedCurrentAmount: number | null;
    suppliedCurrentPeriod: 'monthly' | 'annual' | null;
    estimatedSavingRand: number | null;
    estimatedIncreaseRand: number | null;
    outcome: 'saving' | 'increase' | 'unavailable';
  };
  warnings: string[];
  notes: string[];
  basisExplanation: string;
  futureCostDisclaimer: string;
  copy: {
    currentEnergy: string;
    proposedEnergy: string;
    currentCost: string;
    proposedCost: string;
    saving: string;
  };
  breakdown: {
    auditDurationDays: number | null;
    measuredDeliveredAirM3: number | null;
    annualisedAirVolumeM3: number | null;
    currentPackageInputFad: string | null;
    proposedPackageInputFad: string | null;
    electricityRate: string | null;
    estimatedCurrentKwh: number | null;
    estimatedProposedKwh: number | null;
  };
}

export interface SalesProposal {
  id: string;
  status: 'draft';
  customerId: string | null;
  customerName: string | null;
  site: SalesProposalSite;
  airAudit: SalesProposalAirAudit | null;
  currentEquipment: CurrentEquipment[];
  proposedEquipment: ProposedEquipment[];
  electricityBasis: ElectricityBasis;
  commercialOffer: CommercialOffer;
  comparison: AirAndElectricityComparison | null;
  commercial: CommercialComparison | null;
  customerProposal?: CustomerProposalDocument | null;
  currentMachinePerformance?: CurrentMachineMeasuredPerformance | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalesProposalListItem {
  id: string;
  customerName: string | null;
  siteName: string | null;
  updatedAt: string;
}

export const EMPTY_SITE: SalesProposalSite = {
  name: null,
  latitude: null,
  longitude: null,
  address: null,
  locality: null,
  municipality: null,
  province: null,
  postcode: null,
  country: null,
  altitudeMetres: null,
};

export const DEFAULT_PROPOSED_QUANTITY = 1;

export type CommercialOfferType = 'none' | 'purchase' | 'rental';

export interface CommercialOffer {
  type: CommercialOfferType;
  current: {
    monthlyRental: number | null;
    annualSla: number | null;
  };
  purchase: {
    equipmentPrice: number | null;
    installation: number | null;
    delivery: number | null;
    buyBack: number | null;
    annualSla: number | null;
  };
  rental: {
    monthlyRental: number | null;
    annualSla: number | null;
    installation: number | null;
  };
}

export const EMPTY_COMMERCIAL_OFFER: CommercialOffer = {
  type: 'none',
  current: { monthlyRental: null, annualSla: null },
  purchase: {
    equipmentPrice: null,
    installation: null,
    delivery: null,
    buyBack: null,
    annualSla: null,
  },
  rental: { monthlyRental: null, annualSla: null, installation: null },
};

export interface CommercialLine {
  key: string;
  label: string;
  amountRand: number;
}

export interface CommercialComparison {
  offerType: CommercialOfferType;
  current: {
    electricityRand: number | null;
    rentalRand: number | null;
    slaRand: number | null;
    lines: CommercialLine[];
    totalA: number | null;
    unavailableReason: string | null;
  };
  proposed: {
    electricityRand: number | null;
    rentalRand: number | null;
    slaRand: number | null;
    lines: CommercialLine[];
    totalB: number | null;
    unavailableReason: string | null;
  };
  saving: {
    totalZ: number | null;
    displayRand: number | null;
    outcome: 'saving' | 'increase' | 'unavailable';
  };
  purchase: {
    equipmentPriceRand: number | null;
    installationRand: number | null;
    deliveryRand: number | null;
    buyBackRand: number | null;
    grossInvestmentRand: number | null;
    netInvestmentRand: number | null;
    paybackYears: number | null;
    paybackUnavailableReason: string | null;
  } | null;
  included: string[];
  notes: string[];
  unavailableReason: string | null;
  copy: {
    currentHeadline: string;
    proposedHeadline: string;
    savingHeadline: string;
    investmentHeadline: string;
    paybackHeadline: string;
    paybackUnavailable: string;
    electricityIncomplete: string;
    onlySuppliedNote: string;
  };
}

export interface CurrentMachineMeasuredPerformance {
  scopeType: 'single_machine' | 'site_header';
  available: boolean;
  machineName: string | null;
  publishedFlowM3PerMin: number | null;
  measuredFlowM3PerMin: number | null;
  measuredFlowMetric: 'highest_recorded_airflow';
  absoluteDifferenceM3PerMin: number | null;
  percentageDifference: number | null;
  reductionPercent: number | null;
  publishedPressureBarG: number | null;
  recordedPressureBar: number | null;
  pressureComparable: boolean;
  siteHeaderNote: string | null;
  comparisonCaveat: string | null;
  flowBasisNote: string | null;
  copy: {
    title: string;
    publishedLabel: string;
    measuredLabel: string;
    differenceLabel: string;
    comparisonLabel: string | null;
    comparisonDisplay: string | null;
    unavailableReason: string | null;
  };
}

export interface CustomerProposalDocument {
  companyName: string;
  documentTitle: string;
  preparedFor: string | null;
  siteName: string | null;
  siteLocation: string | null;
  date: string | null;
  purposeTitle: string;
  purposeLead: string;
  purposeBullets: string[];
  airAudit: {
    sourceFile: string | null;
    period: string | null;
    measuredHeading: string;
    meanAirflow: string | null;
    p90Airflow: string | null;
    highestAirflow: string | null;
    recordedPressure: string | null;
    deliveredAir: string | null;
  };
  currentMachines: Array<{
    name: string;
    serial: string | null;
    publishedAirflow: string | null;
    publishedPressure: string | null;
    packageInput: string | null;
  }>;
  currentMachinePerformance: {
    title: string;
    machineName: string | null;
    publishedLabel: string;
    publishedAirflow: string | null;
    measuredLabel: string;
    measuredAirflow: string | null;
    comparisonLabel: string | null;
    comparisonValue: string | null;
    caveat: string | null;
  } | null;
  proposed: {
    quantity: number | null;
    name: string | null;
    publishedAirflow: string | null;
    publishedPressure: string | null;
    packageInput: string | null;
  };
  technicalRows: Array<{
    label: string;
    current: string | null;
    proposed: string | null;
  }>;
  warnings: string[];
  electricity: {
    currentLabel: string;
    proposedLabel: string;
    savingLabel: string;
    current: string | null;
    proposed: string | null;
    saving: string | null;
  };
  commercial: {
    currentHeadline: string;
    proposedHeadline: string;
    savingHeadline: string;
    investmentHeadline: string | null;
    paybackHeadline: string | null;
    current: string | null;
    proposed: string | null;
    saving: string | null;
    offerType: string;
    investment: string | null;
    payback: string | null;
    costRows: Array<{
      label: string;
      current: string | null;
      proposed: string | null;
    }>;
    purchaseLines: Array<{ label: string; amount: string }>;
  };
  recommendation: string;
  conclusion: string;
  nextSteps: string[];
  basis: string;
  futureCostDisclaimer: string;
  estimatedNote: string;
}
