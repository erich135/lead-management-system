import { useEffect, useState } from 'react';
import { BadgeDollarSign, Plus, Trash2 } from 'lucide-react';

import type {
  AuditCommercialScenario,
  AuditEvidenceReference,
  AuditEquipmentGroup,
  AuditRecurringCommercialCostComponent,
  CommercialComponentKind,
  RecordValueProvenance,
} from '../../auditIntakeTypes';
import { EvidenceProvenanceOverrideEditor } from './EvidenceProvenanceOverrideEditor';
import {
  commercialComponentBusinessProjection,
  commercialComponentCurrentValue,
  commercialScenarioBusinessProjection,
  commercialScenarioCurrentValue,
  isSourceBackedProvenance,
  recordOverride,
  structuredRecordChanged,
  structuredRecordIsRemovable,
} from '../recordProvenancePresentation';

const KINDS: { value: CommercialComponentKind; label: string }[] = [
  { value: 'fixed_service', label: 'Fixed service charge (R/month)' },
  { value: 'variable_volume', label: 'Volume rate (R/m³)' },
  { value: 'customer_electricity', label: 'Customer electricity (R/month)' },
  { value: 'customer_maintenance', label: 'Customer maintenance (R/month)' },
];

function blankProvenance(): RecordValueProvenance {
  return {
    sourceValue: null,
    currentValue: null,
    sourceReference: null,
    sourceFilename: null,
    sourceSha256: null,
    sourcePage: null,
    sourceText: null,
    evidenceIds: [],
    verificationStatus: 'confirmation_required',
    overrideReason: null,
    actor: null,
    recordedAt: null,
  };
}

function id(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? String(Date.now())}`;
}

function ComponentCard({
  component,
  evidence,
  disabled,
  onSave,
  onRemove,
}: {
  component: AuditRecurringCommercialCostComponent;
  evidence: AuditEvidenceReference[];
  disabled: boolean;
  onSave: (component: AuditRecurringCommercialCostComponent) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(component);
  useEffect(() => setDraft(component), [component]);
  const sourceBacked = isSourceBackedProvenance(component.provenance);
  const changed = structuredRecordChanged(
    component,
    draft,
    commercialComponentBusinessProjection,
  );
  const removable = structuredRecordIsRemovable(component);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Component"><input value={draft.label} disabled={disabled} onChange={event => setDraft({ ...draft, label: event.target.value })} /></Field>
        <Field label="Cost basis">
          <select value={draft.kind} disabled={disabled} onChange={event => setDraft({ ...draft, kind: event.target.value as CommercialComponentKind })}>
            {KINDS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field label={draft.kind === 'variable_volume' ? 'Rate (R/m³)' : 'Amount (R/month)'}>
          <input type="number" min="0" step="any" value={draft.amountRand ?? ''} disabled={disabled} onChange={event => setDraft({ ...draft, amountRand: event.target.value === '' ? null : Number(event.target.value) })} />
        </Field>
        <Field label="Payer">
          <select value={draft.payer} disabled={disabled} onChange={event => setDraft({ ...draft, payer: event.target.value as typeof draft.payer })}>
            <option value="customer">Customer</option><option value="provider">Provider</option><option value="shared">Shared</option>
          </select>
        </Field>
        <Field label="Responsibility">
          <select value={draft.responsibility} disabled={disabled} onChange={event => setDraft({ ...draft, responsibility: event.target.value as typeof draft.responsibility })}>
            <option value="confirmation_required">Unknown / confirm</option><option value="customer">Customer</option><option value="provider">Provider</option><option value="shared">Shared</option>
          </select>
        </Field>
        <Field label="Source reference"><input value={draft.sourceReference} disabled={disabled || sourceBacked} onChange={event => setDraft({ ...draft, sourceReference: event.target.value })} /></Field>
        <label className="flex items-center gap-2 self-end py-1.5 text-[11px] text-slate-600">
          <input type="checkbox" checked={draft.confirmed} disabled={disabled} onChange={event => setDraft({ ...draft, confirmed: event.target.checked })} /> Confirmed charge
        </label>
        {removable ? (
          <button type="button" disabled={disabled} onClick={onRemove} className="flex items-center gap-1 self-end py-1.5 text-[11px] text-rose-600 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /> Remove</button>
        ) : (
          <p className="self-end text-[10px] text-slate-500">Source-backed records are retained; supersede through an evidenced override.</p>
        )}
      </div>
      <EvidenceProvenanceOverrideEditor
        provenance={{
          ...component.provenance,
          currentValue: commercialComponentCurrentValue(draft),
        }}
        evidence={evidence}
        disabled={disabled}
        requiresOverride={sourceBacked && changed}
        onApply={(reason, evidenceId) =>
          onSave({
            ...draft,
            provenance: recordOverride(
              component.provenance,
              commercialComponentCurrentValue(draft),
              reason,
              evidenceId,
              sourceBacked && changed,
            ),
          })
        }
      />
    </div>
  );
}

function ScenarioCard({
  scenario,
  groups,
  components,
  evidence,
  disabled,
  onSave,
  onRemove,
}: {
  scenario: AuditCommercialScenario;
  groups: AuditEquipmentGroup[];
  components: AuditRecurringCommercialCostComponent[];
  evidence: AuditEvidenceReference[];
  disabled: boolean;
  onSave: (scenario: AuditCommercialScenario) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(scenario);
  useEffect(() => setDraft(scenario), [scenario]);
  const numeric = (value: string) => (value === '' ? null : Number(value));
  const sourceBacked = isSourceBackedProvenance(scenario.provenance);
  const changed = structuredRecordChanged(
    scenario,
    draft,
    commercialScenarioBusinessProjection,
  );
  const removable = structuredRecordIsRemovable(scenario);
  return (
    <div className={`rounded-lg border p-3 ${scenario.scenarioKind === 'source' ? 'border-blue-200 bg-blue-50/30' : 'border-emerald-200 bg-emerald-50/30'}`}>
      <div className="flex justify-between gap-2">
        <p className="text-xs font-semibold text-slate-800">
          {scenario.scenarioKind === 'source' ? 'Source-stated scenario' : 'Actual scientific calculation'}
        </p>
        {removable ? (
          <button type="button" disabled={disabled} onClick={onRemove} className="text-rose-600 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
        ) : (
          <p className="max-w-60 text-right text-[10px] text-slate-500">Source-backed records are retained; supersede through an evidenced override.</p>
        )}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Scenario label"><input value={draft.label} disabled={disabled} onChange={event => setDraft({ ...draft, label: event.target.value })} /></Field>
        <Field label="Equipment group">
          <select value={draft.equipmentGroupId} disabled={disabled} onChange={event => setDraft({ ...draft, equipmentGroupId: event.target.value })}>
            <option value="">Unknown / not selected</option>
            {groups.map(group => <option key={group.groupId} value={group.groupId}>{group.quantity} × {group.manufacturer || 'Unknown'} {group.model}</option>)}
          </select>
        </Field>
        <Field label="Base year"><input type="number" value={draft.baseYear || ''} disabled={disabled} onChange={event => setDraft({ ...draft, baseYear: Number(event.target.value) })} /></Field>
        <Field label="Days per month"><input type="number" min="1" max="31" value={draft.daysPerMonth || ''} disabled={disabled} onChange={event => setDraft({ ...draft, daysPerMonth: Number(event.target.value) })} /></Field>
        <Field label="Contract months"><input type="number" min="1" value={draft.contractTermMonths ?? ''} disabled={disabled} onChange={event => setDraft({ ...draft, contractTermMonths: numeric(event.target.value) })} /></Field>
        <Field label="Annual escalation fraction"><input type="number" min="-1" step="any" value={draft.annualEscalationFraction ?? ''} disabled={disabled} onChange={event => setDraft({ ...draft, annualEscalationFraction: numeric(event.target.value) })} /></Field>
        <Field label="Source monthly total (R)"><input type="number" min="0" step="any" value={draft.sourceStatedMonthlyTotalRand ?? ''} disabled={disabled} onChange={event => setDraft({ ...draft, sourceStatedMonthlyTotalRand: numeric(event.target.value) })} /></Field>
        <Field label="Source five-year total (R)"><input type="number" min="0" step="any" value={draft.sourceStatedFiveYearTotalRand ?? ''} disabled={disabled} onChange={event => setDraft({ ...draft, sourceStatedFiveYearTotalRand: numeric(event.target.value) })} /></Field>
        <Field label="Charge combination">
          <select value={draft.combinationStatus} disabled={disabled} onChange={event => setDraft({ ...draft, combinationStatus: event.target.value as typeof draft.combinationStatus })}>
            <option value="unconfirmed_stacking">Unknown — additive sensitivity only</option>
            <option value="confirmed_additive">Confirmed additive</option>
            <option value="confirmed_alternative">Confirmed alternatives</option>
          </select>
        </Field>
        <Field label="Source reference"><input value={draft.sourceReference} disabled={disabled || sourceBacked} onChange={event => setDraft({ ...draft, sourceReference: event.target.value })} /></Field>
      </div>
      <fieldset className="mt-2">
        <legend className="text-[11px] text-slate-500">Recurring components in this scenario</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {components.map(component => (
            <label key={component.componentId} className="flex items-center gap-1 text-[11px] text-slate-600">
              <input
                type="checkbox"
                checked={draft.componentIds.includes(component.componentId)}
                disabled={disabled}
                onChange={event => setDraft({
                  ...draft,
                  componentIds: event.target.checked
                    ? [...draft.componentIds, component.componentId]
                    : draft.componentIds.filter(item => item !== component.componentId),
                })}
              />
              {component.label || 'Unnamed component'}
            </label>
          ))}
        </div>
      </fieldset>
      <EvidenceProvenanceOverrideEditor
        provenance={{
          ...scenario.provenance,
          currentValue: commercialScenarioCurrentValue(draft),
        }}
        evidence={evidence}
        disabled={disabled}
        requiresOverride={sourceBacked && changed}
        onApply={(reason, evidenceId) =>
          onSave({
            ...draft,
            provenance: recordOverride(
              scenario.provenance,
              commercialScenarioCurrentValue(draft),
              reason,
              evidenceId,
              sourceBacked && changed,
            ),
          })
        }
      />
    </div>
  );
}

export function CommercialScenarioEditor({
  components,
  scenarios,
  groups,
  evidence,
  disabled,
  onComponentsChange,
  onScenariosChange,
}: {
  components: AuditRecurringCommercialCostComponent[];
  scenarios: AuditCommercialScenario[];
  groups: AuditEquipmentGroup[];
  evidence: AuditEvidenceReference[];
  disabled: boolean;
  onComponentsChange: (components: AuditRecurringCommercialCostComponent[]) => void;
  onScenariosChange: (scenarios: AuditCommercialScenario[]) => void;
}) {
  const [addingComponent, setAddingComponent] = useState(false);
  const [componentLabel, setComponentLabel] = useState('');
  const [componentKind, setComponentKind] = useState<CommercialComponentKind | ''>('');
  const [componentPayer, setComponentPayer] = useState<'' | 'customer' | 'provider' | 'shared'>('');
  const [componentSource, setComponentSource] = useState('');
  const [addingScenario, setAddingScenario] = useState<'source' | 'independent' | null>(null);
  const [scenarioLabel, setScenarioLabel] = useState('');
  const [scenarioGroup, setScenarioGroup] = useState('');
  const [scenarioBaseYear, setScenarioBaseYear] = useState('');
  const [scenarioDays, setScenarioDays] = useState('');
  const [scenarioSource, setScenarioSource] = useState('');
  const [scenarioCombination, setScenarioCombination] = useState<AuditCommercialScenario['combinationStatus'] | ''>('');
  const addComponent = () => {
    if (!componentLabel.trim() || componentKind === '' || componentPayer === '' || !componentSource.trim()) return;
    onComponentsChange([...components, {
      componentId: id('cost'),
      label: componentLabel.trim(),
      kind: componentKind,
      payer: componentPayer,
      responsibility: 'confirmation_required',
      amountRand: null,
      sourceReference: componentSource.trim(),
      confirmed: false,
      provenance: blankProvenance(),
    }]);
    setAddingComponent(false);
    setComponentLabel('');
    setComponentKind('');
    setComponentPayer('');
    setComponentSource('');
  };
  const addScenario = () => {
    if (
      addingScenario === null ||
      !scenarioLabel.trim() ||
      !scenarioGroup ||
      !Number.isInteger(Number(scenarioBaseYear)) ||
      Number(scenarioBaseYear) < 1900 ||
      !Number.isFinite(Number(scenarioDays)) ||
      Number(scenarioDays) <= 0 ||
      Number(scenarioDays) > 31 ||
      !scenarioSource.trim() ||
      scenarioCombination === ''
    )
      return;
    onScenariosChange([...scenarios, {
      scenarioId: id(addingScenario),
      label: scenarioLabel.trim(),
      scenarioKind: addingScenario,
      equipmentGroupId: scenarioGroup,
      componentIds: [],
      combinationStatus: scenarioCombination,
      contractTermMonths: null,
      annualEscalationFraction: null,
      baseYear: Number(scenarioBaseYear),
      escalationBasis: 'annual_compound_from_base_year',
      roundingPolicy: 'unrounded_calculation_display_2dp',
      sourceStatedMonthlyTotalRand: null,
      sourceStatedFiveYearTotalRand: null,
      requiredComponentKinds: [],
      daysPerMonth: Number(scenarioDays),
      sourceReference: scenarioSource.trim(),
      provenance: blankProvenance(),
    }]);
    setAddingScenario(null);
    setScenarioLabel('');
    setScenarioGroup('');
    setScenarioBaseYear('');
    setScenarioDays('');
    setScenarioSource('');
    setScenarioCombination('');
  };

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-slate-800"><BadgeDollarSign className="h-4 w-4 text-ars-primary" /> Recurring commercial scenarios</p>
          <p className="text-[11px] text-slate-500">Record payer and responsibility per component. Source and independent scenarios stay separate; the server calculates totals and five-year values.</p>
        </div>
        <div className="flex flex-wrap gap-1">
          <SmallAdd disabled={disabled} label="Component" onClick={() => setAddingComponent(value => !value)} />
          <SmallAdd disabled={disabled} label="Source scenario" onClick={() => setAddingScenario('source')} />
          <SmallAdd disabled={disabled} label="Actual scientific calculation" onClick={() => setAddingScenario('independent')} />
        </div>
      </div>
      {addingComponent && (
        <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Component label"><input value={componentLabel} onChange={event => setComponentLabel(event.target.value)} /></Field>
          <Field label="Cost basis"><select value={componentKind} onChange={event => setComponentKind(event.target.value as CommercialComponentKind | '')}><option value="">Choose basis</option>{KINDS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
          <Field label="Payer"><select value={componentPayer} onChange={event => setComponentPayer(event.target.value as typeof componentPayer)}><option value="">Choose payer</option><option value="customer">Customer</option><option value="provider">Provider</option><option value="shared">Shared</option></select></Field>
          <Field label="Source reference"><input value={componentSource} onChange={event => setComponentSource(event.target.value)} /></Field>
          <button type="button" disabled={!componentLabel.trim() || componentKind === '' || componentPayer === '' || !componentSource.trim()} onClick={addComponent} className="self-end rounded-md bg-ars-primary px-2.5 py-1.5 text-[11px] font-medium text-white disabled:opacity-50">Record component</button>
        </div>
      )}
      {addingScenario !== null && (
        <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-6">
          <Field label={`${addingScenario === 'source' ? 'Source' : 'Independent'} scenario label`}><input value={scenarioLabel} onChange={event => setScenarioLabel(event.target.value)} /></Field>
          <Field label="Equipment group"><select value={scenarioGroup} onChange={event => setScenarioGroup(event.target.value)}><option value="">Choose group</option>{groups.map(group => <option key={group.groupId} value={group.groupId}>{group.quantity} × {group.manufacturer} {group.model}</option>)}</select></Field>
          <Field label="Base year"><input type="number" min="1900" max="9999" value={scenarioBaseYear} onChange={event => setScenarioBaseYear(event.target.value)} /></Field>
          <Field label="Days per month"><input type="number" min="1" max="31" value={scenarioDays} onChange={event => setScenarioDays(event.target.value)} /></Field>
          <Field label="Charge combination"><select value={scenarioCombination} onChange={event => setScenarioCombination(event.target.value as typeof scenarioCombination)}><option value="">Choose status</option><option value="confirmed_additive">Confirmed additive</option><option value="confirmed_alternative">Confirmed alternatives</option><option value="unconfirmed_stacking">Unknown — sensitivity only</option></select></Field>
          <Field label="Source reference"><input value={scenarioSource} onChange={event => setScenarioSource(event.target.value)} /></Field>
          <button type="button" disabled={!scenarioLabel.trim() || !scenarioGroup || Number(scenarioBaseYear) < 1900 || Number(scenarioDays) <= 0 || Number(scenarioDays) > 31 || !scenarioSource.trim() || scenarioCombination === ''} onClick={addScenario} className="rounded-md bg-ars-primary px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-50">Record scenario</button>
        </div>
      )}
      {components.length === 0 && scenarios.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">No recurring commercial scenario supplied. No charge has been assumed.</p>
      )}
      {components.map(component => (
        <ComponentCard key={component.componentId} component={component} evidence={evidence} disabled={disabled} onSave={next => onComponentsChange(components.map(item => item.componentId === next.componentId ? next : item))} onRemove={() => onComponentsChange(components.filter(item => item.componentId !== component.componentId))} />
      ))}
      {scenarios.map(scenario => (
        <ScenarioCard key={scenario.scenarioId} scenario={scenario} groups={groups} components={components} evidence={evidence} disabled={disabled} onSave={next => onScenariosChange(scenarios.map(item => item.scenarioId === next.scenarioId ? next : item))} onRemove={() => onScenariosChange(scenarios.filter(item => item.scenarioId !== scenario.scenarioId))} />
      ))}
    </section>
  );
}

function SmallAdd({ disabled, label, onClick }: { disabled: boolean; label: string; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium disabled:opacity-50"><Plus className="h-3 w-3" /> {label}</button>;
}

function Field({ label, children }: { label: string; children: React.ReactElement }) {
  return <label className="text-[11px] text-slate-500">{label}<span className="mt-0.5 block [&>*]:w-full [&>*]:rounded-md [&>*]:border [&>*]:border-slate-300 [&>*]:px-2 [&>*]:py-1.5 [&>*]:text-xs disabled:[&>*]:bg-slate-100">{children}</span></label>;
}
