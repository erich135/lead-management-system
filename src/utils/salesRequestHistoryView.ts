import type {
  SalesRequestSubmission,
  SalesRequestSubmissionHistory,
  SalesRequestSubmissionOutcome,
} from '../lib/api';

export const NO_RECORDED_HISTORY_MESSAGE =
  'Earlier submission history was not recorded for this request.';

export const EXISTING_RECORD_CAPTURE_NOTE =
  'Captured from the existing record — not the original submission.';

/**
 * Picks the requested version, or the latest captured version when none matches.
 */
export function selectSalesRequestSubmission(
  submissions: SalesRequestSubmission[],
  version?: number,
): SalesRequestSubmission | null {
  if (!submissions.length) return null;
  if (typeof version === 'number') {
    const match = submissions.find((item) => item.version === version);
    if (match) return match;
  }
  return submissions[submissions.length - 1];
}

/**
 * Human-readable outcome for a captured submission version.
 */
export function submissionOutcomeLabel(outcome?: SalesRequestSubmissionOutcome): string {
  if (outcome === 'approved') return 'Approved';
  if (outcome === 'accepted_no_job') return 'Accepted — no job created';
  if (outcome === 'declined') return 'Rejected';
  return 'Pending review';
}

export const UNREADABLE_VALUE_MESSAGE = 'This value could not be displayed.';

export interface ReadableVisitGps {
  verified: boolean;
  declined: boolean;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  capturedAt?: string;
  address?: string;
  outsideExpectedLocation?: boolean;
  distanceFromExpectedMeters?: number;
  permissionStatus?: string;
  declineReason?: string;
}

const INTERNAL_KEY =
  /(schema|checksum|dataurl|^_?id$|templateid|templateversion|templatetype|attachmentid|objectid|capturedby|appointmentid|clientref)/i;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function finiteNumber(value: unknown): number | undefined {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function humanizeKey(key: string): string {
  return key
    .replace(/^fld_/, '')
    .replace(/\[\d+\]/g, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function isHiddenKey(key: string): boolean {
  return INTERNAL_KEY.test(key);
}

function isInternalId(value: string): boolean {
  return /^[a-f0-9]{24}$/i.test(value.trim());
}

/**
 * Last segment of a stored field path, without schema keys or fld_ ids.
 */
export function readableFieldPath(path: string): string {
  const parts = path
    .split('.')
    .map((part) => part.replace(/\[\d+\]/g, ''))
    .filter((part) => part && !isHiddenKey(part));
  const last = parts[parts.length - 1] || 'Field';
  return humanizeKey(last);
}

function renderReadableValue(value: unknown, depth: number): string {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || isInternalId(trimmed) || trimmed.startsWith('data:')) return '';
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (parsed && typeof parsed === 'object') return renderReadableValue(parsed, depth + 1);
      } catch {
        return '';
      }
    }
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (depth > 4) return '';
  if (Array.isArray(value)) {
    return value
      .map((item) => renderReadableValue(item, depth + 1))
      .filter(Boolean)
      .join(', ');
  }
  const record = asRecord(value);
  if (!record) return '';
  const lines: string[] = [];
  for (const [key, nested] of Object.entries(record)) {
    if (isHiddenKey(key)) continue;
    const text = renderReadableValue(nested, depth + 1);
    if (!text) continue;
    lines.push(`${humanizeKey(key)}: ${text}`);
  }
  return lines.join('\n');
}

/**
 * Formats a stored history value as readable text. Objects are never dumped as JSON.
 */
export function formatHistoryValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  try {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      if (typeof value === 'string' && isInternalId(value)) return '—';
      const rendered = renderReadableValue(value, 0);
      return rendered || (typeof value === 'string' ? UNREADABLE_VALUE_MESSAGE : '—');
    }
    const rendered = renderReadableValue(value, 0);
    return rendered || UNREADABLE_VALUE_MESSAGE;
  } catch {
    return UNREADABLE_VALUE_MESSAGE;
  }
}

/**
 * Reads the visit-location card fields from a stored GPS snapshot.
 * Attendance payloads and internal ids are ignored.
 */
export function readRecordedGps(value: unknown): ReadableVisitGps | null {
  const record = asRecord(value);
  if (!record) return null;
  const nested = asRecord(record.visitGpsVerification);
  const source = nested || record;
  const latitude = finiteNumber(source.latitude);
  const longitude = finiteNumber(source.longitude);
  const verified = source.verified === true && latitude !== undefined && longitude !== undefined;
  const declined = source.declinedByUser === true || source.verified === false;
  if (!verified && !declined) return null;
  return {
    verified,
    declined,
    latitude,
    longitude,
    accuracyMeters: finiteNumber(source.accuracyMeters),
    capturedAt: typeof source.capturedAt === 'string' ? source.capturedAt : undefined,
    address: typeof source.address === 'string' ? source.address : undefined,
    outsideExpectedLocation: source.outsideExpectedLocation === true,
    distanceFromExpectedMeters: finiteNumber(source.distanceFromExpectedMeters),
    permissionStatus:
      typeof source.permissionStatus === 'string' ? source.permissionStatus : undefined,
    declineReason: typeof source.declineReason === 'string' ? source.declineReason : undefined,
  };
}

/**
 * Empty-state copy when an RFQ has no captured snapshots.
 */
export function historyEmptyState(
  history?: SalesRequestSubmissionHistory | null,
): string | null {
  if (history?.historyRecorded && history.submissions.length > 0) return null;
  return history?.message || NO_RECORDED_HISTORY_MESSAGE;
}
