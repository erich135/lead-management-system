import { useCallback, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { AIR_AUDIT_ELECTRICAL_NOTE } from '../specDisplay';

interface AirAuditUploadProps {
  disabled?: boolean;
  uploading: boolean;
  error: string | null;
  sourceFileName: string | null;
  onFile: (file: File) => void;
}

export function AirAuditUpload({
  disabled,
  uploading,
  error,
  sourceFileName,
  onFile,
}: AirAuditUploadProps) {
  const [dragOver, setDragOver] = useState(false);

  const takeFile = useCallback(
    (file: File | undefined) => {
      if (!file || disabled) return;
      onFile(file);
    },
    [disabled, onFile],
  );

  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-[#383838]/70 mb-1">
        Air Audit
      </label>
      <label
        className={`flex cursor-pointer flex-col items-center justify-center rounded-[8px] border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragOver ? 'border-[#0969a9] bg-sky-50' : 'border-slate-300 bg-slate-50'
        } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          takeFile(event.dataTransfer.files[0]);
        }}
      >
        {uploading ? (
          <Loader2 className="mb-2 h-6 w-6 animate-spin text-[#0969a9]" />
        ) : (
          <Upload className="mb-2 h-6 w-6 text-[#0969a9]" />
        )}
        <span className="text-sm font-medium text-[#383838]">Drop CSV here</span>
        <span className="mt-1 text-xs text-slate-500">or select CSV</span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          disabled={disabled || uploading}
          onChange={(event) => {
            takeFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </label>
      {sourceFileName && (
        <p className="mt-2 text-xs text-slate-600">Source file: {sourceFileName}</p>
      )}
      <p className="mt-2 text-xs text-slate-500">{AIR_AUDIT_ELECTRICAL_NOTE}</p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
