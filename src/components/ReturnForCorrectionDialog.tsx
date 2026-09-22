import React, { useEffect, useRef, useState } from 'react';
import { Loader2, RotateCcw, X } from 'lucide-react';

export const CORRECTION_INSTRUCTIONS_MAX = 10000;

interface ReturnForCorrectionDialogProps {
  open: boolean;
  requestNumber?: string;
  submitting?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (instructions: string) => void | Promise<void>;
}

/**
 * Required return-for-correction dialog. Instructions are never silently truncated.
 */
const ReturnForCorrectionDialog: React.FC<ReturnForCorrectionDialogProps> = ({
  open,
  requestNumber,
  submitting = false,
  error,
  onCancel,
  onConfirm,
}) => {
  const [instructions, setInstructions] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) {
      setInstructions('');
      setLocalError(null);
      return;
    }
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 192)}px`;
  }, [instructions, open]);

  if (!open) return null;

  function handleConfirm(): void {
    if (instructions.length > CORRECTION_INSTRUCTIONS_MAX) {
      setLocalError(
        `Correction instructions cannot exceed ${CORRECTION_INSTRUCTIONS_MAX} characters.`,
      );
      textareaRef.current?.focus();
      return;
    }
    if (!instructions.replace(/^\s+|\s+$/g, '')) {
      setLocalError('What must the rep correct? is required.');
      textareaRef.current?.focus();
      return;
    }
    setLocalError(null);
    void onConfirm(instructions.replace(/^\s+|\s+$/g, ''));
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/50 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="return-correction-title"
        className="w-full max-w-3xl rounded-2xl border border-line bg-white p-5 shadow-crm-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="return-correction-title" className="text-lg font-bold text-ink">
              Return for correction
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {requestNumber
                ? `Tell the representative what to correct on ${requestNumber}. The same RFQ number is kept.`
                : 'Tell the representative what to correct. The same RFQ number is kept.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-muted disabled:opacity-50"
            aria-label="Cancel return"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label htmlFor="return-correction-input" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
          What must the rep correct?
        </label>
        <textarea
          id="return-correction-input"
          ref={textareaRef}
          value={instructions}
          onChange={(event) => {
            const next = event.target.value;
            if (next.length > CORRECTION_INSTRUCTIONS_MAX) {
              setLocalError(
                `Correction instructions cannot exceed ${CORRECTION_INSTRUCTIONS_MAX} characters.`,
              );
              return;
            }
            setInstructions(next);
            if (localError) setLocalError(null);
          }}
          rows={10}
          disabled={submitting}
          className="min-h-[12rem] w-full resize-y rounded-lg border border-line px-3 py-2 text-sm text-ink"
          placeholder="Describe the errors and what must be changed. Paragraphs and line breaks are kept."
        />
        <div className="mt-1 flex justify-between text-xs text-ink-muted">
          <span>Required. Line breaks are preserved.</span>
          <span>
            {instructions.length.toLocaleString()} / {CORRECTION_INSTRUCTIONS_MAX.toLocaleString()}
          </span>
        </div>

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
            disabled={submitting || !instructions.replace(/^\s+|\s+$/g, '')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Return for correction
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReturnForCorrectionDialog;
