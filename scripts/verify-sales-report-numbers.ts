import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  calculateSalesAverage,
  calculatePendingAppointments,
  calculateSalesPercentage,
  buildAppointmentPresentation,
  buildBranchPerformancePresentation,
  buildCalculatedRatePresentation,
  buildRatePresentation,
  buildRepPerformancePresentation,
  compareSalesNumbers,
  formatSalesAverageDays,
  formatSalesCurrency,
  formatSalesNumber,
  formatSalesPercentage,
  getSalesRatePresentationStyle,
  normalizeSalesAnalytics,
  normalizeOptionalConvertedCount,
  normalizeOptionalAppointmentSubsetCount,
  normalizeOptionalCount,
  normalizeOptionalRate,
  safeDivision,
  safePercentage,
  selectSalesMetricWinner,
  toChartPercent,
  toFiniteNumber,
  toSalesMetric,
} from '../src/utils/salesReportNumbers.ts';

const unavailableInputs = [null, undefined, '', '   ', 'not-a-number', NaN, Infinity, -Infinity];
const normalisedValues = unavailableInputs.map((value) => toSalesMetric(value));

assert.deepEqual(normalisedValues, [null, null, null, null, null, null, null, null]);
assert.deepEqual(unavailableInputs.map((value) => toFiniteNumber(value)), [0, 0, 0, 0, 0, 0, 0, 0]);
assert.equal(toSalesMetric(0), 0);
assert.equal(toSalesMetric('0'), 0);
assert.equal(toSalesMetric('1250'), 1250);
assert.equal(toSalesMetric(-42), -42);
assert.equal(formatSalesCurrency('1500000'), 'R 1.5M');
assert.equal(formatSalesPercentage('12.5'), '12.5%');
assert.equal(formatSalesCurrency(null), '—');
assert.equal(formatSalesCurrency(0), 'R 0');
assert.equal(formatSalesCurrency(-42), 'R -42');
assert.equal(formatSalesPercentage(null), '—');
assert.equal(formatSalesPercentage(0), '0.0%');
assert.equal(formatSalesNumber(null), '—');
assert.equal(formatSalesNumber(0), '0');
assert.equal(formatSalesAverageDays(null), '—');
assert.equal(formatSalesAverageDays(0), '0');
assert.equal(safePercentage(1, 0), 0);
assert.equal(safeDivision(1, 0), 0);
assert.equal(safeDivision(Number.MAX_VALUE, Number.MIN_VALUE), null);
assert.equal(safeDivision(-Number.MAX_VALUE, Number.MIN_VALUE), null);
assert.equal(safePercentage(Number.MAX_VALUE, Number.MIN_VALUE), null);
assert.equal(calculateSalesAverage(Number.MAX_VALUE, Number.MIN_VALUE), null);
assert.equal(calculateSalesPercentage(Number.MAX_VALUE, Number.MIN_VALUE), null);
assert.equal(formatSalesCurrency(calculateSalesAverage(Number.MAX_VALUE, Number.MIN_VALUE)), '—');
assert.equal(formatSalesPercentage(calculateSalesPercentage(Number.MAX_VALUE, Number.MIN_VALUE)), '—');
assert.deepEqual(buildCalculatedRatePresentation(Number.MAX_VALUE, Number.MIN_VALUE), {
  value: null,
  label: '—',
  width: 0,
});
assert.equal(safeDivision(10, 4), 2.5);
assert.equal(safePercentage(1, 4), 25);
assert.equal(safeDivision(0, 4), 0);
assert.equal(safePercentage(0, 4), 0);
assert.equal(safeDivision(null, 4), null);
assert.equal(safeDivision(4, null), null);
assert.equal(safeDivision(NaN, 4), null);
assert.equal(safePercentage(Infinity, 4), null);
assert.equal(calculateSalesPercentage(null, 10), null);
assert.equal(calculateSalesPercentage(0, 10), 0);
assert.equal(calculateSalesPercentage(1, 0), 0);
assert.equal(calculateSalesAverage(null, 4), null);
assert.equal(calculateSalesAverage(0, 4), 0);

assert.equal(normalizeOptionalCount(-1), null);
assert.equal(normalizeOptionalCount(0), 0);
assert.equal(normalizeOptionalCount('12'), 12);
assert.equal(normalizeOptionalCount(null), null);
assert.equal(normalizeOptionalCount('not-a-number'), null);
assert.equal(normalizeOptionalCount(Number.MAX_VALUE), Number.MAX_VALUE);
assert.equal(formatSalesNumber(normalizeOptionalCount(-1)), '—');

assert.equal(normalizeOptionalRate(-5), 0);
assert.equal(normalizeOptionalRate(0), 0);
assert.equal(normalizeOptionalRate('55'), 55);
assert.equal(normalizeOptionalRate(100), 100);
assert.equal(normalizeOptionalRate(150), 100);
assert.equal(normalizeOptionalRate(null), null);
assert.equal(normalizeOptionalRate('not-a-number'), null);
assert.equal(calculateSalesPercentage(-1, 10), null);
assert.equal(calculateSalesPercentage(0, 10), 0);
assert.equal(calculateSalesPercentage(10, 10), 100);
assert.equal(calculateSalesPercentage(12, 10), 100);
assert.equal(formatSalesPercentage(normalizeOptionalRate(-5)), '0.0%');
assert.equal(formatSalesPercentage(normalizeOptionalRate(150)), '100.0%');
assert.equal(formatSalesPercentage(calculateSalesPercentage(12, 10)), '100.0%');
assert.equal(toChartPercent(normalizeOptionalRate(-5)), 0);
assert.equal(toChartPercent(normalizeOptionalRate(150)), 100);
assert.equal(toChartPercent(calculateSalesPercentage(12, 10)), 100);

assert.equal(calculatePendingAppointments(10, 4), 6);
assert.equal(calculatePendingAppointments(10, 10), 0);
assert.equal(calculatePendingAppointments(10, 12), null);
assert.equal(calculatePendingAppointments(null, 4), null);
assert.equal(calculatePendingAppointments(10, null), null);
assert.equal(calculatePendingAppointments(normalizeOptionalCount(-10), 4), null);
assert.equal(calculatePendingAppointments(10, normalizeOptionalCount(-4)), null);
assert.equal(formatSalesNumber(calculatePendingAppointments(10, 12)), '—');
assert.equal(normalizeOptionalConvertedCount(12, 10), null);
assert.equal(normalizeOptionalAppointmentSubsetCount(4, 10), 4);
assert.equal(normalizeOptionalAppointmentSubsetCount(12, 10), null);
assert.equal(normalizeOptionalAppointmentSubsetCount(1, null), null);

const comparatorCases: Array<[number, number, -1 | 0 | 1]> = [
  [Number.MAX_VALUE, -Number.MAX_VALUE, 1],
  [-Number.MAX_VALUE, Number.MAX_VALUE, -1],
  [Number.MAX_VALUE, Number.MAX_VALUE, 0],
  [0, 0, 0],
  [12, 48, -1],
  [48, 12, 1],
  [-48, -12, -1],
  [-12, 48, -1],
];

for (const [left, right, expected] of comparatorCases) {
  const result = compareSalesNumbers(left, right);
  assert.ok(Number.isFinite(result), 'comparator results must be finite');
  assert.ok([-1, 0, 1].includes(result), 'comparator results must be bounded');
  assert.equal(result, expected);
}
assert.equal(compareSalesNumbers(Number.MAX_VALUE, Number.MAX_VALUE, 'descending'), 0);
assert.equal(compareSalesNumbers(null, Number.MAX_VALUE, 'descending'), 1);
assert.equal(compareSalesNumbers(Number.MAX_VALUE, null, 'descending'), -1);
assert.equal(compareSalesNumbers(null, null, 'descending'), 0);

const comparisonValues = [Number.MAX_VALUE, -Number.MAX_VALUE, 0, 48, -48];
assert.deepEqual(
  [...comparisonValues].sort((left, right) => compareSalesNumbers(left, right, 'ascending')),
  [-Number.MAX_VALUE, -48, 0, 48, Number.MAX_VALUE],
);
assert.deepEqual(
  [...comparisonValues].sort((left, right) => compareSalesNumbers(left, right, 'descending')),
  [Number.MAX_VALUE, 48, 0, -48, -Number.MAX_VALUE],
);
assert.deepEqual(
  [{ name: 'first', value: Number.MAX_VALUE }, { name: 'second', value: Number.MAX_VALUE }]
    .sort((left, right) => compareSalesNumbers(left.value, right.value, 'descending'))
    .map((item) => item.name),
  ['first', 'second'],
);

const reps = [
  { name: 'low', totalValue: -Number.MAX_VALUE },
  { name: 'high', totalValue: Number.MAX_VALUE },
].sort((left, right) => compareSalesNumbers(left.totalValue, right.totalValue, 'descending'));
const branches = [
  { name: 'low', totalValue: -Number.MAX_VALUE },
  { name: 'high', totalValue: Number.MAX_VALUE },
].sort((left, right) => compareSalesNumbers(left.totalValue, right.totalValue, 'descending'));

assert.deepEqual(reps.map((rep) => rep.name), ['high', 'low']);
assert.deepEqual(branches.map((branch) => branch.name), ['high', 'low']);

const analyticsInput = {
  leadPerformance: {
    totalLeads: undefined,
    statusBreakdown: { new: '0', invalid: Infinity },
    conversionRate: '   ',
    avgDaysToConversion: NaN,
    valueMetrics: { totalPipelineValue: null, totalConvertedValue: '0', avgLeadValue: '1250', avgConvertedValue: -42 },
  },
  sourceAnalysis: {
    leadsBySource: [{ source: 'Email', count: '0', totalValue: '0' }, { source: 'Broken', count: Infinity, totalValue: NaN }],
    sourceConversionRates: undefined,
  },
  repPerformance: undefined,
  appointmentAnalytics: { totalAppointments: '0', attendedAppointments: Infinity, noShowAppointments: null, appointmentShowRate: '75' },
  branchPerformance: [{ branch: 'JHB', totalLeads: '2', convertedLeads: '1', totalValue: '2000', avgValue: '' }],
  leadAging: undefined,
  lostReasons: undefined,
};
const analyticsInputSnapshot = structuredClone(analyticsInput);
const analytics = normalizeSalesAnalytics(analyticsInput);

assert.deepEqual(analyticsInput, analyticsInputSnapshot, 'normalisation must not mutate API data');
assert.equal(analytics.leadPerformance.valueMetrics.totalPipelineValue, null);
assert.equal(analytics.leadPerformance.valueMetrics.totalConvertedValue, 0);
assert.equal(analytics.leadPerformance.conversionRate, null);
assert.equal(analytics.leadPerformance.totalLeads, null);
assert.equal(analytics.sourceAnalysis.leadsBySource[1].totalValue, null);

const domainInput = {
  leadPerformance: {
    totalLeads: -1,
    statusBreakdown: { invalid: -1 },
    conversionRate: 150,
    valueMetrics: {},
  },
  sourceAnalysis: {
    sourceConversionRates: [{ source: 'Web', totalLeads: 10, convertedLeads: 12, conversionRate: -5 }],
  },
  repPerformance: {
    reps: [{ repId: 'rep-1', repName: 'Rep', totalLeads: 10, convertedLeads: 12, conversionRate: 125 }],
  },
  appointmentAnalytics: { totalAppointments: 10, attendedAppointments: 12, noShowAppointments: -1, appointmentShowRate: 125 },
  branchPerformance: [{ branch: 'JHB', totalLeads: -10, convertedLeads: 1, totalValue: -42, avgValue: 0 }],
};
const domainInputSnapshot = structuredClone(domainInput);
const domainAnalytics = normalizeSalesAnalytics(domainInput);

assert.deepEqual(domainInput, domainInputSnapshot, 'domain normalisation must not mutate API data');
assert.equal(domainAnalytics.leadPerformance.totalLeads, null);
assert.equal(domainAnalytics.leadPerformance.statusBreakdown.invalid, null);
assert.equal(domainAnalytics.leadPerformance.conversionRate, 100);
assert.equal(domainAnalytics.sourceAnalysis.sourceConversionRates[0].convertedLeads, null);
assert.equal(domainAnalytics.sourceAnalysis.sourceConversionRates[0].conversionRate, 0);
assert.equal(domainAnalytics.repPerformance.reps[0].convertedLeads, null);
assert.equal(domainAnalytics.repPerformance.reps[0].conversionRate, 100);
assert.equal(domainAnalytics.appointmentAnalytics.noShowAppointments, null);
assert.equal(domainAnalytics.appointmentAnalytics.appointmentShowRate, 100);
assert.equal(calculatePendingAppointments(
  domainAnalytics.appointmentAnalytics.totalAppointments,
  domainAnalytics.appointmentAnalytics.attendedAppointments,
), null);
assert.equal(domainAnalytics.branchPerformance[0].totalLeads, null);
assert.equal(domainAnalytics.branchPerformance[0].totalValue, -42, 'currency remains unconstrained');
assert.ok(
  [
    domainAnalytics.leadPerformance.conversionRate,
    domainAnalytics.sourceAnalysis.sourceConversionRates[0].conversionRate,
    domainAnalytics.repPerformance.reps[0].conversionRate,
    domainAnalytics.appointmentAnalytics.appointmentShowRate,
  ].map(toChartPercent).every(Number.isFinite),
  'domain-normalised chart values must be finite',
);

const completeMissingAnalytics = normalizeSalesAnalytics(undefined);
const missingRepPresentation = buildRepPerformancePresentation(completeMissingAnalytics.repPerformance.reps);
const missingBranchPresentation = buildBranchPerformancePresentation(completeMissingAnalytics.branchPerformance);
const missingAppointmentPresentation = buildAppointmentPresentation(completeMissingAnalytics.appointmentAnalytics);

assert.deepEqual(completeMissingAnalytics.leadPerformance.statusBreakdown, {});
assert.equal(completeMissingAnalytics.leadPerformance.totalLeads, null);
assert.equal(completeMissingAnalytics.leadPerformance.conversionRate, null);
assert.equal(completeMissingAnalytics.leadPerformance.valueMetrics.totalPipelineValue, null);
assert.equal(completeMissingAnalytics.leadPerformance.valueMetrics.avgLeadValue, null);
assert.deepEqual(completeMissingAnalytics.sourceAnalysis.leadsBySource, []);
assert.deepEqual(completeMissingAnalytics.sourceAnalysis.sourceConversionRates, []);
assert.deepEqual(completeMissingAnalytics.repPerformance.reps, []);
assert.deepEqual(completeMissingAnalytics.branchPerformance, []);
assert.deepEqual(completeMissingAnalytics.leadAging.ranges, []);
assert.deepEqual(completeMissingAnalytics.lostReasons, []);
assert.equal(completeMissingAnalytics.appointmentAnalytics.totalAppointments, null);
assert.equal(completeMissingAnalytics.appointmentAnalytics.appointmentShowRate, null);
assert.deepEqual(missingRepPresentation.sortedReps, []);
assert.equal(missingRepPresentation.convertedRepCount, 0);
assert.deepEqual(missingBranchPresentation.rows, []);
assert.equal(missingAppointmentPresentation.pending, null);
assert.equal(missingAppointmentPresentation.showRate.label, '—');

const presentationInput = normalizeSalesAnalytics({
  repPerformance: {
    reps: [
      { repId: 'low', repName: 'Low', totalValue: -Number.MAX_VALUE, conversionRate: 10 },
      { repId: 'high', repName: 'High', totalValue: Number.MAX_VALUE, conversionRate: 100 },
      { repId: 'missing', repName: 'Missing', totalValue: null, conversionRate: null },
    ],
  },
  branchPerformance: [
    { branch: 'Low', totalLeads: 10, convertedLeads: 1, totalValue: -Number.MAX_VALUE },
    { branch: 'High', totalLeads: 10, convertedLeads: 10, totalValue: Number.MAX_VALUE },
    { branch: 'Missing', totalLeads: null, convertedLeads: null, totalValue: null },
  ],
  appointmentAnalytics: { totalAppointments: 10, attendedAppointments: 4, noShowAppointments: 1, appointmentShowRate: 125 },
});
const repPresentation = buildRepPerformancePresentation(presentationInput.repPerformance.reps);
const branchPresentation = buildBranchPerformancePresentation(presentationInput.branchPerformance);
const appointmentPresentation = buildAppointmentPresentation(presentationInput.appointmentAnalytics);
const negativeAppointmentPresentation = buildAppointmentPresentation(normalizeSalesAnalytics({
  appointmentAnalytics: { totalAppointments: 10, attendedAppointments: 12 },
}).appointmentAnalytics);
const boundedRatePresentation = buildRatePresentation(150);
const missingRatePresentation = buildRatePresentation(null);
const derivedRatePresentation = buildCalculatedRatePresentation(12, 10);

assert.deepEqual(repPresentation.sortedReps.map((rep) => rep.repId), ['high', 'low', 'missing']);
assert.deepEqual(branchPresentation.rows.map((row) => row.branch.branch), ['High', 'Low', 'Missing']);
assert.equal(branchPresentation.topByConversion?.branch.branch, 'High');
assert.equal(appointmentPresentation.pending, 6);
assert.equal(appointmentPresentation.showRate.label, '100.0%');
assert.equal(appointmentPresentation.showRate.width, 100);
assert.equal(appointmentPresentation.attended.rate.label, '40.0%');
assert.equal(appointmentPresentation.attended.rate.width, 40);
assert.equal(negativeAppointmentPresentation.pending, null);
assert.equal(negativeAppointmentPresentation.pendingBreakdown.rate.label, '—');
assert.deepEqual(boundedRatePresentation, { value: 100, label: '100.0%', width: 100 });
assert.deepEqual(missingRatePresentation, { value: null, label: '—', width: 0 });
assert.deepEqual(derivedRatePresentation, { value: 100, label: '100.0%', width: 100 });
assert.equal(getSalesRatePresentationStyle(null), 'bg-gray-100 text-gray-600');
assert.equal(getSalesRatePresentationStyle(normalizeOptionalRate('not-a-number')), 'bg-gray-100 text-gray-600');
assert.equal(getSalesRatePresentationStyle(0), 'bg-red-100 text-red-800');
assert.equal(getSalesRatePresentationStyle(19.999), 'bg-red-100 text-red-800');
assert.equal(getSalesRatePresentationStyle(20), 'bg-yellow-100 text-yellow-800');
assert.equal(getSalesRatePresentationStyle(20.001), 'bg-yellow-100 text-yellow-800');
assert.equal(getSalesRatePresentationStyle(29.999), 'bg-yellow-100 text-yellow-800');
assert.equal(getSalesRatePresentationStyle(30), 'bg-green-100 text-green-800');
assert.equal(getSalesRatePresentationStyle(30.001), 'bg-green-100 text-green-800');
assert.equal(getSalesRatePresentationStyle(100), 'bg-green-100 text-green-800');
assert.equal(getSalesRatePresentationStyle(normalizeOptionalRate(150)), 'bg-green-100 text-green-800');
assert.equal(missingRatePresentation.label, '—');
assert.equal(missingRatePresentation.width, 0);

const selectionInput = [
  { name: 'missing', value: null },
  { name: 'negative', value: -Number.MAX_VALUE },
  { name: 'zero', value: 0 },
  { name: 'positive', value: Number.MAX_VALUE },
];
const selectionInputSnapshot = structuredClone(selectionInput);
assert.equal(selectSalesMetricWinner(selectionInput, (candidate) => candidate.value)?.name, 'positive');
assert.equal(selectSalesMetricWinner(selectionInput.slice(0, 3), (candidate) => candidate.value)?.name, 'zero');
assert.equal(selectSalesMetricWinner([{ name: 'first', value: 0 }, { name: 'second', value: 0 }], (candidate) => candidate.value)?.name, 'first');
assert.equal(selectSalesMetricWinner([{ name: 'missing', value: null }], (candidate) => candidate.value), null);
assert.equal(selectSalesMetricWinner([], (candidate: { value: number | null }) => candidate.value), null);
assert.deepEqual(selectionInput, selectionInputSnapshot, 'winner selection must not mutate candidates');

const unavailableAwards = normalizeSalesAnalytics({
  repPerformance: {
    reps: [
      { repId: 'rep-a', repName: 'Rep A', totalValue: null, conversionRate: null },
      { repId: 'rep-b', repName: 'Rep B', totalValue: null, conversionRate: null },
    ],
  },
  branchPerformance: [
    { branch: 'Branch A', totalValue: null, totalLeads: null, convertedLeads: null },
    { branch: 'Branch B', totalValue: null, totalLeads: null, convertedLeads: null },
  ],
});
const unavailableRepAwards = buildRepPerformancePresentation(unavailableAwards.repPerformance.reps);
const unavailableBranchAwards = buildBranchPerformancePresentation(unavailableAwards.branchPerformance);
assert.equal(unavailableRepAwards.topPerformer, null);
assert.equal(unavailableRepAwards.topConverter, null);
assert.equal(unavailableBranchAwards.topByRevenue, null);
assert.equal(unavailableBranchAwards.topByLeads, null);
assert.equal(unavailableBranchAwards.topByConversion, null);

const zeroAwards = normalizeSalesAnalytics({
  repPerformance: {
    reps: [
      { repId: 'rep-zero', repName: 'Rep Zero', totalValue: 0, conversionRate: 0 },
      { repId: 'rep-missing', repName: 'Rep Missing', totalValue: null, conversionRate: null },
      { repId: 'rep-zero-tie', repName: 'Rep Zero Tie', totalValue: 0, conversionRate: 0 },
    ],
  },
  branchPerformance: [
    { branch: 'Branch Zero', totalValue: 0, totalLeads: 0, convertedLeads: 0 },
    { branch: 'Branch Missing', totalValue: null, totalLeads: null, convertedLeads: null },
    { branch: 'Branch Zero Tie', totalValue: 0, totalLeads: 0, convertedLeads: 0 },
  ],
});
const zeroRepAwards = buildRepPerformancePresentation(zeroAwards.repPerformance.reps);
const zeroBranchAwards = buildBranchPerformancePresentation(zeroAwards.branchPerformance);
assert.equal(zeroRepAwards.topPerformer?.repId, 'rep-zero');
assert.equal(zeroRepAwards.topConverter?.repId, 'rep-zero');
assert.equal(zeroBranchAwards.topByRevenue?.branch.branch, 'Branch Zero');
assert.equal(zeroBranchAwards.topByLeads?.branch.branch, 'Branch Zero');
assert.equal(zeroBranchAwards.topByConversion?.branch.branch, 'Branch Zero');

const mixedAwards = normalizeSalesAnalytics({
  repPerformance: {
    reps: [
      { repId: 'rep-unavailable', repName: 'Rep Unavailable', totalValue: null, conversionRate: null },
      { repId: 'rep-negative', repName: 'Rep Negative', totalValue: -Number.MAX_VALUE, conversionRate: 0 },
      { repId: 'rep-best', repName: 'Rep Best', totalValue: Number.MAX_VALUE, conversionRate: 100 },
    ],
  },
  branchPerformance: [
    { branch: 'Branch Unavailable', totalValue: null, totalLeads: null, convertedLeads: null },
    { branch: 'Branch Negative', totalValue: -Number.MAX_VALUE, totalLeads: 0, convertedLeads: 0 },
    { branch: 'Branch Best', totalValue: Number.MAX_VALUE, totalLeads: 10, convertedLeads: 10 },
  ],
});
const mixedRepAwards = buildRepPerformancePresentation(mixedAwards.repPerformance.reps);
const mixedBranchAwards = buildBranchPerformancePresentation(mixedAwards.branchPerformance);
assert.equal(mixedRepAwards.topPerformer?.repId, 'rep-best');
assert.equal(mixedRepAwards.topConverter?.repId, 'rep-best');
assert.equal(mixedBranchAwards.topByRevenue?.branch.branch, 'Branch Best');
assert.equal(mixedBranchAwards.topByLeads?.branch.branch, 'Branch Best');
assert.equal(mixedBranchAwards.topByConversion?.branch.branch, 'Branch Best');

const normaliseAppointments = (appointmentAnalytics: unknown) =>
  normalizeSalesAnalytics({ appointmentAnalytics }).appointmentAnalytics;
const appointmentInput = { totalAppointments: 10, attendedAppointments: 4, noShowAppointments: 3 };
const appointmentInputSnapshot = structuredClone(appointmentInput);
const validAppointmentPresentation = buildAppointmentPresentation(normaliseAppointments(appointmentInput));
const completeAppointmentPresentation = buildAppointmentPresentation(normaliseAppointments({ totalAppointments: 10, attendedAppointments: 10 }));
const zeroAppointmentPresentation = buildAppointmentPresentation(normaliseAppointments({ totalAppointments: 0, attendedAppointments: 0 }));
const invalidAttendedPresentations = [
  buildAppointmentPresentation(normaliseAppointments({ totalAppointments: 10, attendedAppointments: 12 })),
  buildAppointmentPresentation(normaliseAppointments({ totalAppointments: 0, attendedAppointments: 1 })),
  buildAppointmentPresentation(normaliseAppointments({ totalAppointments: 10, attendedAppointments: -1 })),
  buildAppointmentPresentation(normaliseAppointments({ attendedAppointments: 4 })),
  buildAppointmentPresentation(normaliseAppointments({ totalAppointments: 'bad', attendedAppointments: 4 })),
];
const invalidNoShowPresentations = [
  buildAppointmentPresentation(normaliseAppointments({ totalAppointments: 10, noShowAppointments: 12 })),
  buildAppointmentPresentation(normaliseAppointments({ totalAppointments: 0, noShowAppointments: 1 })),
  buildAppointmentPresentation(normaliseAppointments({ totalAppointments: 10, noShowAppointments: -1 })),
  buildAppointmentPresentation(normaliseAppointments({ noShowAppointments: 3 })),
  buildAppointmentPresentation(normaliseAppointments({ totalAppointments: 'bad', noShowAppointments: 3 })),
];
const combinedAppointmentPresentation = buildAppointmentPresentation(normaliseAppointments({
  totalAppointments: 10,
  attendedAppointments: 4,
  noShowAppointments: 8,
}));

assert.deepEqual(appointmentInput, appointmentInputSnapshot, 'appointment normalisation must not mutate API input');
assert.equal(validAppointmentPresentation.attended.count, 4);
assert.equal(validAppointmentPresentation.attended.rate.label, '40.0%');
assert.equal(validAppointmentPresentation.attended.rate.width, 40);
assert.equal(validAppointmentPresentation.noShow.count, 3);
assert.equal(validAppointmentPresentation.noShow.rate.label, '30.0%');
assert.equal(validAppointmentPresentation.pending, 6);
assert.equal(completeAppointmentPresentation.attended.count, 10);
assert.equal(completeAppointmentPresentation.attended.rate.label, '100.0%');
assert.equal(completeAppointmentPresentation.pending, 0);
assert.equal(zeroAppointmentPresentation.attended.count, 0);
assert.equal(zeroAppointmentPresentation.attended.rate.label, '0.0%');
assert.equal(zeroAppointmentPresentation.pending, 0);

for (const presentation of invalidAttendedPresentations) {
  assert.equal(presentation.attended.count, null);
  assert.deepEqual(presentation.attended.rate, { value: null, label: '—', width: 0 });
  assert.equal(presentation.pending, null);
}
for (const presentation of invalidNoShowPresentations) {
  assert.equal(presentation.noShow.count, null);
  assert.deepEqual(presentation.noShow.rate, { value: null, label: '—', width: 0 });
}

// The documented pending formula includes all non-attended appointments, so no-show is not validated as disjoint.
assert.equal(combinedAppointmentPresentation.attended.count, 4);
assert.equal(combinedAppointmentPresentation.noShow.count, 8);
assert.equal(combinedAppointmentPresentation.pending, 6);

const assertSafePresentationOutput = (value: unknown): void => {
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value), 'presentation numbers must be finite');
    return;
  }
  if (typeof value === 'string') {
    assert.doesNotMatch(value, /NaN|Infinity|-Infinity/);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(assertSafePresentationOutput);
    return;
  }
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(assertSafePresentationOutput);
  }
};

assertSafePresentationOutput({
  status: buildCalculatedRatePresentation(null, 10),
  source: presentationInput.sourceAnalysis.sourceConversionRates.map((source) => buildRatePresentation(source.conversionRate)),
  reps: repPresentation,
  branches: branchPresentation,
  appointments: appointmentPresentation,
  missing: { reps: missingRepPresentation, branches: missingBranchPresentation, appointments: missingAppointmentPresentation },
});

const chartData = [
  toChartPercent(calculateSalesPercentage(analytics.leadPerformance.statusBreakdown.new, analytics.leadPerformance.totalLeads)),
  ...analytics.sourceAnalysis.sourceConversionRates.map((source) => toChartPercent(source.conversionRate)),
  toChartPercent(analytics.appointmentAnalytics.appointmentShowRate),
  ...analytics.branchPerformance.map((branch) => toChartPercent(calculateSalesPercentage(branch.convertedLeads, branch.totalLeads))),
];
const renderedOutput = [
  ...normalisedValues.map((value) => formatSalesCurrency(value)),
  formatSalesCurrency(analytics.leadPerformance.valueMetrics.totalPipelineValue),
  formatSalesCurrency(analytics.leadPerformance.valueMetrics.totalConvertedValue),
  formatSalesPercentage(analytics.leadPerformance.conversionRate),
  formatSalesNumber(analytics.leadPerformance.totalLeads),
  formatSalesCurrency(calculateSalesAverage(
    analytics.sourceAnalysis.leadsBySource[1].totalValue,
    analytics.sourceAnalysis.leadsBySource[1].count,
  )),
].join(' | ');

assert.ok(chartData.every(Number.isFinite), 'chart data must contain finite numbers only');
assert.doesNotMatch(renderedOutput, /NaN|Infinity|-Infinity/);
assert.ok(renderedOutput.includes('—'), 'unavailable display metrics must remain unavailable');
assert.ok(renderedOutput.includes('R 0'), 'genuine zero currency must remain visible as zero');

const sortedWithUnavailable = [Number.MAX_VALUE, null, -Number.MAX_VALUE]
  .sort((left, right) => compareSalesNumbers(left, right, 'descending'));
assert.deepEqual(sortedWithUnavailable, [Number.MAX_VALUE, -Number.MAX_VALUE, null]);
assert.ok(
  sortedWithUnavailable.slice(1).map((value) => compareSalesNumbers(sortedWithUnavailable[0], value, 'descending'))
    .every((result) => Number.isFinite(result) && [-1, 0, 1].includes(result)),
  'sorting unavailable values must remain finite and bounded',
);

const requiredProductionHelpers = [
  'buildRatePresentation',
  'buildCalculatedRatePresentation',
  'buildRepPerformancePresentation',
  'buildBranchPerformancePresentation',
  'buildAppointmentPresentation',
  'getSalesRatePresentationStyle',
] as const;
type RequiredProductionHelper = typeof requiredProductionHelpers[number];

const salesReportNumbersModule = '../utils/salesReportNumbers';
const salesLeadReportsPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../src/components/SalesLeadReports.tsx',
);

const isRequiredProductionHelper = (value: string): value is RequiredProductionHelper =>
  requiredProductionHelpers.includes(value as RequiredProductionHelper);

const parseSalesLeadReports = (sourceText: string) =>
  ts.createSourceFile(
    salesLeadReportsPath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

const collectProductionHelperUsage = (sourceText: string) => {
  const sourceFile = parseSalesLeadReports(sourceText);
  const importedHelpers = new Set<RequiredProductionHelper>();
  const calledHelpers = new Set<RequiredProductionHelper>();

  const visit = (node: ts.Node): void => {
    if (
      ts.isImportDeclaration(node)
      && ts.isStringLiteral(node.moduleSpecifier)
      && node.moduleSpecifier.text === salesReportNumbersModule
      && node.importClause?.namedBindings
      && ts.isNamedImports(node.importClause.namedBindings)
    ) {
      node.importClause.namedBindings.elements.forEach((specifier) => {
        if (
          specifier.propertyName === undefined
          && isRequiredProductionHelper(specifier.name.text)
        ) {
          importedHelpers.add(specifier.name.text);
        }
      });
    }

    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && isRequiredProductionHelper(node.expression.text)) {
      calledHelpers.add(node.expression.text);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return { sourceFile, importedHelpers, calledHelpers };
};

const assertSalesLeadReportsUsesProductionHelpers = (sourceText: string): void => {
  const { importedHelpers, calledHelpers } = collectProductionHelperUsage(sourceText);
  const missingImports = requiredProductionHelpers.filter((helper) => !importedHelpers.has(helper));
  if (missingImports.length > 0) {
    throw new Error(`SalesLeadReports integration guard: missing named import: ${missingImports.join(', ')}`);
  }

  const missingCalls = requiredProductionHelpers.filter((helper) => !calledHelpers.has(helper));
  if (missingCalls.length > 0) {
    throw new Error(`SalesLeadReports integration guard: missing production call: ${missingCalls.join(', ')}`);
  }
};

const renameProductionCallsInMemory = (sourceText: string, helper: RequiredProductionHelper): string => {
  const { sourceFile } = collectProductionHelperUsage(sourceText);
  const callNameRanges: Array<{ start: number; end: number }> = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === helper
    ) {
      callNameRanges.push({ start: node.expression.getStart(sourceFile), end: node.expression.getEnd() });
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  assert.ok(callNameRanges.length > 0, `self-test requires a production call to ${helper}`);
  return callNameRanges
    .sort((left, right) => right.start - left.start)
    .reduce(
      (alteredSource, range) =>
        `${alteredSource.slice(0, range.start)}unsafeInlineCalculation${alteredSource.slice(range.end)}`,
      sourceText,
    );
};

const removeNamedImportInMemory = (sourceText: string, helper: RequiredProductionHelper): string => {
  const { sourceFile } = collectProductionHelperUsage(sourceText);
  let importElements: ts.NodeArray<ts.ImportSpecifier> | undefined;
  let importIndex = -1;

  sourceFile.forEachChild((node) => {
    if (
      importIndex === -1
      && ts.isImportDeclaration(node)
      && ts.isStringLiteral(node.moduleSpecifier)
      && node.moduleSpecifier.text === salesReportNumbersModule
      && node.importClause?.namedBindings
      && ts.isNamedImports(node.importClause.namedBindings)
    ) {
      const index = node.importClause.namedBindings.elements.findIndex(
        (specifier) => specifier.propertyName === undefined && specifier.name.text === helper,
      );
      if (index !== -1) {
        importElements = node.importClause.namedBindings.elements;
        importIndex = index;
      }
    }
  });

  assert.notEqual(importIndex, -1, `self-test requires a named import for ${helper}`);
  const target = importElements![importIndex];
  const start = importIndex === importElements!.length - 1
    ? importElements![importIndex - 1].getEnd()
    : target.getFullStart();
  const end = importIndex === importElements!.length - 1
    ? target.getEnd()
    : importElements![importIndex + 1].getFullStart();
  return `${sourceText.slice(0, start)}${sourceText.slice(end)}`;
};

const salesLeadReportsSource = readFileSync(salesLeadReportsPath, 'utf8');
assertSalesLeadReportsUsesProductionHelpers(salesLeadReportsSource);

const countComponentHelperCalls = (componentName: string, helper: RequiredProductionHelper): number => {
  const { sourceFile } = collectProductionHelperUsage(salesLeadReportsSource);
  let component: ts.Node | undefined;

  const findComponent = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.name.text === componentName
      && node.initializer !== undefined
    ) {
      component = node.initializer;
      return;
    }
    ts.forEachChild(node, findComponent);
  };

  findComponent(sourceFile);
  assert.ok(component, `component integration guard: ${componentName} must exist`);

  let callCount = 0;
  const countCalls = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === helper) {
      callCount += 1;
    }
    ts.forEachChild(node, countCalls);
  };
  countCalls(component);
  return callCount;
};

assert.ok(
  countComponentHelperCalls('RepPerformanceReport', 'getSalesRatePresentationStyle') > 0,
  'rep conversion-rate styling must use the shared production helper',
);
assert.ok(
  countComponentHelperCalls('BranchPerformanceReport', 'getSalesRatePresentationStyle') > 0,
  'branch conversion-rate styling must use the shared production helper',
);

const countComponentIdentifierUses = (componentName: string, identifier: string): number => {
  const { sourceFile } = collectProductionHelperUsage(salesLeadReportsSource);
  let component: ts.Node | undefined;

  const findComponent = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.name.text === componentName
      && node.initializer !== undefined
    ) {
      component = node.initializer;
      return;
    }
    ts.forEachChild(node, findComponent);
  };

  findComponent(sourceFile);
  assert.ok(component, `component integration guard: ${componentName} must exist`);

  let useCount = 0;
  const countUses = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === identifier) useCount += 1;
    ts.forEachChild(node, countUses);
  };
  countUses(component);
  return useCount;
};

const hasIndexedWinnerFallback = (componentName: string, candidateName: string): boolean => {
  const { sourceFile } = collectProductionHelperUsage(salesLeadReportsSource);
  let component: ts.Node | undefined;

  const findComponent = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.name.text === componentName
      && node.initializer !== undefined
    ) {
      component = node.initializer;
      return;
    }
    ts.forEachChild(node, findComponent);
  };

  findComponent(sourceFile);
  assert.ok(component, `component integration guard: ${componentName} must exist`);

  let found = false;
  const findIndexedFallback = (node: ts.Node): void => {
    if (
      ts.isElementAccessExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === candidateName
      && node.argumentExpression !== undefined
      && ts.isNumericLiteral(node.argumentExpression)
      && node.argumentExpression.text === '0'
    ) {
      found = true;
    }
    ts.forEachChild(node, findIndexedFallback);
  };
  findIndexedFallback(component);
  return found;
};

assert.ok(
  countComponentIdentifierUses('RepPerformanceReport', 'topPerformer') > 1,
  'rep awards must render the production topPerformer field',
);
assert.ok(
  countComponentIdentifierUses('RepPerformanceReport', 'topConverter') > 1,
  'rep awards must render the production topConverter field',
);
assert.ok(
  countComponentIdentifierUses('BranchPerformanceReport', 'topByRevenue') > 1,
  'branch awards must render the production topByRevenue field',
);
assert.ok(
  countComponentIdentifierUses('BranchPerformanceReport', 'topByLeads') > 1,
  'branch awards must render the production topByLeads field',
);
assert.ok(
  countComponentIdentifierUses('BranchPerformanceReport', 'topByConversion') > 1,
  'branch awards must render the production topByConversion field',
);
assert.equal(
  hasIndexedWinnerFallback('RepPerformanceReport', 'sortedReps'),
  false,
  'rep awards must not fall back to sortedReps[0]',
);
assert.equal(
  hasIndexedWinnerFallback('BranchPerformanceReport', 'rows'),
  false,
  'branch awards must not fall back to rows[0]',
);

for (const helper of requiredProductionHelpers) {
  assert.throws(
    () => assertSalesLeadReportsUsesProductionHelpers(renameProductionCallsInMemory(salesLeadReportsSource, helper)),
    new RegExp(`missing production call: ${helper}`),
  );
}

const importRemovedSource = removeNamedImportInMemory(salesLeadReportsSource, requiredProductionHelpers[0]);
assert.throws(
  () => assertSalesLeadReportsUsesProductionHelpers(importRemovedSource),
  new RegExp(`missing named import: ${requiredProductionHelpers[0]}`),
);

console.log('ARS-SALES-001 numeric regression verification passed.');
