import { useState } from 'react';
import { buildElectricityBasis } from '../electricityBasis';
import { formatEstimatedRand } from '../formatMeasured';
import type { ElectricityBasis } from '../types';

interface ElectricityBasisSectionProps {
  value: ElectricityBasis;
  onChange: (next: ElectricityBasis) => void;
}

export function ElectricityBasisSection({
  value,
  onChange,
}: ElectricityBasisSectionProps) {
  const [rateText, setRateText] = useState(
    value.flatRateRandPerKwh === null ? '' : String(value.flatRateRandPerKwh),
  );
  const [amountText, setAmountText] = useState(
    value.suppliedCurrentAmount === null ? '' : String(value.suppliedCurrentAmount),
  );
  const [period, setPeriod] = useState<'monthly' | 'annual'>(
    value.suppliedCurrentPeriod ?? 'monthly',
  );

  function emit(
    nextRate: string,
    nextAmount: string,
    nextPeriod: 'monthly' | 'annual',
  ) {
    onChange(
      buildElectricityBasis({
        rateText: nextRate,
        amountText: nextAmount,
        period: nextPeriod,
        tariffRecordId: value.tariffRecordId,
      }),
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
        Electricity
      </h2>
      <label className="block">
        <span className="text-xs font-medium text-slate-500">Electricity rate</span>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm text-[#383838]">R</span>
          <input
            type="text"
            inputMode="decimal"
            value={rateText}
            onChange={(event) => {
              const next = event.target.value;
              setRateText(next);
              emit(next, amountText, period);
            }}
            placeholder="0.00"
            className="w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
          />
          <span className="whitespace-nowrap text-sm text-slate-600">/ kWh</span>
        </div>
      </label>
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
                emit(rateText, amountText, 'monthly');
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
                emit(rateText, amountText, 'annual');
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
                emit(rateText, next, period);
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
    </section>
  );
}
