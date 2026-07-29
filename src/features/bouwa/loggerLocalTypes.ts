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
