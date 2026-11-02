/** Shared formatting; the caller supplies the source, with no timestamp fallback. */
export function formatOperationalSignOffTime(value?: string | null): string {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat('en-ZA', {
        timeZone: 'Africa/Johannesburg', year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }).format(date)
    : 'Unavailable';
}

export function operationalSignOffLabel(identity: string): string {
  const signer = /tech|serviced by/i.test(identity) ? 'Technician '
    : /cust|client/i.test(identity) ? 'Customer '
    : /supervisor|super_date/i.test(identity) ? 'Supervisor ' : '';
  return `${signer}sign-off reference (Finish Work — device time)`;
}

/** The same document reference may appear at each signature; none measures signing time. */
export function OperationalSignOffReference({ submittedAt, finishWorkClockWarning }: {
  submittedAt?: string | null; finishWorkClockWarning?: boolean;
}) {
  return (
    <div className="jcr-block jcr-keep">
      <div className="jcr-field-label">Server accepted submission</div>
      <div className="jcr-field-value">{formatOperationalSignOffTime(submittedAt)}</div>
      <p>Each sign-off reference uses the same recorded Finish Work device time (South Africa) as an operational approximation, not an independently verified signature capture time.</p>
      {finishWorkClockWarning && <p>Finish Work device time is later than its event server receipt. Device/server clocks may differ; the recorded values have not been adjusted.</p>}
    </div>
  );
}
