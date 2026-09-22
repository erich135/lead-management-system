import { VARIABLE_SPEED_DRIVE_LABEL } from '../variableSpeedDrive';

export function VariableSpeedDriveCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="mt-2 flex items-center gap-2 text-sm text-[#383838]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-[#0969a9] focus:ring-[#0969a9]/30"
      />
      <span>{VARIABLE_SPEED_DRIVE_LABEL}</span>
    </label>
  );
}
