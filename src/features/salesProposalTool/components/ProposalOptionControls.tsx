import React from 'react';
import type { OperatingArrangement } from '../types';
import type { ProposedEquipmentDraft } from '../equipmentState';
import { operatingArrangementSentence, suppliedMachineCount } from '../proposalOptions';

interface OperatingArrangementFieldsProps {
  rows: ProposedEquipmentDraft[];
  arrangement: OperatingArrangement;
  onArrangement: (next: OperatingArrangement) => void;
  onRunningQuantity: (key: string, runningQuantity: number) => void;
}

export function OperatingArrangementFields({
  rows,
  arrangement,
  onArrangement,
  onRunningQuantity,
}: OperatingArrangementFieldsProps) {
  const supplied = suppliedMachineCount(rows);
  if (supplied <= 1) return null;
  const severalModels = rows.filter((row) => row.quantity >= 1).length > 1;
  return (
    <div className="space-y-3 rounded-[8px] border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-semibold text-[#383838]">How will these machines operate?</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onArrangement('all_run_together')}
          className={`rounded-[8px] px-3 py-2 text-sm font-bold ${
            arrangement === 'all_run_together' ? 'bg-[#f7c12b] text-[#383838]' : 'bg-white text-[#383838]'
          }`}
        >
          All run together
        </button>
        <button
          type="button"
          onClick={() => onArrangement('some_rest')}
          className={`rounded-[8px] px-3 py-2 text-sm font-bold ${
            arrangement === 'some_rest' ? 'bg-[#f7c12b] text-[#383838]' : 'bg-white text-[#383838]'
          }`}
        >
          Some run while others rest
        </button>
      </div>
      {arrangement === 'some_rest' &&
        (severalModels ? (
          <div className="space-y-2">
            {rows.filter((row) => row.quantity >= 1).map((row) => (
              <label key={row.key} className="block text-sm text-[#383838]">
                How many {row.model || row.manufacturer || 'of these machines'} run at the same time?
                <input
                  type="number"
                  min={0}
                  max={row.quantity}
                  value={row.runningQuantity ?? row.quantity}
                  onChange={(event) => onRunningQuantity(row.key, Number(event.target.value))}
                  className="mt-1 w-24 rounded-[8px] border border-slate-300 px-3 py-2"
                />
                <span className="ml-2 text-slate-500">of {row.quantity} supplied</span>
              </label>
            ))}
          </div>
        ) : (
          <label className="block text-sm text-[#383838]">
            How many run at the same time?
            <input
              type="number"
              min={0}
              max={rows[0]?.quantity ?? 1}
              value={rows[0]?.runningQuantity ?? 1}
              onChange={(event) => rows[0] && onRunningQuantity(rows[0].key, Number(event.target.value))}
              className="mt-1 w-24 rounded-[8px] border border-slate-300 px-3 py-2"
            />
          </label>
        ))}
      <p className="text-sm text-[#383838]">{operatingArrangementSentence(rows, arrangement)}</p>
    </div>
  );
}

interface ProposalOptionBarProps {
  options: Array<{ id: string; name: string; includedInReport: boolean; archived: boolean }>;
  activeOptionId: string;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onInclude: (id: string, included: boolean) => void;
  onArchive: (id: string) => void;
  onAdd: () => void;
  showAdd: boolean;
  showSelector?: boolean;
}

export function ProposalOptionBar({
  options,
  activeOptionId,
  onSelect,
  onRename,
  onInclude,
  onArchive,
  onAdd,
  showAdd,
  showSelector = true,
}: ProposalOptionBarProps) {
  const visible = options.filter((option) => !option.archived);
  return (
    <div className="space-y-3">
      {showSelector && visible.length > 1 && (
        <div className="space-y-2 rounded-[8px] border border-slate-200 p-3">
          <p className="text-sm text-slate-600">
            Customer, site, current equipment and the Air Audit are shared. Editing them updates every option.
          </p>
          <div className="flex flex-wrap gap-2">
            {visible.map((option, index) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelect(option.id)}
                className={`rounded-[8px] px-3 py-2 text-sm font-bold ${
                  option.id === activeOptionId ? 'bg-[#0969a9] text-white' : 'bg-slate-100 text-[#383838]'
                }`}
              >
                {option.name || `Option ${index + 1}`}
              </button>
            ))}
          </div>
          {visible.map((option) =>
            option.id === activeOptionId ? (
              <div key={option.id} className="flex flex-wrap items-end gap-3">
                <label className="block text-sm">
                  Option name
                  <input
                    value={option.name}
                    onChange={(event) => onRename(option.id, event.target.value)}
                    className="mt-1 block rounded-[8px] border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={option.includedInReport}
                    onChange={(event) => onInclude(option.id, event.target.checked)}
                  />
                  Include in report
                </label>
                <button type="button" className="text-sm font-bold text-slate-600" onClick={() => onArchive(option.id)}>
                  Archive option
                </button>
              </div>
            ) : null,
          )}
        </div>
      )}
      {showAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="rounded-[8px] border border-[#0969a9] px-4 py-2 text-sm font-bold text-[#0969a9]"
        >
          Add another option
        </button>
      )}
    </div>
  );
}
