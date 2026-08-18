/**
 * Choosing the instrument an audit was measured with.
 *
 * ARS has a register of compressors and had no register at all of measuring
 * equipment, so the same three loggers were described from memory on every
 * proposal. This reads the Bouwa audit-equipment catalogue instead, and what a
 * selection is allowed to fill in lives in `equipmentSelection.ts` so it can be
 * tested without a browser.
 *
 * "Not listed" adds an instrument to the catalogue rather than typing it into
 * this one proposal, so the next audit finds it. The catalogue refuses details
 * that cannot be true — a reversed range, a basis the instrument cannot report
 * on — and the refusal is shown here as it was stated, not reworded.
 */

import { useCallback, useEffect, useState } from 'react';
import { Check, Gauge, Loader2, Plus, Search, X } from 'lucide-react';

import type { AuditFormField, AuditSelectionOption } from '../../auditIntakeTypes';
import { addAuditEquipment, listAuditEquipment } from '../wizardApi';
import { equipmentSummaryLine } from '../equipmentSelection';
import type { WizardEquipment, WizardEquipmentType } from '../wizardTypes';

const TYPE_LABELS: Record<WizardEquipmentType, string> = {
  flow_logger: 'Data logger',
  flow_sensor: 'Flow sensor',
  pressure_sensor: 'Pressure sensor',
  temperature_sensor: 'Temperature sensor',
};

/** The unit a range is stated in, decided by what the instrument measures. */
const RANGE_UNITS: Partial<Record<WizardEquipmentType, string>> = {
  flow_sensor: 'm³/min',
  pressure_sensor: 'bar',
  temperature_sensor: '°C',
};

const BASIS_CODE: Partial<Record<WizardEquipmentType, string>> = {
  flow_sensor: 'AUDIT.FLOW_SENSOR.FLOW_REFERENCE_BASIS',
  pressure_sensor: 'AUDIT.PRESSURE_SENSOR.PRESSURE_BASIS',
};

/**
 * The bases the audit itself offers for this instrument. Taking them from the
 * form model rather than restating them here means the catalogue and the audit
 * can never drift into offering different vocabularies for the same question.
 */
function basisOptions(
  equipmentType: WizardEquipmentType,
  fields: readonly AuditFormField[],
): AuditSelectionOption[] {
  const code = BASIS_CODE[equipmentType];
  if (code === undefined) return [];
  return (fields.find(field => field.code === code)?.options ?? []).filter(
    option =>
      !option.value.startsWith('unknown') && option.value !== 'not_applicable',
  );
}

export interface EquipmentPickerProps {
  equipmentType: WizardEquipmentType;
  formFields: readonly AuditFormField[];
  /** The serial or model already answered, so a chosen entry can be shown as chosen. */
  chosenSerial: string | null;
  chosenModel: string | null;
  disabled: boolean;
  onSelect: (equipment: WizardEquipment) => void;
}

export function EquipmentPicker({
  equipmentType,
  formFields,
  chosenSerial,
  chosenModel,
  disabled,
  onSelect,
}: EquipmentPickerProps) {
  const [search, setSearch] = useState('');
  const [equipment, setEquipment] = useState<WizardEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState('');
  const [adding, setAdding] = useState(false);

  const reload = useCallback(
    (term: string) => {
      setLoading(true);
      return listAuditEquipment({
        equipmentType,
        ...(term.trim() === '' ? {} : { search: term.trim() }),
      })
        .then(found => {
          setEquipment(found.equipment);
          setProblem('');
        })
        .catch(() => setProblem('The equipment catalogue could not be read.'))
        .finally(() => setLoading(false));
    },
    [equipmentType],
  );

  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      if (live) void reload(search);
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [reload, search]);

  const isChosen = (entry: WizardEquipment) =>
    entry.serialNumber !== null && chosenSerial !== null
      ? entry.serialNumber === chosenSerial
      : chosenSerial === null && chosenModel !== null && entry.model === chosenModel;

  return (
    <div
      data-testid="bouwa-equipment-picker"
      data-equipment-type={equipmentType}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <Gauge className="h-4 w-4 text-ars-primary" />
          {TYPE_LABELS[equipmentType]}
        </p>
        {disabled ? null : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Not listed — add equipment
          </button>
        )}
      </div>
      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
        From the Bouwa audit-equipment catalogue. Choosing one fills what the
        catalogue records about the instrument. Anything it does not record stays
        a question below.
      </p>

      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="search"
          disabled={disabled}
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search by make, model or serial…"
          className="w-full rounded-md border border-slate-300 py-1.5 pl-8 pr-8 text-sm disabled:bg-slate-100"
        />
        {loading ? (
          <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-slate-400" />
        ) : null}
      </div>

      {problem === '' ? null : (
        <p className="mt-1.5 text-xs text-amber-700">{problem}</p>
      )}

      {!loading && equipment.length === 0 && problem === '' ? (
        <p className="mt-1.5 text-xs text-slate-500">
          Nothing in the catalogue matches. Add the instrument, or answer the
          questions below directly.
        </p>
      ) : (
        <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
          {equipment.map(entry => (
            <li key={entry.equipmentId}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(entry)}
                className={`flex w-full items-center justify-between gap-3 rounded-md border px-2.5 py-1.5 text-left text-xs ${
                  isChosen(entry)
                    ? 'border-ars-primary bg-blue-50'
                    : 'border-slate-200 hover:bg-slate-50'
                } disabled:opacity-50`}
              >
                <span>
                  <span className="block font-medium text-slate-800">
                    {entry.manufacturer} {entry.model}
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    {equipmentSummaryLine(entry)}
                  </span>
                </span>
                {isChosen(entry) ? (
                  <Check className="h-4 w-4 shrink-0 text-ars-primary" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!adding ? null : (
        <AddEquipmentDialog
          equipmentType={equipmentType}
          basisOptions={basisOptions(equipmentType, formFields)}
          onClose={() => setAdding(false)}
          onAdded={added => {
            setAdding(false);
            void reload(search);
            onSelect(added);
          }}
        />
      )}
    </div>
  );
}

function AddEquipmentDialog({
  equipmentType,
  basisOptions: bases,
  onClose,
  onAdded,
}: {
  equipmentType: WizardEquipmentType;
  basisOptions: AuditSelectionOption[];
  onClose: () => void;
  onAdded: (equipment: WizardEquipment) => void;
}) {
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [rangeMinimum, setRangeMinimum] = useState('');
  const [rangeMaximum, setRangeMaximum] = useState('');
  const [referenceBasis, setReferenceBasis] = useState('');
  const [calibrationDate, setCalibrationDate] = useState('');
  const [certificate, setCertificate] = useState('');
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState('');

  const rangeUnit = RANGE_UNITS[equipmentType];

  function submit() {
    setSaving(true);
    setProblem('');
    addAuditEquipment({
      equipmentType,
      manufacturer,
      model,
      serialNumber,
      // A lone bound is not a range, and the catalogue says so rather than
      // storing half of one.
      ...(rangeUnit === undefined || (rangeMinimum === '' && rangeMaximum === '')
        ? {}
        : {
            measuringRange: {
              minimum: rangeMinimum,
              maximum: rangeMaximum,
              unit: rangeUnit,
            },
          }),
      ...(referenceBasis === '' ? {} : { referenceBasis }),
      ...(calibrationDate === '' ? {} : { calibrationDate }),
      ...(certificate === '' ? {} : { calibrationCertificateReference: certificate }),
    })
      .then(onAdded)
      .catch((error: unknown) =>
        setProblem(
          error instanceof Error
            ? error.message
            : 'The equipment could not be added.',
        ),
      )
      .finally(() => setSaving(false));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Add ${TYPE_LABELS[equipmentType].toLowerCase()}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
    >
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Add {TYPE_LABELS[equipmentType].toLowerCase()}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              This is added to the shared catalogue, so the next audit that uses
              the same instrument finds it here.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 space-y-2">
          <Text label="Manufacturer" value={manufacturer} onChange={setManufacturer} />
          <Text label="Model" value={model} onChange={setModel} />
          <Text
            label="Serial or asset number"
            value={serialNumber}
            onChange={setSerialNumber}
          />
          {rangeUnit === undefined ? null : (
            <div className="grid grid-cols-2 gap-2">
              <Text
                label={`Range minimum (${rangeUnit})`}
                value={rangeMinimum}
                onChange={setRangeMinimum}
              />
              <Text
                label={`Range maximum (${rangeUnit})`}
                value={rangeMaximum}
                onChange={setRangeMaximum}
              />
            </div>
          )}
          {bases.length === 0 ? null : (
            <label className="block text-xs font-medium text-slate-700">
              Reference basis its readings are stated on
              <select
                value={referenceBasis}
                onChange={event => setReferenceBasis(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
              >
                <option value="">Leave unstated</option>
                {bases.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-medium text-slate-700">
              Calibration date
              <input
                type="date"
                value={calibrationDate}
                onChange={event => setCalibrationDate(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
              />
            </label>
            <Text
              label="Calibration certificate"
              value={certificate}
              onChange={setCertificate}
            />
          </div>
        </div>

        {problem === '' ? null : (
          <p className="mt-2 rounded-md bg-rose-50 px-2.5 py-2 text-xs text-rose-700">
            {problem}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="rounded-lg bg-ars-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Adding…' : 'Add to catalogue'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Text({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-medium text-slate-700">
      {label}
      <input
        type="text"
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
      />
    </label>
  );
}
