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

/**
 * Formats a stored history value for the review panel without dropping content.
 */
export function formatHistoryValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
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
