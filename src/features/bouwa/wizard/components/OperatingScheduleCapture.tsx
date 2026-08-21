/**
 * The normal sales operating-schedule questions: hours per operating day and
 * a days-per-week pattern. Weekly and annual hours are derived on the
 * established 30-day month × 12 basis. Monthly kWh × 12 becomes estimated
 * annual usage unless an explicit annual figure is supplied.
 */

import { useEffect, useMemo, useState } from 'react';
import { Clock3 } from 'lucide-react';

import type { AuditIntakeDocument, IntakeAnswer } from '../../auditIntakeTypes';
import { readAnswerAtPath } from '../../auditIntakeState';
import {
  OPERATING_DAY_PATTERN_OPTIONS,
  answeredNumber,
  daysPerWeekProblem,
  derivedAnnualHours,
  derivedWeeklyHours,
  estimatedAnnualUsageKwh,
  EXPLICIT_ANNUAL_HOURS_NOTE,
  EXPLICIT_ANNUAL_USAGE_NOTE,
  formatHours,
  hoursPerDayProblem,
  patternFromDaysPerWeek,
  scheduleHoursNote,
  unansweredNumber,
  type OperatingDaysPattern,
} from '../operatingSchedule';

function numericValue(answer: IntakeAnswer<unknown> | null): number | null {
  if (answer === null || answer.state !== 'answered') return null;
  return typeof answer.value === 'number' && Number.isFinite(answer.value)
    ? answer.value
    : null;
}

export function OperatingScheduleCapture({
  intake,
  disabled,
  onAnswerMany,
}: {
  intake: AuditIntakeDocument;
  disabled: boolean;
  onAnswerMany: (entries: readonly [string, IntakeAnswer<unknown>][]) => void;
}) {
  const storedHours = numericValue(
    readAnswerAtPath(intake, 'operatingConditions.hoursPerOperatingDay'),
  );
  const storedDays = numericValue(
    readAnswerAtPath(intake, 'operatingConditions.operatingDaysPerWeek'),
  );
  const storedAnnualHours = readAnswerAtPath(
    intake,
    'operatingConditions.annualOperatingHours',
  );
  const storedMonthly = numericValue(
    readAnswerAtPath(intake, 'operatingConditions.monthlyElectricityUsageKwh'),
  );
  const storedAnnualUsage = readAnswerAtPath(
    intake,
    'operatingConditions.estimatedAnnualElectricityUsageKwh',
  );

  const [hoursText, setHoursText] = useState(
    storedHours === null ? '' : String(storedHours),
  );
  const [customDaysText, setCustomDaysText] = useState(
    storedDays === null || storedDays === 5 || storedDays === 6 || storedDays === 7
      ? ''
      : String(storedDays),
  );
  const [pattern, setPattern] = useState<OperatingDaysPattern>(
    patternFromDaysPerWeek(storedDays),
  );
  const [hoursProblem, setHoursProblem] = useState('');
  const [daysProblem, setDaysProblem] = useState('');
  const [monthlyText, setMonthlyText] = useState(
    storedMonthly === null ? '' : String(storedMonthly),
  );
  const [changingHours, setChangingHours] = useState(false);
  const [annualHoursText, setAnnualHoursText] = useState('');
  const [changingUsage, setChangingUsage] = useState(false);
  const [annualUsageText, setAnnualUsageText] = useState('');

  useEffect(() => {
    setHoursText(storedHours === null ? '' : String(storedHours));
  }, [storedHours]);
  useEffect(() => {
    setPattern(patternFromDaysPerWeek(storedDays));
    setCustomDaysText(
      storedDays === null || storedDays === 5 || storedDays === 6 || storedDays === 7
        ? ''
        : String(storedDays),
    );
  }, [storedDays]);
  useEffect(() => {
    setMonthlyText(storedMonthly === null ? '' : String(storedMonthly));
  }, [storedMonthly]);

  const derived = useMemo(() => {
    if (storedHours === null || storedDays === null) return null;
    if (hoursPerDayProblem(storedHours) !== null) return null;
    if (daysPerWeekProblem(storedDays) !== null) return null;
    return {
      weekly: derivedWeeklyHours(storedHours, storedDays),
      annual: derivedAnnualHours(storedHours, storedDays),
      note: scheduleHoursNote(storedHours, storedDays),
    };
  }, [storedHours, storedDays]);

  const annualHoursOverridden =
    storedAnnualHours?.state === 'answered' &&
    storedAnnualHours.note === EXPLICIT_ANNUAL_HOURS_NOTE;
  const annualUsageOverridden =
    storedAnnualUsage?.state === 'answered' &&
    storedAnnualUsage.note === EXPLICIT_ANNUAL_USAGE_NOTE;
  const derivedUsage =
    storedMonthly !== null && storedMonthly > 0
      ? estimatedAnnualUsageKwh(storedMonthly)
      : null;

  function commitHours(raw: string) {
    const trimmed = raw.trim();
    if (trimmed === '') {
      setHoursProblem('');
      onAnswerMany([['operatingConditions.hoursPerOperatingDay', unansweredNumber]]);
      return;
    }
    const value = Number(trimmed);
    const problem = hoursPerDayProblem(value);
    if (problem !== null) {
      setHoursProblem(problem);
      return;
    }
    setHoursProblem('');
    onAnswerMany([
      ['operatingConditions.hoursPerOperatingDay', answeredNumber(value)],
    ]);
  }

  function commitDays(nextPattern: OperatingDaysPattern, customRaw?: string) {
    setPattern(nextPattern);
    if (nextPattern !== 'custom') {
      const days = OPERATING_DAY_PATTERN_OPTIONS.find(
        option => option.pattern === nextPattern,
      )?.daysPerWeek;
      if (days === undefined || days === null) return;
      setDaysProblem('');
      onAnswerMany([
        ['operatingConditions.operatingDaysPerWeek', answeredNumber(days)],
      ]);
      return;
    }
    const raw = (customRaw ?? customDaysText).trim();
    if (raw === '') {
      setDaysProblem('');
      onAnswerMany([
        ['operatingConditions.operatingDaysPerWeek', unansweredNumber],
      ]);
      return;
    }
    const value = Number(raw);
    const problem = daysPerWeekProblem(value);
    if (problem !== null) {
      setDaysProblem(problem);
      return;
    }
    setDaysProblem('');
    onAnswerMany([
      ['operatingConditions.operatingDaysPerWeek', answeredNumber(value)],
    ]);
  }

  function commitMonthly(raw: string) {
    const trimmed = raw.trim();
    if (trimmed === '') {
      onAnswerMany([
        ['operatingConditions.monthlyElectricityUsageKwh', unansweredNumber],
      ]);
      return;
    }
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value <= 0) return;
    onAnswerMany([
      ['operatingConditions.monthlyElectricityUsageKwh', answeredNumber(value)],
    ]);
  }

  return (
    <section className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <Clock3 className="h-4 w-4 text-ars-primary" />
          Operating schedule
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Hours per operating day and the days the plant runs. Weekly and annual
          hours are calculated on a 30-day month × 12 basis. This is not equivalent
          full-load hours.
        </p>

        <label className="mt-3 block text-[11px] text-slate-500">
          Hours per operating day
          <input
            type="number"
            min="0"
            max="24"
            step="any"
            disabled={disabled}
            value={hoursText}
            onChange={event => setHoursText(event.target.value)}
            onBlur={() => commitHours(hoursText)}
            className="mt-0.5 block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm disabled:bg-slate-100"
          />
        </label>
        {hoursProblem === '' ? null : (
          <p className="mt-1 text-xs text-rose-600">{hoursProblem}</p>
        )}

        <p className="mt-3 text-[11px] text-slate-500">Operating days</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {OPERATING_DAY_PATTERN_OPTIONS.map(option => (
            <button
              key={option.pattern}
              type="button"
              disabled={disabled}
              onClick={() => commitDays(option.pattern)}
              className={`rounded-md border px-2.5 py-1.5 text-[11px] font-medium disabled:opacity-50 ${
                pattern === option.pattern
                  ? 'border-ars-primary bg-blue-50 text-ars-primary'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {option.label}
              <span className="ml-1 font-normal text-slate-500">
                {option.detail}
              </span>
            </button>
          ))}
        </div>
        {pattern === 'custom' ? (
          <label className="mt-2 block text-[11px] text-slate-500">
            Operating days per week
            <input
              type="number"
              min="1"
              max="7"
              step="1"
              disabled={disabled}
              value={customDaysText}
              onChange={event => setCustomDaysText(event.target.value)}
              onBlur={() => commitDays('custom', customDaysText)}
              className="mt-0.5 block w-40 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm disabled:bg-slate-100"
            />
          </label>
        ) : null}
        {daysProblem === '' ? null : (
          <p className="mt-1 text-xs text-rose-600">{daysProblem}</p>
        )}

        {derived === null ? (
          <p className="mt-3 text-[11px] text-slate-500">
            Annual operating hours appear here once hours/day and days/week are
            both known.
          </p>
        ) : (
          <div className="mt-3 rounded-md bg-slate-50 px-2.5 py-2 text-xs text-slate-700">
            <p>
              Calculated:{' '}
              <span className="font-medium">
                {formatHours(derived.weekly)} h/week
              </span>
              {' · '}
              <span className="font-medium">
                {formatHours(
                  annualHoursOverridden
                    ? Number(storedAnnualHours?.value)
                    : derived.annual,
                )}{' '}
                h/year
              </span>
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {annualHoursOverridden
                ? EXPLICIT_ANNUAL_HOURS_NOTE
                : derived.note}
            </p>
            {disabled ? null : changingHours ? (
              <div className="mt-2 space-y-1.5">
                <input
                  type="number"
                  min="0"
                  value={annualHoursText}
                  onChange={event => setAnnualHoursText(event.target.value)}
                  placeholder="Annual operating hours"
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                />
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const value = Number(annualHoursText);
                      if (!Number.isFinite(value) || value <= 0) return;
                      onAnswerMany([
                        [
                          'operatingConditions.annualOperatingHours',
                          answeredNumber(value, EXPLICIT_ANNUAL_HOURS_NOTE),
                        ],
                      ]);
                      setChangingHours(false);
                    }}
                    className="rounded-md bg-ars-primary px-2.5 py-1 text-[11px] font-medium text-white"
                  >
                    Record this change
                  </button>
                  <button
                    type="button"
                    onClick={() => setChangingHours(false)}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAnnualHoursText(
                    storedAnnualHours?.state === 'answered'
                      ? String(storedAnnualHours.value)
                      : String(derived.annual),
                  );
                  setChangingHours(true);
                }}
                className="mt-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
              >
                Change
              </button>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
        <p className="text-sm font-medium text-slate-800">Electricity usage</p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Optional. Monthly usage × 12 is estimated annual usage. An explicit
          annual figure is kept if the customer supplied a better one.
        </p>
        <label className="mt-3 block text-[11px] text-slate-500">
          Monthly electricity usage (kWh)
          <input
            type="number"
            min="0"
            step="any"
            disabled={disabled}
            value={monthlyText}
            onChange={event => setMonthlyText(event.target.value)}
            onBlur={() => commitMonthly(monthlyText)}
            className="mt-0.5 block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm disabled:bg-slate-100"
          />
        </label>
        {derivedUsage === null && !annualUsageOverridden ? (
          <p className="mt-2 text-[11px] text-slate-500">
            Estimated annual usage is not invented when monthly usage is not
            supplied.
          </p>
        ) : (
          <div className="mt-3 rounded-md bg-slate-50 px-2.5 py-2 text-xs text-slate-700">
            <p>
              Estimated annual usage:{' '}
              <span className="font-medium">
                {formatHours(
                  Number(
                    annualUsageOverridden
                      ? storedAnnualUsage?.value
                      : derivedUsage,
                  ),
                )}{' '}
                kWh/year
              </span>
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {annualUsageOverridden
                ? EXPLICIT_ANNUAL_USAGE_NOTE
                : `Basis: ${formatHours(storedMonthly ?? 0)} × 12`}
            </p>
            {disabled ? null : changingUsage ? (
              <div className="mt-2 space-y-1.5">
                <input
                  type="number"
                  min="0"
                  value={annualUsageText}
                  onChange={event => setAnnualUsageText(event.target.value)}
                  placeholder="Annual kWh"
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                />
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const value = Number(annualUsageText);
                      if (!Number.isFinite(value) || value <= 0) return;
                      onAnswerMany([
                        [
                          'operatingConditions.estimatedAnnualElectricityUsageKwh',
                          answeredNumber(value, EXPLICIT_ANNUAL_USAGE_NOTE),
                        ],
                      ]);
                      setChangingUsage(false);
                    }}
                    className="rounded-md bg-ars-primary px-2.5 py-1 text-[11px] font-medium text-white"
                  >
                    Record this change
                  </button>
                  <button
                    type="button"
                    onClick={() => setChangingUsage(false)}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAnnualUsageText(
                    storedAnnualUsage?.state === 'answered'
                      ? String(storedAnnualUsage.value)
                      : String(derivedUsage ?? ''),
                  );
                  setChangingUsage(true);
                }}
                className="mt-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
              >
                Change
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
