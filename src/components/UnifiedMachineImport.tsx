import { useState, useRef } from 'react';
import {
  validateMachinesCSV,
  confirmMachinesImport,
  type ValidatedMachineRow,
  type ErrorMachineRow,
} from '../lib/api';
import {
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronRight,
  SkipForward,
  Cog,
} from 'lucide-react';

type Step = 'upload' | 'review' | 'importing' | 'done';

interface Props {
  onClose: () => void;
  onImportComplete: () => void;
}

export function UnifiedMachineImport({ onClose, onImportComplete }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [validRows, setValidRows] = useState<ValidatedMachineRow[]>([]);
  const [errorRows, setErrorRows] = useState<ErrorMachineRow[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; updated: number; skipped: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 1: Validate ──────────────────────────────────────────────────────

  const handleValidate = async () => {
    if (!file) return;
    setValidating(true);
    setGlobalError(null);
    try {
      const result = await validateMachinesCSV(file);
      setValidRows(result.data.validRows);
      setErrorRows(result.data.errorRows.map(r => ({ ...r, resolvedCustomerId: undefined, skip: false })));
      setStep('review');
    } catch (err: any) {
      setGlobalError(err.message || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  // ── Step 2: Error row corrections ─────────────────────────────────────────

  const resolveRow = (rowIndex: number, customerId: string, customerName: string) => {
    setErrorRows(prev =>
      prev.map(r =>
        r.rowIndex === rowIndex
          ? { ...r, resolvedCustomerId: customerId, customerName, skip: false }
          : r,
      ),
    );
  };

  const skipRow = (rowIndex: number) => {
    setErrorRows(prev =>
      prev.map(r =>
        r.rowIndex === rowIndex ? { ...r, skip: true, resolvedCustomerId: undefined } : r,
      ),
    );
  };

  const unSkipRow = (rowIndex: number) => {
    setErrorRows(prev =>
      prev.map(r => r.rowIndex === rowIndex ? { ...r, skip: false } : r),
    );
  };

  // ── Step 3: Confirm import ────────────────────────────────────────────────

  const handleConfirm = async () => {
    setStep('importing');
    setGlobalError(null);
    try {
      // Build final row list
      const correctedErrors: (ValidatedMachineRow | ErrorMachineRow)[] = errorRows.map(r => {
        if (r.skip) return { ...r, skip: true };
        if (r.resolvedCustomerId) {
          return {
            ...r,
            customerId: r.resolvedCustomerId,
            isRental: false,
            skip: false,
          } as ValidatedMachineRow;
        }
        // Still unresolved — skip
        return { ...r, skip: true };
      });

      const allRows = [...validRows, ...correctedErrors];
      const result = await confirmMachinesImport(allRows);
      setImportResult(result.data);
      setStep('done');
      onImportComplete();
    } catch (err: any) {
      setGlobalError(err.message || 'Import failed');
      setStep('review');
    }
  };

  // ── Derived counts ────────────────────────────────────────────────────────

  const resolvedCount = errorRows.filter(r => r.resolvedCustomerId && !r.skip).length;
  const skippedCount  = errorRows.filter(r => r.skip).length;
  const unresolvedCount = errorRows.filter(r => !r.resolvedCustomerId && !r.skip).length;
  const willImport = validRows.length + resolvedCount;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Cog className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Import Machines</h2>
              <p className="text-xs text-slate-500">
                {step === 'upload'    && 'Upload your master sheet CSV'}
                {step === 'review'    && 'Review and fix any issues before importing'}
                {step === 'importing' && 'Importing machines…'}
                {step === 'done'      && 'Import complete'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Upload Step ── */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  file ? 'border-amber-400 bg-amber-50' : 'border-slate-300 hover:border-amber-400 hover:bg-amber-50'
                }`}
              >
                <Upload className="w-10 h-10 mx-auto mb-3 text-slate-400" />
                {file ? (
                  <div>
                    <p className="font-semibold text-slate-700">{file.name}</p>
                    <p className="text-sm text-slate-500 mt-1">{(file.size / 1024).toFixed(0)} KB — click to change</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-slate-600">Click to select your CSV file</p>
                    <p className="text-sm text-slate-400 mt-1">Must have Make, Model, Serial Number columns</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }}
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-700 mb-2">Required columns</p>
                <div className="flex flex-wrap gap-2">
                  {['Make', 'Model', 'Serial Number'].map(c => (
                    <span key={c} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">{c}</span>
                  ))}
                </div>
                <p className="text-xs font-semibold text-slate-700 mt-3 mb-2">Optional columns</p>
                <div className="flex flex-wrap gap-2">
                  {['Asset Number','Machine Type','Customer','Cash Customer','Unit Ownership',
                    'Service Type','Machine Hours','Next Service Hours','Last Service Date',
                    'Next Service Date','Current Location','Last Oil Sample Date','Oil Sample Comment',
                  ].map(c => (
                    <span key={c} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{c}</span>
                  ))}
                </div>
              </div>

              {globalError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {globalError}
                </div>
              )}
            </div>
          )}

          {/* ── Review Step ── */}
          {step === 'review' && (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{validRows.length}</p>
                  <p className="text-xs text-green-600 mt-0.5">Ready to import</p>
                </div>
                <div className={`border rounded-xl p-3 text-center ${errorRows.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                  <p className={`text-2xl font-bold ${errorRows.length > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                    {errorRows.length}
                  </p>
                  <p className={`text-xs mt-0.5 ${errorRows.length > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    Need attention
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-slate-600">{skippedCount}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Marked to skip</p>
                </div>
              </div>

              {errorRows.length === 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  All rows validated successfully — ready to import!
                </div>
              )}

              {/* Error rows table */}
              {errorRows.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">
                    Rows needing attention ({errorRows.length})
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      — fix or skip each row before importing
                    </span>
                  </p>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="max-h-80 overflow-y-auto">
                      {errorRows.map(row => (
                        <ErrorRowCard
                          key={row.rowIndex}
                          row={row}
                          onResolve={(id, name) => resolveRow(row.rowIndex, id, name)}
                          onSkip={() => skipRow(row.rowIndex)}
                          onUnSkip={() => unSkipRow(row.rowIndex)}
                        />
                      ))}
                    </div>
                  </div>
                  {unresolvedCount > 0 && (
                    <p className="text-xs text-amber-600 mt-2">
                      {unresolvedCount} row{unresolvedCount !== 1 ? 's' : ''} still unresolved — they will be skipped automatically.
                    </p>
                  )}
                </div>
              )}

              {globalError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {globalError}
                </div>
              )}
            </div>
          )}

          {/* ── Importing Step ── */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
              <p className="text-slate-600 font-medium">Importing {willImport} machines…</p>
              <p className="text-sm text-slate-400">This may take a moment. Please don't close this window.</p>
            </div>
          )}

          {/* ── Done Step ── */}
          {step === 'done' && importResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">Import complete!</p>
                  <p className="text-sm text-green-700 mt-0.5">The machine list has been updated.</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-700">{importResult.imported}</p>
                  <p className="text-sm text-green-600 mt-1">New machines created</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-blue-700">{importResult.updated}</p>
                  <p className="text-sm text-blue-600 mt-1">Existing machines updated</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-slate-600">{importResult.skipped}</p>
                  <p className="text-sm text-slate-500 mt-1">Rows skipped</p>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-semibold text-red-700 mb-1">
                    {importResult.errors.length} row{importResult.errors.length !== 1 ? 's' : ''} had errors:
                  </p>
                  <ul className="text-xs text-red-600 space-y-0.5 max-h-32 overflow-y-auto">
                    {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          {step === 'done' ? (
            <div className="ml-auto">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={step === 'review' ? () => setStep('upload') : onClose}
                disabled={step === 'importing'}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors disabled:opacity-40"
              >
                {step === 'review' ? '← Back' : 'Cancel'}
              </button>

              {step === 'upload' && (
                <button
                  onClick={handleValidate}
                  disabled={!file || validating}
                  className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {validating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Validating…</>
                  ) : (
                    <><ChevronRight className="w-4 h-4" /> Validate CSV</>
                  )}
                </button>
              )}

              {step === 'review' && (
                <button
                  onClick={handleConfirm}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Import {willImport} machine{willImport !== 1 ? 's' : ''}
                  {(unresolvedCount + skippedCount) > 0 && (
                    <span className="ml-1 text-xs opacity-80">
                      (+{unresolvedCount + skippedCount} skipped)
                    </span>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Error Row Card ───────────────────────────────────────────────────────────

interface ErrorRowCardProps {
  row: ErrorMachineRow;
  onResolve: (id: string, name: string) => void;
  onSkip: () => void;
  onUnSkip: () => void;
}

function ErrorRowCard({ row, onResolve, onSkip, onUnSkip }: ErrorRowCardProps) {
  const isResolved = !!row.resolvedCustomerId;
  const isSkipped  = !!row.skip;

  return (
    <div className={`px-4 py-3 border-b border-slate-100 last:border-0 ${isSkipped ? 'opacity-50 bg-slate-50' : isResolved ? 'bg-green-50' : 'bg-white'}`}>
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className="mt-0.5 flex-shrink-0">
          {isSkipped  && <SkipForward className="w-4 h-4 text-slate-400" />}
          {isResolved && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          {!isSkipped && !isResolved && <AlertCircle className="w-4 h-4 text-amber-500" />}
        </div>

        <div className="flex-1 min-w-0">
          {/* Machine info */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-800">
              {row.make} {row.model}
            </span>
            <span className="text-xs text-slate-400 font-mono">{row.serialNumber}</span>
            <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">Row {row.rowIndex}</span>
          </div>

          {/* Error message */}
          {!isSkipped && (
            <p className="text-xs text-amber-700 mt-0.5">{row.errorMessage}</p>
          )}
          {isSkipped && (
            <p className="text-xs text-slate-400 mt-0.5">This row will be skipped</p>
          )}

          {/* Fix controls */}
          {!isSkipped && row.errorType === 'customer_not_found' && (
            <div className="mt-2 space-y-1.5">
              {row.suggestions.length > 0 ? (
                <>
                  <p className="text-xs text-slate-500">Did you mean:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {row.suggestions.map(s => (
                      <button
                        key={s.id}
                        onClick={() => onResolve(s.id, s.name)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          row.resolvedCustomerId === s.id
                            ? 'bg-green-500 text-white border-green-500'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400 italic">No suggestions found — skip this row or fix the CSV</p>
              )}
            </div>
          )}
        </div>

        {/* Skip / Undo button */}
        <div className="flex-shrink-0">
          {isSkipped ? (
            <button
              onClick={onUnSkip}
              className="text-xs text-blue-500 hover:text-blue-700 underline"
            >
              Undo
            </button>
          ) : (
            <button
              onClick={onSkip}
              className="text-xs text-slate-400 hover:text-slate-600 underline"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
