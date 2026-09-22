import { useState } from 'react';
import {
  effectiveMotorShaft,
  effectivePackageInput,
  effectiveRatedAirflow,
  effectiveRatedPressure,
  patchSourceBackedRating,
  type SourceBackedRatingField,
} from '../specDisplay';
import type { ElectricalPowerKind, PublicMachineSpec, SourceBackedSpec } from '../types';
import {
  ARS_AUXILIARY_POWER_ALLOWANCE_LABEL,
  ELECTRICAL_POWER_KIND_LABEL,
  ELECTRICAL_POWER_LABEL,
  ESTIMATED_PACKAGE_INPUT_LABEL,
  formatEstimatedPackageInputKw,
  inferElectricalPowerKind,
  resolvePackageInputKw,
} from '../electricalPowerInput';
import {
  AIRFLOW_REFERENCE_BASIS_HELP,
  AIRFLOW_REFERENCE_BASIS_LABEL,
  AIRFLOW_REFERENCE_NEEDS_CONFIRMATION,
  ADVANCED_SPECIFICATIONS_LABEL,
  DISCHARGE_PRESSURE_HINT,
  FLOW_REFERENCE_BASIS_OPTIONS,
  OPEN_ADVANCED_SPECIFICATIONS_ACTION,
  REFERENCE_INLET_PRESSURE_HELP,
  REFERENCE_INLET_PRESSURE_LABEL,
  REFERENCE_INLET_PRESSURE_UNIT,
  SPECIFICATION_REFERENCE_HELP,
  SPECIFICATION_REFERENCE_LABEL,
  hasKnownFlowReferenceBasis,
  isFlowReferenceBasis,
  parseBarAbsoluteText,
  paToBarAbsolute,
  publishedAirflowBasisSummary,
  publishedFlowReferenceFromSpec,
  looksLikeDischargePressureBarAbs,
  type PublishedFlowReference,
} from '../publishedFlowReference';

interface PublishedRatingFieldsProps {
  library: PublicMachineSpec | null;
  source: SourceBackedSpec | null;
  identity: {
    manufacturer?: string | null;
    model?: string | null;
    modelVariant?: string | null;
  };
  electricalPowerKind?: ElectricalPowerKind | null;
  onSourceChange: (next: SourceBackedSpec) => void;
  onElectricalPowerKindChange?: (kind: ElectricalPowerKind) => void;
  flowReference?: PublishedFlowReference | null;
  onFlowReferenceChange?: (next: PublishedFlowReference) => void;
  advancedOpen?: boolean;
  onAdvancedOpenChange?: (open: boolean) => void;
}

export function PublishedRatingFields({
  library,
  source,
  identity,
  electricalPowerKind = null,
  onSourceChange,
  onElectricalPowerKindChange,
  flowReference = null,
  onFlowReferenceChange,
  advancedOpen = false,
  onAdvancedOpenChange,
}: PublishedRatingFieldsProps) {
  const pressure = effectiveRatedPressure(library, source);
  const airflow = effectiveRatedAirflow(library, source);
  const packageInput = effectivePackageInput(library, source);
  const motor = effectiveMotorShaft(library, source);
  const kind =
    inferElectricalPowerKind({
      storedKind: electricalPowerKind,
      packageInputPowerKw: packageInput.value,
      motorShaftPowerKw: motor.value,
    }) ?? 'package_input';
  const enteredPower = kind === 'motor_power' ? motor.value : packageInput.value;
  const resolved = resolvePackageInputKw({
    storedKind: kind,
    packageInputPowerKw: packageInput.value,
    motorShaftPowerKw: motor.value,
  });

  function patch(field: SourceBackedRatingField, text: string) {
    onSourceChange(patchSourceBackedRating(source, identity, field, text));
  }

  function onPowerChange(text: string) {
    if (electricalPowerKind == null) onElectricalPowerKindChange?.(kind);
    patch(kind === 'motor_power' ? 'motorShaftPowerKw' : 'packageInputPowerKw', text);
  }

  return (
    <>
      <EditableRating
        label="Rated pressure"
        unit="bar"
        value={pressure.value}
        placeholder="e.g. 8.6"
        onChange={(text) => patch('ratedPressureBarG', text)}
      />
      <EditableRating
        label="Rated airflow"
        unit="m³/min"
        value={airflow.value}
        placeholder="e.g. 6.69"
        onChange={(text) => patch('ratedAirflowM3PerMin', text)}
      />
      <div>
        <span className="text-xs font-medium text-slate-500">{ELECTRICAL_POWER_LABEL}</span>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <EditableRating
            key={kind}
            label=""
            unit="kW"
            value={enteredPower}
            placeholder="e.g. 55"
            onChange={onPowerChange}
          />
          <label className="shrink-0">
            <span className="sr-only">Power type</span>
            <select
              value={kind}
              onChange={(event) =>
                onElectricalPowerKindChange?.(event.target.value as ElectricalPowerKind)
              }
              className="rounded-[8px] border border-slate-300 px-2 py-1.5 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
            >
              <option value="motor_power">{ELECTRICAL_POWER_KIND_LABEL.motor_power}</option>
              <option value="package_input">{ELECTRICAL_POWER_KIND_LABEL.package_input}</option>
            </select>
          </label>
        </div>
        {resolved.auxiliaryAllowanceApplied && (
          <div className="mt-1 text-xs text-slate-500">
            <p>
              {ESTIMATED_PACKAGE_INPUT_LABEL}:{' '}
              {formatEstimatedPackageInputKw(resolved.packageInputKw) ?? 'Not available'}
            </p>
            <p>{ARS_AUXILIARY_POWER_ALLOWANCE_LABEL}</p>
          </div>
        )}
      </div>
      <PublishedFlowReferenceFields
        library={library}
        value={flowReference}
        onChange={onFlowReferenceChange}
        advancedOpen={advancedOpen}
        onAdvancedOpenChange={onAdvancedOpenChange}
      />
    </>
  );
}

function PublishedFlowReferenceFields({
  library,
  value,
  onChange,
  advancedOpen = false,
  onAdvancedOpenChange,
}: {
  library: PublicMachineSpec | null;
  value: PublishedFlowReference | null;
  onChange?: (next: PublishedFlowReference) => void;
  advancedOpen?: boolean;
  onAdvancedOpenChange?: (open: boolean) => void;
}) {
  const fromLibrary = publishedFlowReferenceFromSpec(library);
  const current: PublishedFlowReference = {
    flowReferenceBasis: value?.flowReferenceBasis ?? fromLibrary.flowReferenceBasis,
    referenceAbsolutePressurePa:
      value?.referenceAbsolutePressurePa ?? fromLibrary.referenceAbsolutePressurePa,
    specificationReference:
      value?.specificationReference ?? fromLibrary.specificationReference,
  };
  const barAbs = paToBarAbsolute(current.referenceAbsolutePressurePa);
  const knownBasis = hasKnownFlowReferenceBasis(current.flowReferenceBasis);
  const summary = publishedAirflowBasisSummary(current.flowReferenceBasis);
  const extraBasis =
    current.flowReferenceBasis && !isFlowReferenceBasis(current.flowReferenceBasis)
      ? [{ value: current.flowReferenceBasis, label: current.flowReferenceBasis }]
      : [];

  function patch(partial: Partial<PublishedFlowReference>) {
    onChange?.({ ...current, ...partial });
  }

  return (
    <div className="space-y-2">
      {summary && <p className="text-sm text-[#383838]">{summary}</p>}
      {!knownBasis && (
        <p className="text-xs font-medium text-amber-800">
          {AIRFLOW_REFERENCE_NEEDS_CONFIRMATION}
          {onAdvancedOpenChange && (
            <>
              {' '}
              <button
                type="button"
                className="font-medium text-[#0969a9] underline"
                onClick={() => onAdvancedOpenChange(true)}
              >
                {OPEN_ADVANCED_SPECIFICATIONS_ACTION}
              </button>
            </>
          )}
        </p>
      )}
      <details
        className="rounded-[8px] border border-slate-200 bg-slate-50 p-3"
        open={onAdvancedOpenChange ? advancedOpen : undefined}
        onToggle={(event) => onAdvancedOpenChange?.(event.currentTarget.open)}
      >
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500">
          {ADVANCED_SPECIFICATIONS_LABEL}
        </summary>
        <div className="mt-3 space-y-2">
          <label className="block">
            <span className="text-xs font-medium text-slate-500">{AIRFLOW_REFERENCE_BASIS_LABEL}</span>
            <select
              value={current.flowReferenceBasis ?? ''}
              onChange={(event) =>
                patch({ flowReferenceBasis: event.target.value.trim() || null })
              }
              className="mt-1 w-full rounded-[8px] border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
            >
              <option value="">Select basis</option>
              {extraBasis.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              {FLOW_REFERENCE_BASIS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-slate-500">{AIRFLOW_REFERENCE_BASIS_HELP}</span>
          </label>
          <EditableRating
            key={`pref-${current.referenceAbsolutePressurePa ?? 'empty'}`}
            label={REFERENCE_INLET_PRESSURE_LABEL}
            unit={REFERENCE_INLET_PRESSURE_UNIT}
            value={barAbs}
            placeholder="e.g. 1.013"
            onChange={(text) => patch({ referenceAbsolutePressurePa: parseBarAbsoluteText(text) })}
          />
          <p className="text-xs text-slate-500">{REFERENCE_INLET_PRESSURE_HELP}</p>
          {looksLikeDischargePressureBarAbs(barAbs) && (
            <p className="text-xs text-amber-700">{DISCHARGE_PRESSURE_HINT}</p>
          )}
          <label className="block">
            <span className="text-xs font-medium text-slate-500">{SPECIFICATION_REFERENCE_LABEL}</span>
            <input
              type="text"
              value={current.specificationReference ?? ''}
              placeholder="e.g. BOUWA datasheet or CAGI listing"
              onChange={(event) => patch({ specificationReference: event.target.value })}
              className="mt-1 w-full rounded-[8px] border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
            />
            <span className="mt-1 block text-xs text-slate-500">{SPECIFICATION_REFERENCE_HELP}</span>
          </label>
        </div>
      </details>
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
    <div className={label ? undefined : 'min-w-[8rem] flex-1'}>
      <label className="block">
        {label ? <span className="text-xs font-medium text-slate-500">{label}</span> : null}
        <span className={`${label ? 'mt-1 ' : ''}flex items-center gap-2`}>
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
