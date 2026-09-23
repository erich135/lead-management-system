import React from 'react';
import { History } from 'lucide-react';
import type { SalesRequestSubmission, SalesRequestSubmissionHistory } from '../lib/api';
import { getSalesRequestAttachmentDownloadUrl } from '../utils/repApprovalsDownload';
import { SalesRequestFormPresentation } from './SalesRequestFormPresentation';
import { VisitLocationCard } from './VisitLocationCard';
import {
  EXISTING_RECORD_CAPTURE_NOTE,
  formatHistoryValue,
  historyEmptyState,
  readableFieldPath,
  readRecordedGps,
  selectSalesRequestSubmission,
  submissionOutcomeLabel,
} from '../utils/salesRequestHistoryView';

interface SalesRequestHistoryPanelProps {
  history: SalesRequestSubmissionHistory | null;
  loading: boolean;
  error?: string | null;
  selectedVersion?: number;
  onSelectVersion: (version: number) => void;
}

function userName(
  user?: string | { firstName?: string; lastName?: string; email?: string },
): string {
  if (!user) return '—';
  if (typeof user === 'string') return user;
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return full || user.email || '—';
}

function formatDate(value?: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Simple RFQ submission-history panel: pick a version and inspect submitted
 * content, corrections, outcome, and attachments.
 */
const SalesRequestHistoryPanel: React.FC<SalesRequestHistoryPanelProps> = ({
  history,
  loading,
  error,
  selectedVersion,
  onSelectVersion,
}) => {
  const emptyMessage = historyEmptyState(history);
  const selected = selectSalesRequestSubmission(history?.submissions || [], selectedVersion);

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700">
        <History className="h-4 w-4" />
        Submission history
      </h3>

      {loading ? (
        <p className="text-sm text-slate-600">Loading submission history…</p>
      ) : error ? (
        <p className="text-sm text-rose-700">{error}</p>
      ) : emptyMessage ? (
        <p className="text-sm text-slate-600">{emptyMessage}</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {(history?.submissions || []).map((submission) => {
              const active = selected?.version === submission.version;
              return (
                <button
                  key={submission._id}
                  type="button"
                  onClick={() => onSelectVersion(submission.version)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    active
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400'
                  }`}
                >
                  Version {submission.version}
                </button>
              );
            })}
          </div>
          {selected ? <SelectedSubmissionDetail submission={selected} /> : null}
        </>
      )}
    </section>
  );
};

function SelectedSubmissionDetail({
  submission,
}: {
  submission: SalesRequestSubmission;
}) {
  const fromExisting =
    submission.captureSource === 'existing_record' || submission.capturedFromExistingRecord;
  const recordedGps = submission.gps ? readRecordedGps(submission.gps) : null;

  return (
    <div className="space-y-3 text-sm">
      {fromExisting ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
          {submission.captureNote || EXISTING_RECORD_CAPTURE_NOTE}
        </p>
      ) : null}
      <dl className="grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase text-slate-500">Submitted</dt>
          <dd>{formatDate(submission.submittedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-slate-500">Submitted by</dt>
          <dd>{userName(submission.submittedBy)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-slate-500">Outcome</dt>
          <dd className="font-semibold text-slate-900">
            {submissionOutcomeLabel(submission.outcome)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-slate-500">Decided</dt>
          <dd>
            {formatDate(submission.decidedAt)}
            {submission.decidedBy ? ` · ${userName(submission.decidedBy)}` : ''}
          </dd>
        </div>
        {submission.declineReason ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase text-slate-500">Rejection reason</dt>
            <dd>{submission.declineReason}</dd>
          </div>
        ) : null}
        {submission.reviewNotes ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase text-slate-500">Review notes</dt>
            <dd>{submission.reviewNotes}</dd>
          </div>
        ) : null}
      </dl>

      {submission.visitNotes ? (
        <div>
          <h4 className="text-xs font-semibold uppercase text-slate-500">Visit notes</h4>
          <p className="whitespace-pre-wrap text-slate-800">{submission.visitNotes}</p>
        </div>
      ) : null}

      {submission.gps ? (
        recordedGps ? (
          <VisitLocationCard gps={recordedGps} />
        ) : (
          <p className="text-sm text-rose-700">Visit location could not be displayed.</p>
        )
      ) : null}

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">Submitted form</h4>
        <SalesRequestFormPresentation
          requestType={submission.requestType}
          formData={submission.submittedFormData}
        />
      </div>

      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase text-slate-500">
          Submitted attachments
        </h4>
        {(submission.attachmentRefs || []).length === 0 ? (
          <p className="text-slate-600">No submitted attachments for this version.</p>
        ) : (
          <ul className="space-y-1">
            {submission.attachmentRefs.map((attachment) => (
              <li key={String(attachment.attachmentId)}>
                <a
                  href={getSalesRequestAttachmentDownloadUrl(String(attachment.attachmentId))}
                  className="text-indigo-700 underline"
                >
                  {attachment.caption || attachment.originalName}
                </a>
                <span className="ml-2 text-xs text-slate-500">
                  {attachment.originalName} · {attachment.mimeType}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase text-slate-500">
          Administrator corrections
        </h4>
        {(submission.adminEdits || []).length === 0 ? (
          <p className="text-slate-600">No administrator corrections on this version.</p>
        ) : (
          <ul className="space-y-2">
            {submission.adminEdits.map((edit, index) => (
              <li
                key={`${edit.path}-${index}`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <p className="font-medium text-slate-900">{readableFieldPath(edit.path)}</p>
                <p className="text-xs text-slate-500">
                  {userName(edit.editedBy)} · {formatDate(edit.editedAt)}
                </p>
                <dl className="mt-1 grid gap-1 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold uppercase text-slate-500">Before</dt>
                    <dd className="whitespace-pre-wrap break-all">
                      {formatHistoryValue(edit.before)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase text-slate-500">After</dt>
                    <dd className="whitespace-pre-wrap break-all">
                      {formatHistoryValue(edit.after)}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default SalesRequestHistoryPanel;
