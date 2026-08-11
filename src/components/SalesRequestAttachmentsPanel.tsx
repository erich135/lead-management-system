import React, { useMemo, useRef, useState } from 'react';
import { Download, FileText, Loader2, Replace, Trash2, Upload } from 'lucide-react';
import {
  deleteSalesRequestAttachment,
  uploadSalesRequestAttachment,
  type SalesRequest,
} from '../lib/api';
import {
  collectRequestDownloadUrls,
  downloadAttachmentsAsZip,
  downloadStoredAttachment,
  triggerFileDownload,
  type RequestAttachmentFile,
} from '../utils/repApprovalsDownload';

interface SalesRequestAttachmentsPanelProps {
  request: SalesRequest;
  /** When true, shows the empty-state copy used on Rep Approvals. */
  showRepEmptyMessage?: boolean;
  /** When true, allows add / replace / remove of stored attachments. */
  editable?: boolean;
  /** Called after an attachment is added or removed so the parent can reload. */
  onChanged?: () => void | Promise<void>;
}

/**
 * Inline list of representative uploads with single-file and ZIP download actions.
 */
const SalesRequestAttachmentsPanel: React.FC<SalesRequestAttachmentsPanelProps> = ({
  request,
  showRepEmptyMessage = false,
  editable = false,
  onChanged,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [zipping, setZipping] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const files = useMemo(() => collectRequestDownloadUrls(request), [request]);

  /**
   * Downloads all attachments as a ZIP archive.
   */
  async function handleDownloadZip(): Promise<void> {
    setZipping(true);
    setError(null);
    try {
      await downloadAttachmentsAsZip(request, files);
    } catch (zipError: unknown) {
      const message =
        zipError instanceof Error ? zipError.message : 'Failed to create ZIP download.';
      setError(message);
    } finally {
      setZipping(false);
    }
  }

  /**
   * Uploads one or more new attachments onto the request.
   */
  async function handleAddFiles(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    if (selected.length === 0) return;

    setBusyId('add');
    setError(null);
    try {
      for (const file of selected) {
        await uploadSalesRequestAttachment(request._id, file);
      }
      await onChanged?.();
    } catch (uploadError: unknown) {
      setError(
        uploadError instanceof Error ? uploadError.message : 'Failed to upload attachment.',
      );
    } finally {
      setBusyId(null);
    }
  }

  /**
   * Replaces an existing stored attachment with a newly selected file.
   */
  async function handleReplaceFile(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    const targetId = replacingId;
    event.target.value = '';
    setReplacingId(null);
    if (!file || !targetId) return;

    setBusyId(targetId);
    setError(null);
    try {
      await uploadSalesRequestAttachment(request._id, file);
      await deleteSalesRequestAttachment(targetId);
      await onChanged?.();
    } catch (replaceError: unknown) {
      setError(
        replaceError instanceof Error ? replaceError.message : 'Failed to replace attachment.',
      );
    } finally {
      setBusyId(null);
    }
  }

  /**
   * Removes a stored attachment from the request.
   */
  async function handleRemove(file: RequestAttachmentFile): Promise<void> {
    if (!file.attachmentId) {
      setError('Only stored attachments can be removed.');
      return;
    }
    if (!window.confirm(`Remove "${file.label}" from this request?`)) return;

    setBusyId(file.attachmentId);
    setError(null);
    try {
      await deleteSalesRequestAttachment(file.attachmentId);
      await onChanged?.();
    } catch (removeError: unknown) {
      setError(
        removeError instanceof Error ? removeError.message : 'Failed to remove attachment.',
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {files.length} attachment{files.length === 1 ? '' : 's'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {files.length > 1 && (
            <button
              type="button"
              disabled={zipping || Boolean(busyId)}
              onClick={() => {
                void handleDownloadZip();
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-100 disabled:opacity-50"
            >
              {zipping ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Download ZIP
            </button>
          )}
          {editable && (
            <button
              type="button"
              disabled={Boolean(busyId)}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-lg border border-[#0969a9]/30 bg-[#0969a9]/5 px-2.5 py-1.5 text-xs font-semibold text-[#0969a9] hover:bg-[#0969a9]/10 disabled:opacity-50"
            >
              {busyId === 'add' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Add files
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        multiple
        className="hidden"
        onChange={(event) => {
          void handleAddFiles(event);
        }}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        className="hidden"
        onChange={(event) => {
          void handleReplaceFile(event);
        }}
      />

      {files.length === 0 ? (
        <p className="text-sm text-gray-500">
          {showRepEmptyMessage
            ? 'No attachments uploaded by the representative.'
            : 'No uploaded photos or documents on this request.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={`${file.attachmentId || file.filename}-${file.label}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-gray-500" />
                <span className="truncate text-sm text-gray-900">{file.label}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={Boolean(busyId)}
                  onClick={() => {
                    if (file.url.startsWith('data:')) {
                      triggerFileDownload(file.url, file.filename);
                    } else {
                      void downloadStoredAttachment(file);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-100 disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
                {editable && file.attachmentId && (
                  <>
                    <button
                      type="button"
                      disabled={Boolean(busyId)}
                      onClick={() => {
                        setReplacingId(file.attachmentId || null);
                        replaceInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                      title="Replace attachment"
                    >
                      {busyId === file.attachmentId ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Replace className="h-3.5 w-3.5" />
                      )}
                      Replace
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(busyId)}
                      onClick={() => {
                        void handleRemove(file);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      title="Remove attachment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}
    </div>
  );
};

export default SalesRequestAttachmentsPanel;
