/**
 * Supporting documents.
 *
 * A document is attached against the kind of evidence it is, because an
 * unlabelled PDF proves nothing: the readiness contract asks for a calibration
 * certificate or an electricity bill, not for a file.
 *
 * Attaching a document does not answer a question and does not clear a blocker.
 * The answer it supports still has to be given, and the person reviewing the
 * proposal still has to accept the document. Saying so here is the difference
 * between a workflow that collects evidence and one that looks like it has.
 */

import { useRef, useState } from 'react';
import { Download, FileUp, Loader2, Paperclip } from 'lucide-react';

import type {
  AuditEvidenceType,
  AuditIntakeFormModel,
} from '../../auditIntakeTypes';
import { downloadWizardFile, wizardUrl } from '../wizardApi';
import { formatSavedAt } from '../wizardState';
import type { WizardDraft } from '../wizardTypes';

export interface DocumentsScreenProps {
  draft: WizardDraft;
  formModel: AuditIntakeFormModel;
  disabled: boolean;
  busy: boolean;
  onUpload: (
    file: File,
    options: { evidenceType: AuditEvidenceType | null },
  ) => Promise<boolean>;
}

export function DocumentsScreen({
  draft,
  formModel,
  disabled,
  busy,
  onUpload,
}: DocumentsScreenProps) {
  const input = useRef<HTMLInputElement>(null);
  const [evidenceType, setEvidenceType] = useState<AuditEvidenceType | ''>('');
  const [problem, setProblem] = useState('');

  const typeLabel = new Map(
    formModel.evidenceTypes.map(option => [option.value, option.label]),
  );
  const current = draft.attachments.filter(
    attachment => attachment.supersededByAttachmentId === null,
  );

  async function choose(file: File | undefined) {
    if (file === undefined) return;
    setProblem('');
    const stored = await onUpload(file, {
      evidenceType: evidenceType === '' ? null : evidenceType,
    });
    if (!stored) setProblem('The document was not stored. Nothing was changed.');
    if (input.current !== null) input.current.value = '';
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
        <label
          htmlFor="wizard-evidence-type"
          className="text-sm font-medium text-slate-800"
        >
          What does this document prove?
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            id="wizard-evidence-type"
            disabled={disabled || busy}
            value={evidenceType}
            onChange={event =>
              setEvidenceType(event.target.value as AuditEvidenceType | '')
            }
            className="min-w-[18rem] flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm disabled:bg-slate-100"
          >
            <option value="">Choose the kind of document…</option>
            {formModel.evidenceTypes.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            ref={input}
            type="file"
            className="hidden"
            onChange={event => void choose(event.target.files?.[0])}
          />
          <button
            type="button"
            disabled={disabled || busy || evidenceType === ''}
            onClick={() => input.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg bg-ars-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4" />
            )}
            Attach document
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Attaching a document does not answer the question it supports, and does
          not release anything that is blocked. The answer still has to be given
          and the document still has to be accepted.
        </p>
        {problem === '' ? null : (
          <p className="mt-1.5 text-xs text-rose-600">{problem}</p>
        )}
      </div>

      <div>
        <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Attached to this proposal ({current.length})
        </h4>
        {current.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">
            No documents attached yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {current.map(attachment => (
              <li
                key={attachment.attachmentId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm text-slate-800">
                    <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate">{attachment.filename}</span>
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">
                    {attachment.evidenceType === null
                      ? 'Kind not stated'
                      : (typeLabel.get(attachment.evidenceType) ??
                        attachment.evidenceType)}{' '}
                    · {attachment.uploadedByName ?? 'Unattributed'} ·{' '}
                    {formatSavedAt(attachment.uploadedAt)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    void downloadWizardFile(
                      wizardUrl(
                        `/drafts/${encodeURIComponent(draft.draftId)}/documents/${encodeURIComponent(attachment.attachmentId)}`,
                      ),
                      attachment.filename,
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
