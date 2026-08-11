import React, { useMemo, useState } from 'react';
import { Download, FileText, Loader2, X } from 'lucide-react';
import type { SalesRequest } from '../lib/api';
import {
  collectRequestDownloadUrls,
  downloadAttachmentsAsZip,
  triggerFileDownload,
  type RequestAttachmentFile,
} from '../utils/repApprovalsDownload';

interface SalesRequestAttachmentsSheetProps {
  request: SalesRequest | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Bottom sheet for choosing attachments when a rep request has multiple uploads.
 */
const SalesRequestAttachmentsSheet: React.FC<SalesRequestAttachmentsSheetProps> = ({
  request,
  open,
  onClose,
}) => {
  const [zipping, setZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const files = useMemo<RequestAttachmentFile[]>(() => {
    if (!request) return [];
    return collectRequestDownloadUrls(request);
  }, [request]);

  if (!open || !request) return null;

  /**
   * Downloads every attachment as one ZIP file.
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

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 max-h-[88vh] w-full max-w-lg overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-xl sm:rounded-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Attachments</h2>
            <p className="mt-0.5 text-sm text-gray-600">
              {request.requestNumber} · {files.length} file{files.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="max-h-[60vh] overflow-y-auto px-4 py-4">
          {files.length === 0 ? (
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-600">
              No attachments uploaded by the representative.
            </p>
          ) : (
            <ul className="space-y-2">
              {files.map((file) => (
                <li
                  key={`${file.filename}-${file.label}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-gray-500" />
                    <span className="truncate text-sm font-medium text-gray-900">{file.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (file.url.startsWith('data:')) {
                        triggerFileDownload(file.url, file.filename);
                      } else {
                        void downloadStoredAttachment(file);
                      }
                    }}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-100"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          )}
        </div>

        {files.length > 1 && (
          <footer className="border-t border-gray-200 px-4 py-3">
            <button
              type="button"
              disabled={zipping}
              onClick={() => {
                void handleDownloadZip();
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0969a9] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {zipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download all as ZIP
            </button>
          </footer>
        )}
      </div>
    </div>
  );
};

export default SalesRequestAttachmentsSheet;
