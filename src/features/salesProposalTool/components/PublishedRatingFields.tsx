import { useState } from 'react';
import {
  effectivePackageInput,
  effectiveRatedAirflow,
  effectiveRatedPressure,
  patchSourceBackedRating,
  PUBLISHED_PACKAGE_INPUT_LABEL,
  type SourceBackedRatingField,
} from '../specDisplay';
import { formatMeasuredNumber } from '../formatMeasured';
import type { PublicMachineSpec, SourceBackedSpec } from '../types';

interface PublishedRatingFieldsProps {
  library: PublicMachineSpec | null;
  source: SourceBackedSpec | null;
  identity: {
    manufacturer?: string | null;
    model?: string | null;
    modelVariant?: string | null;
  };
  onSourceChange: (next: SourceBackedSpec) => void;
}

function formatReadOnly(value: number | null, digits: number, unit: string): string {
  const formatted = formatMeasuredNumber(value, digits);
  return formatted ? `${formatted} ${unit}` : 'Not available';
}

export function PublishedRatingFields({
  library,
  source,
  identity,
  onSourceChange,
}: PublishedRatingFieldsProps) {
  const pressure = effectiveRatedPressure(library, source);
  const airflow = effectiveRatedAirflow(library, source);
  const packageInput = effectivePackageInput(library, source);

  function patch(field: SourceBackedRatingField, text: string) {
    onSourceChange(patchSourceBackedRating(source, identity, field, text));
  }

  return (
    <>
      {pressure.origin === 'library' ? (
        <ReadOnlyRating label="Rated pressure" value={formatReadOnly(pressure.value, 2, 'bar')} />
      ) : (
        <EditableRating
          label="Rated pressure"
          unit="bar"
          value={pressure.value}
          placeholder="e.g. 8.6"
          onChange={(text) => patch('ratedPressureBarG', text)}
        />
      )}
      {airflow.origin === 'library' ? (
        <ReadOnlyRating
          label="Rated airflow"
          value={formatReadOnly(airflow.value, 2, 'm³/min')}
        />
      ) : (
        <EditableRating
          label="Rated airflow"
          unit="m³/min"
          value={airflow.value}
          placeholder="e.g. 6.69"
          onChange={(text) => patch('ratedAirflowM3PerMin', text)}
        />
      )}
      {packageInput.origin === 'library' ? (
        <ReadOnlyRating
          label={PUBLISHED_PACKAGE_INPUT_LABEL}
          value={formatReadOnly(packageInput.value, 1, 'kW')}
        />
      ) : (
        <EditableRating
          label={PUBLISHED_PACKAGE_INPUT_LABEL}
          unit="kW"
          value={packageInput.value}
          placeholder="e.g. 43.4"
          onChange={(text) => patch('packageInputPowerKw', text)}
        />
      )}
    </>
  );
}

function ReadOnlyRating({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-[#383838]">{value}</dd>
    </div>
  );
}

function EditableRating({
  label,
  unit,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  unit: string;
  value: number | null;
  placeholder: string;
  onChange: (text: string) => void;
}) {
  const [text, setText] = useState(value === null ? '' : String(value));

  return (
    <div>
      <label className="block">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className="mt-1 flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={text}
            placeholder={placeholder}
            onChange={(event) => {
              const next = event.target.value;
              setText(next);
              onChange(next);
            }}
            className="w-full rounded-[8px] border border-slate-300 px-3 py-1.5 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
          />
          <span className="shrink-0 text-xs text-slate-500">{unit}</span>
        </span>
      </label>
    </div>
  );
}
