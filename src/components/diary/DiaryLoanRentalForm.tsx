import React from 'react';
import { ClipboardList, MapPin, Package, Plus, Trash2, Truck } from 'lucide-react';
import { FormSectionCard } from '../ui';
import VisitSignaturePad from './VisitSignaturePad';
import {
  createLoanRentalAuxiliaryLine,
  createLoanRentalUnitLine,
  LOAN_RENTAL_DAILY_APPLICATION_OPTIONS,
  LOAN_RENTAL_YES_NO_OPTIONS,
  type LoanRentalAuxiliaryLine,
  type LoanRentalFormData,
  type LoanRentalOption,
  type LoanRentalUnitLine,
} from './loanRentalFormUtils';

interface DiaryLoanRentalFormProps {
  value: LoanRentalFormData;
  onChange: (next: LoanRentalFormData) => void;
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
 * Single-line Loan & Rental field with a short printed caption.
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
 * Multi-line Loan & Rental field for short free-text notes.
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
  options: LoanRentalOption[];
  selected: string[];
  onToggle: (next: string[]) => void;
  disabled?: boolean;
}

/**
 * Tick-box group for daily application options.
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
    <div className="grid gap-1.5 sm:grid-cols-2">
      {options.map((option) => {
        const isChecked = selected.includes(option.value);
        return (
          <label
            key={option.value}
            className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition ${
              isChecked
                ? 'border-sky-300 bg-sky-50 font-medium text-sky-900'
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
              className="h-4 w-4 flex-shrink-0 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
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
  options: LoanRentalOption[];
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}

/**
 * Single-choice Yes/No group for key site questions.
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
                ? 'border-sky-500 bg-sky-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50'
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
 * Field-friendly Loan & Rental request with only the important meeting fields.
 * Extra template fields remain in storage for older saved visits.
 */
const DiaryLoanRentalForm: React.FC<DiaryLoanRentalFormProps> = ({
  value,
  onChange,
  disabled = false,
  activeStep = null,
}) => {
  /**
   * Applies a patch to the request header block.
   */
  function updateHeader(changes: Partial<LoanRentalFormData['header']>): void {
    onChange({ ...value, header: { ...value.header, ...changes } });
  }

  /**
   * Applies a patch to the customer block.
   */
  function updateCustomer(changes: Partial<LoanRentalFormData['customer']>): void {
    onChange({ ...value, customer: { ...value.customer, ...changes } });
  }

  /**
   * Applies a patch to the request details block.
   */
  function updateRequest(changes: Partial<LoanRentalFormData['request']>): void {
    onChange({ ...value, request: { ...value.request, ...changes } });
  }

  /**
   * Applies a patch to the site specifics block.
   */
  function updateSite(changes: Partial<LoanRentalFormData['site']>): void {
    onChange({ ...value, site: { ...value.site, ...changes } });
  }

  /**
   * Applies a patch to the office-use block.
   */
  function updateOffice(changes: Partial<LoanRentalFormData['office']>): void {
    onChange({ ...value, office: { ...value.office, ...changes } });
  }

  /**
   * Updates one unit table row.
   */
  function updateUnit(lineId: string, changes: Partial<LoanRentalUnitLine>): void {
    onChange({
      ...value,
      units: value.units.map((line) => (line.id === lineId ? { ...line, ...changes } : line)),
    });
  }

  /**
   * Updates one auxiliary equipment row.
   */
  function updateAuxiliary(lineId: string, changes: Partial<LoanRentalAuxiliaryLine>): void {
    onChange({
      ...value,
      auxiliaries: value.auxiliaries.map((line) =>
        line.id === lineId ? { ...line, ...changes } : line,
      ),
    });
  }

  /**
   * Appends an empty unit row.
   */
  function addUnit(): void {
    onChange({ ...value, units: [...value.units, createLoanRentalUnitLine()] });
  }

  /**
   * Removes a unit row, always keeping at least one blank row.
   */
  function removeUnit(lineId: string): void {
    const remaining = value.units.filter((line) => line.id !== lineId);
    onChange({
      ...value,
      units: remaining.length > 0 ? remaining : [createLoanRentalUnitLine()],
    });
  }

  /**
   * Appends an empty auxiliary row.
   */
  function addAuxiliary(): void {
    onChange({ ...value, auxiliaries: [...value.auxiliaries, createLoanRentalAuxiliaryLine()] });
  }

  /**
   * Removes an auxiliary row, always keeping at least one blank row.
   */
  function removeAuxiliary(lineId: string): void {
    const remaining = value.auxiliaries.filter((line) => line.id !== lineId);
    onChange({
      ...value,
      auxiliaries: remaining.length > 0 ? remaining : [createLoanRentalAuxiliaryLine()],
    });
  }

  /**
   * Stores the request signature and stamps the sign-off time.
   */
  function updateSignature(signatureDataUrl: string | null): void {
    updateOffice({
      signatureDataUrl,
      signedAt: signatureDataUrl ? new Date().toISOString() : '',
    });
  }

  return (
    <div className="space-y-3">
      {(activeStep == null || activeStep === 0) && (
        <div className="rounded-crm-lg border border-brand/20 bg-brand-soft px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">
            Air Rotory Services (Pty) Ltd · OS007-35
          </p>
          <h2 className="mt-0.5 text-base font-bold text-ink">Rental / Loan Request</h2>
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
        <TextField
          label="Customer"
          value={value.customer.customer}
          onChange={(next) => updateCustomer({ customer: next })}
          disabled={disabled}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Customer name"
            value={value.customer.customerName}
            onChange={(next) => updateCustomer({ customerName: next })}
            disabled={disabled}
          />
          <TextField
            label="Contact no"
            type="tel"
            inputMode="tel"
            value={value.customer.contactNumber}
            onChange={(next) => updateCustomer({ contactNumber: next })}
            disabled={disabled}
          />
          <TextField
            label="E-mail"
            type="email"
            inputMode="email"
            value={value.customer.emailAddress}
            onChange={(next) => updateCustomer({ emailAddress: next })}
            disabled={disabled}
          />
          <TextField
            label="Rep code"
            value={value.customer.repCode}
            onChange={(next) => updateCustomer({ repCode: next })}
            disabled={disabled}
          />
          <TextField
            label="Branch"
            value={value.customer.branch}
            onChange={(next) => updateCustomer({ branch: next })}
            disabled={disabled}
            placeholder="e.g. JHB"
          />
          <TextField
            label="Request by"
            value={value.header.requestBy}
            onChange={(next) => updateHeader({ requestBy: next })}
            disabled={disabled}
          />
        </div>
      </FormSectionCard>

      <FormSectionCard
        title="Request Details"
        icon={<Truck className="h-4 w-4" />}
        accentClassName="text-brand"
        stepIndex={1}
        activeStep={activeStep}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Duration of rental"
            value={value.request.durationOfRental}
            onChange={(next) => updateRequest({ durationOfRental: next })}
            disabled={disabled}
            placeholder="e.g. 3 DAYS"
          />
          <TextField
            label="Unit size"
            value={value.request.unitSize}
            onChange={(next) => updateRequest({ unitSize: next })}
            disabled={disabled}
            placeholder="e.g. 90/110KW , 6 BAR"
          />
          <TextField
            label="Unit voltage"
            value={value.request.unitVoltage}
            onChange={(next) => updateRequest({ unitVoltage: next })}
            disabled={disabled}
          />
        </div>
        <CheckboxGroup
          label="Daily application"
          options={LOAN_RENTAL_DAILY_APPLICATION_OPTIONS}
          selected={value.request.dailyApplication}
          onToggle={(next) => updateRequest({ dailyApplication: next })}
          disabled={disabled}
        />
      </FormSectionCard>

      <FormSectionCard
        title="Units"
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
                label="Unit description"
                value={line.unitDescription}
                onChange={(next) => updateUnit(line.id, { unitDescription: next })}
                disabled={disabled}
                placeholder="e.g. MOBILE COMPRESSOR"
              />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Qty"
                  inputMode="numeric"
                  value={line.qty}
                  onChange={(next) => updateUnit(line.id, { qty: next })}
                  disabled={disabled}
                />
                <TextField
                  label="Rental duration"
                  value={line.rentalDuration}
                  onChange={(next) => updateUnit(line.id, { rentalDuration: next })}
                  disabled={disabled}
                />
                <TextField
                  label="Unit size"
                  value={line.unitSize}
                  onChange={(next) => updateUnit(line.id, { unitSize: next })}
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
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-sky-300 bg-sky-50/60 py-3 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:bg-sky-50"
          >
            <Plus className="h-4 w-4" />
            Add unit line
          </button>
        )}
      </FormSectionCard>

      <FormSectionCard
        title="Auxiliary Equipment"
        subtitle="Quote ancillary items needed with loan units."
        icon={<Package className="h-4 w-4" />}
        accentClassName="text-brand"
        stepIndex={3}
        activeStep={activeStep}
      >
        <div className="space-y-3">
          {value.auxiliaries.map((line, index) => (
            <div key={line.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Auxiliary {index + 1}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeAuxiliary(line.id)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-red-500"
                    aria-label={`Remove auxiliary line ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <TextField
                label="Description"
                value={line.description}
                onChange={(next) => updateAuxiliary(line.id, { description: next })}
                disabled={disabled}
              />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Qty"
                  inputMode="numeric"
                  value={line.qty}
                  onChange={(next) => updateAuxiliary(line.id, { qty: next })}
                  disabled={disabled}
                />
                <TextField
                  label="Size"
                  value={line.size}
                  onChange={(next) => updateAuxiliary(line.id, { size: next })}
                  disabled={disabled}
                />
              </div>
            </div>
          ))}
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={addAuxiliary}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-sky-300 bg-sky-50/60 py-3 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:bg-sky-50"
          >
            <Plus className="h-4 w-4" />
            Add auxiliary line
          </button>
        )}
      </FormSectionCard>

      <FormSectionCard
        title="Site & Notes"
        icon={<MapPin className="h-4 w-4" />}
        accentClassName="text-brand"
        stepIndex={4}
        activeStep={activeStep}
      >
        <ChoiceGroup
          label="Forklift availability"
          options={LOAN_RENTAL_YES_NO_OPTIONS}
          value={value.site.forkliftAvailability}
          onChange={(next) => updateSite({ forkliftAvailability: next })}
          disabled={disabled}
        />
        <ChoiceGroup
          label="Crane truck accessibility"
          options={LOAN_RENTAL_YES_NO_OPTIONS}
          value={value.site.craneTruckAccessibility}
          onChange={(next) => updateSite({ craneTruckAccessibility: next })}
          disabled={disabled}
        />
        <TextField
          label="Site supply voltage"
          value={value.site.siteSupplyVoltage}
          onChange={(next) => updateSite({ siteSupplyVoltage: next })}
          disabled={disabled}
        />
        <TextAreaField
          label="Additional comments"
          value={value.site.additionalComments}
          onChange={(next) => updateSite({ additionalComments: next })}
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

      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs leading-5 text-amber-900">
        Loan units are free of charge for the compressor only. Ancillary equipment, installation,
        delivery and collection remain for the customer&apos;s account unless approved. On rental
        contracts everything is for the customer&apos;s account.
      </div>

      <FormSectionCard
        title="Sign-off"
        icon={<ClipboardList className="h-4 w-4" />}
        accentClassName="text-brand"
        stepIndex={5}
        activeStep={activeStep}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Request completed by"
            value={value.office.requestCompletedBy}
            onChange={(next) => updateOffice({ requestCompletedBy: next })}
            disabled={disabled}
          />
          <TextField
            label="Date completed"
            type="date"
            value={value.office.dateCompleted}
            onChange={(next) => updateOffice({ dateCompleted: next })}
            disabled={disabled}
          />
        </div>
        <div>
          <span className={LABEL_CLASS}>Signature</span>
          {disabled ? (
            value.office.signatureDataUrl ? (
              <img
                src={value.office.signatureDataUrl}
                alt="Request signature"
                className="h-32 w-full rounded-lg border border-slate-200 bg-white object-contain"
              />
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                No signature captured
              </p>
            )
          ) : (
            <VisitSignaturePad value={value.office.signatureDataUrl} onChange={updateSignature} />
          )}
        </div>
      </FormSectionCard>
    </div>
  );
};

export default DiaryLoanRentalForm;
