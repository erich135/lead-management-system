import JSZip from 'jszip';
import { getAuthToken } from '../lib/api';
import { resolveApiBaseUrl } from '../lib/resolveApiBaseUrl';
import type { SalesRequest, SalesRequestAttachmentMeta } from '../lib/api';

export interface RequestAttachmentFile {
  url: string;
  filename: string;
  label: string;
  attachmentId?: string;
}

export type AttachmentDownloadAction =
  | { kind: 'empty' }
  | { kind: 'single'; file: RequestAttachmentFile }
  | { kind: 'multiple'; files: RequestAttachmentFile[] };

/**
 * Builds an authenticated download URL for a stored sales request attachment.
 */
export function getSalesRequestAttachmentDownloadUrl(attachmentId: string): string {
  const token = getAuthToken();
  const base = resolveApiBaseUrl();
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${base}/api/sales-requests/attachments/${attachmentId}/download${query}`;
}

/**
 * Collects downloadable files from stored attachments, visit photos, and nested form files.
 */
export function collectRequestDownloadUrls(request: SalesRequest): RequestAttachmentFile[] {
  const files: RequestAttachmentFile[] = [];
  const base = request.requestNumber || request._id;
  const seen = new Set<string>();

  /**
   * Registers a file once using a stable dedupe key.
   */
  function addFile(file: RequestAttachmentFile, dedupeKey: string): void {
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    files.push(file);
  }

  for (const attachment of (request.attachments || []) as SalesRequestAttachmentMeta[]) {
    if (!attachment?._id) continue;
    addFile(
      {
        url: getSalesRequestAttachmentDownloadUrl(attachment._id),
        filename: attachment.originalName,
        label: attachment.caption || attachment.originalName,
        attachmentId: attachment._id,
      },
      `stored:${attachment._id}`,
    );
  }

  for (const [index, photo] of (request.visitPhotos || []).entries()) {
    if (photo?.attachmentId) {
      addFile(
        {
          url: getSalesRequestAttachmentDownloadUrl(photo.attachmentId),
          filename: `${base}-photo-${index + 1}.jpg`,
          label: photo.caption?.trim() || `Visit photo ${index + 1}`,
          attachmentId: photo.attachmentId,
        },
        `stored:${photo.attachmentId}`,
      );
      continue;
    }

    if (!photo?.dataUrl) continue;
    const ext = photo.dataUrl.startsWith('data:image/png') ? 'png' : 'jpg';
    const label = photo.caption?.trim() || `Visit photo ${index + 1}`;
    addFile(
      {
        url: photo.dataUrl,
        filename: `${base}-photo-${index + 1}.${ext}`,
        label,
      },
      `inline:${photo.dataUrl.slice(0, 64)}`,
    );
  }

  /**
   * Walks nested form objects for embedded base64 file payloads.
   */
  function walk(value: unknown, path: string): void {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(entry, `${path}-${index}`));
      return;
    }
    const record = value as Record<string, unknown>;

    for (const key of ['dataUrl', 'signatureDataUrl'] as const) {
      const candidate = record[key];
      if (typeof candidate === 'string' && candidate.startsWith('data:')) {
        const mime = candidate.slice(5, candidate.indexOf(';')) || 'application/octet-stream';
        const ext = mime.includes('pdf')
          ? 'pdf'
          : mime.includes('png')
            ? 'png'
            : mime.includes('jpeg') || mime.includes('jpg')
              ? 'jpg'
              : 'jpg';
        const name =
          typeof record.name === 'string' && record.name.trim()
            ? record.name.trim()
            : `${base}${path || '-attachment'}.${ext}`;
        addFile(
          {
            url: candidate,
            filename: name.includes('.') ? name : `${name}.${ext}`,
            label: key === 'signatureDataUrl' ? 'Customer signature' : name,
          },
          `inline:${path}:${key}`,
        );
        return;
      }
    }

    for (const [key, nested] of Object.entries(record)) {
      walk(nested, `${path}-${key}`);
    }
  }

  walk(request.formData, '');

  return files;
}

/**
 * Resolves how attachment download should behave for a request.
 */
export function resolveAttachmentDownloadAction(
  request: SalesRequest,
): AttachmentDownloadAction {
  const files = collectRequestDownloadUrls(request);
  if (files.length === 0) return { kind: 'empty' };
  if (files.length === 1) return { kind: 'single', file: files[0] };
  return { kind: 'multiple', files };
}

/**
 * Triggers a browser download for a data URL or remote file URL.
 */
export function triggerFileDownload(url: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

/**
 * Triggers a browser download for a Blob payload.
 */
function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  triggerFileDownload(objectUrl, filename);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

/**
 * Converts a data URL into a Blob for ZIP packaging.
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * Fetches a remote attachment using auth when required.
 */
async function fetchAttachmentBlob(file: RequestAttachmentFile): Promise<Blob> {
  if (file.url.startsWith('data:')) {
    return dataUrlToBlob(file.url);
  }

  const token = getAuthToken();
  const response = await fetch(file.url, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error(`Failed to download ${file.filename}`);
  }

  return response.blob();
}

/**
 * Downloads all request attachments as a single ZIP archive.
 */
export async function downloadAttachmentsAsZip(
  request: SalesRequest,
  files: RequestAttachmentFile[] = collectRequestDownloadUrls(request),
): Promise<void> {
  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const file of files) {
    let filename = file.filename;
    let duplicate = 1;
    while (usedNames.has(filename)) {
      const dot = file.filename.lastIndexOf('.');
      const stem = dot >= 0 ? file.filename.slice(0, dot) : file.filename;
      const ext = dot >= 0 ? file.filename.slice(dot) : '';
      filename = `${stem}-${duplicate}${ext}`;
      duplicate += 1;
    }
    usedNames.add(filename);
    const blob = await fetchAttachmentBlob(file);
    zip.file(filename, blob);
  }

  const archive = await zip.generateAsync({ type: 'blob' });
  const archiveName = `${request.requestNumber || request._id}-attachments.zip`;
  triggerBlobDownload(archive, archiveName);
}

/**
 * Downloads a stored attachment through the authenticated API.
 */
export async function downloadStoredAttachment(file: RequestAttachmentFile): Promise<void> {
  const blob = await fetchAttachmentBlob(file);
  triggerBlobDownload(blob, file.filename);
}

/**
 * Deep-merges edited form values while preserving original embedded file payloads.
 */
export function preserveSubmittedAttachments(
  original: Record<string, unknown>,
  edited: Record<string, unknown>,
): Record<string, unknown> {
  return mergePreservingDataUrls(original, edited) as Record<string, unknown>;
}

/**
 * Recursively merges form data, keeping original file blobs after submission.
 */
function mergePreservingDataUrls(original: unknown, edited: unknown): unknown {
  if (edited === undefined || edited === null) return original;
  if (typeof edited !== 'object') return edited;

  if (Array.isArray(edited)) {
    return edited.map((item, index) =>
      mergePreservingDataUrls(Array.isArray(original) ? original[index] : undefined, item),
    );
  }

  const originalRecord =
    original && typeof original === 'object' && !Array.isArray(original)
      ? (original as Record<string, unknown>)
      : {};
  const editedRecord = edited as Record<string, unknown>;

  for (const key of ['dataUrl', 'signatureDataUrl'] as const) {
    if (
      typeof editedRecord[key] === 'string' &&
      String(editedRecord[key]).startsWith('data:') &&
      typeof originalRecord[key] === 'string'
    ) {
      return {
        ...editedRecord,
        [key]: originalRecord[key],
        ...(typeof originalRecord.name === 'string' ? { name: originalRecord.name } : {}),
      };
    }
  }

  const merged: Record<string, unknown> = { ...editedRecord };
  for (const key of Object.keys(editedRecord)) {
    merged[key] = mergePreservingDataUrls(originalRecord[key], editedRecord[key]);
  }
  return merged;
}

/**
 * @deprecated Use resolveAttachmentDownloadAction + triggerFileDownload instead.
 */
export function downloadSalesRequestAttachment(request: SalesRequest): boolean {
  const action = resolveAttachmentDownloadAction(request);
  if (action.kind === 'empty') return false;
  if (action.kind === 'single') {
    if (action.file.url.startsWith('data:')) {
      triggerFileDownload(action.file.url, action.file.filename);
    } else {
      void downloadStoredAttachment(action.file);
    }
    return true;
  }
  if (action.files[0].url.startsWith('data:')) {
    triggerFileDownload(action.files[0].url, action.files[0].filename);
  } else {
    void downloadStoredAttachment(action.files[0]);
  }
  return true;
}
