export type SalesMetric = number | null;

export interface SalesAnalyticsData {
  leadPerformance: {
    totalLeads: SalesMetric;
    statusBreakdown: Record<string, SalesMetric>;
    conversionRate: SalesMetric;
    avgDaysToConversion: SalesMetric;
    valueMetrics: {
      totalPipelineValue: SalesMetric;
      totalConvertedValue: SalesMetric;
      avgLeadValue: SalesMetric;
      avgConvertedValue: SalesMetric;
    };
  };
  sourceAnalysis: {
    leadsBySource: Array<{ source: string; count: SalesMetric; totalValue: SalesMetric }>;
    sourceConversionRates: Array<{ source: string; conversionRate: SalesMetric; totalLeads: SalesMetric; convertedLeads: SalesMetric }>;
  };
  repPerformance: {
    reps: Array<{
      repId: string;
      repName: string;
      totalLeads: SalesMetric;
      convertedLeads: SalesMetric;
      conversionRate: SalesMetric;
      totalValue: SalesMetric;
      avgLeadValue: SalesMetric;
    }>;
  };
  appointmentAnalytics: {
    totalAppointments: SalesMetric;
    attendedAppointments: SalesMetric;
    noShowAppointments: SalesMetric;
    appointmentShowRate: SalesMetric;
  };
  branchPerformance: Array<{
    branch: string;
    totalLeads: SalesMetric;
    convertedLeads: SalesMetric;
    totalValue: SalesMetric;
    avgValue: SalesMetric;
  }>;
  leadAging: { ranges: Array<{ range: string; count: SalesMetric }> };
  lostReasons: Array<{ reason: string; count: SalesMetric }>;
}

/** Converts calculation inputs to a finite number, using the caller's deliberate fallback. */
export const toFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'string' && value.trim() === '') return fallback;

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

/** Converts an API display metric to a finite number, preserving unavailable values as null. */
export const toSalesMetric = (value: unknown): SalesMetric => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' && typeof value !== 'string') return null;

  const numericValue = toFiniteNumber(value, Number.NaN);
  return Number.isFinite(numericValue) ? numericValue : null;
};

/** Record and event quantities cannot be negative; invalid counts remain unavailable. */
export const normalizeOptionalCount = (value: unknown): SalesMetric => {
  const numericValue = toSalesMetric(value);
  return numericValue === null || numericValue < 0 ? null : numericValue;
};

export const normalizeOptionalConvertedCount = (
  value: unknown,
  total: SalesMetric,
): SalesMetric => {
  const count = normalizeOptionalCount(value);
  return count !== null && total !== null && count > total ? null : count;
};

/** Appointment subsets require a valid known total before they can be presented. */
export const normalizeOptionalAppointmentSubsetCount = (
  value: unknown,
  total: SalesMetric,
): SalesMetric => {
  const count = normalizeOptionalCount(value);
  return count === null || total === null || count > total ? null : count;
};

/** Proportion metrics use the same bounded value for labels and chart widths. */
export const normalizeOptionalRate = (value: unknown): SalesMetric => {
  const numericValue = toSalesMetric(value);
  return numericValue === null ? null : Math.min(100, Math.max(0, numericValue));
};

/** A zero denominator has an explicit zero fallback; finite arithmetic overflow is unavailable. */
export const safeDivision = (
  numerator: unknown,
  denominator: unknown,
  zeroDenominatorFallback = 0,
): SalesMetric => {
  const dividend = toSalesMetric(numerator);
  const divisor = toSalesMetric(denominator);
  if (dividend === null || divisor === null) return null;
  if (divisor === 0) return zeroDenominatorFallback;

  const result = dividend / divisor;
  return Number.isFinite(result) ? result : null;
};

export const safePercentage = (numerator: unknown, denominator: unknown): SalesMetric => {
  const dividend = toSalesMetric(numerator);
  const total = toSalesMetric(denominator);
  if (dividend === null || total === null) return null;
  if (total <= 0) return 0;

  const quotient = safeDivision(dividend, total);
  if (quotient === null) return null;

  const result = quotient * 100;
  return Number.isFinite(result) ? result : null;
};

export const calculateSalesPercentage = (
  numerator: SalesMetric,
  denominator: SalesMetric,
): SalesMetric => {
  if (numerator === null || denominator === null) return null;
  if (numerator < 0 || denominator < 0) return null;
  return normalizeOptionalRate(safePercentage(numerator, denominator));
};

export const calculateSalesAverage = (
  total: SalesMetric,
  count: SalesMetric,
): SalesMetric => {
  if (total === null || count === null) return null;
  return safeDivision(total, count);
};

export const calculatePendingAppointments = (
  total: SalesMetric,
  attended: SalesMetric,
): SalesMetric => {
  if (total === null || attended === null || attended > total) return null;
  return total - attended;
};

export const toChartPercent = (value: unknown): number =>
  normalizeOptionalRate(value) ?? 0;

export type SalesSortDirection = 'ascending' | 'descending';

/** Compares already-normalised finite report values without subtraction overflow. */
/** Unavailable values sort last in both directions so finite performance data ranks first. */
export const compareSalesNumbers = (
  left: SalesMetric,
  right: SalesMetric,
  direction: SalesSortDirection = 'ascending',
): -1 | 0 | 1 => {
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;
  if (left === right) return 0;

  const result = left < right ? -1 : 1;
  return direction === 'descending' ? (result === -1 ? 1 : -1) : result;
};

export const formatSalesCurrency = (value: unknown): string => {
  const numericValue = toSalesMetric(value);
  if (numericValue === null) return '—';

  if (numericValue >= 1000000) return `R ${(numericValue / 1000000).toFixed(1)}M`;
  if (numericValue >= 1000) return `R ${(numericValue / 1000).toFixed(0)}K`;
  return `R ${numericValue.toFixed(0)}`;
};

export const formatSalesPercentage = (value: unknown, fractionDigits = 1): string => {
  const numericValue = toSalesMetric(value);
  return numericValue === null ? '—' : `${numericValue.toFixed(fractionDigits)}%`;
};

export const formatSalesNumber = (value: unknown): string => {
  const numericValue = toSalesMetric(value);
  return numericValue === null ? '—' : `${numericValue}`;
};

export const formatSalesAverageDays = (value: SalesMetric): string => {
  if (value === null) return '—';
  if (value > 0) return `${Math.round(value)}`;
  return value === 0 ? '0' : 'N/A';
};

export interface SalesRatePresentation {
  value: SalesMetric;
  label: string;
  width: number;
}

export const buildRatePresentation = (value: SalesMetric): SalesRatePresentation => {
  const validatedValue = normalizeOptionalRate(value);
  return {
    value: validatedValue,
    label: formatSalesPercentage(validatedValue),
    width: toChartPercent(validatedValue),
  };
};

export const buildCalculatedRatePresentation = (
  numerator: SalesMetric,
  denominator: SalesMetric,
): SalesRatePresentation => buildRatePresentation(calculateSalesPercentage(numerator, denominator));

/** Keeps unavailable rates visually distinct from genuine low performance. */
export const getSalesRatePresentationStyle = (value: SalesMetric): string => {
  if (value === null) return 'bg-gray-100 text-gray-600';
  if (value >= 30) return 'bg-green-100 text-green-800';
  if (value >= 20) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

/** Selects the first highest finite metric, excluding only unavailable values. */
export const selectSalesMetricWinner = <T>(
  candidates: readonly T[],
  getMetric: (candidate: T) => SalesMetric,
): T | null => {
  let winner: T | null = null;
  let winnerMetric: number | null = null;

  for (const candidate of candidates) {
    const metric = getMetric(candidate);
    if (metric === null) continue;
    if (winnerMetric === null || metric > winnerMetric) {
      winner = candidate;
      winnerMetric = metric;
    }
  }

  return winner;
};

type SalesRep = SalesAnalyticsData['repPerformance']['reps'][number];
type SalesBranch = SalesAnalyticsData['branchPerformance'][number];

export const buildRepPerformancePresentation = (reps: SalesRep[]) => {
  const sortedReps = [...reps].sort((left, right) =>
    compareSalesNumbers(left.totalValue, right.totalValue, 'descending'),
  );
  const convertedRepCount = sortedReps.some((rep) => rep.convertedLeads === null)
    ? null
    : sortedReps.filter((rep) => rep.convertedLeads > 0).length;
  const topPerformer = selectSalesMetricWinner(sortedReps, (rep) => rep.totalValue);
  const topConverter = selectSalesMetricWinner(sortedReps, (rep) => rep.conversionRate);

  return { sortedReps, convertedRepCount, topPerformer, topConverter };
};

export const buildBranchPerformancePresentation = (branches: SalesBranch[]) => {
  const rows = [...branches]
    .sort((left, right) => compareSalesNumbers(left.totalValue, right.totalValue, 'descending'))
    .map((branch) => ({
      branch,
      conversionRate: buildCalculatedRatePresentation(branch.convertedLeads, branch.totalLeads),
    }));
  const topByRevenue = selectSalesMetricWinner(rows, (row) => row.branch.totalValue);
  const topByLeads = selectSalesMetricWinner(rows, (row) => row.branch.totalLeads);
  const topByConversion = selectSalesMetricWinner(rows, (row) => row.conversionRate.value);

  return { rows, topByRevenue, topByLeads, topByConversion };
};

export const buildAppointmentPresentation = (
  appointments: SalesAnalyticsData['appointmentAnalytics'],
) => {
  const pending = calculatePendingAppointments(
    appointments.totalAppointments,
    appointments.attendedAppointments,
  );

  return {
    pending,
    showRate: buildRatePresentation(appointments.appointmentShowRate),
    attended: {
      count: appointments.attendedAppointments,
      rate: buildCalculatedRatePresentation(appointments.attendedAppointments, appointments.totalAppointments),
    },
    noShow: {
      count: appointments.noShowAppointments,
      rate: buildCalculatedRatePresentation(appointments.noShowAppointments, appointments.totalAppointments),
    },
    pendingBreakdown: {
      count: pending,
      rate: buildCalculatedRatePresentation(pending, appointments.totalAppointments),
    },
  };
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

const asText = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim() ? value : fallback;

const normaliseCountRecord = (value: unknown): Record<string, SalesMetric> =>
  Object.fromEntries(
    Object.entries(asRecord(value)).map(([key, item]) => [key, normalizeOptionalCount(item)]),
  );

/** Normalise the untrusted analytics response before any report calculation or rendering. */
export const normalizeSalesAnalytics = (value: unknown): SalesAnalyticsData => {
  const data = asRecord(value);
  const leadPerformance = asRecord(data.leadPerformance);
  const valueMetrics = asRecord(leadPerformance.valueMetrics);
  const sourceAnalysis = asRecord(data.sourceAnalysis);
  const repPerformance = asRecord(data.repPerformance);
  const appointmentAnalytics = asRecord(data.appointmentAnalytics);

  return {
    leadPerformance: {
      totalLeads: normalizeOptionalCount(leadPerformance.totalLeads),
      statusBreakdown: normaliseCountRecord(leadPerformance.statusBreakdown),
      conversionRate: normalizeOptionalRate(leadPerformance.conversionRate),
      avgDaysToConversion: toSalesMetric(leadPerformance.avgDaysToConversion),
      valueMetrics: {
        totalPipelineValue: toSalesMetric(valueMetrics.totalPipelineValue),
        totalConvertedValue: toSalesMetric(valueMetrics.totalConvertedValue),
        avgLeadValue: toSalesMetric(valueMetrics.avgLeadValue),
        avgConvertedValue: toSalesMetric(valueMetrics.avgConvertedValue),
      },
    },
    sourceAnalysis: {
      leadsBySource: asArray(sourceAnalysis.leadsBySource).map((item) => {
        const source = asRecord(item);
        return {
          source: asText(source.source, 'Not Specified'),
          count: normalizeOptionalCount(source.count),
          totalValue: toSalesMetric(source.totalValue),
        };
      }),
      sourceConversionRates: asArray(sourceAnalysis.sourceConversionRates).map((item) => {
        const source = asRecord(item);
        const totalLeads = normalizeOptionalCount(source.totalLeads);
        return {
          source: asText(source.source, 'Not Specified'),
          conversionRate: normalizeOptionalRate(source.conversionRate),
          totalLeads,
          convertedLeads: normalizeOptionalConvertedCount(source.convertedLeads, totalLeads),
        };
      }),
    },
    repPerformance: {
      reps: asArray(repPerformance.reps).map((item, index) => {
        const rep = asRecord(item);
        const totalLeads = normalizeOptionalCount(rep.totalLeads);
        return {
          repId: asText(rep.repId, `rep-${index}`),
          repName: asText(rep.repName, 'Unassigned'),
          totalLeads,
          convertedLeads: normalizeOptionalConvertedCount(rep.convertedLeads, totalLeads),
          conversionRate: normalizeOptionalRate(rep.conversionRate),
          totalValue: toSalesMetric(rep.totalValue),
          avgLeadValue: toSalesMetric(rep.avgLeadValue),
        };
      }),
    },
    appointmentAnalytics: (() => {
      const totalAppointments = normalizeOptionalCount(appointmentAnalytics.totalAppointments);
      return {
        totalAppointments,
        attendedAppointments: normalizeOptionalAppointmentSubsetCount(
          appointmentAnalytics.attendedAppointments,
          totalAppointments,
        ),
        noShowAppointments: normalizeOptionalAppointmentSubsetCount(
          appointmentAnalytics.noShowAppointments,
          totalAppointments,
        ),
        appointmentShowRate: normalizeOptionalRate(appointmentAnalytics.appointmentShowRate),
      };
    })(),
    branchPerformance: asArray(data.branchPerformance).map((item) => {
      const branch = asRecord(item);
      const totalLeads = normalizeOptionalCount(branch.totalLeads);
      return {
        branch: asText(branch.branch, 'Not Specified'),
        totalLeads,
        convertedLeads: normalizeOptionalConvertedCount(branch.convertedLeads, totalLeads),
        totalValue: toSalesMetric(branch.totalValue),
        avgValue: toSalesMetric(branch.avgValue),
      };
    }),
    leadAging: {
      ranges: asArray(asRecord(data.leadAging).ranges).map((item) => {
        const range = asRecord(item);
        return { range: asText(range.range, 'Not Specified'), count: normalizeOptionalCount(range.count) };
      }),
    },
    lostReasons: asArray(data.lostReasons).map((item) => {
      const reason = asRecord(item);
      return { reason: asText(reason.reason, 'No reason provided'), count: normalizeOptionalCount(reason.count) };
    }),
  };
};
