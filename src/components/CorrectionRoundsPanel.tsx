import { RotateCcw } from 'lucide-react';
import type {
  SalesRequest,
  SalesRequestCorrectionEmailCandidate,
  SalesRequestCorrectionRound,
} from '../lib/api';

function personName(
  user?: string | { firstName?: string; lastName?: string; email?: string } | null,
): string {
  if (!user) return 'Unknown';
  if (typeof user === 'string') return user;
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || 'Unknown';
}

function formatWhen(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export function latestOpenCorrectionRound(
  rounds?: SalesRequestCorrectionRound[],
): SalesRequestCorrectionRound | null {
  if (!rounds?.length) return null;
  for (let index = rounds.length - 1; index >= 0; index -= 1) {
    if (!rounds[index].resubmittedAt) return rounds[index];
  }
  return rounds[rounds.length - 1];
}

interface CorrectionRoundsPanelProps {
  request: SalesRequest;
  showRetry?: boolean;
  retrying?: boolean;
  onRetry?: () => void;
  recipientChoices?: SalesRequestCorrectionEmailCandidate[];
  recipientUserId?: string;
  onRecipientUserIdChange?: (userId: string) => void;
}

/**
 * Current correction request plus previous rounds.
 */
export function CorrectionRoundsPanel({
  request,
  showRetry = false,
  retrying = false,
  onRetry,
  recipientChoices = [],
  recipientUserId = '',
  onRecipientUserIdChange,
}: CorrectionRoundsPanelProps) {
  const rounds = request.correctionRounds || [];
  if (rounds.length === 0 && request.status !== 'needs_correction') return null;

  const current = request.status === 'needs_correction' ? latestOpenCorrectionRound(rounds) : null;
  const previous = current
    ? rounds.filter((round) => round !== current)
    : rounds;

  return (
    <div className="space-y-3">
      {current ? (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
            Needs correction
          </p>
          <p className="mt-1 text-sm text-amber-950">
            Returned by {personName(current.returnedBy)} on {formatWhen(current.returnedAt)}
          </p>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-900">
            {current.instructions}
          </p>
          {current.emailStatus && current.emailStatus !== 'sent' ? (
            <p className="mt-3 text-sm text-rose-800">
              Correction email was not delivered
              {current.emailError ? `: ${current.emailError}` : '.'}
            </p>
          ) : null}
          {showRetry && recipientChoices.length > 1 ? (
            <label className="mt-3 block text-sm text-amber-950">
              Send the correction email to
              <select
                value={recipientUserId}
                onChange={(event) => onRecipientUserIdChange?.(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-sm text-slate-900"
              >
                <option value="">Choose a linked user</option>
                {recipientChoices.map((candidate) => (
                  <option key={candidate.userId} value={candidate.userId}>
                    {candidate.name ? `${candidate.name} (${candidate.email})` : candidate.email}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {showRetry && current.emailStatus !== 'sent' && onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying || (recipientChoices.length > 1 && !recipientUserId)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {retrying ? 'Retrying email…' : 'Retry email'}
            </button>
          ) : null}
        </section>
      ) : null}

      {previous.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
            Previous correction requests
          </p>
          <ol className="mt-2 space-y-3">
            {previous.map((round, index) => (
              <li key={`${round.returnedAt || index}`} className="text-sm text-slate-800">
                <p className="font-semibold">
                  Round {index + 1} · {personName(round.returnedBy)} · {formatWhen(round.returnedAt)}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words">{round.instructions}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {round.resubmittedAt
                    ? `Resubmitted ${formatWhen(round.resubmittedAt)} by ${personName(round.resubmittedBy)}`
                    : 'Not resubmitted yet'}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
