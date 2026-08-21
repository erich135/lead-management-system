/**
 * Sales operating-schedule presentation and the 30-day month × 12 annualisation
 * convention the backend already uses. Weekly hours are hours/day × days/week.
 * Annual hours are never 52-week arithmetic.
 */

import type { IntakeAnswer } from '../auditIntakeTypes';

export const PRELIMINARY_DAYS_PER_MONTH = 30;
export const PRELIMINARY_MONTHS_PER_YEAR = 12;

export const EXPLICIT_ANNUAL_HOURS_NOTE =
  'Explicit annual operating hours supplied for this proposal.';
export const EXPLICIT_ANNUAL_USAGE_NOTE =
  'Explicit annual electricity usage supplied for this proposal.';

export const OPERATING_SCHEDULE_CAPTURE_CODES = [
  'AUDIT.OPERATING.HOURS_PER_DAY',
  'AUDIT.OPERATING.DAYS_PER_WEEK',
  'AUDIT.OPERATING.ANNUAL_HOURS',
  'AUDIT.OPERATING.MONTHLY_ELECTRICITY_USAGE',
  'AUDIT.OPERATING.ESTIMATED_ANNUAL_ELECTRICITY_USAGE',
] as const;

export type OperatingDaysPattern = 'five_day' | 'six_day' | 'seven_day' | 'custom';

export const OPERATING_DAY_PATTERN_OPTIONS: readonly {
  pattern: OperatingDaysPattern;
  daysPerWeek: number | null;
  label: string;
  detail: string;
}[] = [
  { pattern: 'five_day', daysPerWeek: 5, label: 'Mon–Fri', detail: '5 days/week' },
  { pattern: 'six_day', daysPerWeek: 6, label: 'Mon–Sat', detail: '6 days/week' },
  { pattern: 'seven_day', daysPerWeek: 7, label: 'Every day', detail: '7 days/week' },
  { pattern: 'custom', daysPerWeek: null, label: 'Custom', detail: 'Set days/week' },
];

export function hoursPerDayProblem(value: number): string | null {
  if (!Number.isFinite(value)) return 'Hours per operating day must be a number.';
  if (value <= 0) return 'Hours per operating day must be greater than 0.';
  if (value > 24) return 'Hours per operating day must be at most 24.';
  return null;
}

export function daysPerWeekProblem(value: number): string | null {
  if (!Number.isFinite(value)) return 'Operating days per week must be a number.';
  if (!Number.isInteger(value))
    return 'Operating days per week must be a whole number.';
  if (value <= 0) return 'Operating days per week must be greater than 0.';
  if (value > 7) return 'Operating days per week must be at most 7.';
  return null;
}

export function patternFromDaysPerWeek(
  daysPerWeek: number | null,
): OperatingDaysPattern {
  if (daysPerWeek === 5) return 'five_day';
  if (daysPerWeek === 6) return 'six_day';
  if (daysPerWeek === 7) return 'seven_day';
  return 'custom';
}

export function operatingDaysPerMonth(daysPerWeek: number): number {
  return (PRELIMINARY_DAYS_PER_MONTH * daysPerWeek) / 7;
}

export function derivedWeeklyHours(
  hoursPerDay: number,
  daysPerWeek: number,
): number {
  return hoursPerDay * daysPerWeek;
}

export function derivedAnnualHours(
  hoursPerDay: number,
  daysPerWeek: number,
): number {
  return hoursPerDay * operatingDaysPerMonth(daysPerWeek) * PRELIMINARY_MONTHS_PER_YEAR;
}

export function scheduleHoursNote(
  hoursPerDay: number,
  daysPerWeek: number,
): string {
  return `Calculated from ${hoursPerDay} h/day × ${daysPerWeek} days/week, annualised on a 30-day month × 12 basis, matching the airflow monthly-volume convention.`;
}

export function estimatedAnnualUsageKwh(monthlyKwh: number): number {
  return monthlyKwh * PRELIMINARY_MONTHS_PER_YEAR;
}

export function formatHours(value: number): string {
  if (Number.isInteger(value)) return value.toLocaleString('en-ZA');
  return value.toLocaleString('en-ZA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function answeredNumber(
  value: number,
  note: string | null = null,
): IntakeAnswer<number> {
  return { state: 'answered', value, note };
}

export const unansweredNumber: IntakeAnswer<number> = {
  state: 'unanswered',
  value: null,
  note: null,
};
