import React, { useEffect, useRef, useState } from 'react';
import { Loader2, X, XCircle } from 'lucide-react';
import { normalizeRejectionReason } from '../utils/salesRequestRejection';

interface RejectReasonDialogProps {
  open: boolean;
  requestNumber?: string;
  submitting?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}

/**
 * Required rejection-reason dialog used by the sales-request review modal.
 */
const RejectReasonDialog: React.FC<RejectReasonDialogProps> = ({
  open,
  requestNumber,
  submitting = false,
  error,
  onCancel,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const normalized = normalizeRejectionReason(reason);

  useEffect(() => {
    if (!open) {
      setReason('');
      setLocalError(null);
      return;
    }
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  /**
   * Validates the reason locally, then hands it to the parent.
   */
  function handleConfirm(): void {
    if (!normalized) {
      setLocalError('Enter a clear reason for rejecting this request.');
      textareaRef.current?.focus();
      return;
    }
    setLocalError(null);
    void onConfirm(normalized);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/50 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-reason-title"
        className="w-full max-w-lg rounded-2xl border border-line bg-white p-5 shadow-crm-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="reject-reason-title" className="text-lg font-bold text-ink">
              Reject request
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {requestNumber
                ? `Enter a clear reason so the representative can correct ${requestNumber}.`
                : 'Enter a clear reason so the representative can correct and resubmit.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-muted disabled:opacity-50"
            aria-label="Cancel rejection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label htmlFor="reject-reason-input" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Rejection reason
        </label>
        <textarea
          id="reject-reason-input"
          ref={textareaRef}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            if (localError) setLocalError(null);
          }}
          rows={4}
          disabled={submitting}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
          placeholder="Explain what must be corrected before resubmission"
        />

        {(localError || error) && (
          <p className="mt-2 text-sm text-rose-700">{localError || error}</p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || !normalized}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Reject request
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectReasonDialog;
