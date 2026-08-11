import React from 'react';
import { ClipboardList, Package, Plus, Trash2, Wrench } from 'lucide-react';
import { FormSectionCard } from '../ui';
import VisitSignaturePad from './VisitSignaturePad';
import {
  createNewServiceLevelUnitLine,
  NEW_SERVICE_LEVEL_UNIT_TYPE_OPTIONS,
  NEW_SERVICE_LEVEL_YES_NO_OPTIONS,
  type NewServiceLevelFormData,
  type NewServiceLevelOption,
  type NewServiceLevelUnitLine,
} from './newServiceLevelFormUtils';

interface DiaryNewServiceLevelFormProps {
  value: NewServiceLevelFormData;
  onChange: (next: NewServiceLevelFormData) => void;
  disabled?: boolean;
  /** Mobile wizard step; null/undefined shows all sections. */
  activeStep?: number | null;
}

const FIELD_CLASS =
  'crm-input disabled:bg-surface-muted disabled:text-ink-muted';

const LABEL_CLASS = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted';

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
  type?: 'text' | 'number' | 'date' | 'tel' | 'email';
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email';
}

/**
 * Single-line New Service Level field with the printed caption as its label.
 */
const TextField: React.FC<TextFieldProps> = ({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  type = 'text',
  inputMode,
}) => (
  <label className="block">
    <span className={LABEL_CLASS}>{label}</span>
    <input
      type={type}
      inputMode={inputMode}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={FIELD_CLASS}
    />
  </label>
);

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
}

/**
 * Multi-line New Service Level field for free-text blocks.
 */
const TextAreaField: React.FC<TextAreaFieldProps> = ({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  rows = 3,
}) => (
  <label className="block">
    <span className={LABEL_CLASS}>{label}</span>
    <textarea
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      rows={rows}
      onChange={(event) => onChange(event.target.value)}
      className={`${FIELD_CLASS} leading-6`}
    />
  </label>
);

interface CheckboxGroupProps {
  label: string;
  options: NewServiceLevelOption[];
  selected: string[];
  onToggle: (next: string[]) => void;
  disabled?: boolean;
}

/**
 * Tick-box group for unit type selection.
 */
const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  label,
  options,
  selected,
  onToggle,
  disabled,
}) => (
  <fieldset disabled={disabled}>
    <legend className={LABEL_CLASS}>{label}</legend>
    <div className="grid gap-1.5 sm:grid-cols-3">
      {options.map((option) => {
        const isChecked = selected.includes(option.value);
        return (
          <label
            key={option.value}
            className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition ${
              isChecked
                ? 'border-violet-300 bg-violet-50 font-medium text-violet-900'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <input
              type="checkbox"
              checked={isChecked}
              disabled={disabled}
              onChange={() =>
                onToggle(
                  isChecked
                    ? selected.filter((entry) => entry !== option.value)
                    : [...selected, option.value],
                )
              }
              className="h-4 w-4 flex-shrink-0 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  </fieldset>
);

interface ChoiceGroupProps {
  label: string;
  options: NewServiceLevelOption[];
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}

/**
 * Single-choice Yes/No group for refurbs included.
 */
const ChoiceGroup: React.FC<ChoiceGroupProps> = ({
  label,
  options,
  value,
  onChange,
  disabled,
}) => (
  <div>
    <span className={LABEL_CLASS}>{label}</span>
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(isActive ? '' : option.value)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              isActive
                ? 'border-violet-500 bg-violet-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50'
            } disabled:opacity-60`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  </div>
);

/**
 * Interactive digital New Service Level Agreement sheet (OS007-47).
 * Only the important fields from the printed form are included for field use.
 */
const DiaryNewServiceLevelForm: React.FC<DiaryNewServiceLevelFormProps> = ({
  value,
  onChange,
  disabled = false,
  activeStep = null,
}) => {
  /**
   * Updates one unit table row.
   */
  function updateUnit(lineId: string, changes: Partial<NewServiceLevelUnitLine>): void {
    onChange({
      ...value,
      units: value.units.map((line) => (line.id === lineId ? { ...line, ...changes } : line)),
    });
  }

  /**
   * Appends an empty unit row.
   */
  function addUnit(): void {
    onChange({ ...value, units: [...value.units, createNewServiceLevelUnitLine()] });
  }

  /**
   * Removes a unit row, always keeping at least one blank row.
   */
  function removeUnit(lineId: string): void {
    const remaining = value.units.filter((line) => line.id !== lineId);
    onChange({
      ...value,
      units: remaining.length > 0 ? remaining : [createNewServiceLevelUnitLine()],
    });
  }

  /**
   * Stores the customer approval signature and stamps the sign-off time.
   */
  function updateSignature(signatureDataUrl: string | null): void {
    onChange({
      ...value,
      signatureDataUrl,
      signedAt: signatureDataUrl ? new Date().toISOString() : '',
    });
  }

  return (
    <div className="space-y-3">
      {(activeStep == null || activeStep === 0) && (
        <div className="rounded-crm-lg border border-brand/20 bg-brand-soft px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">
            Air Rotory Services (Pty) Ltd · OS007-47 · Rev 00
          </p>
          <h2 className="mt-0.5 text-base font-bold text-ink">
            Request For Costing — New Service Level Agreement
          </h2>
          <p className="mt-1 text-xs leading-5 text-ink-muted">
            Complete the key details with the customer. Drafts save automatically.
          </p>
        </div>
      )}

      <FormSectionCard
        title="Request Details"
        icon={<ClipboardList className="h-4 w-4" />}
        accentClassName="text-brand"
        stepIndex={0}
        activeStep={activeStep}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Requested by"
            value={value.requestedBy}
            onChange={(next) => onChange({ ...value, requestedBy: next })}
            disabled={disabled}
          />
          <TextField
            label="Rep code"
            value={value.repCode}
            onChange={(next) => onChange({ ...value, repCode: next })}
            disabled={disabled}
          />
          <TextField
            label="Quote done by"
            value={value.quoteDoneBy}
            onChange={(next) => onChange({ ...value, quoteDoneBy: next })}
            disabled={disabled}
          />
          <TextField
            label="Date quote done"
            type="date"
            value={value.dateQuoteDone}
            onChange={(next) => onChange({ ...value, dateQuoteDone: next })}
            disabled={disabled}
          />
        </div>
      </FormSectionCard>

      <FormSectionCard
        title="Customer & Contract"
        icon={<ClipboardList className="h-4 w-4" />}
        accentClassName="text-brand"
        stepIndex={1}
        activeStep={activeStep}
      >
        <TextField
          label="Customer"
          value={value.customer}
          onChange={(next) => onChange({ ...value, customer: next })}
          disabled={disabled}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Customer contact no"
            type="tel"
            inputMode="tel"
            value={value.customerContactNo}
            onChange={(next) => onChange({ ...value, customerContactNo: next })}
            disabled={disabled}
          />
          <TextField
            label="Customer email address"
            type="email"
            inputMode="email"
            value={value.customerEmail}
            onChange={(next) => onChange({ ...value, customerEmail: next })}
            disabled={disabled}
          />
          <TextField
            label="Duration of contract"
            value={value.durationOfContract}
            onChange={(next) => onChange({ ...value, durationOfContract: next })}
            disabled={disabled}
            placeholder="e.g. 12 months"
          />
          <TextField
            label="Qty"
            inputMode="numeric"
            value={value.unitQty}
            onChange={(next) => onChange({ ...value, unitQty: next })}
            disabled={disabled}
          />
        </div>
        <ChoiceGroup
          label="Refurbs included"
          options={NEW_SERVICE_LEVEL_YES_NO_OPTIONS}
          value={value.refurbsIncluded}
          onChange={(next) => onChange({ ...value, refurbsIncluded: next })}
          disabled={disabled}
        />
        <CheckboxGroup
          label="Unit type"
          options={NEW_SERVICE_LEVEL_UNIT_TYPE_OPTIONS}
          selected={value.unitTypes}
          onToggle={(next) => onChange({ ...value, unitTypes: next })}
          disabled={disabled}
        />
      </FormSectionCard>

      <FormSectionCard
        title="Units"
        subtitle="Indicate oil free or oil injected on compressor, and refrigeration or desiccant on dryer."
        icon={<Package className="h-4 w-4" />}
        accentClassName="text-brand"
        stepIndex={2}
        activeStep={activeStep}
      >
        <div className="space-y-3">
          {value.units.map((line, index) => (
            <div key={line.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Unit {index + 1}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeUnit(line.id)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-red-500"
                    aria-label={`Remove unit line ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <TextField
                label="Unit make & model"
                value={line.makeAndModel}
                onChange={(next) => updateUnit(line.id, { makeAndModel: next })}
                disabled={disabled}
              />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Year model"
                  value={line.yearModel}
                  onChange={(next) => updateUnit(line.id, { yearModel: next })}
                  disabled={disabled}
                />
                <TextField
                  label="Voltage"
                  value={line.voltage}
                  onChange={(next) => updateUnit(line.id, { voltage: next })}
                  disabled={disabled}
                />
                <TextField
                  label="Oil type"
                  value={line.oilType}
                  onChange={(next) => updateUnit(line.id, { oilType: next })}
                  disabled={disabled}
                  placeholder="Oil free / Oil injected"
                />
                <TextField
                  label="Running hours per day/week"
                  value={line.runningHours}
                  onChange={(next) => updateUnit(line.id, { runningHours: next })}
                  disabled={disabled}
                />
                <TextField
                  label="Service intervals"
                  value={line.serviceIntervals}
                  onChange={(next) => updateUnit(line.id, { serviceIntervals: next })}
                  disabled={disabled}
                />
              </div>
            </div>
          ))}
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={addUnit}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-violet-300 bg-violet-50/60 py-3 text-sm font-semibold text-violet-700 transition hover:border-violet-400 hover:bg-violet-50"
          >
            <Plus className="h-4 w-4" />
            Add unit line
          </button>
        )}
      </FormSectionCard>

      <FormSectionCard
        title="Site & Comments"
        icon={<Wrench className="h-4 w-4" />}
        accentClassName="text-brand"
        stepIndex={3}
        activeStep={activeStep}
      >
        <TextAreaField
          label="Site specifics"
          value={value.siteSpecifics}
          onChange={(next) => onChange({ ...value, siteSpecifics: next })}
          disabled={disabled}
          rows={3}
        />
        <TextAreaField
          label="Additional comments"
          value={value.additionalComments}
          onChange={(next) => onChange({ ...value, additionalComments: next })}
          disabled={disabled}
          rows={3}
        />
        <TextAreaField
          label="Notes"
          value={value.notes}
          onChange={(next) => onChange({ ...value, notes: next })}
          disabled={disabled}
          rows={3}
        />
      </FormSectionCard>

      <FormSectionCard
        title="Completion & Customer Approval"
        icon={<ClipboardList className="h-4 w-4" />}
        accentClassName="text-brand"
        stepIndex={4}
        activeStep={activeStep}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Request completed by"
            value={value.requestCompletedBy}
            onChange={(next) => onChange({ ...value, requestCompletedBy: next })}
            disabled={disabled}
          />
          <TextField
            label="Date completed"
            type="date"
            value={value.dateCompleted}
            onChange={(next) => onChange({ ...value, dateCompleted: next })}
            disabled={disabled}
          />
          <TextField
            label="Customer approval — name"
            value={value.customerApprovalName}
            onChange={(next) => onChange({ ...value, customerApprovalName: next })}
            disabled={disabled}
          />
          <TextField
            label="Date"
            type="date"
            value={value.customerApprovalDate}
            onChange={(next) => onChange({ ...value, customerApprovalDate: next })}
            disabled={disabled}
          />
          <TextField
            label="Designation"
            value={value.customerApprovalDesignation}
            onChange={(next) => onChange({ ...value, customerApprovalDesignation: next })}
            disabled={disabled}
          />
        </div>
        <div>
          <span className={LABEL_CLASS}>Customer signature</span>
          {disabled ? (
            value.signatureDataUrl ? (
              <img
                src={value.signatureDataUrl}
                alt="Customer signature"
                className="h-32 w-full rounded-lg border border-slate-200 bg-white object-contain"
              />
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                No signature captured
              </p>
            )
          ) : (
            <VisitSignaturePad value={value.signatureDataUrl} onChange={updateSignature} />
          )}
        </div>
      </FormSectionCard>
    </div>
  );
};

export default DiaryNewServiceLevelForm;
