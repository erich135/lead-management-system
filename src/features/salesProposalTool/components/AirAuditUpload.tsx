import { useCallback, useState } from 'react';
import { Loader2, Trash2, Upload } from 'lucide-react';
import { AIR_AUDIT_ELECTRICAL_NOTE } from '../specDisplay';

interface AirAuditUploadProps {
  disabled?: boolean;
  uploading: boolean;
  removing: boolean;
  error: string | null;
  sourceFileName: string | null;
  onFile: (file: File) => void;
  onRemove: () => void;
}

export function AirAuditUpload({
  disabled,
  uploading,
  removing,
  error,
  sourceFileName,
  onFile,
  onRemove,
}: AirAuditUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const unavailable = disabled || uploading || removing;

  const takeFile = useCallback(
    (file: File | undefined) => {
      if (!file || unavailable) return;
      onFile(file);
    },
    [onFile, unavailable],
  );

  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-[#383838]/70 mb-1">
        Air Audit
      </label>
      <label
        className={`flex cursor-pointer flex-col items-center justify-center rounded-[8px] border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragOver ? 'border-[#0969a9] bg-sky-50' : 'border-slate-300 bg-slate-50'
        } ${unavailable ? 'pointer-events-none opacity-60' : ''}`}
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
          disabled={unavailable}
          onChange={(event) => {
            takeFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </label>
      {sourceFileName && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-600">Source file: {sourceFileName}</p>
          <button
            type="button"
            onClick={onRemove}
            disabled={unavailable}
            className="inline-flex items-center gap-1 rounded-[6px] border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {removing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {removing ? 'Removing…' : 'Remove Air Audit'}
          </button>
        </div>
      )}
      <p className="mt-2 text-xs text-slate-500">{AIR_AUDIT_ELECTRICAL_NOTE}</p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
