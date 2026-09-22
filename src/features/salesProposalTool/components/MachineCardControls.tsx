import type { ReactNode } from 'react';

export function ActionButton({
  children,
  onClick,
  primary = false,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[8px] px-3 py-1.5 text-xs font-medium ${
        primary
          ? 'bg-[#f7c12b] text-[#383838] hover:brightness-95'
          : 'bg-slate-100 text-[#383838] hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

export function MachineActionRow({
  onLibrary,
  onManual,
  onUpload,
}: {
  onLibrary: () => void;
  onManual: () => void;
  onUpload: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton primary onClick={onLibrary}>
        Choose from library
      </ActionButton>
      <ActionButton onClick={onManual}>Enter manually</ActionButton>
      <ActionButton onClick={onUpload}>Upload spec sheet</ActionButton>
    </div>
  );
}

export function QuantityField({
  value,
  onChange,
}: {
  value: number;
  onChange: (quantity: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500">Quantity</span>
      <input
        type="number"
        min={1}
        max={99}
        step={1}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange(Number.isInteger(next) && next >= 1 && next <= 99 ? next : 1);
        }}
        className="mt-1 w-24 rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
      />
    </label>
  );
}
