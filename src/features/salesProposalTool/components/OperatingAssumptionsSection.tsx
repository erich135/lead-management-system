import { useState } from 'react';
import {
  ANNUAL_OPERATING_HOURS_HELPER,
  AUDIT_ANNUAL_HOURS_HELPER,
  AUDIT_ELECTRICITY_BASIS_INFO,
  AVERAGE_LOAD_HELPER,
  buildOperatingAssumptions,
} from '../operatingAssumptions';
import type { OperatingAssumptions } from '../types';
import { MissingHint } from './EditorSection';

interface OperatingAssumptionsSectionProps {
  value: OperatingAssumptions;
  airAuditPresent: boolean;
  onChange: (next: OperatingAssumptions) => void;
}

export function OperatingAssumptionsSection({
  value,
  airAuditPresent,
  onChange,
}: OperatingAssumptionsSectionProps) {
  const [hoursText, setHoursText] = useState(
    value.annualOperatingHours === null ? '' : String(value.annualOperatingHours),
  );
  const [loadText, setLoadText] = useState(
    value.averageLoadPercent === null ? '' : String(value.averageLoadPercent),
  );
  const hoursAreEstimated = value.hoursAreEstimated !== false;

  function emit(nextHours: string, nextLoad: string, estimated: boolean | null = value.hoursAreEstimated) {
    onChange(
      buildOperatingAssumptions({
        hoursText: nextHours,
        loadText: nextLoad,
        hasAirAudit: value.hasAirAudit,
        hoursAreEstimated: estimated,
      }),
    );
  }

  return (
    <div className="space-y-3">
      {airAuditPresent && (
        <p className="text-sm text-slate-600">{AUDIT_ELECTRICITY_BASIS_INFO}</p>
      )}
      <div>
        <p className="text-xs font-medium text-slate-500">Annual operating hours</p>
        <div className="mt-1 flex gap-3">
          <label className="flex items-center gap-1 text-xs text-[#383838]">
            <input
              type="radio"
              name="hours-basis"
              checked={value.hoursAreEstimated === false}
              onChange={() => emit(hoursText, loadText, false)}
            />
            Known hours
          </label>
          <label className="flex items-center gap-1 text-xs text-[#383838]">
            <input
              type="radio"
              name="hours-basis"
              checked={hoursAreEstimated}
              onChange={() => emit(hoursText, loadText, true)}
            />
            Estimated hours
          </label>
        </div>
        <input
          type="text"
          inputMode="decimal"
          value={hoursText}
          onChange={(event) => {
            const next = event.target.value;
            setHoursText(next);
            emit(next, loadText, hoursAreEstimated ? true : value.hoursAreEstimated);
          }}
          placeholder="e.g. 4000"
          className="mt-1 w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
        />
        <span className="mt-1 block text-xs text-slate-500">
          {airAuditPresent ? AUDIT_ANNUAL_HOURS_HELPER : ANNUAL_OPERATING_HOURS_HELPER}
        </span>
        {hoursAreEstimated && hoursText.trim() !== '' && (
          <p className="mt-1 text-xs font-medium text-slate-600">
            These hours are labelled as an estimate on the comparison.
          </p>
        )}
        {hoursText.trim() === '' && (
          <MissingHint>Enter known or estimated annual hours. The same hours apply to both options.</MissingHint>
        )}
      </div>
      {!airAuditPresent && (
        <label className="block">
          <span className="text-xs font-medium text-slate-500">Average load (%)</span>
          <input
            type="text"
            inputMode="decimal"
            value={loadText}
            onChange={(event) => {
              const next = event.target.value;
              setLoadText(next);
              emit(hoursText, next);
            }}
            placeholder="e.g. 70"
            className="mt-1 w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
          />
          <span className="mt-1 block text-xs text-slate-500">{AVERAGE_LOAD_HELPER}</span>
        </label>
      )}
    </div>
  );
}
