import { useEffect, useState } from 'react';
import { ChevronDown, ClipboardCheck, ShieldCheck } from 'lucide-react';
import type {
  ProposalField,
  SourceType,
} from '../../proposalLocalTypes';
import { displayProposalValue } from './proposalDisplay';

const SOURCE_TYPES: SourceType[] = [
  'logger_upload',
  'bouwa_technician_measurement',
  'site_measurement',
  'customer_document',
  'customer_verbal',
  'manufacturer_document',
  'calibration_certificate',
  'questionnaire',
  'site_interview',
  'engineering_judgement',
  'commercial_source',
  'user_entry',
  'not_provided',
];

function jsonValue(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value ?? '');
}

export function ProposalSelect({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-slate-600">
      {label}
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
      >
        {values.map(item => <option key={item} value={item}>{displayProposalValue(item)}</option>)}
      </select>
    </label>
  );
}

export function ProposalTextInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  readOnly = false,
  focusTarget = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  focusTarget?: boolean;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-slate-600">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        aria-readonly={readOnly}
        data-proposal-editable={focusTarget && !readOnly ? 'true' : undefined}
        onChange={event => onChange?.(event.target.value)}
        className={`rounded-lg border px-3 py-2 text-sm ${
          readOnly
            ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500'
            : 'border-slate-300 bg-white text-slate-800'
        }`}
      />
    </label>
  );
}

function DerivedState({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
        {label} · system derived
      </p>
      <p className="mt-1 text-sm font-semibold capitalize text-blue-950">
        {displayProposalValue(value)}
      </p>
    </div>
  );
}

export function ProposalFieldEditor({
  field,
  onChange,
  onAcknowledge,
  onEvidenceUpload,
  onVerifyValue,
  canAcknowledge,
  canVerifyValue,
  focusRequestToken,
  onFocusRequestHandled,
}: {
  field: ProposalField;
  onChange: (field: ProposalField) => void;
  onAcknowledge: (fieldId: string) => void;
  onEvidenceUpload: (fieldId: string, file: File) => void;
  onVerifyValue: (fieldId: string) => void;
  canAcknowledge: boolean;
  canVerifyValue: boolean;
  focusRequestToken?: number;
  onFocusRequestHandled: (token: number) => void;
}) {
  const [expanded, setExpanded] = useState(field.section === 'proposal_input');
  const panelId = `proposal-field-panel-${field.id}`;
  const statusTone = field.validationStatus === 'valid'
    ? 'bg-emerald-50 text-emerald-700'
    : field.validationStatus === 'missing' || field.validationStatus === 'contradictory'
      ? 'bg-red-50 text-red-700'
      : 'bg-amber-50 text-amber-700';
  const patch = (changes: Partial<ProposalField>) => onChange({ ...field, ...changes });
  const sourcePatch = (changes: Partial<ProposalField['source']>) =>
    patch({ source: { ...field.source, ...changes } });

  useEffect(() => {
    if (focusRequestToken === undefined) return;
    setExpanded(true);
    window.setTimeout(() => {
      const container = document.getElementById(`proposal-field-${field.id}`);
      const target = container?.querySelector<HTMLElement>(
        '[data-proposal-editable="true"]',
      );
      (target ?? container)?.focus();
      onFocusRequestHandled(focusRequestToken);
    }, 0);
  }, [field.id, focusRequestToken, onFocusRequestHandled]);

  return (
    <article id={`proposal-field-${field.id}`} tabIndex={-1} className="scroll-mt-24 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-ars-primary">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded(value => !value)}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ars-primary">
              {field.questionnaireReference}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone}`}>
              {displayProposalValue(field.validationStatus)}
            </span>
            {field.provisionalAcknowledgement?.acknowledged && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                acknowledged
              </span>
            )}
          </div>
          <h4 className="mt-1 font-semibold capitalize text-slate-900">{field.name}</h4>
          <p className="mt-1 text-xs leading-5 text-slate-500">{field.description}</p>
        </div>
        <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div id={panelId} className="border-t border-slate-100 p-4">
          <div className="grid gap-3 lg:grid-cols-3">
            <ProposalTextInput label="Editable name" value={field.name} onChange={name => patch({ name })} />
            <ProposalTextInput
              label="Questionnaire reference"
              value={field.questionnaireReference}
              onChange={questionnaireReference => patch({ questionnaireReference })}
            />
            <ProposalTextInput label="Unit" value={field.unit} onChange={unit => patch({ unit })} />
          </div>
          <label className="mt-3 grid gap-1 text-xs font-medium text-slate-600">
            Plain-language description
            <textarea
              rows={2}
              value={field.description}
              onChange={event => patch({ description: event.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="mt-3 grid gap-1 text-xs font-medium text-slate-600">
            Value
            <textarea
              data-proposal-editable="true"
              rows={2}
              value={jsonValue(field.value)}
              onChange={event => patch({ value: event.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              User-declared source
            </p>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <ProposalSelect
                label="Source type"
                value={field.source.type}
                values={SOURCE_TYPES}
                onChange={value => sourcePatch({ type: value as SourceType })}
              />
              <ProposalTextInput label="Source person" value={field.source.person} onChange={person => sourcePatch({ person })} />
              <ProposalTextInput label="Source date" type="date" value={field.source.date} onChange={date => sourcePatch({ date })} />
              <ProposalTextInput label="Document reference" value={field.source.documentReference} onChange={documentReference => sourcePatch({ documentReference })} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <DerivedState label="Nature" value={field.nature} />
            <DerivedState label="Evidence attached" value={field.evidenceStatus === 'attached' ? 'attached' : `not ${field.evidenceStatus}`} />
            <DerivedState label="Value verification" value={field.valueVerificationStatus === 'unverified' ? 'not yet verified' : field.valueVerificationStatus} />
            <DerivedState label="Parser measurement" value={field.id === 'logger_analysis_result' && field.valueVerificationStatus === 'verified' ? 'attested when linked' : 'not applicable'} />
            <DerivedState label="Validation" value={field.validationStatus} />
            <DerivedState label="Confidence" value={field.confidenceStatus} />
            <DerivedState label="Engineering/workflow approval" value={field.approval.status} />
            <DerivedState label="Exact value" value={field.valueVerificationStatus} />
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            Attached, measured, documented exact-value, parser-attested, and workflow-approved are separate states. The backend requires an actual evidence record for attachment, and authorised exact-value verification or a parser attestation for value trust; typed document references and uploaded files alone remain unverified.
          </div>
          <label className="mt-3 grid gap-1 text-xs font-medium text-slate-600">
            Notes
            <textarea rows={2} value={field.notes} onChange={event => patch({ notes: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            <strong>System-owned calculation effect:</strong> {field.calculationEffect}
          </div>
          {!!field.requiredEvidence.length && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              <strong>Evidence needed:</strong> {field.requiredEvidence.join('; ')}
            </div>
          )}
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">
            <ClipboardCheck className="h-4 w-4" /> Attach local evidence record
            <input
              type="file"
              className="sr-only"
              onChange={event => {
                const file = event.target.files?.[0];
                if (file) onEvidenceUpload(field.id, file);
                event.currentTarget.value = '';
              }}
            />
          </label>
          <button
            type="button"
            disabled={!canVerifyValue}
            onClick={() => onVerifyValue(field.id)}
            className="ml-2 mt-3 inline-flex items-center gap-2 rounded-lg border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-800 disabled:border-slate-200 disabled:text-slate-300"
          >
            <ShieldCheck className="h-4 w-4" /> Verify exact field value
          </button>
          {field.provisionalAcknowledgement?.material && (
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-950">
              <p className="font-semibold">Material provisional item</p>
              <p className="mt-1 leading-5">
                Acknowledgement adds one server-owned workflow record bound to this proposal, field, settings version, and content hash.
              </p>
              <button
                type="button"
                disabled={
                  field.provisionalAcknowledgement.acknowledged ||
                  !canAcknowledge
                }
                onClick={() => onAcknowledge(field.id)}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white disabled:bg-slate-300"
              >
                <ClipboardCheck className="h-4 w-4" />
                {field.provisionalAcknowledgement.acknowledged
                  ? 'Acknowledged in this version'
                  : canAcknowledge
                    ? 'Acknowledge this item'
                    : 'Current identity cannot acknowledge'}
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
