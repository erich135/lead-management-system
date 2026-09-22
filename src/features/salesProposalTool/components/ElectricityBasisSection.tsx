import { useState } from 'react';
import {
  buildElectricityBasis,
  parseDays,
  parseNonNegativeNumber,
} from '../electricityBasis';
import { formatEstimatedRand } from '../formatMeasured';
import type { ElectricityBasis } from '../types';
import { MissingHint } from './EditorSection';

interface ElectricityBasisSectionProps {
  value: ElectricityBasis;
  onChange: (next: ElectricityBasis) => void;
}

const RATE_FIELDS: { key: keyof ElectricityBasis['touRates']; label: string }[] = [
  { key: 'ldsStandard', label: 'Standard' },
  { key: 'ldsPeak', label: 'Peak' },
  { key: 'ldsOffPeak', label: 'Off-peak' },
  { key: 'hdsStandard', label: 'Standard' },
  { key: 'hdsPeak', label: 'Peak' },
  { key: 'hdsOffPeak', label: 'Off-peak' },
];

const DAY_FIELDS: { key: keyof ElectricityBasis['productionDays']; label: string }[] = [
  { key: 'ldsWorkdays', label: 'Workdays' },
  { key: 'ldsSaturdays', label: 'Saturdays' },
  { key: 'ldsSundays', label: 'Sundays' },
  { key: 'hdsWorkdays', label: 'Workdays' },
  { key: 'hdsSaturdays', label: 'Saturdays' },
  { key: 'hdsSundays', label: 'Sundays' },
];

function textFromNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

export function ElectricityBasisSection({
  value,
  onChange,
}: ElectricityBasisSectionProps) {
  const [rateTexts, setRateTexts] = useState(() => ({
    ldsStandard: textFromNumber(value.touRates.ldsStandard ?? value.flatRateRandPerKwh),
    ldsPeak: textFromNumber(value.touRates.ldsPeak ?? value.flatRateRandPerKwh),
    ldsOffPeak: textFromNumber(value.touRates.ldsOffPeak ?? value.flatRateRandPerKwh),
    hdsStandard: textFromNumber(value.touRates.hdsStandard ?? value.flatRateRandPerKwh),
    hdsPeak: textFromNumber(value.touRates.hdsPeak ?? value.flatRateRandPerKwh),
    hdsOffPeak: textFromNumber(value.touRates.hdsOffPeak ?? value.flatRateRandPerKwh),
  }));
  const [dayTexts, setDayTexts] = useState(() => ({
    ldsWorkdays: textFromNumber(value.productionDays.ldsWorkdays),
    ldsSaturdays: textFromNumber(value.productionDays.ldsSaturdays),
    ldsSundays: textFromNumber(value.productionDays.ldsSundays),
    hdsWorkdays: textFromNumber(value.productionDays.hdsWorkdays),
    hdsSaturdays: textFromNumber(value.productionDays.hdsSaturdays),
    hdsSundays: textFromNumber(value.productionDays.hdsSundays),
  }));
  const [sameRateText, setSameRateText] = useState(
    value.flatRateRandPerKwh === null ? '' : String(value.flatRateRandPerKwh),
  );
  const [amountText, setAmountText] = useState(
    value.suppliedCurrentAmount === null ? '' : String(value.suppliedCurrentAmount),
  );
  const [period, setPeriod] = useState<'monthly' | 'annual'>(
    value.suppliedCurrentPeriod ?? 'monthly',
  );

  function emit(next: {
    rates?: typeof rateTexts;
    days?: typeof dayTexts;
    amount?: string;
    nextPeriod?: 'monthly' | 'annual';
  }) {
    const rates = next.rates ?? rateTexts;
    const days = next.days ?? dayTexts;
    const amount = next.amount ?? amountText;
    const nextPeriod = next.nextPeriod ?? period;
    onChange(
      buildElectricityBasis({
        amountText: amount,
        period: nextPeriod,
        tariffRecordId: value.tariffRecordId,
        touRates: {
          ldsStandard: parseNonNegativeNumber(rates.ldsStandard),
          ldsPeak: parseNonNegativeNumber(rates.ldsPeak),
          ldsOffPeak: parseNonNegativeNumber(rates.ldsOffPeak),
          hdsStandard: parseNonNegativeNumber(rates.hdsStandard),
          hdsPeak: parseNonNegativeNumber(rates.hdsPeak),
          hdsOffPeak: parseNonNegativeNumber(rates.hdsOffPeak),
        },
        productionDays: {
          ldsWorkdays: parseDays(days.ldsWorkdays),
          ldsSaturdays: parseDays(days.ldsSaturdays),
          ldsSundays: parseDays(days.ldsSundays),
          hdsWorkdays: parseDays(days.hdsWorkdays),
          hdsSaturdays: parseDays(days.hdsSaturdays),
          hdsSundays: parseDays(days.hdsSundays),
        },
      }),
    );
  }

  function fillAllRates(text: string) {
    const filled = {
      ldsStandard: text,
      ldsPeak: text,
      ldsOffPeak: text,
      hdsStandard: text,
      hdsPeak: text,
      hdsOffPeak: text,
    };
    setSameRateText(text);
    setRateTexts(filled);
    emit({ rates: filled });
  }

  const missingRates = RATE_FIELDS.some((field) => rateTexts[field.key].trim() === '');
  const ratesDiffer = new Set(
    RATE_FIELDS.map((field) => rateTexts[field.key].trim()).filter((text) => text !== ''),
  ).size > 1;
  const missingDays = ratesDiffer && DAY_FIELDS.some((field) => dayTexts[field.key].trim() === '');

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-slate-500">Use the same R/kWh in every period</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm text-[#383838]">R</span>
          <input
            type="text"
            inputMode="decimal"
            value={sameRateText}
            onChange={(event) => fillAllRates(event.target.value)}
            placeholder="Optional"
            className="w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
          />
          <span className="whitespace-nowrap text-sm text-slate-600">/ kWh</span>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Low-demand season
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {RATE_FIELDS.slice(0, 3).map((field) => (
            <RateField
              key={field.key}
              label={field.label}
              value={rateTexts[field.key]}
              onChange={(next) => {
                const rates = { ...rateTexts, [field.key]: next };
                setRateTexts(rates);
                emit({ rates });
              }}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          High-demand season
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {RATE_FIELDS.slice(3).map((field) => (
            <RateField
              key={field.key}
              label={field.label}
              value={rateTexts[field.key]}
              onChange={(next) => {
                const rates = { ...rateTexts, [field.key]: next };
                setRateTexts(rates);
                emit({ rates });
              }}
            />
          ))}
        </div>
      </div>
      {missingRates && (
        <MissingHint>Enter all six R/kWh rates, or the same rate in every period.</MissingHint>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Production days
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Used to weight different R/kWh rates. These days do not multiply annual operating hours.
          Operating time in each day uses the standard weekday, Saturday and Sunday splits.
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-slate-500">Low-demand season</p>
            {DAY_FIELDS.slice(0, 3).map((field) => (
              <DayField
                key={field.key}
                label={field.label}
                value={dayTexts[field.key]}
                onChange={(next) => {
                  const days = { ...dayTexts, [field.key]: next };
                  setDayTexts(days);
                  emit({ days });
                }}
              />
            ))}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">High-demand season</p>
            {DAY_FIELDS.slice(3).map((field) => (
              <DayField
                key={field.key}
                label={field.label}
                value={dayTexts[field.key]}
                onChange={(next) => {
                  const days = { ...dayTexts, [field.key]: next };
                  setDayTexts(days);
                  emit({ days });
                }}
              />
            ))}
          </div>
        </div>
        {missingDays && (
          <MissingHint>
            Enter production days for each season so different R/kWh rates can be averaged.
          </MissingHint>
        )}
      </div>

      <div className="rounded-[8px] border border-slate-100 bg-slate-50 p-3">
        <p className="text-xs font-medium text-slate-500">
          Known compressor electricity amount
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Use this only for compressor electricity, not the whole-site bill.
        </p>
        <div className="mt-2 flex gap-2">
          <label className="flex items-center gap-1 text-xs text-[#383838]">
            <input
              type="radio"
              name="compressor-electricity-period"
              checked={period === 'monthly'}
              onChange={() => {
                setPeriod('monthly');
                emit({ nextPeriod: 'monthly' });
              }}
            />
            Monthly
          </label>
          <label className="flex items-center gap-1 text-xs text-[#383838]">
            <input
              type="radio"
              name="compressor-electricity-period"
              checked={period === 'annual'}
              onChange={() => {
                setPeriod('annual');
                emit({ nextPeriod: 'annual' });
              }}
            />
            Annual
          </label>
        </div>
        <label className="mt-2 block">
          <span className="text-xs font-medium text-slate-500">Amount</span>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-[#383838]">R</span>
            <input
              type="text"
              inputMode="decimal"
              value={amountText}
              onChange={(event) => {
                const next = event.target.value;
                setAmountText(next);
                emit({ amount: next });
              }}
              placeholder="Optional"
              className="w-full rounded-[8px] border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
            />
          </div>
        </label>
        {value.flatRateRandPerKwh !== null && value.suppliedCurrentAmount !== null && (
          <p className="mt-2 text-xs text-slate-500">
            Known compressor electricity amount supplied:{' '}
            {formatEstimatedRand(value.suppliedCurrentAmount) ?? 'Not available'}{' '}
            {value.suppliedCurrentPeriod === 'annual' ? 'per year' : 'per month'}.
            This supplied amount is shown for reference and is not substituted into the
            like-for-like estimate based on the stated operating assumptions.
          </p>
        )}
      </div>
    </div>
  );
}

function RateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <div className="mt-1 flex items-center gap-1">
        <span className="text-xs text-[#383838]">R</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="0.00"
          className="w-full rounded-[8px] border border-slate-300 px-2 py-1.5 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
        />
        <span className="whitespace-nowrap text-xs text-slate-600">/ kWh</span>
      </div>
    </label>
  );
}

function DayField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="mt-2 block">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Days"
        className="mt-1 w-full rounded-[8px] border border-slate-300 px-2 py-1.5 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
      />
    </label>
  );
}
