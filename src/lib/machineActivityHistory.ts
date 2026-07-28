export const MACHINE_HISTORY_SECTIONS = [
  'jobs',
  'rsrs',
  'readings',
  'activities',
  'notes',
  'attachments',
  'relatedDocuments',
] as const;

export type MachineHistorySection = (typeof MACHINE_HISTORY_SECTIONS)[number];

export interface MachineHistoryRecordWithStableId {
  id: string;
}

export interface MachineHistoryIdentity {
  _id?: string;
  make?: string;
  model?: string;
  serialNumber?: string;
  assetNumber?: string;
}

export function buildCanonicalMachineHistoryEndpoint(
  machineId: string,
  section: MachineHistorySection,
  page: number,
  limit: number,
): string {
  const query = new URLSearchParams({ section, page: String(page), limit: String(limit) });
  return `/api/machines/${encodeURIComponent(machineId)}/canonical-history?${query.toString()}`;
}

export function mergeMachineHistoryPages<T extends MachineHistoryRecordWithStableId>(
  existing: T[],
  incoming: T[],
  replace: boolean,
): T[] {
  const merged = replace ? [] : [...existing];
  const seen = new Set(merged.map((record) => record.id));
  for (const record of incoming) {
    if (!seen.has(record.id)) {
      seen.add(record.id);
      merged.push(record);
    }
  }
  return merged;
}

export function isCurrentMachineHistoryRequest(requestGeneration: number, currentGeneration: number): boolean {
  return requestGeneration === currentGeneration;
}

export function canonicalHistoryMachineId(requestedMachineId: string, confirmedCanonicalMachineId?: string): string {
  return confirmedCanonicalMachineId || requestedMachineId;
}

export function machineIdentityLabel(identity: MachineHistoryIdentity): string {
  const name = [identity.make, identity.model].filter(Boolean).join(' ').trim();
  const reference = identity.assetNumber || identity.serialNumber;
  if (name && reference) return `${name} (${reference})`;
  return name || reference || 'another machine in this canonical group';
}

export function machineHistoryProvenanceText(
  machineIds: string[] | undefined,
  groupIdentities: MachineHistoryIdentity[],
): string | null {
  if (!machineIds?.length) return null;
  const identities = groupIdentities.filter((identity) => identity._id && machineIds.includes(identity._id));
  if (!identities.length) return 'Originally recorded against another machine in this canonical group.';
  return `Originally recorded against ${identities.map(machineIdentityLabel).join(', ')}.`;
}

// ---------------------------------------------------------------------------
// ARS-RSR-HISTORY-ACTIONS-001 — retained RSR View/Download/Print in history.
// ---------------------------------------------------------------------------

/** History record types that represent a retained RSR document. */
export type RsrHistoryRecordType = 'machineRsr' | 'jobRsr';

/** Browser-previewable MIME types for which a Print action may be shown. */
export const PRINTABLE_RSR_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

export function isRsrHistoryRecordType(type: string): type is RsrHistoryRecordType {
  return type === 'machineRsr' || type === 'jobRsr';
}

export function isPrintableRsrMimeType(mimeType: unknown): boolean {
  return (
    typeof mimeType === 'string' &&
    (PRINTABLE_RSR_MIME_TYPES as readonly string[]).includes(mimeType.toLowerCase())
  );
}

/**
 * True when a retained RSR history record's underlying file is available.
 * The backend only includes `file` once it has confirmed the retained
 * GridFS metadata exists, so absence of `file` on an RSR-type record means
 * the original file cannot be opened right now.
 */
export function isRsrHistoryFileAvailable(item: { type: string; file?: unknown }): boolean {
  return isRsrHistoryRecordType(item.type) && Boolean(item.file);
}

export interface RsrHistoryFileUrls {
  /** Opens the file inline (View / Print). */
  viewUrl: string;
  /** Triggers a save-as download preserving the original filename. */
  downloadUrl: string;
  downloadFileName: string;
}

export interface RsrHistoryUrlHelpers {
  machineRSRUrl: (machineId: string, rsrId: string) => string;
  rsrDocumentUrl: (documentId: string) => string;
}

function recordIdOf(record: Record<string, unknown> | undefined): string | null {
  const value = record?._id;
  if (typeof value === 'string' && value) return value;
  if (value && typeof value === 'object' && 'toString' in value) {
    const asString = String(value);
    return asString && asString !== '[object Object]' ? asString : null;
  }
  return null;
}

/**
 * Builds the View/Download URLs for one retained RSR history record, reusing
 * the existing authorised machine-RSR and job-RSR file endpoints. Returns
 * `null` when the record does not carry enough information to build a safe
 * URL (defensive — should not happen for records the backend already marked
 * as file-available).
 */
export function buildRsrHistoryFileUrls(
  item: { type: string; record: Record<string, unknown> },
  canonicalMachineId: string,
  token: string | null,
  urlHelpers: RsrHistoryUrlHelpers,
): RsrHistoryFileUrls | null {
  if (!isRsrHistoryRecordType(item.type)) return null;
  const recordId = recordIdOf(item.record);
  if (!recordId) return null;

  if (item.type === 'jobRsr') {
    const base = urlHelpers.rsrDocumentUrl(recordId); // already contains ?token=
    const fileName =
      (typeof item.record.originalName === 'string' && item.record.originalName) ||
      (typeof item.record.fileName === 'string' && item.record.fileName) ||
      'RSR document';
    return { viewUrl: `${base}&inline=1`, downloadUrl: base, downloadFileName: fileName };
  }

  if (!canonicalMachineId) return null;
  const base = urlHelpers.machineRSRUrl(canonicalMachineId, recordId);
  const withToken = token ? `${base}?token=${encodeURIComponent(token)}` : base;
  const fileName = (typeof item.record.fileName === 'string' && item.record.fileName) || 'RSR document';
  // The machine RSR endpoint always responds inline; the query flag is kept
  // only for consistency with the job-RSR URL shape.
  return { viewUrl: `${withToken}&inline=1`, downloadUrl: withToken, downloadFileName: fileName };
}
