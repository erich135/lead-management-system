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
  intakeAirTemperatureC?: number | null;
  intakeAirTemperatureKind?: 'measured' | 'estimated' | null;
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
  validMeasurementDurationSeconds?: number | null;
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
  flowReferenceBasis?: string | null;
  referenceAbsolutePressurePa?: number | null;
}

export type MachineEfficiencyOrigin = 'manual' | 'audit';
export type MachineEfficiencySource = 'audit' | 'manual' | 'assumed';
export type ElectricalPowerKind = 'motor_power' | 'package_input';

export interface MachineEfficiencyAudit {
  sourceFileId: string | null;
  sourceFileName: string | null;
  sourceSha256: string | null;
  extractedPercent: number | null;
}

export interface CurrentEquipment {
  id?: string | null;
  arsMachineId: string | null;
  make: string;
  model: string;
  serialNumber: string;
  quantity: number;
  specLibraryRecordId: string | null;
  sourceBacked: SourceBackedSpec | null;
  efficiencyPercent?: number | null;
  efficiencyOrigin?: MachineEfficiencyOrigin | null;
  efficiencyAudit?: MachineEfficiencyAudit | null;
  electricalPowerKind?: ElectricalPowerKind | null;
  variableSpeedDrive?: boolean | null;
  flowReferenceBasis?: string | null;
  referenceAbsolutePressurePa?: number | null;
  referencePressureSource?: string | null;
  referenceTemperatureC?: number | null;
  referenceTemperatureSource?: string | null;
  intakeTemperatureOverrideC?: number | null;
  intakeTemperatureKind?: 'measured' | 'estimated' | null;
  specificationReference?: string | null;
}

export interface ProposedEquipment {
  specLibraryRecordId: string | null;
  quantity: number;
  manufacturer: string | null;
  model: string | null;
  sourceBacked: SourceBackedSpec | null;
  efficiencyPercent?: number | null;
  efficiencyOrigin?: MachineEfficiencyOrigin | null;
  efficiencyAudit?: MachineEfficiencyAudit | null;
  electricalPowerKind?: ElectricalPowerKind | null;
  variableSpeedDrive?: boolean | null;
  flowReferenceBasis?: string | null;
  referenceAbsolutePressurePa?: number | null;
  referencePressureSource?: string | null;
  referenceTemperatureC?: number | null;
  referenceTemperatureSource?: string | null;
  intakeTemperatureOverrideC?: number | null;
  intakeTemperatureKind?: 'measured' | 'estimated' | null;
  specificationReference?: string | null;
}

export type ElectricityBasisType = 'none' | 'flat_rate' | 'supplied_compressor_amount';

export interface ElectricityBasis {
  type: ElectricityBasisType;
  flatRateRandPerKwh: number | null;
  tariffRecordId: string | null;
  suppliedCurrentAmount: number | null;
  suppliedCurrentPeriod: 'monthly' | 'annual' | null;
  touRates: {
    ldsStandard: number | null;
    ldsPeak: number | null;
    ldsOffPeak: number | null;
    hdsStandard: number | null;
    hdsPeak: number | null;
    hdsOffPeak: number | null;
  };
  productionDays: {
    ldsWorkdays: number | null;
    ldsSaturdays: number | null;
    ldsSundays: number | null;
    hdsWorkdays: number | null;
    hdsSaturdays: number | null;
    hdsSundays: number | null;
  };
  touHoursPerDay: null;
}

export interface OperatingAssumptions {
  annualOperatingHours: number | null;
  averageLoadPercent: number | null;
  hasAirAudit: boolean | null;
  hoursAreEstimated: boolean | null;
}

export const EMPTY_ELECTRICITY_BASIS: ElectricityBasis = {
  type: 'none',
  flatRateRandPerKwh: null,
  tariffRecordId: null,
  suppliedCurrentAmount: null,
  suppliedCurrentPeriod: null,
  touRates: {
    ldsStandard: null,
    ldsPeak: null,
    ldsOffPeak: null,
    hdsStandard: null,
    hdsPeak: null,
    hdsOffPeak: null,
  },
  productionDays: {
    ldsWorkdays: null,
    ldsSaturdays: null,
    ldsSundays: null,
    hdsWorkdays: null,
    hdsSaturdays: null,
    hdsSundays: null,
  },
  touHoursPerDay: null,
};

export const EMPTY_OPERATING_ASSUMPTIONS: OperatingAssumptions = {
  annualOperatingHours: null,
  averageLoadPercent: null,
  hasAirAudit: null,
  hoursAreEstimated: null,
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
    suppliedAmountReferenceNote?: string | null;
    estimatedSavingRand: number | null;
    estimatedIncreaseRand: number | null;
    outcome: 'saving' | 'increase' | 'unavailable';
  };
  warnings: string[];
  notes: string[];
  operating?: {
    used: boolean;
    annualOperatingHours: number | null;
    averageLoadPercent: number | null;
    currentOperatingCapacityM3PerMin: number | null;
    estimatedAverageOperatingAirflowM3PerMin: number | null;
    annualDeliveredVolumeM3: number | null;
    unavailableReason: string | null;
    publishedCapacityFallbackNote: string | null;
    hoursAreEstimated?: boolean | null;
  } | null;
  airRequirement?: {
    kind: 'measured' | 'assumed' | 'unavailable';
    label: string;
    airflowM3PerMin: number | null;
    annualVolumeM3: number | null;
    instruction: string | null;
    assumedNote: string | null;
  };
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
    costBreakdown?: {
      rows: Array<{
        key: string;
        label: string;
        productionDays: number | null;
        dailyCurrentCostRand: number | null;
        dailyProposedCostRand: number | null;
        annualCurrentCostRand: number | null;
        annualProposedCostRand: number | null;
      }>;
      currentAnnualBeforeVsdRand: number | null;
      proposedAnnualBeforeVsdRand: number | null;
      vsdAllowancePercent: number;
      vsdAllowanceLabel?: string;
      vsdAllowanceRand: number | null;
      currentVsdAllowanceRand?: number | null;
      proposedVsdAllowanceRand?: number | null;
      vsdApplicable: boolean;
      vsdNote: string;
      currentAnnualAdjustedRand: number | null;
      proposedAnnualAdjustedRand: number | null;
      annualSavingAfterVsdRand: number | null;
      derivedAverageTariffRandPerKwh: number | null;
    };
  };
}

export interface SalesProposal {
  id: string;
  status: 'draft';
  customerId: string | null;
  customerName: string | null;
  customerEntry?: 'existing' | 'manual';
  manualCustomer?: ManualCustomerDetails | null;
  site: SalesProposalSite;
  airAudit: SalesProposalAirAudit | null;
  currentEquipment: CurrentEquipment[];
  proposedEquipment: ProposedEquipment[];
  electricityBasis: ElectricityBasis;
  operatingAssumptions: OperatingAssumptions;
  commercialOffer: CommercialOffer;
  comparison: AirAndElectricityComparison | null;
  commercial: CommercialComparison | null;
  customerProposal?: CustomerProposalDocument | null;
  currentMachinePerformance?: CurrentMachineMeasuredPerformance | null;
  proposedSitePerformance?: SitePerformanceView | null;
  proposedSitePerformances?: SitePerformanceView[] | null;
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

export type CommercialOfferType = 'none' | 'purchase' | 'rental' | 'rent_to_own';

export interface CommercialOffer {
  type: CommercialOfferType;
  current: {
    monthlyRental: number | null;
    annualSla: number | null;
    financeEndMonth: number | null;
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
    termMonths: number | null;
    annualEscalationPercent: number | null;
  };
  rentToOwn: {
    monthlyPayment: number | null;
    termMonths: number | null;
    annualEscalationPercent: number | null;
    finalTransferPaymentRand: number | null;
    upfrontRand: number | null;
    buyBackRand: number | null;
    postTermAnnualSlaRand: number | null;
    projectionYears: number | null;
    ownershipConfirmed: boolean;
  };
}

export interface ManualCustomerDetails {
  companyName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
}

export const EMPTY_COMMERCIAL_OFFER: CommercialOffer = {
  type: 'none',
  current: { monthlyRental: null, annualSla: null, financeEndMonth: null },
  purchase: {
    equipmentPrice: null,
    installation: null,
    delivery: null,
    buyBack: null,
    annualSla: null,
  },
  rental: {
    monthlyRental: null,
    annualSla: null,
    installation: null,
    termMonths: null,
    annualEscalationPercent: null,
  },
  rentToOwn: {
    monthlyPayment: null,
    termMonths: null,
    annualEscalationPercent: null,
    finalTransferPaymentRand: null,
    upfrontRand: null,
    buyBackRand: null,
    postTermAnnualSlaRand: null,
    projectionYears: 10,
    ownershipConfirmed: false,
  },
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
    paybackMonths?: number | null;
    simpleAnnualRoiPercent?: number | null;
    paybackUnavailableReason: string | null;
  } | null;
  rentalProjection?: {
    escalationPercent: number;
    termMonths: number | null;
    firstYearMonths: number;
    firstYearAnnualNetRand: number | null;
    firstYearAverageMonthlyNetRand: number | null;
    termNetRand: number | null;
    upfrontNetOutlayRand: number;
    recoveryMonth: number | null;
    recoveryReversed: boolean;
    years: Array<{
      year: number;
      months: number;
      rentalPaidRand: number;
      netBenefitRand: number;
      cumulativeNetBenefitRand: number;
    }>;
    outcome: 'benefit' | 'additional_cost' | 'unavailable';
    unavailableReason: string | null;
  } | null;
  rentToOwnProjection?: {
    projectionYears: number;
    termMonths: number | null;
    paymentEndMonth: number | null;
    firstYearAnnualNetRand: number | null;
    firstYearAfterPaymentsRand: number | null;
    breakEvenYears: number | null;
    projectionNetRand: number | null;
    provisional: boolean;
    provisionalReasons: string[];
    unavailableReason: string | null;
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

export interface SitePerformanceView {
  status:
    | 'estimated'
    | 'published_airflow_unavailable'
    | 'reference_basis_unconfirmed'
    | 'reference_pressure_unconfirmed'
    | 'site_altitude_unavailable'
    | 'site_altitude_invalid';
  publishedAirflowM3PerMin: number | null;
  estimatedSiteAirflowM3PerMin: number | null;
  estimatedSiteAirflowTotalM3PerMin: number | null;
  siteAltitudeMetres: number | null;
  factor: number | null;
  basisNote: string | null;
  unavailableReason: string | null;
  sectionTitle: string;
  estimatedLabel: string;
  altitudeLabel: string;
  altitudeDisplay: string | null;
  advisory: string | null;
  missingInputs?: string[];
  temperatureIncluded?: boolean;
  reductionPercent?: number | null;
  siteIntakeTemperatureC?: number | null;
  siteIntakeTemperatureDisplay?: string | null;
  siteIntakeTemperatureKindLabel?: string | null;
  referenceTemperatureDisplay?: string | null;
  referenceTemperatureSourceLabel?: string | null;
  referencePressureDisplay?: string | null;
  referencePressureSourceLabel?: string | null;
  sitePressureDisplay?: string | null;
  reductionDisplay?: string | null;
  calculationExplanation?: string | null;
  electricityNote?: string | null;
  demandComparisonNote?: string | null;
}

export interface CurrentMachineMeasuredPerformance {
  scopeType: 'single_machine' | 'site_header';
  presentation?: 'measured' | 'estimated_operating';
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
  sitePerformance?: SitePerformanceView | null;
  annualOperatingHours?: number | null;
  averageLoadPercent?: number | null;
  operatingCapacityM3PerMin?: number | null;
  estimatedAverageOperatingAirflowM3PerMin?: number | null;
  publishedCapacityFallbackNote?: string | null;
  copy: {
    title: string;
    publishedLabel: string;
    measuredLabel: string | null;
    differenceLabel: string | null;
    comparisonLabel: string | null;
    comparisonDisplay: string | null;
    limitationNote: string | null;
    unavailableReason: string | null;
    annualOperatingHoursLabel?: string;
    averageLoadLabel?: string;
    estimatedAverageOperatingAirflowLabel?: string;
  };
}

export interface CustomerProposalDocument {
  companyName: string;
  documentTitle: string;
  preparedFor: string | null;
  siteName: string | null;
  siteLocation: string | null;
  date: string | null;
  reference?: string | null;
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
    quantity?: number;
    serial: string | null;
    publishedAirflow: string | null;
    publishedPressure: string | null;
    packageInput: string | null;
    packageInputEstimated?: boolean;
    auxiliaryAllowanceNote?: string | null;
    efficiency?: string | null;
  }>;
  currentMachinePerformance: {
    title: string;
    presentation?: 'measured' | 'estimated_operating';
    machineName: string | null;
    publishedLabel: string;
    publishedAirflow: string | null;
    estimatedLabel: string | null;
    estimatedAirflow: string | null;
    estimatedSectionTitle: string | null;
    estimatedBasisNote: string | null;
    measuredLabel: string | null;
    measuredAirflow: string | null;
    differenceLabel: string | null;
    differenceAirflow: string | null;
    comparisonLabel: string | null;
    comparisonValue: string | null;
    limitationNote: string | null;
    caveat: string | null;
    annualOperatingHoursLabel?: string | null;
    annualOperatingHours?: string | null;
    averageLoadLabel?: string | null;
    averageLoad?: string | null;
    estimatedAverageOperatingAirflowLabel?: string | null;
    estimatedAverageOperatingAirflow?: string | null;
  } | null;
  proposed: {
    quantity: number | null;
    name: string | null;
    publishedAirflow: string | null;
    publishedPressure: string | null;
    packageInput: string | null;
    packageInputEstimated?: boolean;
    auxiliaryAllowanceNote?: string | null;
    efficiency?: string | null;
    estimatedSectionTitle: string | null;
    estimatedLabel: string | null;
    estimatedAirflow: string | null;
    siteAltitude: string | null;
    siteIntakeTemperature?: string | null;
    siteIntakeTemperatureKind?: string | null;
    reduction?: string | null;
    referencePressure?: string | null;
    referencePressureSource?: string | null;
    referenceTemperature?: string | null;
    referenceTemperatureSource?: string | null;
    calculationExplanation?: string | null;
    electricityNote?: string | null;
    estimatedBasisNote: string | null;
    siteUnavailableReason: string | null;
    sitePressure?: string | null;
  };
  proposedMachines?: Array<{
    name: string;
    quantity: number;
    publishedAirflow: string | null;
    publishedPressure: string | null;
    packageInput: string | null;
    estimatedAirflow: string | null;
    reduction: string | null;
    referencePressure: string | null;
    referencePressureSource: string | null;
    referenceTemperature: string | null;
    referenceTemperatureSource: string | null;
    calculationExplanation: string | null;
    siteUnavailableReason: string | null;
  }>;
  technicalRows: Array<{
    label: string;
    current: string | null;
    proposed: string | null;
  }>;
  warnings: string[];
  siteAirflowAdvisory: string | null;
  requiresRevision: boolean;
  electricity: {
    currentEnergyLabel?: string;
    proposedEnergyLabel?: string;
    currentEnergy?: string | null;
    proposedEnergy?: string | null;
    currentLabel: string;
    proposedLabel: string;
    savingLabel: string;
    current: string | null;
    proposed: string | null;
    saving: string | null;
    chartCurrentRand?: number | null;
    chartProposedRand?: number | null;
    suppliedAmountReference?: string | null;
    suppliedAmountReferenceNote?: string | null;
    costBreakdown?: {
      rows: Array<{
        label: string;
        productionDays: string | null;
        dailyCurrent: string | null;
        dailyProposed: string | null;
        annualCurrent: string | null;
        annualProposed: string | null;
      }>;
      beforeVsdCurrent: string | null;
      beforeVsdProposed: string | null;
      vsdAllowanceLabel: string;
      vsdAllowance: string | null;
      vsdAllowanceCurrent?: string | null;
      vsdAllowanceProposed?: string | null;
      vsdNote: string | null;
      adjustedCurrent: string | null;
      adjustedProposed: string | null;
      finalSaving: string | null;
      averageTariff: string | null;
    } | null;
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
  financialBenefit?: {
    mode: 'purchase' | 'rental' | 'rent_to_own' | 'none';
    figures: Array<{ label: string; value: string }>;
    note: string | null;
    years: Array<{
      year: string;
      months: string;
      rentalPaid: string;
      netBenefit: string;
      cumulative: string;
    }>;
    chart?: Array<{
      year: string;
      currentElectricity: number;
      currentFinance: number;
      currentMaintenance: number;
      proposedElectricity: number;
      proposedFinance: number;
      proposedMaintenance: number;
      netBenefit: number;
      cumulative: number;
    }>;
    paymentEndYear?: number | null;
    breakEvenYears?: number | null;
  };
  recommendation: string;
  conclusion: string;
  nextSteps: string[];
  basis: string;
  futureCostDisclaimer: string;
  estimatedNote: string;
}
