import { useRef, useState } from 'react';
import { uploadEfficiencyAudit } from '../api';
import {
  applyEfficiencyAuditToFields,
  applyEfficiencyManualInput,
  EFFICIENCY_BLANK_HELPER,
  EFFICIENCY_FIELD_LABEL,
  efficiencySource,
  efficiencySourceLabel,
  UPLOAD_EFFICIENCY_AUDIT_LABEL,
  type MachineEfficiencyFields,
} from '../machineEfficiency';

interface MachineEfficiencyFieldProps {
  proposalId: string;
  value: MachineEfficiencyFields;
  onChange: (next: MachineEfficiencyFields) => void;
}

export function MachineEfficiencyField({
  proposalId,
  value,
  onChange,
}: MachineEfficiencyFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const source = efficiencySource(value.efficiencyPercent, value.efficiencyOrigin);
  const display =
    value.efficiencyPercent == null ? '' : String(value.efficiencyPercent);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const stored = await uploadEfficiencyAudit(proposalId, file);
      onChange(
        applyEfficiencyAuditToFields(value, stored.extractedPercent, {
          sourceFileId: stored.sourceFileId,
          sourceFileName: stored.sourceFileName,
          sourceSha256: stored.sourceSha256,
        }),
      );
      if (stored.extractionStatus === 'no_supported_values') {
        setError(
          'No clearly identified efficiency value was found. Enter the percentage manually.',
        );
      } else if (stored.extractionStatus === 'read_failed') {
        setError('The efficiency audit could not be read. Enter the percentage manually.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not upload the efficiency audit.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-1">
      <label className="block">
        <span className="text-xs font-medium text-slate-500">{EFFICIENCY_FIELD_LABEL}</span>
        <input
          type="number"
          min={0.001}
          max={100}
          step="any"
          value={display}
          onChange={(event) => onChange(applyEfficiencyManualInput(value, event.target.value))}
          className="mt-1 w-28 rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
        />
      </label>
      <p className="text-xs text-slate-500">{EFFICIENCY_BLANK_HELPER}</p>
      <p className="text-xs text-slate-500">Source: {efficiencySourceLabel(source)}</p>
      {value.efficiencyAudit?.sourceFileName && (
        <p className="text-xs text-slate-500">
          Efficiency audit: {value.efficiencyAudit.sourceFileName}
        </p>
      )}
      <div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.xlsx,.csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="rounded-[8px] bg-slate-100 px-3 py-1.5 text-xs font-medium text-[#383838] hover:bg-slate-200 disabled:opacity-60"
        >
          {uploading ? 'Uploading…' : UPLOAD_EFFICIENCY_AUDIT_LABEL}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
