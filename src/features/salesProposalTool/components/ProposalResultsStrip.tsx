interface ProposalResultsStripProps {
  savingText: string | null;
  savingLabel?: string;
  paybackText: string | null;
  suppressedMessage: string | null;
}

export function ProposalResultsStrip({
  savingText,
  savingLabel = 'Final annual electricity saving',
  paybackText,
  suppressedMessage,
}: ProposalResultsStripProps) {
  return (
    <div className="rounded-[8px] border border-slate-200 bg-white px-4 py-3 text-sm text-[#383838] shadow-sm">
      {suppressedMessage ? (
        <p>{suppressedMessage}</p>
      ) : (
        <p>
          <span className="font-semibold">{savingLabel}</span>{' '}
          {savingText ?? 'Not available yet'}
          <span className="px-2 text-slate-300">·</span>
          <span className="font-semibold">Payback</span> {paybackText ?? 'Not available yet'}
        </p>
      )}
    </div>
  );
}
