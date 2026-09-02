import { useState } from 'react';
import { confirmSpecSheet, uploadSpecSheet } from '../api';
import {
  AUTHORITATIVE_SOURCE_CONFIRMATION_NOTE,
  CONFIRM_SPEC_BUTTON_LABEL,
  PROPOSAL_ONLY_LIBRARY_STATUS,
  buildSpecSheetConfirmPayload,
  sourceBackedFromConfirmInput,
  type SpecSheetConfirmTarget,
} from '../confirmSpecSheet';
import {
  formFieldsFromExtracted,
  specSheetStatusMessage,
  type SpecSheetOutcomeStatus,
} from '../specSheetPrefill';
import type { PublicMachineSpec, SourceBackedSpec } from '../types';

interface SpecSheetCaptureProps {
  proposalId: string;
  target: SpecSheetConfirmTarget;
  currentEquipmentId?: string | null;
  initialManufacturer?: string;
  initialModel?: string;
  onCancel: () => void;
  onApply: (values: SourceBackedSpec) => void;
  onConfirmed: (result: {
    spec: PublicMachineSpec;
    sourceBacked: SourceBackedSpec;
    created: boolean;
  }) => void;
}

function textOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

export function SpecSheetCapture({
  proposalId,
  target,
  currentEquipmentId = null,
  initialManufacturer = '',
  initialModel = '',
  onCancel,
  onApply,
  onConfirmed,
}: SpecSheetCaptureProps) {
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [sourceFileId, setSourceFileId] = useState<string | null>(null);
  const [sourceSha256, setSourceSha256] = useState<string | null>(null);
  const [extractionStatus, setExtractionStatus] =
    useState<SpecSheetOutcomeStatus | null>(null);
  const [manufacturer, setManufacturer] = useState(initialManufacturer);
  const [model, setModel] = useState(initialModel);
  const [variant, setVariant] = useState('');
  const [pressure, setPressure] = useState('');
  const [airflow, setAirflow] = useState('');
  const [packageInput, setPackageInput] = useState('');
  const [motorRating, setMotorRating] = useState('');
  const [controlType, setControlType] = useState('');

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const stored = await uploadSpecSheet(proposalId, file);
      setSourceFileName(stored.sourceFileName);
      setSourceFileId(stored.sourceFileId);
      setSourceSha256(stored.sourceSha256);
      const prefill = formFieldsFromExtracted(stored.extracted, {
        manufacturer: initialManufacturer,
        model: initialModel,
      });
      setManufacturer(prefill.manufacturer);
      setModel(prefill.model);
      setVariant(prefill.variant);
      setPressure(prefill.pressure);
      setAirflow(prefill.airflow);
      setPackageInput(prefill.packageInput);
      setMotorRating(prefill.motorRating);
      setControlType(prefill.controlType);
      setExtractionStatus(stored.extractionStatus);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not upload the specification sheet.');
    } finally {
      setUploading(false);
    }
  }

  function reviewedValues() {
    if (!sourceFileName || !sourceFileId) {
      setError('Upload a PDF specification sheet first.');
      return null;
    }
    if (!textOrNull(manufacturer) || !textOrNull(model)) {
      setError('Manufacturer and model are required.');
      return null;
    }
    return {
      target,
      currentEquipmentId: target === 'current' ? currentEquipmentId : null,
      sourceFileId,
      sourceFileName,
      sourceSha256,
      manufacturer: textOrNull(manufacturer) as string,
      model: textOrNull(model) as string,
      modelVariant: textOrNull(variant),
      ratedPressureBarG: numberOrNull(pressure),
      ratedAirflowM3PerMin: numberOrNull(airflow),
      packageInputPowerKw: numberOrNull(packageInput),
      motorShaftPowerKw: numberOrNull(motorRating),
      controlType: textOrNull(controlType),
    };
  }

  function handleApply() {
    const values = reviewedValues();
    if (!values) return;
    onApply(sourceBackedFromConfirmInput(values));
  }

  async function handleConfirm() {
    const values = reviewedValues();
    if (!values) return;
    setConfirming(true);
    setError(null);
    try {
      const confirmed = await confirmSpecSheet(
        proposalId,
        buildSpecSheetConfirmPayload(values),
      );
      onConfirmed({
        spec: confirmed.spec,
        sourceBacked: sourceBackedFromConfirmInput(values),
        created: confirmed.created,
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not add this specification to the Machine Spec Library.',
      );
    } finally {
      setConfirming(false);
    }
  }

  const inputClass =
    'w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20';

  return (
    <div className="space-y-3 rounded-[8px] border border-slate-200 bg-slate-50 p-3">
      <h3 className="text-sm font-semibold text-[#383838]">Add machine from specification sheet</h3>
      {!sourceFileName ? (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[#383838]/70 mb-1">
            Specification sheet (PDF)
          </label>
          <input
            type="file"
            accept="application/pdf,.pdf"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          {uploading && <p className="mt-1 text-xs text-slate-500">Uploading…</p>}
        </div>
      ) : (
        <p className="text-xs text-slate-600">
          Source: {sourceFileName}
        </p>
      )}
      {sourceFileName && specSheetStatusMessage(extractionStatus) && (
        <p className="text-xs text-slate-600">
          {specSheetStatusMessage(extractionStatus)}
        </p>
      )}
      {sourceFileName && (
        <p className="text-xs font-medium text-slate-600">{PROPOSAL_ONLY_LIBRARY_STATUS}</p>
      )}
      {sourceFileName && (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs font-medium text-slate-600">
            Manufacturer
            <input className={`${inputClass} mt-1`} value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Model
            <input className={`${inputClass} mt-1`} value={model} onChange={(e) => setModel(e.target.value)} />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Variant (optional)
            <input className={`${inputClass} mt-1`} value={variant} onChange={(e) => setVariant(e.target.value)} />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Rated pressure (bar)
            <input className={`${inputClass} mt-1`} inputMode="decimal" value={pressure} onChange={(e) => setPressure(e.target.value)} />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Rated airflow (m³/min)
            <input className={`${inputClass} mt-1`} inputMode="decimal" value={airflow} onChange={(e) => setAirflow(e.target.value)} />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Published package input power (kW)
            <input className={`${inputClass} mt-1`} inputMode="decimal" value={packageInput} onChange={(e) => setPackageInput(e.target.value)} />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Motor rating (kW, optional)
            <input className={`${inputClass} mt-1`} inputMode="decimal" value={motorRating} onChange={(e) => setMotorRating(e.target.value)} />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Control type (optional)
            <input className={`${inputClass} mt-1`} value={controlType} onChange={(e) => setControlType(e.target.value)} />
          </label>
        </div>
      )}
      <p className="text-xs text-slate-500">
        Leave a field blank if the specification sheet does not publish that value. Do not copy motor rating into package input.
      </p>
      {sourceFileName && (
        <p className="text-xs text-slate-600">{AUTHORITATIVE_SOURCE_CONFIRMATION_NOTE}</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleApply}
          disabled={!sourceFileName || confirming}
          className="rounded-[8px] bg-white px-3 py-1.5 text-xs font-medium text-[#383838] ring-1 ring-slate-200 disabled:opacity-50"
        >
          Use in this proposal
        </button>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={!sourceFileName || confirming}
          className="rounded-[8px] bg-[#f7c12b] px-3 py-1.5 text-xs font-bold text-[#383838] disabled:opacity-50"
        >
          {CONFIRM_SPEC_BUTTON_LABEL}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[8px] bg-white px-3 py-1.5 text-xs font-medium text-[#383838] ring-1 ring-slate-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
