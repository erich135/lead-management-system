export type NumericChannelId = 'flow' | 'cumulativeConsumption' | 'temperature' | 'pressure';

export interface EngineeringSetting {
  id: string;
  section: string;
  question: string;
  originalAnswer: string;
  normalizedValue: unknown;
  validationStatus:
    | 'confirmed'
    | 'provisional_unsupported'
    | 'contradictory'
    | 'missing'
    | 'not_applicable'
    | 'blocked_pending_evidence';
  blockingReason: string | null;
  requiredEvidence: string[];
  usableInCalculations: boolean;
  version: string;
  approvalDate: string;
}

export interface DisabledCapability {
  id: string;
  label: string;
  enabled: false;
  sourceQuestions: string[];
  reason: string;
  requiredAnswerOrEvidence: string;
}

export interface RawStatistics {
  channelId: NumericChannelId;
  unit: string;
  sampleCount: number;
  minimum: number | null;
  maximum: number | null;
  average: number | null;
}

export interface Trend {
  channelId: 'flow' | 'pressure';
  unit: string;
  sourcePointCount: number;
  sampled: boolean;
  points: Array<{ timestamp: string; value: number }>;
}

export interface PeriodSummary {
  periodType: 'overall' | 'hour' | 'day' | 'iso_week';
  periodStart: string;
  periodEnd: string;
  localPeriodLabel: string;
  timezone: string;
  isPartial: boolean;
  sampleCount: number;
  validDurationSeconds: number;
  missingDurationSeconds: number;
  coveragePercent: number;
  coverageRequiredPercent: number;
  hasUnsupportedGap: boolean;
  eligibleForConfirmedSummary: boolean;
  qualityFlags: string[];
  channels: Array<{
    channelId: NumericChannelId;
    unit: string;
    sampleCount: number;
    validSampleCount: number;
    minimum: number | null;
    maximum: number | null;
    average: number | null;
  }>;
}

export type ScientificCalculationProvenance =
  | 'exact_mathematics'
  | 'established_engineering'
  | 'manufacturer_specification'
  | 'approved_assumption'
  | 'business_input'
  | 'user_input';

export type ScientificUncertainty =
  | 'measured'
  | 'derived_exact'
  | 'derived_manufacturer'
  | 'estimated'
  | 'estimated_from_short_record'
  | 'unavailable';

export type ScientificCalculationId =
  | 'CALC-007'
  | 'CALC-008'
  | 'CALC-021'
  | 'CALC-023'
  | 'CALC-025'
  | 'CALC-030'
  | 'CALC-031'
  | 'CALC-032'
  | 'CALC-033'
  | 'CALC-034'
  | 'CALC-035'
  | 'CALC-036'
  | 'CALC-041'
  | 'CALC-042'
  | 'CALC-043'
  | 'CALC-045'
  | 'CALC-046'
  | 'CALC-047'
  | 'CALC-051'
  | 'CALC-052'
  | 'CALC-053'
  | 'CALC-056'
  | 'CALC-058'
  | 'CALC-059'
  | 'CALC-060'
  | 'CALC-061'
  | 'CALC-062'
  | 'CALC-063'
  | 'CALC-067';

export interface ScientificNumericUncertainty {
  plusMinus: number;
  unit: string;
  basis: 'counter_quantisation';
}

export interface ScientificFigureMetadata {
  unit: string;
  provenance: ScientificCalculationProvenance;
  uncertainty: ScientificUncertainty;
  calculationId: ScientificCalculationId;
  numericUncertainty: ScientificNumericUncertainty | null;
  reason: string;
}

export interface ScientificSourceReference {
  sourceFilename: string;
  sourceSha256: string;
}

export type LowFlowCutOffStatus = 'cut_off_unconfirmed' | 'cut_off_confirmed';

export interface RuntimeFigureCutOffMetadata {
  status: LowFlowCutOffStatus;
  unit: 's' | 'fraction' | 'm3/min';
  reason: string;
}

export interface RuntimeFigureMetadata {
  flowingDurationSeconds: RuntimeFigureCutOffMetadata;
  nonFlowingDurationSeconds: RuntimeFigureCutOffMetadata;
  flowingFraction: RuntimeFigureCutOffMetadata;
  meanFlowWhileFlowingM3PerMin: RuntimeFigureCutOffMetadata;
}

export interface MeasuredDemandFigureMetadata {
  supportedDurationSeconds: ScientificFigureMetadata;
  deliveredVolumeM3: ScientificFigureMetadata;
  meteredVolumeM3: ScientificFigureMetadata;
  volumeBalanceClosure: ScientificFigureMetadata;
  meanFlowM3PerMin: ScientificFigureMetadata;
  flowP50M3PerMin: ScientificFigureMetadata;
  flowP90M3PerMin: ScientificFigureMetadata;
  peakMeanFlowWindowMinutes: ScientificFigureMetadata;
  peakMeanFlowM3PerMin: ScientificFigureMetadata;
  flowingDurationSeconds: ScientificFigureMetadata;
  nonFlowingDurationSeconds: ScientificFigureMetadata;
  flowingFraction: ScientificFigureMetadata;
  meanFlowWhileFlowingM3PerMin: ScientificFigureMetadata;
  meanPressureBarG: ScientificFigureMetadata;
  meanPressureWhileFlowingBarG: ScientificFigureMetadata;
  lowFlowCutOffM3PerMin: ScientificFigureMetadata;
  observedMinimumNonZeroFlowM3PerMin: ScientificFigureMetadata;
  annualisationFactor: ScientificFigureMetadata;
  recordDurationDays: ScientificFigureMetadata;
}

export interface MeasuredDemandProfile {
  source: ScientificSourceReference;
  supportedDurationSeconds: number;
  deliveredVolumeM3: number;
  meteredVolumeM3: number | null;
  volumeBalanceClosure: number | null;
  meanFlowM3PerMin: number | null;
  flowP50M3PerMin: number | null;
  flowP90M3PerMin: number | null;
  peakMeanFlowM3PerMin: Array<{ windowMinutes: number; value: number }>;
  flowingDurationSeconds: number;
  nonFlowingDurationSeconds: number;
  flowingFraction: number | null;
  meanFlowWhileFlowingM3PerMin: number | null;
  meanPressureBarG: number | null;
  meanPressureWhileFlowingBarG: number | null;
  lowFlowCutOffM3PerMin: number | null;
  lowFlowCutOffStatus: LowFlowCutOffStatus;
  reportedZeroFlowLabel: 'below cut-off';
  runtimeFigureMetadata: RuntimeFigureMetadata;
  observedMinimumNonZeroFlowM3PerMin: number | null;
  annualisationFactor: number | null;
  recordDurationDays: number;
  confidence: 'measured' | 'estimated_from_short_record' | 'insufficient';
  figureMetadata: MeasuredDemandFigureMetadata;
}

export interface BouwaLocalAnalysis {
  attestation: {
    analysisId: string;
    proposalRecordId: string;
    proposalId: string;
    settingsVersion: number;
    sourceFilename: string;
    sourceSha256: string;
    resultHash: string;
    parserProfile: string;
    parserVersion: string;
    analysedAt: string;
  };
  application: {
    version: string;
    parserVersion: string;
    engineeringSettingsVersion: string;
    localOnly: true;
    externalUpload: false;
    persistence: 'none';
  };
  inputFile: {
    filename: string;
    sizeBytes: number;
    sha256: string;
  };
  dataset: {
    detectedFormat: string;
    firstTimestamp: string | null;
    lastTimestamp: string | null;
    timezone: string;
    rowCount: number;
    validRowCount: number;
    invalidRowCount: number;
    channelNames: string[];
    channels: Array<{ id: string; sourceLabel: string; rawUnit: string | null; normalisedUnit: string | null }>;
    sourceOrder: string;
    outOfOrderSampleCount: number;
    observedIntervals: Array<{ seconds: number; count: number }>;
    unexpectedIntervalCount: number;
    missingSampleCount: number;
    missingDurationSeconds: number;
    overallCoveragePercent: number;
    partialPeriods: { hourly: number; daily: number; isoWeekly: number };
  };
  dataQuality: {
    invalidTimestampRows: number;
    invalidNumericValues: number;
    duplicateTimestampRows: number;
    dataGapCount: number;
    irregularIntervalCount: number;
    warningRowCount: number;
    warnings: string[];
  };
  measuredDemand: MeasuredDemandProfile;
  rawStatistics: RawStatistics[];
  trends: Trend[];
  summaries: {
    hourly: PeriodSummary[];
    daily: PeriodSummary[];
    isoWeekly: PeriodSummary[];
  };
  engineeringSettings: {
    confirmedUsed: EngineeringSetting[];
    blockedNotUsed: EngineeringSetting[];
  };
  disabledCapabilities: DisabledCapability[];
  validationReportText: string;
}

export interface LocalHealth {
  status: 'ready';
  localOnly: true;
  persistence: 'memory-only-trust-records';
  applicationVersion: string;
  parserVersion: string;
  engineeringSettingsVersion: string;
  maximumCsvBytes: number;
  sessionAuthentication: 'required';
}
