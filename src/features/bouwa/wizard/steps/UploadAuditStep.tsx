/**
 * The upload step of the Air Audit path.
 *
 * The file is sent exactly as it came off the logger and everything the file
 * states is read from it: filename, hash, the period it covers, the interval,
 * the channels, the gaps. None of that is asked for, because a person retyping
 * a hash or a start date is a person introducing an error into the one part of
 * the record that is genuinely authoritative.
 *
 * What the file does not state is said plainly rather than left blank, so a
 * reader can tell a value that was read from one that was never there.
 */

import { useRef, useState } from 'react';
import { Download, FileCheck2, Loader2, ShieldCheck, Upload } from 'lucide-react';

import {
  downloadWizardFile,
  wizardSourceDownloadUrl,
} from '../wizardApi';
import type { WizardDraft, WizardSourceFact } from '../wizardTypes';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export interface UploadAuditStepProps {
  draft: WizardDraft;
  sourceFacts: WizardSourceFact[];
  disabled: boolean;
  busy: boolean;
  onUpload: (file: File) => Promise<boolean>;
}

export function UploadAuditStep({
  draft,
  sourceFacts,
  disabled,
  busy,
  onUpload,
}: UploadAuditStepProps) {
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState('');

  async function choose(file: File | undefined) {
    if (file === undefined) return;
    setProblem('');
    const accepted = await onUpload(file);
    if (!accepted) setProblem('The export was not accepted. Nothing was stored.');
    if (input.current !== null) input.current.value = '';
  }

  const held = draft.sourceFile;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-5 text-center">
        <input
          ref={input}
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          className="hidden"
          onChange={event => void choose(event.target.files?.[0])}
        />
        <Upload className="mx-auto h-6 w-6 text-slate-400" />
        <p className="mt-2 text-sm font-medium text-slate-800">
          {held === null
            ? 'Upload the untouched logger export'
            : 'Replace the logger export'}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          Send the file exactly as it came off the logger. Do not open it, sort it
          or save it again first.
        </p>
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => input.current?.click()}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-ars-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {held === null ? 'Choose file' : 'Choose replacement'}
        </button>
        {problem === '' ? null : (
          <p className="mt-2 text-xs text-rose-600">{problem}</p>
        )}
      </div>

      {held === null ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          You can continue without the file and upload it later. Measured demand
          and data quality stay unavailable until a record has been read.
        </p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <FileCheck2 className="h-4 w-4 text-emerald-600" />
              {held.filename}
              <span className="text-xs font-normal text-slate-500">
                {formatBytes(held.byteSize)}
                {held.version > 1 ? ` · version ${held.version}` : ''}
              </span>
            </span>
            <button
              type="button"
              onClick={() =>
                void downloadWizardFile(
                  wizardSourceDownloadUrl(draft.draftId),
                  held.filename,
                )
              }
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Download original
            </button>
          </div>
          <p className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Verified from untouched source bytes · SHA-256
            <span className="font-mono">{held.sha256.slice(0, 16)}…</span>
          </p>
          <dl className="grid gap-x-6 gap-y-1 border-t border-slate-100 px-3 py-2.5 sm:grid-cols-2">
            {sourceFacts.map(fact => (
              <div key={fact.id} className="flex justify-between gap-3 text-xs">
                <dt className="text-slate-500">{fact.label}</dt>
                <dd
                  className={`text-right ${
                    fact.unavailable ? 'text-slate-400' : 'font-medium text-slate-800'
                  }`}
                  title={fact.sourceLabel}
                >
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
