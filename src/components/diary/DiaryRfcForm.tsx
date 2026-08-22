import React from 'react';
import { ClipboardList, Package, Plus, Trash2, Wrench } from 'lucide-react';
import { FormSectionCard } from '../ui';
import VisitSignaturePad from './VisitSignaturePad';
import {
  createRfcPartLine,
  RFC_LOGISTICS_OPTIONS,
  RFC_PURCHASE_OPTIONS,
  RFC_SERVICE_SCOPE_OPTIONS,
  RFC_WORK_REQUIRED_OPTIONS,
  RFC_YES_NO_OPTIONS,
  type RfcFormData,
  type RfcOption,
  type RfcPartLine,
} from './rfcFormUtils';

interface DiaryRfcFormProps {
  value: RfcFormData;
  onChange: (next: RfcFormData) => void;
  disabled?: boolean;
  /** Mobile wizard step; null/undefined shows all sections. */
  activeStep?: number | null;
}

const FIELD_CLASS =
  'crm-input disabled:bg-surface-muted disabled:text-ink-muted';

const LABEL_CLASS = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted';

interface RfcTextFieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
  type?: 'text' | 'number' | 'date' | 'tel' | 'email';
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email';
}

/**
 * Single-line RFC field with a short printed caption.
 */
const RfcTextField: React.FC<RfcTextFieldProps> = ({
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

interface RfcTextAreaFieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
}

/**
 * Multi-line RFC field for short free-text notes.
 */
const RfcTextAreaField: React.FC<RfcTextAreaFieldProps> = ({
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

interface RfcCheckboxGroupProps {
  label: string;
  options: RfcOption[];
  selected: string[];
  onToggle: (next: string[]) => void;
  disabled?: boolean;
  columns?: 1 | 2;
}

/**
 * Tick-box group for the important multi-select lists on the RFC sheet.
 */
const RfcCheckboxGroup: React.FC<RfcCheckboxGroupProps> = ({
  label,
  options,
  selected,
  onToggle,
  disabled,
  columns = 2,
}) => (
  <fieldset disabled={disabled}>
    <legend className={LABEL_CLASS}>{label}</legend>
    <div className={`grid gap-1.5 ${columns === 2 ? 'sm:grid-cols-2' : ''}`}>
      {options.map((option) => {
        const isChecked = selected.includes(option.value);
        return (
          <label
            key={option.value}
            className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition ${
              isChecked
                ? 'border-emerald-300 bg-emerald-50 font-medium text-emerald-900'
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
              className="h-4 w-4 flex-shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="leading-5">{option.label}</span>
          </label>
        );
      })}
    </div>
  </fieldset>
);

interface RfcChoiceGroupProps {
  label: string;
  options: RfcOption[];
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}

/**
 * Single-choice pill group for Yes/No and service scope answers.
 */
const RfcChoiceGroup: React.FC<RfcChoiceGroupProps> = ({
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
                ? 'border-emerald-500 bg-emerald-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'
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
 * Field-friendly RFC sheet with only the important costing fields.
 * Extra template fields remain in storage for older saved visits.
 */
const DiaryRfcForm: React.FC<DiaryRfcFormProps> = ({
  value,
  onChange,
  disabled = false,
  activeStep = null,
}) => {
  /**
   * Applies a patch to the customer detail block.
   */
  function updateCustomer(changes: Partial<RfcFormData['customer']>): void {
    onChange({ ...value, customer: { ...value.customer, ...changes } });
  }

  /**
   * Applies a patch to Section A (purchase enquiry).
   */
  function updateSectionA(changes: Partial<RfcFormData['sectionA']>): void {
    onChange({ ...value, sectionA: { ...value.sectionA, ...changes } });
  }

  /**
   * Applies a patch to Section B (work to be done).
   */
  function updateSectionB(changes: Partial<RfcFormData['sectionB']>): void {
    onChange({ ...value, sectionB: { ...value.sectionB, ...changes } });
  }

  /**
   * Applies a patch to the office use block.
   */
  function updateOffice(changes: Partial<RfcFormData['office']>): void {
    onChange({ ...value, office: { ...value.office, ...changes } });
  }

  /**
   * Applies a patch to a single parts table row.
   */
  function updatePart(partId: string, changes: Partial<RfcPartLine>): void {
    onChange({
      ...value,
      parts: value.parts.map((part) => (part.id === partId ? { ...part, ...changes } : part)),
    });
  }

  /**
   * Appends an empty row to the parts table.
   */
  function addPart(): void {
    onChange({ ...value, parts: [...value.parts, createRfcPartLine()] });
  }

  /**
   * Removes a parts row, always keeping at least one blank row.
   */
  function removePart(partId: string): void {
    const remaining = value.parts.filter((part) => part.id !== partId);
    onChange({ ...value, parts: remaining.length > 0 ? remaining : [createRfcPartLine()] });
  }

  /**
   * Stores the customer signature and stamps the sign-off time.
   */
  function updateSignature(signatureDataUrl: string | null): void {
    onChange({
      ...value,
      acknowledgement: {
        ...value.acknowledgement,
        signatureDataUrl,
        signedAt: signatureDataUrl ? new Date().toISOString() : '',
      },
    });
  }

  return (
    <div className="space-y-3">
      {(activeStep == null || activeStep === 0) && (
        <div className="rounded-crm-lg border border-brand/20 bg-brand-soft px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">
            Air Rotory Services (Pty) Ltd · ISO_RFC-010
          </p>
          <h2 className="mt-0.5 text-base font-bold text-ink">
            Internal Request For Costing
          </h2>
          <p className="mt-1 text-xs leading-5 text-ink-muted">
            Complete the key details with the customer. Drafts save automatically.
          </p>
        </div>
      )}

      <FormSectionCard
        title="Customer"
        icon={<ClipboardList className="h-4 w-4" />}
        accentClassName="text-brand"
        stepIndex={0}
        activeStep={activeStep}
      >
        <RfcTextField
          label="Customer company name"
          value={value.customer.companyName}
          onChange={(next) => updateCustomer({ companyName: next })}
          disabled={disabled}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <RfcTextField
            label="Contact person"
            value={value.customer.contactPerson}
            onChange={(next) => updateCustomer({ contactPerson: next })}
            disabled={disabled}
          />
          <RfcTextField
            label="Telephone"
            type="tel"
            inputMode="tel"
            value={value.customer.telephone}
            onChange={(next) => updateCustomer({ telephone: next })}
            disabled={disabled}
          />
          <RfcTextField
            label="E-mail"
            type="email"
            inputMode="email"
            value={value.customer.email}
            onChange={(next) => updateCustomer({ email: next })}
            disabled={disabled}
          />
          <RfcTextField
            label="Rep code"
            value={value.customer.repCode}
            onChange={(next) => updateCustomer({ repCode: next })}
            disabled={disabled}
          />
        </div>
        <RfcTextAreaField
          label="Physical address"
          value={value.customer.physicalAddress}
          onChange={(next) => updateCustomer({ physicalAddress: next })}
          disabled={disabled}
          rows={2}
        />
        <RfcChoiceGroup
          label="Service contract"
          options={RFC_YES_NO_OPTIONS}
          value={value.customer.serviceContract}
          onChange={(next) => updateCustomer({ serviceContract: next })}
          disabled={disabled}
        />
      </FormSectionCard>

      <FormSectionCard
        title="Purchase"
        subtitle="Use this when quoting a new / pre-owned unit or parts."
        icon={<Package className="h-4 w-4" />}
        accentClassName="text-brand"
        stepIndex={1}
        activeStep={activeStep}
      >
        <RfcCheckboxGroup
          label="Purchase type"
          options={RFC_PURCHASE_OPTIONS}
          selected={value.sectionA.purchaseOptions}
          onToggle={(next) => updateSectionA({ purchaseOptions: next })}
          disabled={disabled}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <RfcTextField
            label="Make preference"
            value={value.sectionA.make}
            onChange={(next) => updateSectionA({ make: next })}
            disabled={disabled}
          />
          <RfcTextField
            label="Application"
            value={value.sectionA.application}
            onChange={(next) => updateSectionA({ application: next })}
            disabled={disabled}
          />
          <RfcTextField
            label="kW"
            inputMode="decimal"
            value={value.sectionA.kw}
            onChange={(next) => updateSectionA({ kw: next })}
            disabled={disabled}
          />
          <RfcTextField
            label="Capacity"
            value={value.sectionA.capacity}
            onChange={(next) => updateSectionA({ capacity: next })}
            disabled={disabled}
          />
          <RfcTextField
            label="Operating voltage"
            value={value.sectionA.operatingVoltage}
            onChange={(next) => updateSectionA({ operatingVoltage: next })}
            disabled={disabled}
          />
        </div>
        <RfcCheckboxGroup
          label="Logistics"
          options={RFC_LOGISTICS_OPTIONS}
          selected={value.sectionA.logistics}
          onToggle={(next) => updateSectionA({ logistics: next })}
          disabled={disabled}
        />
        <RfcTextField
          label="Capacity / flow required"
          value={value.sectionA.requiredCapacityFlow}
          onChange={(next) => updateSectionA({ requiredCapacityFlow: next })}
          disabled={disabled}
        />
        <RfcTextField
          label="Operating pressure at point of use"
          value={value.sectionA.requiredOperatingPressure}
          onChange={(next) => updateSectionA({ requiredOperatingPressure: next })}
          disabled={disabled}
        />
        <RfcChoiceGroup
          label="Air receiver / piping of sufficient capacity?"
          options={RFC_YES_NO_OPTIONS}
          value={value.sectionA.hasAirReceiverOrPiping}
          onChange={(next) => updateSectionA({ hasAirReceiverOrPiping: next })}
          disabled={disabled}
        />
        <RfcTextAreaField
          label="Other requirements"
          value={value.sectionA.otherRequirements}
          onChange={(next) => updateSectionA({ otherRequirements: next })}
          disabled={disabled}
          rows={2}
        />
      </FormSectionCard>

      <FormSectionCard
        title="Work To Be Done"
        subtitle="Use this for repair, service or breakdown work on an existing unit."
        icon={<Wrench className="h-4 w-4" />}
        accentClassName="text-brand"
        stepIndex={2}
        activeStep={activeStep}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <RfcTextField
            label="Type"
            value={value.sectionB.unitType}
            onChange={(next) => updateSectionB({ unitType: next })}
            disabled={disabled}
            placeholder="Compressor / Air-end / Generator"
          />
          <RfcTextField
            label="Make"
            value={value.sectionB.make}
            onChange={(next) => updateSectionB({ make: next })}
            disabled={disabled}
          />
          <RfcTextField
            label="Model"
            value={value.sectionB.model}
            onChange={(next) => updateSectionB({ model: next })}
            disabled={disabled}
          />
          <RfcTextField
            label="Serial #"
            value={value.sectionB.serialNumber}
            onChange={(next) => updateSectionB({ serialNumber: next })}
            disabled={disabled}
          />
          <RfcTextField
            label="Hour meter"
            inputMode="numeric"
            value={value.sectionB.hourMeter}
            onChange={(next) => updateSectionB({ hourMeter: next })}
            disabled={disabled}
          />
        </div>
        <RfcCheckboxGroup
          label="Work required"
          options={RFC_WORK_REQUIRED_OPTIONS}
          selected={value.sectionB.workRequired}
          onToggle={(next) => updateSectionB({ workRequired: next })}
          disabled={disabled}
        />
        <RfcChoiceGroup
          label="Service scope"
          options={RFC_SERVICE_SCOPE_OPTIONS}
          value={value.sectionB.serviceScope}
          onChange={(next) => updateSectionB({ serviceScope: next })}
          disabled={disabled}
        />
        <label
          className={`flex items-center gap-2.5 rounded-lg border px-3 py-3 text-sm transition ${
            value.sectionB.isBreakdown
              ? 'border-red-300 bg-red-50 font-semibold text-red-800'
              : 'border-slate-200 bg-white text-slate-700'
          } ${disabled ? 'opacity-60' : 'cursor-pointer'}`}
        >
          <input
            type="checkbox"
            checked={value.sectionB.isBreakdown}
            disabled={disabled}
            onChange={(event) => updateSectionB({ isBreakdown: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
          />
          Breakdown
        </label>
        {value.sectionB.isBreakdown && (
          <div className="grid gap-3 sm:grid-cols-2">
            <RfcTextField
              label="RSR #"
              value={value.sectionB.rsrNumber}
              onChange={(next) => updateSectionB({ rsrNumber: next })}
              disabled={disabled}
            />
            <RfcTextField
              label="Date"
              type="date"
              value={value.sectionB.breakdownDate}
              onChange={(next) => updateSectionB({ breakdownDate: next })}
              disabled={disabled}
            />
          </div>
        )}
      </FormSectionCard>

      <FormSectionCard
        title="Parts"
        subtitle="Only list parts needed for this quote."
        icon={<Package className="h-4 w-4" />}
        accentClassName="text-brand"
        stepIndex={3}
        activeStep={activeStep}
      >
        <div className="space-y-3">
          {value.parts.map((part, index) => (
            <div key={part.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Line {index + 1}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removePart(part.id)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-red-500"
                    aria-label={`Remove parts line ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <RfcTextField
                  label="Qty"
                  inputMode="numeric"
                  value={part.qty}
                  onChange={(next) => updatePart(part.id, { qty: next })}
                  disabled={disabled}
                />
              </div>
              <div className="mt-3">
                <RfcTextField
                  label="Part description"
                  value={part.partDescription}
                  onChange={(next) => updatePart(part.id, { partDescription: next })}
                  disabled={disabled}
                />
              </div>
            </div>
          ))}
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={addPart}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 py-3 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50"
          >
            <Plus className="h-4 w-4" />
            Add parts line
          </button>
        )}
      </FormSectionCard>

      <FormSectionCard
        title="Comments & Sign-off"
        icon={<ClipboardList className="h-4 w-4" />}
        accentClassName="text-brand"
        stepIndex={4}
        activeStep={activeStep}
      >
        <RfcTextAreaField
          label="Additional comments"
          value={value.additionalComments}
          onChange={(next) => onChange({ ...value, additionalComments: next })}
          disabled={disabled}
          rows={3}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <RfcTextField
            label="RFC done by"
            value={value.office.rfcDoneBy}
            onChange={(next) => updateOffice({ rfcDoneBy: next })}
            disabled={disabled}
          />
          <RfcTextField
            label="RFC date"
            type="date"
            value={value.office.rfcDate}
            onChange={(next) => updateOffice({ rfcDate: next })}
            disabled={disabled}
          />
          <RfcTextField
            label="Branch"
            value={value.office.branchName}
            onChange={(next) => updateOffice({ branchName: next })}
            disabled={disabled}
            placeholder="e.g. JHB"
          />
          <RfcTextField
            label="Customer name"
            value={value.acknowledgement.customerName}
            onChange={(next) =>
              onChange({
                ...value,
                acknowledgement: { ...value.acknowledgement, customerName: next },
              })
            }
            disabled={disabled}
          />
        </div>
        <div>
          <span className={LABEL_CLASS}>Customer signature</span>
          {disabled ? (
            value.acknowledgement.signatureDataUrl ? (
              <img
                src={value.acknowledgement.signatureDataUrl}
                alt="Customer signature"
                className="h-32 w-full rounded-lg border border-slate-200 bg-white object-contain"
              />
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                No signature captured
              </p>
            )
          ) : (
            <VisitSignaturePad
              value={value.acknowledgement.signatureDataUrl}
              onChange={updateSignature}
            />
          )}
        </div>
      </FormSectionCard>
    </div>
  );
};

export default DiaryRfcForm;
