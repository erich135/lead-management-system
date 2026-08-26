import {
  measuredMachineLabel,
  type AirAuditScope,
} from '../airAuditScope';
import type { CurrentEquipmentDraft } from '../equipmentState';
import { currentMachineHasIdentity } from '../equipmentState';

interface AirAuditScopeFieldsProps {
  scope: AirAuditScope;
  machines: CurrentEquipmentDraft[];
  onChange: (next: AirAuditScope) => void;
}

export function AirAuditScopeFields({
  scope,
  machines,
  onChange,
}: AirAuditScopeFieldsProps) {
  const selected = machines.filter(currentMachineHasIdentity);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-500">What does this Air Audit measure?</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <label className="flex items-center gap-1.5 text-sm text-[#383838]">
          <input
            type="radio"
            name="air-audit-scope"
            checked={scope.type === 'single_machine'}
            onChange={() =>
              onChange({ type: 'single_machine', currentEquipmentId: scope.currentEquipmentId })
            }
          />
          One compressor
        </label>
        <label className="flex items-center gap-1.5 text-sm text-[#383838]">
          <input
            type="radio"
            name="air-audit-scope"
            checked={scope.type === 'site_header'}
            onChange={() => onChange({ type: 'site_header', currentEquipmentId: null })}
          />
          Site / common air header
        </label>
      </div>
      {scope.type === 'single_machine' && selected.length === 1 && (
        <p className="text-sm text-[#383838]">
          <span className="text-xs font-medium text-slate-500">Measured machine</span>
          <br />
          {measuredMachineLabel(selected[0]) || 'Selected current machine'}
        </p>
      )}
      {scope.type === 'single_machine' && selected.length > 1 && (
        <label className="block">
          <span className="text-xs font-medium text-slate-500">Which machine was measured?</span>
          <select
            className="mt-1 w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
            value={scope.currentEquipmentId ?? ''}
            onChange={(event) =>
              onChange({
                type: 'single_machine',
                currentEquipmentId: event.target.value || null,
              })
            }
          >
            <option value="">Select…</option>
            {selected.map((row) => (
              <option key={row.key} value={row.key}>
                {measuredMachineLabel(row) || row.key}
              </option>
            ))}
          </select>
        </label>
      )}
      {scope.type === 'single_machine' && selected.length === 0 && (
        <p className="text-xs text-slate-500">
          Select the measured current machine below before using machine-specific performance comparisons.
        </p>
      )}
    </div>
  );
}
