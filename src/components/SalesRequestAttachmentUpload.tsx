import React, { useRef, useState } from 'react';
import { FileText, Loader2, Paperclip, Trash2, Upload } from 'lucide-react';
import {
  uploadSalesRequestAttachment,
  type SalesRequestAttachmentMeta,
} from '../lib/api';

export interface LocalRequestAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
  caption?: string;
  stored?: SalesRequestAttachmentMeta;
}

interface SalesRequestAttachmentUploadProps {
  requestId?: string;
  attachments: LocalRequestAttachment[];
  onChange: (next: LocalRequestAttachment[]) => void;
  disabled?: boolean;
}

/**
 * Reads a selected file as a data URL for draft persistence.
 */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Creates a stable local attachment id.
 */
function createAttachmentId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Upload section for rep sales request submissions (photos, PDFs, documents).
 */
const SalesRequestAttachmentUpload: React.FC<SalesRequestAttachmentUploadProps> = ({
  requestId,
  attachments,
  onChange,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Adds selected files locally and uploads immediately when a draft request exists.
   */
  async function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0 || disabled) return;

    setUploading(true);
    setError(null);

    try {
      const next = [...attachments];

      for (const file of files) {
        const dataUrl = await readFileAsDataUrl(file);
        const localAttachment: LocalRequestAttachment = {
          id: createAttachmentId(),
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          dataUrl,
        };

        if (requestId) {
          const stored = await uploadSalesRequestAttachment(requestId, file);
          localAttachment.stored = stored;
        }

        next.push(localAttachment);
      }

      onChange(next);
    } catch (uploadError: unknown) {
      const message =
        uploadError instanceof Error ? uploadError.message : 'Failed to upload attachment.';
      setError(message);
    } finally {
      setUploading(false);
    }
  }

  /**
   * Removes one local attachment from the pending list.
   */
  function removeAttachment(id: string): void {
    onChange(attachments.filter((item) => item.id !== id));
  }

  return (
    <section className="rounded-xl border border-line bg-surface-elevated p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-ink">Attachments</h3>
          <p className="text-xs text-ink-muted">
            Upload photos, PDFs, or documents. Files are linked to this request when saved.
          </p>
        </div>
        {!disabled && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="crm-btn-secondary inline-flex items-center gap-1.5 !px-3 !py-2 text-xs"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Add files
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        multiple
        className="hidden"
        onChange={(event) => {
          void handleFilesSelected(event);
        }}
      />

      {attachments.length === 0 ? (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface px-4 py-8 text-sm text-ink-muted disabled:opacity-50"
        >
          <Paperclip className="h-5 w-5" />
          Tap to upload photos or documents
        </button>
      ) : (
        <ul className="space-y-2">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-ink-subtle" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{attachment.fileName}</p>
                  <p className="text-[11px] text-ink-muted">
                    {attachment.stored ? 'Saved to request' : 'Pending save'}
                  </p>
                </div>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.id)}
                  className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                  aria-label={`Remove ${attachment.fileName}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}
    </section>
  );
};

export default SalesRequestAttachmentUpload;
