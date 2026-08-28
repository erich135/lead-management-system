import { useRef, useState, type ReactNode } from 'react';
import {
  validateContactReminders,
  confirmContactReminders,
  type ContactReminderDryRun,
  type ContactReminderPlanRow,
} from '../lib/api';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Upload,
  X,
  Bell,
} from 'lucide-react';

type Step = 'upload' | 'review' | 'importing' | 'done';

interface Props {
  onClose: () => void;
  onImportComplete: () => void;
}

function formatValue(value: string | number | boolean | null | undefined): string {
  if (value == null || value === '') return '—';
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return String(value);
}

function fieldLabel(field: string): string {
  switch (field) {
    case 'contactPerson': return 'Contact Person';
    case 'whatsAppNumber': return 'WhatsApp Number';
    case 'readingFrequencyDays': return 'Reading Frequency (Days)';
    case 'whatsAppRemindersEnabled': return 'Reminders Enabled';
    default: return field;
  }
}

export function ContactReminderImport({ onClose, onImportComplete }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [dryRun, setDryRun] = useState<ContactReminderDryRun | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    updated: number;
    unchanged: number;
    invalid: number;
    stale: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleValidate = async () => {
    if (!file) return;
    setValidating(true);
    setGlobalError(null);
    try {
      const response = await validateContactReminders(file);
      setDryRun(response.data);
      setAcknowledged(false);
      setStep('review');
    } catch (err: any) {
      setGlobalError(err.message || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const handleConfirm = async () => {
    if (!file || !dryRun || !acknowledged) return;
    setConfirming(true);
    setStep('importing');
    setGlobalError(null);
    try {
      const response = await confirmContactReminders(file);
      setResult(response.data.summary);
      setStep('done');
      onImportComplete();
    } catch (err: any) {
      setGlobalError(err.message || 'Import failed');
      setStep('review');
    } finally {
      setConfirming(false);
    }
  };

  const changingPreview = dryRun?.changing.slice(0, 50) || [];
  const invalidPreview = dryRun?.invalid.slice(0, 30) || [];
  const stalePreview = dryRun?.stale.slice(0, 30) || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Import Contact Reminders</h2>
              <p className="text-xs text-slate-500">
                {step === 'upload' && 'Updates only contact person, WhatsApp, frequency and reminder flag'}
                {step === 'review' && 'Review the dry-run. Nothing has been written yet.'}
                {step === 'importing' && 'Applying confirmed contact-reminder changes…'}
                {step === 'done' && 'Contact reminder import complete'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 'upload' && (
            <div className="space-y-5">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
                Rows are matched only by <span className="font-semibold">Machine ID</span>.
                Serial numbers, customers, hours, service dates and RSR documents are never changed.
                Stale rows are only those whose contact-reminder fields changed after export.
                Use a fresh Contact Reminders export — earlier workbooks without baseline columns will be rejected.
                Blank cells leave the current value. Use <span className="font-mono">CLEAR</span> to wipe Contact Person or WhatsApp Number.
              </div>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  file ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50'
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
                    <p className="font-semibold text-slate-600">Click to select the contact-reminder CSV or XLSX</p>
                    <p className="text-sm text-slate-400 mt-1">Must include Machine ID and hidden baseline columns from a new Contact Reminders export</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </div>
          )}

          {step === 'review' && dryRun && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryCard label="Unchanged" value={dryRun.summary.unchanged} tone="slate" />
                <SummaryCard label="Will change" value={dryRun.summary.changing} tone="indigo" />
                <SummaryCard label="Invalid" value={dryRun.summary.invalid} tone="red" />
                <SummaryCard label="Stale" value={dryRun.summary.stale} tone="amber" />
              </div>

              {changingPreview.length > 0 && (
                <Section title="Rows that will change">
                  {changingPreview.map((row) => (
                    <ChangeRow key={`${row.rowNumber}-${row.machineId}`} row={row} />
                  ))}
                  {dryRun.changing.length > changingPreview.length && (
                    <p className="text-xs text-slate-500 px-3 py-2">
                      Showing {changingPreview.length} of {dryRun.changing.length} changing rows
                    </p>
                  )}
                </Section>
              )}

              {stalePreview.length > 0 && (
                <Section title="Stale / conflicting rows (will be skipped)">
                  {stalePreview.map((row) => (
                    <IssueRow key={`stale-${row.rowNumber}`} row={row} />
                  ))}
                </Section>
              )}

              {invalidPreview.length > 0 && (
                <Section title="Invalid rows (will be skipped)">
                  {invalidPreview.map((row) => (
                    <IssueRow key={`invalid-${row.rowNumber}`} row={row} />
                  ))}
                </Section>
              )}

              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                />
                <span>
                  I have reviewed this dry-run. Only the four contact-reminder fields will be updated for the
                  {' '}{dryRun.summary.changing} changing row{dryRun.summary.changing === 1 ? '' : 's'}.
                  Invalid and stale rows will not be imported.
                </span>
              </label>
            </div>
          )}

          {step === 'importing' && (
            <div className="py-16 text-center text-slate-600">
              <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin text-indigo-600" />
              Applying confirmed contact-reminder updates…
            </div>
          )}

          {step === 'done' && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle2 className="w-5 h-5" />
                <p className="font-medium">Updated {result.updated} machine{result.updated === 1 ? '' : 's'}.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryCard label="Updated" value={result.updated} tone="indigo" />
                <SummaryCard label="Unchanged" value={result.unchanged} tone="slate" />
                <SummaryCard label="Invalid" value={result.invalid} tone="red" />
                <SummaryCard label="Stale" value={result.stale} tone="amber" />
              </div>
            </div>
          )}

          {globalError && (
            <div className="mt-4 flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{globalError}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
          {step === 'upload' && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleValidate}
                disabled={!file || validating}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg flex items-center gap-2"
              >
                {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Dry-run
              </button>
            </>
          )}
          {step === 'review' && (
            <>
              <button
                onClick={() => { setStep('upload'); setDryRun(null); setAcknowledged(false); }}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={!acknowledged || confirming || (dryRun?.summary.changing || 0) === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg"
              >
                Confirm import
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'slate' | 'indigo' | 'red' | 'amber';
}) {
  const tones = {
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    indigo: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    red: 'bg-red-50 text-red-800 border-red-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
  };
  return (
    <div className={`rounded-xl border px-3 py-3 ${tones[tone]}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">{children}</div>
    </div>
  );
}

function ChangeRow({ row }: { row: ContactReminderPlanRow }) {
  return (
    <div className="px-4 py-3 text-sm">
      <p className="font-mono text-xs text-slate-500">
        Row {row.rowNumber} · {row.machineId}
      </p>
      <ul className="mt-1 space-y-1">
        {row.changes.map((change) => (
          <li key={change.field} className="text-slate-700">
            <span className="font-medium">{fieldLabel(change.field)}:</span>{' '}
            <span className="text-slate-500">{formatValue(change.oldValue)}</span>
            {' → '}
            <span className="text-indigo-700">{formatValue(change.newValue)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function IssueRow({ row }: { row: ContactReminderPlanRow }) {
  return (
    <div className="px-4 py-3 text-sm">
      <p className="font-mono text-xs text-slate-500">
        Row {row.rowNumber} · {row.machineId || 'no Machine ID'}
      </p>
      <p className="text-slate-700 mt-1">{row.reason}</p>
      {row.staleFields && row.staleFields.length > 0 && (
        <ul className="mt-2 space-y-2">
          {row.staleFields.map((field) => (
            <li key={field.field} className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
              <p className="font-medium">{fieldLabel(field.field)} changed after export</p>
              <p className="text-xs mt-1">
                Exported: {formatValue(field.exportedBaseline)}
                {' · '}Current: {formatValue(field.currentDatabase)}
                {' · '}Spreadsheet: {formatValue(field.proposedSpreadsheet)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
