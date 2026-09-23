import { useEffect, useState } from 'react';
import { Download, FileText, Loader2, Printer, Save, X } from 'lucide-react';
import {
  downloadJobRfqAttachment,
  downloadJobRfqPdf,
  updateJobSalesRequestData,
  type Job,
  type JobSalesRequestData,
} from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { SalesRequestFormPresentation } from './SalesRequestFormPresentation';

interface OriginatingRfqPanelProps {
  job: Job;
  onJobUpdated: (job: Job) => void;
}

function editorName(job: Job): string {
  const editor = job.salesRequestDataEditedBy;
  if (!editor || typeof editor === 'string') return '';
  return [editor.firstName, editor.lastName].filter(Boolean).join(' ') || editor.email || '';
}

/**
 * Originating RFQ panel on a Job. Save/Cancel edit the Job copy only.
 */
export function OriginatingRfqPanel({ job, onJobUpdated }: OriginatingRfqPanelProps) {
  const { hasPermission, isSuperAdmin } = useAuth();
  const copy = job.salesRequestData;
  const canEditCopy = isSuperAdmin || hasPermission('jobs.update');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<JobSalesRequestData>(copy || {});

  useEffect(() => {
    if (!editing) setDraft(copy || {});
  }, [copy, editing]);

  if (!copy?.requestNumber) return null;

  async function handleSave(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const result = await updateJobSalesRequestData(job._id, {
        formData: draft.formData,
        visitNotes: draft.visitNotes,
        customerCompanyName: draft.customerCompanyName,
        customerContactPerson: draft.customerContactPerson,
      });
      onJobUpdated(result.job);
      setEditing(false);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save RFQ copy.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePrint(): Promise<void> {
    setPrinting(true);
    setError(null);
    try {
      await downloadJobRfqPdf(job._id, job.jobNumber);
    } catch (printError: unknown) {
      setError(printError instanceof Error ? printError.message : 'Failed to generate PDF.');
    } finally {
      setPrinting(false);
    }
  }

  const lastCorrected = job.salesRequestDataEditedAt
    ? `Last corrected ${new Date(job.salesRequestDataEditedAt).toLocaleString()}${
        editorName(job) ? ` by ${editorName(job)}` : ''
      }`
    : 'Not corrected after conversion';

  return (
    <section className="rounded-xl border border-[#0969a9]/20 bg-[#0969a9]/5 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Originating RFQ</h3>
          <p className="text-sm text-slate-600">
            {copy.requestNumber}
            {typeof copy.approvedVersion === 'number' ? ` · approved version ${copy.approvedVersion}` : ''}
          </p>
          <p className="text-xs text-slate-500">{lastCorrected}</p>
          {job.salesRequestDataEditedAt ? (
            <p className="mt-1 inline-block rounded bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800">
              Corrected copy
            </p>
          ) : (
            <p className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              Original approved copy
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handlePrint()}
            disabled={printing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
          >
            {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            Print PDF
          </button>
          {canEditCopy && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0969a9] px-3 py-2 text-xs font-semibold text-white"
            >
              Edit copy
            </button>
          )}
          {editing && (
            <>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0969a9] px-3 py-2 text-xs font-semibold text-white"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(copy);
                  setEditing(false);
                  setError(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Customer</span>
          {editing ? (
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={draft.customerCompanyName || ''}
              onChange={(event) =>
                setDraft({ ...draft, customerCompanyName: event.target.value })
              }
            />
          ) : (
            <span>{copy.customerCompanyName || '—'}</span>
          )}
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Contact</span>
          {editing ? (
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={draft.customerContactPerson || ''}
              onChange={(event) =>
                setDraft({ ...draft, customerContactPerson: event.target.value })
              }
            />
          ) : (
            <span>{copy.customerContactPerson || '—'}</span>
          )}
        </label>
      </div>

      <label className="mt-3 block text-sm">
        <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Visit notes</span>
        {editing ? (
          <textarea
            className="min-h-[80px] w-full rounded-lg border border-slate-300 px-3 py-2"
            value={draft.visitNotes || ''}
            onChange={(event) => setDraft({ ...draft, visitNotes: event.target.value })}
          />
        ) : (
          <p className="whitespace-pre-wrap break-words">{copy.visitNotes || '—'}</p>
        )}
      </label>

      <div className="mt-3">
        <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Form content</p>
        <SalesRequestFormPresentation
          requestType={String((editing ? draft.requestType : copy.requestType) || '')}
          formData={editing ? draft.formData : copy.formData}
        />
      </div>

      <div className="mt-3">
        <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Attachments</p>
        {(copy.attachments || []).length === 0 ? (
          <p className="text-sm text-slate-500">No attachments on the approved version.</p>
        ) : (
          <ul className="space-y-1">
            {(copy.attachments || []).map((attachment) => {
              const id = attachment.attachmentId || attachment._id;
              return (
                <li key={id || attachment.originalName} className="flex items-center justify-between gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    {attachment.originalName}
                    {attachment.mimeType ? ` · ${attachment.mimeType}` : ''}
                    {typeof attachment.size === 'number' ? ` · ${attachment.size} B` : ''}
                  </span>
                  {id && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[#0969a9]"
                      onClick={() =>
                        void downloadJobRfqAttachment(job._id, id, attachment.originalName)
                      }
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
