import { useState } from 'react';
import {
  ANNUAL_OPERATING_HOURS_HELPER,
  AUDIT_ELECTRICITY_BASIS_INFO,
  AVERAGE_LOAD_HELPER,
  buildOperatingAssumptions,
} from '../operatingAssumptions';
import type { OperatingAssumptions } from '../types';

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

  if (airAuditPresent) {
    return (
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
          Operating assumptions
        </h2>
        <p className="text-sm text-slate-600">{AUDIT_ELECTRICITY_BASIS_INFO}</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
        Operating assumptions
      </h2>
      <label className="block">
        <span className="text-xs font-medium text-slate-500">Annual operating hours</span>
        <input
          type="text"
          inputMode="decimal"
          value={hoursText}
          onChange={(event) => {
            const next = event.target.value;
            setHoursText(next);
            onChange(buildOperatingAssumptions({ hoursText: next, loadText }));
          }}
          placeholder="e.g. 4000"
          className="mt-1 w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
        />
        <span className="mt-1 block text-xs text-slate-500">{ANNUAL_OPERATING_HOURS_HELPER}</span>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-slate-500">Average load (%)</span>
        <input
          type="text"
          inputMode="decimal"
          value={loadText}
          onChange={(event) => {
            const next = event.target.value;
            setLoadText(next);
            onChange(buildOperatingAssumptions({ hoursText, loadText: next }));
          }}
          placeholder="e.g. 70"
          className="mt-1 w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
        />
        <span className="mt-1 block text-xs text-slate-500">{AVERAGE_LOAD_HELPER}</span>
      </label>
    </section>
  );
}
